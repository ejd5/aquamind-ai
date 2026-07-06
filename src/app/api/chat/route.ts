import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import { buildPoolContext, ASSISTANT_SYSTEM_PROMPT } from '@/lib/pool/ai-context'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const { message } = await req.json()
    if (!message) return NextResponse.json({ error: 'Message requis' }, { status: 400 })

    const [profile, latestTest, history] = await Promise.all([
      db.poolProfile.findFirst({ where: { userId } }),
      db.waterTest.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      db.chatMessage.findMany({ where: { userId }, take: 10, orderBy: { createdAt: 'desc' } }),
    ])
    history.reverse()

    const context = buildPoolContext(profile as any, latestTest as any)
    const systemPrompt = `${ASSISTANT_SYSTEM_PROMPT}\n\n${context}`

    const messages: { role: string; content: string }[] = [
      { role: 'assistant', content: systemPrompt },
    ]
    for (const m of history) messages.push({ role: m.role, content: m.content })
    messages.push({ role: 'user', content: message })

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: messages as any,
      thinking: { type: 'disabled' },
    })
    const reply = completion.choices[0]?.message?.content || "Désolé, je n'ai pas pu générer de réponse."

    await db.chatMessage.createMany({
      data: [
        { userId, role: 'user', content: message },
        { userId, role: 'assistant', content: reply },
      ],
    })

    return NextResponse.json({ reply })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const userId = session.user.id

  await db.chatMessage.deleteMany({ where: { userId } })
  return NextResponse.json({ success: true })
}
