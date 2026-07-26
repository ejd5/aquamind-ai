import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pickLocale, translate } from '@/lib/i18n-api'
import { googleMapsConfiguration, GOOGLE_COORDINATE_REFRESH_DAYS } from '@/lib/pro/google-maps'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const locale = pickLocale(req)
    const message = await translate(locale, 'common.errors.unauthorized', 'Unauthorized')
    return NextResponse.json({ error: message }, { status: 401 })
  }

  return NextResponse.json({
    maps: {
      ...googleMapsConfiguration(),
      coordinateRefreshDays: GOOGLE_COORDINATE_REFRESH_DAYS,
      browserKeyConfigured: Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()),
      serverKeyExposed: false,
      fallbackAvailable: true,
    },
  })
}
