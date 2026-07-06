import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/auth/me
 * Returns the current authenticated user, or 401 if no session.
 * Used by the mobile client (Capacitor) to hydrate session state on app launch.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
  return NextResponse.json({ user: session.user })
}
