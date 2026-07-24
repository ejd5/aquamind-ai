import type { GeoPoint } from '@/lib/pro/live-dispatch'

type GeocodingPayload = {
  status?: string
  results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>
}

export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY
  if (!apiKey || !address.trim()) return null
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', address)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('region', 'fr')
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) return null
  const payload = await response.json().catch(() => null) as GeocodingPayload | null
  const location = payload?.results?.[0]?.geometry?.location
  if (payload?.status !== 'OK' || typeof location?.lat !== 'number' || typeof location.lng !== 'number') return null
  return { latitude: location.lat, longitude: location.lng }
}
