/**
 * AQWELIA — Demo account endpoint (App Store / Play Store review).
 *
 * POST /api/demo/login
 *
 * Idempotently provisions a shared demo account:
 *   email:    demo@aqwelia.app
 *   password: aqwelia-demo-2026
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

export const runtime = 'nodejs'

const DEMO_EMAIL = 'demo@aqwelia.app'
const DEMO_PASSWORD = 'aqwelia-demo-2026'
const DEMO_NAME = 'Compte Démonstration'

export async function POST() {
  try {
    // Find or create the demo user.
    let user = await db.user.findUnique({ where: { email: DEMO_EMAIL } })

    if (!user) {
      user = await db.user.create({
        data: {
          email: DEMO_EMAIL,
          passwordHash: hashPassword(DEMO_PASSWORD),
          name: DEMO_NAME,
        },
      })

      // Seed a representative pool profile so the reviewer sees a populated
      // dashboard immediately (no onboarding required).
      await db.poolProfile.create({
        data: {
          userId: user.id,
          name: 'Piscine démo',
          volume: 40,
          unit: 'm3',
          shape: 'rectangular',
          surfaceType: 'liner',
          treatmentType: 'chlorine',
          filterType: 'sand',
          sunExposure: 'high',
          usageLevel: 'medium',
          covered: false,
          region: 'Sud-Est / PACA',
        },
      })

      // Mark the demo user as Free plan so the paywall is reachable.
      await db.subscription.create({
        data: {
          userId: user.id,
          plan: 'free',
          active: true,
        },
      })
    }

    return NextResponse.json({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      message: 'Utilisez ces identifiants pour vous connecter',
    })
  } catch (err) {
    console.error('[demo/login] error:', err)
    return NextResponse.json(
      { error: 'Erreur lors de la création du compte démo' },
      { status: 500 }
    )
  }
}
