/**
 * AQWELIA — Public-safe runtime projection for admin-authored banners/popups.
 *
 * Anonymous access is intentional: landing content may be public. Identity
 * attributes used for targeting are NEVER accepted from query params. The
 * only client-selected value is the display zone, an allowlisted presentation
 * surface (not an entitlement or authorization input).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale } from '@/lib/i18n-api'
import { getBillingAccessEnvironment } from '@/lib/billing/identity'
import { loadUserEntitlements } from '@/lib/billing/entitlement-projection'
import {
  loadRuntimeContent,
  RUNTIME_ZONES,
  type RuntimeContext,
  type RuntimeZone,
} from '@/lib/admin-runtime/content'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NEW_USER_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

function parseZone(req: NextRequest): RuntimeZone | null {
  const value = req.nextUrl.searchParams.get('zone') || 'LANDING'
  return (RUNTIME_ZONES as readonly string[]).includes(value)
    ? (value as RuntimeZone)
    : null
}

export async function GET(req: NextRequest) {
  const zone = parseZone(req)
  if (!zone) {
    return NextResponse.json({ error: 'invalid_zone' }, { status: 400 })
  }

  try {
    const now = new Date()
    const locale = pickLocale(req)
    const session = await getServerSession(authOptions)

    let country = 'ZZ'
    let plan: string | null = null
    let isNewUser = false

    if (session?.user?.id) {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          country: true,
          countryVerifiedAt: true,
          createdAt: true,
        },
      })

      if (user) {
        // Country targeting fails closed until a server-trusted source has
        // verified the country. A browser cannot supply ?country= to bypass it.
        if (user.countryVerifiedAt) country = user.country.toUpperCase()
        isNewUser = now.getTime() - user.createdAt.getTime() <= NEW_USER_WINDOW_MS

        // Reuse the exact canonical billing projection used by feature gates.
        // No ?plan= client input is read here.
        const projection = await loadUserEntitlements(
          user.id,
          getBillingAccessEnvironment()
        )
        plan = projection.displayPlan
      }
    }

    const context: RuntimeContext = {
      locale,
      country,
      plan,
      // PR109 web runtime deliberately fails closed for native-only targeting.
      // Generic content (no platform filter) still renders in WebViews.
      platform: 'WEB',
      zone,
      isNewUser,
    }

    const content = await loadRuntimeContent(context, now)
    return NextResponse.json(content, {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        Vary: 'Cookie, Accept-Language',
      },
    })
  } catch (error) {
    // Marketing runtime must never take the product down. Fail closed: render
    // no admin content and keep the underlying AQWELIA screen usable.
    console.error('[admin-runtime] content resolution failed', error)
    return NextResponse.json(
      { banner: null, popups: [] },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
          Vary: 'Cookie, Accept-Language',
        },
      }
    )
  }
}
