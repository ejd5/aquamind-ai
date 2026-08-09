import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkEligibility } from '@/lib/launch-offers/service'
import { seedCampaign } from '@/lib/launch-offers/admin'
import { launchOffersEnabled } from '@/lib/launch-offers/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/promotions/launch/eligibility?offerCode=...&planId=...&platform=...
 * Authentifié. Le backend est la seule autorité d'éligibilité et de prix.
 */
export async function GET(req: NextRequest) {
  if (!launchOffersEnabled()) {
    return NextResponse.json({ campaign: null, offers: [] }, { status: 200 })
  }
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await seedCampaign()

  const offerCode = req.nextUrl.searchParams.get('offerCode') || ''
  const planId = req.nextUrl.searchParams.get('planId') || ''
  const platform = req.nextUrl.searchParams.get('platform') || 'WEB'

  const result = await checkEligibility({ userId: session.user.id, offerCode, planId, platform })
  return NextResponse.json(
    {
      campaign: result.campaign,
      offers: result.offer ? [result.offer] : [],
      eligible: result.eligible,
      reasonCode: result.reasonCode,
    },
    { status: 200 },
  )
}
