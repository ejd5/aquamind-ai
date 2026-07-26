import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveWorkspaceEntryTarget } from '@/lib/auth-entry-target'

/**
 * GET /api/auth/me
 * Returns the current authenticated user and the server-resolved workspace
 * entry. The native app uses this endpoint to restore a session and select the
 * technician route without importing database or NextAuth code into the
 * Capacitor bundle.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const entryTarget = await resolveWorkspaceEntryTarget(session.user.id)
  return NextResponse.json({ user: session.user, entryTarget })
}
