/**
 * Authenticated account deletion with explicit handling for records that do
 * not have a Prisma foreign-key relation to User.
 */
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { getComplianceCopy } from '@/i18n/locales/compliance-copy'

export const runtime = 'nodejs'

const ACTIVE_ACCESS_STATUSES = ['trialing', 'active', 'past_due', 'grace_period']

export async function POST(req: Request) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: await translate(locale, 'common.errors.unauthorized', 'Non autorisé') }, { status: 401 })
  }

  const userId = session.user.id
  const compliance = getComplianceCopy(locale)
  const now = new Date()
  try {
    const [activeSubscription, ownedOrganizations] = await Promise.all([
      db.subscription.findFirst({
        where: {
          userId,
          plan: { not: 'decouverte' },
          OR: [
            { status: { in: ACTIVE_ACCESS_STATUSES } },
            { status: 'canceled', currentPeriodEnd: { gt: now } },
          ],
        },
        select: { store: true, status: true, currentPeriodEnd: true },
      }),
      db.organization.findMany({ where: { ownerId: userId }, select: { id: true } }),
    ])

    if (activeSubscription) {
      const message = compliance.common.cancelSubscriptionBeforeDeletion
      return NextResponse.json({
        error: message,
        code: 'active_subscription_requires_cancellation',
        store: activeSubscription.store,
        currentPeriodEnd: activeSubscription.currentPeriodEnd,
      }, { status: 409 })
    }

    const organizationIds = ownedOrganizations.map((organization) => organization.id)
    if (organizationIds.length) {
      const otherActiveMembers = await db.organizationMember.count({
        where: {
          organizationId: { in: organizationIds },
          userId: { not: userId },
          status: { in: ['active', 'invited', 'suspended'] },
        },
      })
      if (otherActiveMembers > 0) {
        const message = compliance.common.transferOrganizationBeforeDeletion
        return NextResponse.json({ error: message, code: 'owned_organization_requires_transfer' }, { status: 409 })
      }
    }

    const deletedIdentity = `deleted:${randomUUID()}`
    await db.$transaction(async (tx) => {
      // Precise location, replay ledgers and operational records have no
      // retention need after the person or their sole-owned organisation exits.
      await tx.proLocationPoint.deleteMany({
        where: organizationIds.length ? { OR: [{ userId }, { organizationId: { in: organizationIds } }] } : { userId },
      })
      await tx.proTrackingSession.deleteMany({
        where: organizationIds.length ? { OR: [{ userId }, { organizationId: { in: organizationIds } }] } : { userId },
      })
      await tx.proTrackingDevice.deleteMany({
        where: organizationIds.length ? { OR: [{ assignedUserId: userId }, { organizationId: { in: organizationIds } }] } : { assignedUserId: userId },
      })
      await tx.proLocationAccessLog.deleteMany({
        where: organizationIds.length ? { OR: [{ actorUserId: userId }, { organizationId: { in: organizationIds } }] } : { actorUserId: userId },
      })
      await tx.agentRun.deleteMany({
        where: organizationIds.length ? { OR: [{ userId }, { organizationId: { in: organizationIds } }] } : { userId },
      })
      if (organizationIds.length) {
        // Lead data belongs to the closed sole-owned organisation. Deleting it
        // prevents the Organization onDelete:SetNull relation from orphaning PII.
        await tx.lead.deleteMany({ where: { organizationId: { in: organizationIds } } })
      }

      await tx.offlineMutation.deleteMany({ where: { userId } })
      await tx.cart.deleteMany({ where: { userId } })
      await tx.certification.deleteMany({ where: { userId } })
      await tx.contactMessage.deleteMany({ where: { userId } })

      // Remove identifiers from audit or collaborative records that may remain
      // because they belong to another organisation or a legal retention set.
      await tx.proClientActivity.updateMany({ where: { actorUserId: userId }, data: { actorUserId: null } })
      await tx.lead.updateMany({ where: { assignedTo: userId }, data: { assignedTo: null } })
      await tx.appointment.updateMany({ where: { assignedTo: userId }, data: { assignedTo: null } })
      await tx.leadEvent.updateMany({ where: { actor: userId }, data: { actor: null } })
      await tx.agentAction.updateMany({ where: { approvedBy: userId }, data: { approvedBy: null } })
      await tx.knowledgeRevision.updateMany({ where: { createdBy: userId }, data: { createdBy: null } })
      await tx.knowledgeRevision.updateMany({ where: { reviewedBy: userId }, data: { reviewedBy: null } })

      // Financial and compliance evidence may need limited retention. It is
      // detached from the live account and stripped of operational PII.
      await tx.order.updateMany({
        where: { userId },
        data: { userId: deletedIdentity, address: null, city: null, zipCode: null, tracking: null },
      })
      await tx.billingEvent.updateMany({
        where: { userId },
        data: { userId: null, payload: null },
      })
      await tx.consentRecord.updateMany({
        where: { userId },
        data: { userId: null, proof: null },
      })

      // Declared User relations use onDelete: Cascade, including personal pool,
      // diagnostics, IoT, subscriptions and the sole-owned organisation itself.
      await tx.user.delete({ where: { id: userId } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[account/delete] error:', error)
    return NextResponse.json({
      error: await translate(locale, 'common.errors.accountDeleteError', 'Erreur lors de la suppression du compte'),
    }, { status: 500 })
  }
}
