import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { googleMapsConfiguration, GOOGLE_COORDINATE_REFRESH_DAYS } from '@/lib/pro/google-maps'

export const runtime = 'nodejs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
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
