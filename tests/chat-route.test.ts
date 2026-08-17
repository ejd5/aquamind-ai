/**
 * AQWELIA — P0-05: Assistant IA (/api/chat) route behaviour.
 *
 * Non-production unit coverage for the chat POST handler:
 *  - auth gate (401 without session) + missing message (400);
 *  - builds pool context + calls the NVIDIA chat model;
 *  - persists user + assistant messages;
 *  - falls back to a translated reply when the model returns empty content;
 *  - DELETE clears the user's chat history.
 *
 * External layers (NVIDIA, DB, analytics) are mocked. The route logic is the
 * real code path.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const dbMock = vi.hoisted(() => ({
  poolProfile: { findFirst: vi.fn() },
  waterTest: { findFirst: vi.fn() },
  chatMessage: { findMany: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
}))

vi.mock('@/lib/db', () => ({ db: dbMock }))

const mockSession = vi.hoisted(() => ({
  value: { user: { id: 'user-1' } } as { user?: { id?: string } },
}))
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(async () => mockSession.value),
}))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/i18n-api', () => ({
  pickLocale: () => 'fr',
  translate: vi.fn(async (_l: string, _k: string, fallback: string) => fallback),
}))
vi.mock('@/lib/analytics-server', () => ({
  trackEventServer: vi.fn(async () => {}),
}))

// NVIDIA chat model mocked: returns a deterministic assistant reply.
vi.mock('@/lib/ai/nvidia', () => ({
  nvidiaChat: vi.fn(async () => ({ content: 'Assistant reply OK' })),
}))

import { POST, DELETE } from '@/app/api/chat/route'
import { nvidiaChat } from '@/lib/ai/nvidia'

function makeReq(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'accept-language': 'fr' },
    body: JSON.stringify(body),
  })
}

describe('P0-05 — /api/chat (Assistant IA)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.value = { user: { id: 'user-1' } }
    dbMock.poolProfile.findFirst.mockResolvedValue(null)
    dbMock.waterTest.findFirst.mockResolvedValue(null)
    dbMock.chatMessage.findMany.mockResolvedValue([])
    dbMock.chatMessage.createMany.mockResolvedValue({ count: 2 })
    dbMock.chatMessage.deleteMany.mockResolvedValue({ count: 1 })
  })

  it('returns 401 without an authenticated session', async () => {
    mockSession.value = {}
    const res = await POST(makeReq('http://localhost/api/chat', { message: 'Bonjour' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when message is missing', async () => {
    const res = await POST(makeReq('http://localhost/api/chat', {}))
    expect(res.status).toBe(400)
  })

  it('builds pool context, calls NVIDIA and persists both messages', async () => {
    const res = await POST(makeReq('http://localhost/api/chat', { message: 'Ma piscine est verte' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.reply).toBe('Assistant reply OK')

    expect(nvidiaChat).toHaveBeenCalledTimes(1)
    const [messages] = (nvidiaChat as any).mock.calls[0]
    const roles = messages.map((m: { role: string }) => m.role)
    expect(roles).toEqual(['system', 'user'])

    expect(dbMock.chatMessage.createMany).toHaveBeenCalledTimes(1)
    const { data: created } = (dbMock.chatMessage.createMany as any).mock.calls[0][0]
    expect(created.map((m: { role: string }) => m.role)).toEqual(['user', 'assistant'])
    expect(created.map((m: { content: string }) => m.content)).toEqual([
      'Ma piscine est verte',
      'Assistant reply OK',
    ])
  })

  it('uses a translated fallback reply when the model returns empty content', async () => {
    ;(nvidiaChat as any).mockResolvedValueOnce({ content: '' })
    const res = await POST(makeReq('http://localhost/api/chat', { message: 'Bonjour' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    // translate() mock returns the fallback string for common.errors.chatError.
    expect(data.reply).toBeTruthy()
    expect(data.reply).toContain('pas pu')
  })

  it('includes the last 10 messages of history in the model context', async () => {
    // findMany returns newest-first (createdAt desc); the route reverses to
    // chronological order before calling the model.
    dbMock.chatMessage.findMany.mockResolvedValue([
      { role: 'assistant', content: 'réponse récente' },
      { role: 'user', content: 'ancien' },
    ])
    await POST(makeReq('http://localhost/api/chat', { message: 'encore' }))
    const [messages] = (nvidiaChat as any).mock.calls[0]
    const roles = messages.map((m: { role: string }) => m.role)
    expect(roles).toEqual(['system', 'user', 'assistant', 'user'])
  })

  it('DELETE clears the user chat history', async () => {
    const req = new NextRequest('http://localhost/api/chat', { method: 'DELETE' })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    expect(dbMock.chatMessage.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
  })
})
