import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import { VISION_DIAGNOSTIC_PROMPT } from '@/lib/pool/ai-context'

export const runtime = 'nodejs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const userId = session.user.id

  const diagnostics = await db.photoDiagnostic.findMany({ where: { userId }, take: 30, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ diagnostics })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const { image, typeHint } = await req.json()
    if (!image) return NextResponse.json({ error: 'Image base64 requise' }, { status: 400 })

    const prompt = typeHint
      ? `${VISION_DIAGNOSTIC_PROMPT}\n\nIndice utilisateur: cette photo montre probablement "${typeHint}".`
      : VISION_DIAGNOSTIC_PROMPT

    const zai = await ZAI.create()
    const response = await zai.chat.completions.createVision({
      model: 'glm-4.6v',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: image } },
          ],
        } as any,
      ],
      thinking: { type: 'disabled' },
    })

    const content = response.choices[0]?.message?.content || ''
    let parsed: any = null
    try {
      const m = content.match(/\{[\s\S]*\}/)
      parsed = m ? JSON.parse(m[0]) : null
    } catch {
      parsed = null
    }

    const saved = await db.photoDiagnostic.create({
      data: {
        userId,
        type: parsed?.imageType || typeHint || 'unknown',
        imageUrl: image.substring(0, 500),
        detectedIssues: JSON.stringify(parsed?.detectedIssues || []),
        probableIssues: JSON.stringify(parsed?.probableIssues || []),
        confidence: Number(parsed?.confidence) || 0,
        aiSummary: parsed?.userFriendlySummary || content.substring(0, 300),
        missingData: JSON.stringify(parsed?.missingData || []),
        recommendedNextStep: parsed?.recommendedNextStep || null,
        safetyWarnings: JSON.stringify(parsed?.safetyWarnings || []),
      },
    })

    return NextResponse.json({ diagnostic: parsed, raw: content, id: saved.id })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
