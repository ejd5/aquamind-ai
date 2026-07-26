/** RGPD access/portability export. Secrets and provider tokens are excluded. */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: await translate(locale, 'common.errors.unauthorized', 'Non autorisé') }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const [
      user, accounts, pools, waterTests, diagnostics, equipment, inventory,
      reminders, chatMessages, maintenanceTasks, poolDesigns, guideViews,
      subscriptions, analyticsEvents, consentRecords, recommendationExecutions,
      recommendationOutcomes, brainFeedback, proClients, trackingSessions,
      trackingDevices, locationPoints, locationAccessLogs, cart, orders,
      certifications, memberships, ownedOrganizations, agentRuns, offlineMutations,
      iotSensors, contactMessages,
    ] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, name: true, phone: true, role: true, locale: true,
          country: true, timezone: true, consentMarketing: true, consentAnalytics: true,
          consentEmail: true, createdAt: true, updatedAt: true,
        },
      }),
      db.account.findMany({ where: { userId }, select: { provider: true, providerAccountId: true, type: true, scope: true, expires_at: true } }),
      db.poolProfile.findMany({ where: { userId } }),
      db.waterTest.findMany({ where: { userId }, include: { actionPlans: true } }),
      db.photoDiagnostic.findMany({ where: { userId } }),
      db.equipment.findMany({ where: { userId } }),
      db.productInventory.findMany({ where: { userId } }),
      db.reminder.findMany({ where: { userId } }),
      db.chatMessage.findMany({ where: { userId } }),
      db.maintenanceTask.findMany({ where: { userId } }),
      db.poolDesign.findMany({ where: { userId } }),
      db.guideView.findMany({ where: { userId } }),
      db.subscription.findMany({ where: { userId } }),
      db.analyticsEvent.findMany({ where: { userId } }),
      (db as any).consentRecord.findMany({ where: { userId } }),
      (db as any).recommendationExecution.findMany({ where: { userId } }),
      (db as any).recommendationOutcome.findMany({ where: { userId } }),
      (db as any).brainFeedback.findMany({ where: { userId } }),
      (db as any).proClient.findMany({ where: { proUserId: userId }, include: { pools: true, interventions: true } }),
      (db as any).proTrackingSession.findMany({ where: { userId } }),
      (db as any).proTrackingDevice.findMany({
        where: { assignedUserId: userId },
        select: { id: true, organizationId: true, assignedUserId: true, provider: true, externalDeviceId: true, label: true, vehicle: true, status: true, lastSeenAt: true, createdAt: true, updatedAt: true },
      }),
      (db as any).proLocationPoint.findMany({ where: { userId }, orderBy: { recordedAt: 'asc' } }),
      (db as any).proLocationAccessLog.findMany({ where: { actorUserId: userId }, orderBy: { createdAt: 'asc' } }),
      (db as any).cart.findMany({ where: { userId } }),
      (db as any).order.findMany({ where: { userId } }),
      (db as any).certification.findMany({ where: { userId } }),
      (db as any).organizationMember.findMany({ where: { userId }, include: { organization: true } }),
      (db as any).organization.findMany({ where: { ownerId: userId } }),
      (db as any).agentRun.findMany({ where: { userId } }),
      (db as any).offlineMutation.findMany({ where: { userId }, select: { id: true, idempotencyKey: true, method: true, path: true, state: true, statusCode: true, createdAt: true, updatedAt: true, expiresAt: true } }),
      db.iotSensor.findMany({ where: { userId }, select: { id: true, poolId: true, provider: true, label: true, deviceId: true, apiUrl: true, config: true, status: true, lastSyncAt: true, createdAt: true, updatedAt: true } }),
      db.contactMessage.findMany({ where: { userId }, select: { id: true, name: true, email: true, subject: true, message: true, status: true, createdAt: true } }),
    ])

    const exportData = {
      schemaVersion: '2026-07-26',
      exportedAt: new Date().toISOString(),
      profile: user,
      linkedAccounts: accounts,
      poolData: { pools, waterTests, diagnostics, equipment, inventory, reminders, maintenanceTasks, poolDesigns, guideViews },
      conversations: chatMessages,
      billing: { subscriptions, orders },
      privacy: { analyticsEvents, consentRecords },
      recommendations: { recommendationExecutions, recommendationOutcomes, brainFeedback },
      professional: { clients: proClients, trackingSessions, trackingDevices, locationPoints, locationAccessLogs, memberships, ownedOrganizations },
      support: { contactMessages },
      commerce: { cart },
      academy: { certifications },
      automation: { agentRuns, offlineMutations },
      connectedDevices: iotSensors,
      excludedSecrets: ['passwordHash', 'OAuth access/refresh/id tokens', 'IoT apiKey', 'billing webhook payloads'],
    }
    const filename = `aqwelia-data-${new Date().toISOString().split('T')[0]}.json`
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('[account/export] error:', error)
    return NextResponse.json({ error: await translate(locale, 'common.errors.exportError', 'Erreur lors de l’export des données') }, { status: 500 })
  }
}
