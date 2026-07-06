import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { assessWeather, wttrCodeToFr, isStormCode, type WeatherData } from '@/lib/pool/weather-engine'

export const runtime = 'nodejs'

// Fetch météo réelle depuis wttr.in (gratuit, sans clé API)
async function fetchWeather(location: string): Promise<WeatherData | null> {
  try {
    const q = encodeURIComponent(location || 'Paris')
    const url = `https://wttr.in/${q}?format=j1`
    const res = await fetch(url, { headers: { 'Accept-Language': 'fr' }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = await res.json()
    const cur = data.current_condition?.[0]
    const tomorrow = data.weather?.[1]
    const today = data.weather?.[0]
    if (!cur) return null

    const next3days = (data.weather || []).slice(0, 3).map((d: any) => ({
      date: d.date,
      maxC: parseInt(d.maxtempC, 10),
      chanceRain: Math.max(parseInt(d.hourly?.[4]?.chanceofrain || '0', 10), parseInt(d.hourly?.[6]?.chanceofrain || '0', 10)),
      desc: wttrCodeToFr(parseInt(d.hourly?.[4]?.weatherCode || '113', 10)),
    }))

    const tomorrowChanceStorm = Math.max(
      ...(tomorrow?.hourly || []).map((h: any) => parseInt(h.chanceofthunder || '0', 10))
    )
    const tomorrowChanceRain = Math.max(
      ...(tomorrow?.hourly || []).map((h: any) => parseInt(h.chanceofrain || '0', 10))
    )

    return {
      location: data.nearest_area?.[0]?.areaName?.[0]?.value || location,
      currentTempC: parseInt(cur.temp_C, 10),
      feelsLikeC: parseInt(cur.FeelsLikeC, 10),
      humidity: parseInt(cur.humidity, 10),
      uvIndex: parseInt(cur.uvIndex, 10),
      windKmph: parseInt(cur.windspeedKmph, 10),
      precipMm: parseFloat(cur.precipMM),
      weatherCode: parseInt(cur.weatherCode, 10),
      weatherDesc: wttrCodeToFr(parseInt(cur.weatherCode, 10)),
      tomorrowMaxC: parseInt(tomorrow?.maxtempC || today?.maxtempC || '25', 10),
      tomorrowMinC: parseInt(tomorrow?.mintempC || today?.mintempC || '15', 10),
      tomorrowChanceRain,
      tomorrowChanceStorm: Math.max(tomorrowChanceStorm, isStormCode(parseInt(cur.weatherCode, 10)) ? 80 : 0),
      next3days,
    }
  } catch (e) {
    console.error('Weather fetch error:', e)
    return null
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const userId = session.user.id

  const { searchParams } = new URL(req.url)
  const explicitLoc = searchParams.get('location')

  // Si location non fournie, utiliser la région du profil
  let location = explicitLoc || 'Paris'
  const profile = await db.poolProfile.findFirst({ where: { userId } })
  if (!explicitLoc && profile?.region) {
    location = profile.region
  }

  const weather = await fetchWeather(location)
  if (!weather) {
    return NextResponse.json({ error: 'Météo indisponible', location }, { status: 502 })
  }

  // Calculer le nombre de jours depuis le dernier test
  const lastTest = await db.waterTest.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } })
  let lastTestDaysAgo = 999
  if (lastTest) {
    lastTestDaysAgo = Math.floor((Date.now() - lastTest.createdAt.getTime()) / 86400000)
  } else {
    lastTestDaysAgo = 9999
  }

  const assessment = assessWeather(weather, lastTestDaysAgo)
  return NextResponse.json({ weather, assessment, lastTestDaysAgo })
}
