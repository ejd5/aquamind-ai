import { describe, it, expect, vi, beforeEach } from 'vitest'

const dbMock = vi.hoisted(() => ({
  lead: {
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
  leadEvent: { deleteMany: vi.fn() },
  appointment: { deleteMany: vi.fn() },
  quote: { deleteMany: vi.fn() },
  commission: { deleteMany: vi.fn() },
  agentRun: { deleteMany: vi.fn() },
  $transaction: vi.fn(async (promises: Promise<unknown>[]) => {
    for (const p of promises) await p
  }),
}))

vi.mock('@/lib/db', () => ({ db: dbMock }))

const mockSession = vi.hoisted(() => ({ value: { user: { id: 'user-1' } } as { user?: { id?: string } } }))
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(async () => mockSession.value),
}))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

vi.mock('@/lib/i18n-api', () => ({
  pickLocale: () => 'fr',
  translate: vi.fn(async (_l: string, _k: string, fallback: string) => fallback),
}))

const getGrowthOrgMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/growth/access', () => ({
  getGrowthOrganization: getGrowthOrgMock,
}))

vi.mock('@/i18n/locales/tool-workspaces', () => ({
  toolWorkspaceText: (_l: string, k: string) => k,
}))

import { NextRequest } from 'next/server'
import { DELETE } from '@/app/api/growth/leads/[id]/route'

function makeReq() {
  return new NextRequest('http://localhost/api/growth/leads/lead-1', { method: 'DELETE' })
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('DELETE /api/growth/leads/[id] — RGPD right to erasure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.value = { user: { id: 'user-1' } }
    getGrowthOrgMock.mockResolvedValue({ id: 'org-growth-1' })
    dbMock.lead.findFirst.mockResolvedValue({ id: 'lead-1' })
    dbMock.leadEvent.deleteMany.mockResolvedValue({ count: 2 })
    dbMock.appointment.deleteMany.mockResolvedValue({ count: 1 })
    dbMock.quote.deleteMany.mockResolvedValue({ count: 1 })
    dbMock.commission.deleteMany.mockResolvedValue({ count: 0 })
    dbMock.agentRun.deleteMany.mockResolvedValue({ count: 1 })
    dbMock.lead.delete.mockResolvedValue({})
  })

  it('returns 401 without session', async () => {
    mockSession.value = {}
    const res = await DELETE(makeReq(), makeCtx('lead-1'))
    expect(res.status).toBe(401)
  })

  it('returns 404 when user has no Growth org', async () => {
    getGrowthOrgMock.mockResolvedValue(null)
    const res = await DELETE(makeReq(), makeCtx('lead-1'))
    expect(res.status).toBe(404)
  })

  it('returns 404 for foreign lead', async () => {
    dbMock.lead.findFirst.mockResolvedValue(null)
    const res = await DELETE(makeReq(), makeCtx('lead-foreign'))
    expect(res.status).toBe(404)
  })

  it('deletes lead belonging to Growth org', async () => {
    const res = await DELETE(makeReq(), makeCtx('lead-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('deletes LeadEvents', async () => {
    await DELETE(makeReq(), makeCtx('lead-1'))
    expect(dbMock.leadEvent.deleteMany).toHaveBeenCalledWith({ where: { leadId: 'lead-1' } })
  })

  it('deletes Appointments', async () => {
    await DELETE(makeReq(), makeCtx('lead-1'))
    expect(dbMock.appointment.deleteMany).toHaveBeenCalledWith({ where: { leadId: 'lead-1' } })
  })

  it('deletes Quotes', async () => {
    await DELETE(makeReq(), makeCtx('lead-1'))
    expect(dbMock.quote.deleteMany).toHaveBeenCalledWith({ where: { leadId: 'lead-1' } })
  })

  it('deletes Commissions', async () => {
    await DELETE(makeReq(), makeCtx('lead-1'))
    expect(dbMock.commission.deleteMany).toHaveBeenCalledWith({ where: { leadId: 'lead-1' } })
  })

  it('deletes AgentRuns', async () => {
    await DELETE(makeReq(), makeCtx('lead-1'))
    expect(dbMock.agentRun.deleteMany).toHaveBeenCalledWith({ where: { leadId: 'lead-1' } })
  })

  it('deletes the Lead itself', async () => {
    await DELETE(makeReq(), makeCtx('lead-1'))
    expect(dbMock.lead.delete).toHaveBeenCalledWith({ where: { id: 'lead-1' } })
  })

  it('calls all deletes in a single transaction', async () => {
    await DELETE(makeReq(), makeCtx('lead-1'))
    expect(dbMock.$transaction).toHaveBeenCalledTimes(1)
    const txFn = dbMock.$transaction.mock.calls[0][0]
    expect(Array.isArray(txFn)).toBe(true)
    expect(txFn.length).toBe(6)
  })

  it('returns 500 on transaction failure', async () => {
    dbMock.$transaction.mockRejectedValueOnce(new Error('tx failed'))
    const res = await DELETE(makeReq(), makeCtx('lead-1'))
    expect(res.status).toBe(500)
  })

  it('cannot delete lead from Pro org via Growth access', async () => {
    getGrowthOrgMock.mockResolvedValue(null)
    dbMock.lead.findFirst.mockResolvedValue(null)
    const res = await DELETE(makeReq(), makeCtx('lead-pro'))
    expect(res.status).toBe(404)
    expect(dbMock.lead.delete).not.toHaveBeenCalled()
  })
})
