/**
 * AQWELIA — RGPD data portability endpoint.
 *
 * GET /api/account/export
 *
 * Returns the authenticated user's full data set as a downloadable JSON
 * attachment. Covers all models linked to `User` via `userId`:
 *   - profile (subset of User: id, email, name, createdAt)
 *   - poolProfiles
 *   - waterTests (+ nested actionPlans)
 *   - photoDiagnostics
 *   - equipment
 *   - productInventory
 *   - reminders
 *   - chatMessages
 *   - maintenanceTasks
 *   - subscriptions
 *   - analyticsEvents
 *
 * Sensitive fields (passwordHash) are explicitly excluded from the User
 * projection. The response sets `Content-Disposition: attachment` so the
 * browser downloads the file rather than rendering it inline.
 *
 * Spec: RGPD art. 20 — droit à la portabilité des données.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const [
      user,
      pools,
      waterTests,
      diagnostics,
      equipment,
      inventory,
      reminders,
      chatMessages,
      maintenanceTasks,
      subscriptions,
      analyticsEvents,
    ] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, createdAt: true },
      }),
      db.poolProfile.findMany({ where: { userId } }),
      db.waterTest.findMany({ where: { userId }, include: { actionPlans: true } }),
      db.photoDiagnostic.findMany({ where: { userId } }),
      db.equipment.findMany({ where: { userId } }),
      db.productInventory.findMany({ where: { userId } }),
      db.reminder.findMany({ where: { userId } }),
      db.chatMessage.findMany({ where: { userId } }),
      db.maintenanceTask.findMany({ where: { userId } }),
      db.subscription.findMany({ where: { userId } }),
      db.analyticsEvent.findMany({ where: { userId } }),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      user,
      pools,
      waterTests,
      diagnostics,
      equipment,
      inventory,
      reminders,
      chatMessages,
      maintenanceTasks,
      subscriptions,
      analyticsEvents,
    }

    const filename = `aqwelia-data-${new Date().toISOString().split('T')[0]}.json`

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[account/export] error:', err)
    return NextResponse.json(
      { error: 'Erreur lors de l’export des données' },
      { status: 500 }
    )
  }
}
