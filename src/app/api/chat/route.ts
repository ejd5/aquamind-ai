import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { nvidiaChat, type ChatMessage } from '@/lib/ai/nvidia'
import { db } from '@/lib/db'
import { buildPoolContext, getAssistantSystemPrompt } from '@/lib/pool/ai-context'
import { pickLocale, translate } from '@/lib/i18n-api'
import { trackEventServer } from '@/lib/analytics-server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const { message } = await req.json()
    if (!message) {
      const msg = await translate(locale, 'common.errors.messageRequired', 'Message requis')
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const [profile, latestTest, history] = await Promise.all([
      db.poolProfile.findFirst({ where: { userId } }),
      db.waterTest.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      db.chatMessage.findMany({ where: { userId }, take: 10, orderBy: { createdAt: 'desc' } }),
    ])
    history.reverse()

    const context = buildPoolContext(profile as any, latestTest as any)
    const systemPrompt = `${getAssistantSystemPrompt(locale)}\n\n${context}`

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ]
    for (const m of history) messages.push({ role: m.role as ChatMessage['role'], content: m.content })
    messages.push({ role: 'user', content: message })

    const result = await nvidiaChat(messages)
    const fallbackReply = await translate(
      locale,
      'common.errors.chatError',
      "Désolé, je n'ai pas pu générer de réponse."
    )
    const reply = result.content || fallbackReply

    await db.chatMessage.createMany({
      data: [
        { userId, role: 'user', content: message },
        { userId, role: 'assistant', content: reply },
      ],
    })

    // Analytics — fire-and-forget.
    void trackEventServer(
      'chat_message_sent',
      {
        messageLength: message.length,
        hadProfile: Boolean(profile),
        hadLatestTest: Boolean(latestTest),
      },
      userId
    )

    return NextResponse.json({ reply })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  await db.chatMessage.deleteMany({ where: { userId } })
  return NextResponse.json({ success: true })
}
