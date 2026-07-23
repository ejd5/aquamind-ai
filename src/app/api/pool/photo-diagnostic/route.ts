import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { nvidiaVision } from '@/lib/ai/nvidia'
import { db } from '@/lib/db'
import { VISION_DIAGNOSTIC_PROMPT, getVisionLanguageInstruction } from '@/lib/pool/ai-context'
import { pickLocale, translate } from '@/lib/i18n-api'
import { trackEventServer } from '@/lib/analytics-server'
import { findOwnedPool } from '@/lib/brain/access'
import {
  normalizeImageForAi,
  privateImageReference,
  publicImageUrl,
  SecureImageError,
} from '@/lib/images/secure-image'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id
  const poolId = new URL(req.url).searchParams.get('poolId')

  const diagnostics = await db.photoDiagnostic.findMany({
    where: { userId, ...(poolId ? { OR: [{ poolId }, { poolId: null }] } : {}) },
    take: 30,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    diagnostics: diagnostics.map((diagnostic) => ({
      ...diagnostic,
      // Never return legacy base64 payloads through the history API.
      imageUrl: publicImageUrl(diagnostic.imageUrl),
      imageAvailable: Boolean(publicImageUrl(diagnostic.imageUrl)),
    })),
  })
}

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const { image, typeHint, poolId } = await req.json()
    const pool = poolId ? await findOwnedPool(userId, poolId) : null
    if (poolId && !pool) return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Image base64 requise' }, { status: 400 })
    }

    // Security boundary: validate, orient, resize and strip all metadata before
    // sending the image to NVIDIA NIM or storing any reference.
    const normalized = await normalizeImageForAi(image)

    const langInstr = getVisionLanguageInstruction(locale)
    const prompt = typeHint
      ? `${langInstr}\n\n${VISION_DIAGNOSTIC_PROMPT}\n\nUser hint: this photo probably shows "${typeHint}".`
      : `${langInstr}\n\n${VISION_DIAGNOSTIC_PROMPT}`

    const zai = await nvidiaVision(prompt, normalized.dataUrl)
    const content = zai.content || ''
    let parsed: any = null
    try {
      const m = content.match(/\{[\s\S]*\}/)
      parsed = m ? JSON.parse(m[0]) : null
    } catch {
      parsed = null
    }

    if (!parsed && content.trim()) {
      parsed = {
        imageType: typeHint || 'unknown',
        detectedIssues: [],
        probableIssues: [],
        confidence: 0.5,
        userFriendlySummary: content.substring(0, 500),
        missingData: [],
        recommendedNextStep: null,
        safetyWarnings: [],
        _raw: true,
      }
    }

    const saved = await db.photoDiagnostic.create({
      data: {
        userId,
        poolId: pool?.id || null,
        type: parsed?.imageType || typeHint || 'unknown',
        // P0-B: never persist image bytes in PostgreSQL. This reference proves
        // which normalized image was processed without allowing reconstruction.
        imageUrl: privateImageReference(normalized.sha256),
        detectedIssues: JSON.stringify(parsed?.detectedIssues || []),
        probableIssues: JSON.stringify(parsed?.probableIssues || []),
        confidence: Number(parsed?.confidence) || 0,
        aiSummary: parsed?.userFriendlySummary || content.substring(0, 300),
        missingData: JSON.stringify(parsed?.missingData || []),
        recommendedNextStep: parsed?.recommendedNextStep || null,
        safetyWarnings: JSON.stringify(parsed?.safetyWarnings || []),
      },
    })

    void trackEventServer(
      'photo_diagnostic_run',
      {
        type: parsed?.imageType || typeHint || 'unknown',
        confidence: Number(parsed?.confidence) || 0,
        hadTypeHint: Boolean(typeHint),
        fallbackRaw: Boolean(parsed?._raw),
        imageInputBytes: normalized.inputBytes,
        imageOutputBytes: normalized.outputBytes,
        imageWidth: normalized.width,
        imageHeight: normalized.height,
        imagePersisted: false,
      },
      userId
    )

    return NextResponse.json({
      diagnostic: parsed,
      raw: content,
      id: saved.id,
      imagePersisted: false,
    })
  } catch (e) {
    if (e instanceof SecureImageError) {
      return NextResponse.json({ error: e.message, code: 'invalid_image' }, { status: e.statusCode })
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    const msg = await translate(locale, 'common.errors.idRequiredUpper', 'ID requis')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const diag = await db.photoDiagnostic.findFirst({ where: { id, userId } })
  if (!diag) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  await db.photoDiagnostic.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
