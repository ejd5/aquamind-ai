import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { nvidiaVision } from '@/lib/ai/nvidia'
import { db } from '@/lib/db'
import { VISION_DIAGNOSTIC_PROMPT, getVisionLanguageInstruction } from '@/lib/pool/ai-context'
import { normalizePhotoDiagnostic } from '@/lib/pool/photo-diagnostic-normalize'
import { extractStructuredJson } from '@/lib/pool/extract-structured-json'
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
// Vercel Hobby par défaut = 10s. Le modèle vision peut prendre 30-60s ; on
// monte explicitement le maxDuration pour éviter le kill serverless (timeout).
export const maxDuration = 60

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
    if (poolId && !pool) {
      const msg = await translate(locale, 'common.errors.poolNotFound', 'Piscine introuvable')
      return NextResponse.json({ error: msg }, { status: 404 })
    }
    if (!image || typeof image !== 'string') {
      const msg = await translate(locale, 'photoDiagnostic.imageRequired', 'Image base64 requise')
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    // Security boundary: validate, orient, resize and strip all metadata before
    // sending the image to NVIDIA NIM or storing any reference.
    const normalized = await normalizeImageForAi(image)

    const langInstr = getVisionLanguageInstruction(locale)
    const prompt = typeHint
      ? `${langInstr}\n\n${VISION_DIAGNOSTIC_PROMPT}\n\nIndice utilisateur : cette photo montre probablement « ${typeHint} ».`
      : `${langInstr}\n\n${VISION_DIAGNOSTIC_PROMPT}`

    const zai = await nvidiaVision(prompt, normalized.dataUrl)
    const content = zai.content || ''
    // Round 2 : parsing robuste (fences markdown, texte parasite, objets
    // imbriqués) — remplace la regex gloutonne. Retourne null sans throw.
    const parsed = extractStructuredJson(content)

    // P0-A i18n : normalise + localise la sortie du modèle (jamais d'anglais
    // brut en locale fr ; fallback localisé si la réponse n'est pas structurée).
    const diag = normalizePhotoDiagnostic(parsed, locale, content, typeHint)

    const saved = await db.photoDiagnostic.create({
      data: {
        userId,
        poolId: pool?.id || null,
        type: diag.imageType,
        // P0-B: never persist image bytes in PostgreSQL. This reference proves
        // which normalized image was processed without allowing reconstruction.
        imageUrl: privateImageReference(normalized.sha256),
        detectedIssues: JSON.stringify(diag.detectedIssues),
        probableIssues: JSON.stringify(diag.probableIssues),
        confidence: diag.confidence,
        aiSummary: diag.userFriendlySummary ?? '',
        missingData: JSON.stringify(diag.missingData),
        recommendedNextStep: diag.recommendedNextStep,
        safetyWarnings: JSON.stringify(diag.safetyWarnings),
      },
    })

    void trackEventServer(
      'photo_diagnostic_run',
      {
        type: diag.imageType,
        confidence: diag.confidence,
        hadTypeHint: Boolean(typeHint),
        fallbackRaw: diag.fallbackRaw,
        imageInputBytes: normalized.inputBytes,
        imageOutputBytes: normalized.outputBytes,
        imageWidth: normalized.width,
        imageHeight: normalized.height,
        imagePersisted: false,
      },
      userId
    )

    return NextResponse.json({
      diagnostic: diag,
      raw: content,
      id: saved.id,
      imagePersisted: false,
    })
  } catch (e) {
    if (e instanceof SecureImageError) {
      return NextResponse.json({ error: e.message, code: 'invalid_image' }, { status: e.statusCode })
    }
    // Round 2 (4/4) : timeout NVIDIA / budget épuisé → code structuré "timeout"
    // pour que le client affiche un message FR propre (jamais le texte brut
    // anglais « The operation was aborted due to timeout »).
    const isTimeout =
      (e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')) ||
      (typeof DOMException !== 'undefined' && e instanceof DOMException && e.name === 'AbortError')
    if (isTimeout) {
      const msg = await translate(
        locale,
        'photoDiagnostic.timeout',
        "L'analyse a pris trop de temps. Réessayez ou prenez une photo plus nette.",
      )
      return NextResponse.json({ error: msg, code: 'timeout' }, { status: 504 })
    }
    const msg = await translate(locale, 'photoDiagnostic.analysisFailed', 'Analyse impossible')
    return NextResponse.json({ error: msg }, { status: 500 })
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
