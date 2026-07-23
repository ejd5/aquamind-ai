import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { getWinterStatus, refineSpringBudget } from '@/lib/pool/winter-guardian'
import type { WeatherData } from '@/lib/pool/weather-engine'

export const runtime = 'nodejs'

// ── Inline weather fetch (same as predictions/route.ts) ───────────────────
// Kept inline to avoid a refactor of the weather route — keeps this task
// self-contained. If weather fetch fails, we still return a WinterStatus with
// weather=null (degrades gracefully — frost alerts just won't fire).

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

    return {
      location: data.nearest_area?.[0]?.areaName?.[0]?.value || (query || ''),
      currentTempC: parseInt(cur.temp_C, 10),
      feelsLikeC: parseInt(cur.FeelsLikeC, 10),
      humidity: parseInt(cur.humidity, 10),
      uvIndex: parseInt(cur.uvIndex, 10),
      windKmph: parseInt(cur.windspeedKmph, 10),
      precipMm: parseFloat(cur.precipMM),
      weatherCode: parseInt(cur.weatherCode, 10),
      weatherDesc: '',
      tomorrowMaxC: parseInt(tomorrow?.maxtempC || today?.maxtempC || '25', 10),
      tomorrowMinC: parseInt(tomorrow?.mintempC || today?.mintempC || '15', 10),
      tomorrowChanceRain: Math.max(
        ...(tomorrow?.hourly || []).map((h: any) => parseInt(h.chanceofrain || '0', 10)),
      ),
      tomorrowChanceStorm: 0,
      next3days: [],
    }
  } catch {
    return null
  }
}

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
  if (!r) return false
  if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(r)) return true
  if (VALID_CITY_REGIONS.has(r)) return true
  return false
}

const WINTER_GUARDIAN_NAMESPACE = 'winterGuardian.'

/**
 * The client uses useTranslations('winterGuardian'), so API translation keys
 * must be relative to that namespace. The engine deliberately exposes fully
 * qualified keys because it can be consumed outside this widget as well.
 */
function toClientTranslationKey(key: string): string {
  return key.startsWith(WINTER_GUARDIAN_NAMESPACE)
    ? key.slice(WINTER_GUARDIAN_NAMESPACE.length)
    : key
}

/**
 * GET /api/pool/winter-guardian
 * GET /api/pool/winter-guardian?poolId=xxx   (multi-pool scoping)
 *
 * Returns the Winter Guardian status for the authenticated user's pool.
 * No DB write — fully derived from profile + weather + last water test.
 */
export async function GET(req: Request) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  const url = new URL(req.url)
  const poolId = url.searchParams.get('poolId')
  const profileWhere = poolId ? { id: poolId, userId } : { userId }

  const [profile, lastTest] = await Promise.all([
    db.poolProfile.findFirst({ where: profileWhere }),
    db.waterTest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        ph: true,
        freeChlorine: true,
        bromine: true,
        temperature: true,
      },
    }),
  ])

  // Weather fetch — uses profile.region or lat/lon query params
  const lat = url.searchParams.get('lat')
  const lon = url.searchParams.get('lon')
  const explicitLoc = url.searchParams.get('location')

  let weatherQuery = ''
  if (lat && lon) {
    weatherQuery = `${lat},${lon}`
  } else if (explicitLoc) {
    weatherQuery = explicitLoc
  } else if (profile?.region && isValidRegion(profile.region)) {
    weatherQuery = profile.region.trim()
  }
  const weather = weatherQuery ? await fetchWeather(weatherQuery) : null

  const profileLite = profile
    ? {
        waterBodyType: profile.waterBodyType,
        region: profile.region,
        covered: profile.covered,
        treatmentType: profile.treatmentType,
        filterType: profile.filterType,
      }
    : null

  const lastTestLite = lastTest
    ? {
        createdAt: lastTest.createdAt,
        ph: lastTest.ph,
        freeChlorine: lastTest.freeChlorine,
        bromine: lastTest.bromine,
        temperature: lastTest.temperature,
      }
    : null

  const status = getWinterStatus(profileLite, weather, lastTestLite)

  // Refine the spring budget with the actual pool volume
  if (profile?.volume) {
    status.springBudgetEstimate = refineSpringBudget(profile.volume)
  }

  return NextResponse.json({
    ...status,
    modeLabelKey: toClientTranslationKey(status.modeLabelKey),
    modeDescKey: toClientTranslationKey(status.modeDescKey),
    alerts: status.alerts.map((alert) => ({
      ...alert,
      titleKey: toClientTranslationKey(alert.titleKey),
      descriptionKey: toClientTranslationKey(alert.descriptionKey),
    })),
    checklist: status.checklist.map((task) => ({
      ...task,
      labelKey: toClientTranslationKey(task.labelKey),
    })),
    nextActionKeys: status.nextActionKeys.map(toClientTranslationKey),
    profileName: profile?.name || null,
    weatherLocation: weather?.location || null,
  })
}
