import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  predictProblems,
  computeGlobalRiskScore,
  type WaterTest as PredictWaterTest,
} from '@/lib/pool/predict-engine'
import { wttrCodeToFr, isStormCode, type WeatherData } from '@/lib/pool/weather-engine'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

// ── Weather fetch (minimal inline copy of the weather route's helper) ──────
// We duplicate a small amount of code rather than refactoring the weather
// route, to keep this task self-contained. If weather fetch fails, we still
// return predictions (with weather=null) — predictions degrade gracefully.

async function fetchWeather(query: string): Promise<WeatherData | null> {
  try {
    let url: string
    if (!query) {
      url = 'https://wttr.in/?format=j1'
    } else if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(query)) {
      url = `https://wttr.in/${query}?format=j1`
    } else {
      url = `https://wttr.in/${encodeURIComponent(query)}?format=j1`
    }
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'fr' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const cur = data.current_condition?.[0]
    const tomorrow = data.weather?.[1]
    const today = data.weather?.[0]
    if (!cur) return null

    const next3days = (data.weather || []).slice(0, 3).map((d: any) => {
      const code = parseInt(d.hourly?.[4]?.weatherCode || '113', 10)
      return {
        date: d.date,
        maxC: parseInt(d.maxtempC, 10),
        chanceRain: Math.max(
          parseInt(d.hourly?.[4]?.chanceofrain || '0', 10),
          parseInt(d.hourly?.[6]?.chanceofrain || '0', 10),
        ),
        desc: wttrCodeToFr(code),
        code,
      }
    })

    const tomorrowChanceStorm = Math.max(
      ...(tomorrow?.hourly || []).map((h: any) => parseInt(h.chanceofthunder || '0', 10)),
    )
    const tomorrowChanceRain = Math.max(
      ...(tomorrow?.hourly || []).map((h: any) => parseInt(h.chanceofrain || '0', 10)),
    )

    return {
      location: data.nearest_area?.[0]?.areaName?.[0]?.value || (query || 'Position actuelle'),
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
      tomorrowChanceStorm: Math.max(
        tomorrowChanceStorm,
        isStormCode(parseInt(cur.weatherCode, 10)) ? 80 : 0,
      ),
      next3days,
    }
  } catch {
    return null
  }
}

const INVALID_REGIONS = new Set([
  'north', 'west', 'east', 'south_east', 'south_west', 'center',
  'centre', 'overseas', 'other', 'paca', 'hauts-de-france',
  'bretagne', 'grand-est', 'nouvelle-aquitaine', '',
])

const VALID_CITY_REGIONS = new Set([
  'paris', 'marseille', 'lyon', 'toulouse', 'nice', 'bordeaux',
  'lille', 'nantes', 'strasbourg', 'montpellier', 'rennes', 'toulon',
  'brest', 'dijon', 'clermont-ferrand', 'aix-en-provence', 'aix en provence',
  'biarritz', 'cannes', 'antibes', 'perpignan', 'la rochelle', 'le havre',
  'rouen', 'tours', 'amiens', 'metz', 'besancon', 'limoges', 'caen',
  'annecy', 'grenoble', 'avignon', 'saint-etienne',
])

function isValidRegion(region: string): boolean {
  const r = region.trim().toLowerCase()
  if (!r || INVALID_REGIONS.has(r)) return false
  if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(r)) return true
  if (VALID_CITY_REGIONS.has(r)) return true
  return false
}

export async function GET(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  try {
    // Récupère les 5 derniers tests + le profil
    const [profile, recentTests] = await Promise.all([
      db.poolProfile.findFirst({ where: { userId } }),
      db.waterTest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    // Météo : on essaie de récupérer la même query que le weather route
    const { searchParams } = new URL(req.url)
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    const explicitLoc = searchParams.get('location')

    let weatherQuery = ''
    if (lat && lon) {
      weatherQuery = `${lat},${lon}`
    } else if (explicitLoc) {
      weatherQuery = explicitLoc
    } else if (profile?.region && isValidRegion(profile.region)) {
      weatherQuery = profile.region.trim()
    }
    const weather = weatherQuery ? await fetchWeather(weatherQuery) : null

    // Map les tests Prisma vers le type attendu par predictProblems
    const tests: PredictWaterTest[] = recentTests.map((t) => ({
      ph: t.ph,
      freeChlorine: t.freeChlorine,
      combinedChlorine: t.combinedChlorine,
      alkalinity: t.alkalinity,
      calciumHardness: t.calciumHardness,
      cyanuricAcid: t.cyanuricAcid,
      salt: t.salt,
      phosphates: t.phosphates,
      temperature: t.temperature,
      createdAt: t.createdAt,
    }))

    const profileLike = profile
      ? {
          name: profile.name,
          volume: profile.volume,
          unit: profile.unit as 'm3' | 'gal',
          treatmentType: profile.treatmentType,
          filterType: profile.filterType,
          saltSystem: profile.saltSystem,
          sunExposure: profile.sunExposure,
          covered: profile.covered,
          usageLevel: profile.usageLevel,
        }
      : null

    const predictions = predictProblems(tests, weather, profileLike)
    const globalScore = computeGlobalRiskScore(predictions)

    return NextResponse.json({
      predictions,
      globalScore,
      level:
        globalScore >= 65 ? 'high' : globalScore >= 35 ? 'medium' : 'low',
      samplesAnalyzed: tests.length,
      weatherFetched: weather != null,
      generatedAt: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur' },
      { status: 500 },
    )
  }
}
