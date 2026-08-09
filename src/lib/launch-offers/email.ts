/**
 * AQWELIA Launch offers — email de confirmation (spec v1.0 §12).
 *
 * Envoyé après activation confirmée de l'offre (webhook Stripe vérifié). Aucune
 * information sensible de paiement : montant payé, renouvellement, forfait,
 * période. Fire-and-forget (jamais bloquant pour le webhook).
 */
import { db } from '@/lib/db'
import { computeLaunchPricing } from './pricing'
import type { PlanId } from '@/lib/billing/plans'
import type { SendEmailOptions } from '@/lib/email'

const PLAN_LABEL: Record<string, string> = {
  oasis: 'Pool',
  wellness: 'Complete',
  spa365: 'Spa',
}

function formatMinor(minor: number): string {
  return `${(minor / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`
}

export function renderLaunchOfferConfirmationEmail(data: {
  userName?: string
  planId: string
  offerCode: string
  paidMinor: number
  renewalMinor: number
  renewalPeriod: string
}): { subject: string; html: string } {
  const firstName = data.userName ? data.userName.split(' ')[0] : ''
  const planLabel = PLAN_LABEL[data.planId] || data.planId
  const period = data.renewalPeriod === 'P1M' ? 'month' : 'quarter'
  const offerTitle = data.offerCode === 'LAUNCH50_MONTHLY'
    ? '-50% for the first period'
    : '3 months for the price of 2'

  const subject = `Your ${planLabel} launch offer is active`

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a2b3c;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 4px 16px rgba(0,59,74,0.08);">
      <h1 style="margin:0 0 16px;font-size:22px;color:#003B4A;">Your launch offer is active</h1>
      <p style="margin:0 0 8px;">Hello${firstName ? ` ${escapeHtml(firstName)}` : ''}, your <strong>${escapeHtml(offerTitle)}</strong> offer on the <strong>${escapeHtml(planLabel)}</strong> plan is now active.</p>
      <div style="margin:16px 0;padding:16px;background:#f0f9f4;border-radius:8px;">
        <p style="margin:0 0 6px;"><strong>Paid now:</strong> ${formatMinor(data.paidMinor)}</p>
        <p style="margin:0 0 6px;"><strong>Then:</strong> ${formatMinor(data.renewalMinor)} / ${period}</p>
        <p style="margin:0;">Secure payment by Stripe.</p>
      </div>
      <p style="margin:0 0 16px;">You can manage your subscription from your AQWELIA account.</p>
      <a href="https://aqwelia.app" style="display:inline-block;background:#b08d3e;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Get started</a>
      <p style="margin:16px 0 0;color:#6b7280;font-size:12px;">A question? Reply to this email or write to contact@aqwelia.app.</p>
    </div>
  </div>
</body>
</html>`

  return { subject, html }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/**
 * Envoie l'email de confirmation après activation. Fire-and-forget : jamais
 * bloquant pour le webhook ; no-op si SMTP non configuré.
 */
export async function sendLaunchOfferConfirmationEmail(to: string, data: {
  userName?: string
  planId: string
  offerCode: string
  paidMinor: number
  renewalMinor: number
  renewalPeriod: string
}): Promise<void> {
  const { subject, html } = renderLaunchOfferConfirmationEmail(data)
  const { sendEmail } = await import('@/lib/email')
  const opts: SendEmailOptions = { to, subject, html }
  await sendEmail(opts)
}

/**
 * Récupère l'utilisateur d'une session de campagne et envoie l'email de
 * confirmation (fire-and-forget). No-op si la session n'est pas de campagne.
 */
export async function sendLaunchOfferConfirmationEmailForSession(checkoutSession: any): Promise<void> {
  try {
    const meta = checkoutSession?.metadata || {}
    const userId = checkoutSession?.client_reference_id || meta.userId
    const offerCode = meta.offerCode
    const planId = meta.planId
    if (!userId || !offerCode || !planId) return

    const pricing = computeLaunchPricing(offerCode, planId as PlanId)
    if (!pricing) return

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    })
    if (!user?.email) return

    await sendLaunchOfferConfirmationEmail(user.email, {
      userName: user.name || undefined,
      planId,
      offerCode,
      paidMinor: pricing.dueNowMinor,
      renewalMinor: pricing.renewalMinor,
      renewalPeriod: pricing.renewalPeriod,
    })
  } catch (err) {
    console.error('[launch.email] confirmation email failed:', err)
  }
}
