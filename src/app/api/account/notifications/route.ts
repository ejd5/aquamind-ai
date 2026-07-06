/**
 * AQWELIA — Notification preferences endpoint.
 *
 * GET  /api/account/notifications  → returns current preferences (defaults for now)
 * POST /api/account/notifications  → echoes preferences back (persistence layer TBD)
 *
 * Future: persist preferences on the User model (or a new NotificationPref
 * table) so they sync across devices. For now, returns sensible defaults
 * (all notifications enabled) so the settings UI has a consistent baseline.
 *
 * Spec: RGPD-friendly opt-in/opt-out for marketing & operational alerts.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'

interface NotificationPreferences {
  measureReminders: boolean
  weatherAlerts: boolean
  recommendations: boolean
}

const DEFAULT_PREFS: NotificationPreferences = {
  measureReminders: true,
  weatherAlerts: true,
  recommendations: true,
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // TODO (future): read from DB once a NotificationPref model is added.
  return NextResponse.json(DEFAULT_PREFS)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await req.json()
    // Merge with defaults so missing keys fall back to "on".
    const preferences: NotificationPreferences = {
      ...DEFAULT_PREFS,
      ...body,
    }
    // TODO (future): persist on the User model or a dedicated table.
    return NextResponse.json({ success: true, preferences })
  } catch {
    return NextResponse.json({ error: 'Body invalide' }, { status: 400 })
  }
}
