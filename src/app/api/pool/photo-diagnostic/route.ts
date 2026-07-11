import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { nvidiaVision } from '@/lib/ai/nvidia'
import { db } from '@/lib/db'
import { VISION_DIAGNOSTIC_PROMPT, getVisionLanguageInstruction } from '@/lib/pool/ai-context'
import { pickLocale, translate } from '@/lib/i18n-api'
import { trackEventServer } from '@/lib/analytics-server'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  const diagnostics = await db.photoDiagnostic.findMany({ where: { userId }, take: 30, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ diagnostics })
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
    const { image, typeHint } = await req.json()
    if (!image) return NextResponse.json({ error: 'Image base64 requise' }, { status: 400 })

    const langInstr = getVisionLanguageInstruction(locale)
    const prompt = typeHint
      ? `${langInstr}\n\n${VISION_DIAGNOSTIC_PROMPT}\n\nUser hint: this photo probably shows "${typeHint}".`
      : `${langInstr}\n\n${VISION_DIAGNOSTIC_PROMPT}`

    const zai = await nvidiaVision(prompt, image)
    const content = zai.content || ''
    let parsed: any = null
    try {
      // Try to extract JSON from the response
      const m = content.match(/\{[\s\S]*\}/)
      parsed = m ? JSON.parse(m[0]) : null
    } catch {
      parsed = null
    }

    // If parsing failed, build a fallback diagnostic from the raw text
    // so the user always sees something useful
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
        type: parsed?.imageType || typeHint || 'unknown',
        imageUrl: image, // Store full base64 (for dev/MVP — use S3 in production)
        detectedIssues: JSON.stringify(parsed?.detectedIssues || []),
        probableIssues: JSON.stringify(parsed?.probableIssues || []),
        confidence: Number(parsed?.confidence) || 0,
        aiSummary: parsed?.userFriendlySummary || content.substring(0, 300),
        missingData: JSON.stringify(parsed?.missingData || []),
        recommendedNextStep: parsed?.recommendedNextStep || null,
        safetyWarnings: JSON.stringify(parsed?.safetyWarnings || []),
      },
    })

    // Analytics — fire-and-forget.
    void trackEventServer(
      'photo_diagnostic_run',
      {
        type: parsed?.imageType || typeHint || 'unknown',
        confidence: Number(parsed?.confidence) || 0,
        hadTypeHint: Boolean(typeHint),
        fallbackRaw: Boolean(parsed?._raw),
      },
      userId
    )

    return NextResponse.json({ diagnostic: parsed, raw: content, id: saved.id })
  } catch (e) {
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

  // Verify ownership before deleting
  const diag = await db.photoDiagnostic.findFirst({ where: { id, userId } })
  if (!diag) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  await db.photoDiagnostic.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
