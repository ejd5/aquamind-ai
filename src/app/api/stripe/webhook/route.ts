import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getStripe } from '@/lib/stripe'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Stripe webhook handler — syncs subscription state to the Prisma DB.
//
// IMPORTANT: Stripe requires the RAW request body for signature verification.
// We use `req.text()` (not `req.json()`) and pass it directly to
// `stripe.webhooks.constructEvent`. Next.js does not buffer the body when
// `.text()` is called, so the signature check is performed against the exact
// bytes Stripe sent.
//
// Auth: NONE. This route is server-to-server (Stripe → our backend). The
// `STRIPE_WEBHOOK_SECRET` env var replaces session-based auth.
export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const cs = event.data.object
        const userId = cs.metadata?.userId || cs.client_reference_id
        const productId = cs.metadata?.productId
        const plan = cs.metadata?.plan as 'oasis' | 'wellness'

        if (userId && plan) {
          // Deactivate previous subscriptions for this user
          await db.subscription.updateMany({
            where: { userId, active: true },
            data: { active: false },
          })
          // Create the new active subscription
          await db.subscription.create({
            data: {
              userId,
              plan,
              duration: productId?.includes('yearly')
                ? 'year'
                : productId?.includes('seasonal')
                ? 'halfyear'
                : productId?.includes('weekly')
                ? 'week'
                : 'month',
              startedAt: new Date(),
              expiresAt: null, // Will be updated by subsequent invoice/subscription events
              active: true,
            },
          })

          // Best-effort: send the subscription-confirmation email.
          // Fire-and-forget so a slow SMTP server never blocks the webhook
          // (Stripe would retry on 500, which would re-create the subscription
          // record — so we MUST return 200 even if the email fails).
          void (async () => {
            try {
              const { sendSubscriptionConfirmationEmail } = await import('@/lib/email')
              const user = await (db as any).user.findUnique({
                where: { id: userId },
                select: { email: true, name: true },
              })
              if (user?.email) {
                const duration = productId?.includes('yearly')
                  ? 'year'
                  : productId?.includes('seasonal')
                  ? 'halfyear'
                  : productId?.includes('weekly')
                  ? 'week'
                  : 'month'
                await sendSubscriptionConfirmationEmail(user.email, {
                  userName: user.name || undefined,
                  plan,
                  duration,
                })
              }
            } catch (err) {
              console.error('[stripe.webhook] subscription confirmation email failed:', err)
            }
          })()
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const userId = sub.metadata?.userId

        if (userId) {
          if (event.type === 'customer.subscription.deleted') {
            await db.subscription.updateMany({
              where: { userId, active: true },
              data: { active: false },
            })
          } else {
            // Refresh expiry date from the Stripe subscription object
            await db.subscription.updateMany({
              where: { userId, active: true },
              data: {
                expiresAt: sub.current_period_end
                  ? new Date(sub.current_period_end * 1000)
                  : null,
              },
            })
          }
        }
        break
      }

      case 'invoice.paid': {
        // Subscription renewed — refresh the expiry date from the invoice line period.
        const invoice = event.data.object
        const userId = invoice.metadata?.userId
        if (userId) {
          await db.subscription.updateMany({
            where: { userId, active: true },
            data: {
              expiresAt: invoice.lines?.data?.[0]?.period?.end
                ? new Date(invoice.lines.data[0].period.end * 1000)
                : null,
            },
          })
        }
        break
      }

      case 'customer.subscription.trial_will_end': {
        // Stripe fires this event 3 days before the trial ends (default).
        // Use it to:
        //   1. Refresh the subscription's expiry date from the trial_end timestamp.
        //   2. Trigger a "trial ending soon" notification email to the user
        //      (best-effort — if email is not configured, the event is silently
        //      ignored so the webhook still returns 200).
        const sub = event.data.object
        const userId = sub.metadata?.userId
        if (userId) {
          try {
            // Refresh expiry (defensive — the subscription may already be set,
            // but the trial_end → period_end transition is the right moment to
            // re-sync).
            await db.subscription.updateMany({
              where: { userId, active: true },
              data: {
                expiresAt: sub.current_period_end
                  ? new Date(sub.current_period_end * 1000)
                  : null,
              },
            })
          } catch (err) {
            // Don't fail the webhook over a DB write error — log + continue.
            console.error('[stripe.webhook] trial_will_end DB update failed:', err)
          }

          // Best-effort trial-ending notification email.
          // Imported lazily so the webhook does not pay the email-module import
          // cost when SMTP is not configured (dev / CI).
          try {
            const { sendTrialEndingEmail } = await import('@/lib/email')
            // Fetch the user's email from the DB.
            const user = await (db as any).user.findUnique({
              where: { id: userId },
              select: { email: true, name: true },
            })
            if (user?.email) {
              const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null
              await sendTrialEndingEmail(user.email, {
                userName: user.name || undefined,
                plan: (sub.metadata?.plan as 'oasis' | 'wellness') || 'oasis',
                trialEnd,
              })
            }
          } catch (err) {
            // Email failures must NOT fail the webhook — Stripe would retry
            // the event indefinitely and re-send the email on every retry.
            console.error('[stripe.webhook] trial_will_end email send failed:', err)
          }
        }
        break
      }

      default:
        // Ignore other event types — only the 5 above are subscription-relevant.
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Stripe webhook processing error:', err)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
