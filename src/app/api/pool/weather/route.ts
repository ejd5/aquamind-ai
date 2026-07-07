import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { assessWeather, wttrCodeToFr, isStormCode, type WeatherData } from '@/lib/pool/weather-engine'

export const runtime = 'nodejs'

// Régions "climatiques" génériques qui ne sont PAS des villes réelles.
// wttr.in les interprète comme des noms de lieu et renvoie des résultats absurdes
// (ex : "south_east" → PASSA). On les ignore systématiquement.
const INVALID_REGIONS = new Set([
  'north', 'west', 'east', 'south_east', 'south_west', 'center',
  'centre', 'overseas', 'other', 'paca', 'hauts-de-france',
  'bretagne', 'grand-est', 'nouvelle-aquitaine', '',
])

// Villes françaises principales acceptées sans ambiguïté comme fallback region.
const VALID_CITY_REGIONS = new Set([
  'paris', 'marseille', 'lyon', 'toulouse', 'nice', 'bordeaux',
  'lille', 'nantes', 'strasbourg', 'montpellier', 'rennes', 'toulon',
  'brest', 'dijon', 'clermont-ferrand', 'aix-en-provence', 'aix en provence',
  'biarritz', 'cannes', 'antibes', 'perpignan', 'la rochelle', 'le havre',
  'rouen', 'tours', 'amiens', 'metz', 'besancon', 'limoges', 'caen',
  'annecy', 'grenoble', 'avignon', 'la rochelle', 'saint-etienne',
])

function isValidRegion(region: string): boolean {
  const r = region.trim().toLowerCase()
  if (!r || INVALID_REGIONS.has(r)) return false
  // Coordonnées "lat,lon" stockées dans region
  if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(r)) return true
  // Ville connue
  if (VALID_CITY_REGIONS.has(r)) return true
  // Sinon on refuse : on laisse wttr.in faire la géoloc IP plutôt que
  // d'envoyer un slug générique qui sera mal interprété.
  return false
}

// Fetch météo réelle depuis wttr.in (gratuit, sans clé API)
// - query vide  → géolocalisation par IP (dernier recours)
// - "lat,lon"   → coordonnées GPS (pas d'encoding du séparateur)
// - texte       → nom de ville encodé
async function fetchWeather(query: string): Promise<WeatherData | null> {
  try {
    let url: string
    if (!query) {
      url = 'https://wttr.in/?format=j1' // IP-based geolocation
    } else if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(query)) {
      // Coordonnées GPS : ne pas encoder la virgule
      url = `https://wttr.in/${query}?format=j1`
    } else {
      url = `https://wttr.in/${encodeURIComponent(query)}?format=j1`
    }
    const res = await fetch(url, { headers: { 'Accept-Language': 'fr' }, signal: AbortSignal.timeout(8000) })
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
        chanceRain: Math.max(parseInt(d.hourly?.[4]?.chanceofrain || '0', 10), parseInt(d.hourly?.[6]?.chanceofrain || '0', 10)),
        desc: wttrCodeToFr(code),
        code,
      }
    })

    const tomorrowChanceStorm = Math.max(
      ...(tomorrow?.hourly || []).map((h: any) => parseInt(h.chanceofthunder || '0', 10))
    )
    const tomorrowChanceRain = Math.max(
      ...(tomorrow?.hourly || []).map((h: any) => parseInt(h.chanceofrain || '0', 10))
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
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const explicitLoc = searchParams.get('location')

  let query = ''
  if (lat && lon) {
    // Coordonnées GPS — priorité maximale (géolocalisation navigateur / Capacitor)
    query = `${lat},${lon}`
  } else if (explicitLoc) {
    // Ville saisie manuellement
    query = explicitLoc
  } else {
    // Fallback : région du profil, mais seulement si c'est une vraie ville.
    // On évite les slugs génériques ("south_east" → PASSA).
    const profile = await db.poolProfile.findFirst({ where: { userId } })
    if (profile?.region && isValidRegion(profile.region)) {
      query = profile.region.trim()
    }
    // Sinon : query reste vide → wttr.in fait la géoloc par IP
  }

  const weather = await fetchWeather(query)
  if (!weather) {
    return NextResponse.json(
      { error: 'Météo indisponible', location: query || 'auto' },
      { status: 502 },
    )
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
