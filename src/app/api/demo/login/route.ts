/**
 * AQWELIA — Demo account endpoint (App Store / Play Store review).
 *
 * POST /api/demo/login
 *
 * Idempotently provisions a temporary shared review account only when
 * DEMO_ACCOUNT_ENABLED=true. Credentials are supplied through server-side
 * environment variables and never committed to the application bundle.
 *
 * If the account does not yet exist, creates it with a sample pool profile
 * (Sud-Est PACA, 40 m³ liner, sand filter, chlorine treatment) so the
 * reviewer can immediately explore the dashboard, water-test, photo
 * diagnostic, reminders and chat features without going through onboarding.
 *
 * Returns the credentials as JSON. The CLIENT then calls
 * `signIn('credentials', { email, password })` from next-auth/react — this
 * route does NOT establish a session itself (server-side `signIn` is not
 * available in app-router route handlers).
 *
 * Public route: no session required (the whole point is to hand out demo
 * credentials to a reviewer who has not yet signed in).
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const locale = pickLocale(req)
  if (process.env.DEMO_ACCOUNT_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const demoEmail = process.env.DEMO_ACCOUNT_EMAIL?.toLowerCase().trim() || ''
  const demoPassword = process.env.DEMO_ACCOUNT_PASSWORD || ''
  if (!demoEmail || demoPassword.length < 16) {
    console.error('[demo/login] enabled without secure credentials')
    return NextResponse.json({ error: 'Demo account not configured' }, { status: 503 })
  }

  try {
    // Resolve the user's UI locale so the demo account name + pool name are
    // stored in the reviewer's language at creation time. The middleware
    // (src/middleware.ts) rewrites `accept-language` to a 2-letter code.
    const demoName = await translate(
      locale,
      'common.demoAccountName',
      'Compte Démonstration'
    )
    const demoPoolName = await translate(
      locale,
      'common.demoPoolName',
      'Piscine démo'
    )
    const demoRegion = await translate(
      locale,
      'common.errors.regionSudEst',
      'Sud-Est / PACA'
    )

    // Find or create the demo user.
    let user = await db.user.findUnique({ where: { email: demoEmail } })

    if (!user) {
      user = await db.user.create({
        data: {
          email: demoEmail,
          passwordHash: hashPassword(demoPassword),
          name: demoName,
        },
      })

      // Seed a representative pool profile so the reviewer sees a populated
      // dashboard immediately (no onboarding required).
      await db.poolProfile.create({
        data: {
          userId: user.id,
          name: demoPoolName,
          volume: 40,
          unit: 'm3',
          shape: 'rectangular',
          surfaceType: 'liner',
          treatmentType: 'chlorine',
          filterType: 'sand',
          sunExposure: 'high',
          usageLevel: 'medium',
          covered: false,
          region: demoRegion,
        },
      })

      // Mark the demo user as Découverte plan so the paywall is reachable.
      await db.subscription.create({
        data: {
          userId: user.id,
          plan: 'decouverte',
          active: true,
        },
      })
    }

    const demoLoginMessage = await translate(
      locale,
      'common.errors.demoLoginMessage',
      'Utilisez ces identifiants pour vous connecter'
    )
    return NextResponse.json({
      email: demoEmail,
      password: demoPassword,
      message: demoLoginMessage,
    })
  } catch (err) {
    console.error('[demo/login] error:', err)
    const msg = await translate(
      locale,
      'common.errors.demoCreateError',
      'Erreur lors de la création du compte démo'
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
