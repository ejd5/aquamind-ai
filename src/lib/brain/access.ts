import { db } from '@/lib/db'

export async function findOwnedPool(userId: string, poolId?: string | null) {
  return db.poolProfile.findFirst({ where: { userId, ...(poolId ? { id: poolId } : {}) }, orderBy: { createdAt: 'asc' } })
}

export function parseJsonArray(value: string | null): unknown[] {
  try { const parsed = value ? JSON.parse(value) : []; return Array.isArray(parsed) ? parsed : [] } catch { return [] }
}
