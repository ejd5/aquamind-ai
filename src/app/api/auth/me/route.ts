import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveWorkspaceEntryTarget, resolveMobileAccountType } from '@/lib/auth-entry-target'

/**
 * GET /api/auth/me
 * Returns the current authenticated user, the server-resolved workspace entry
 * and the canonical mobile account type. The native app uses this endpoint to
 * restore a session and route by identity/account type without importing
 * database or NextAuth code into the Capacitor bundle.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const [entryTarget, accountType] = await Promise.all([
    resolveWorkspaceEntryTarget(session.user.id),
    resolveMobileAccountType(session.user.id),
  ])
  return NextResponse.json({ user: session.user, entryTarget, accountType })
}
