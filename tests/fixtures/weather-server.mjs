/**
 * AQWELIA — Fixture météo déterministe pour les smoke tests.
 *
 * Petit serveur HTTP local (Node pur, zéro dépendance) qui imite la forme
 * JSON renvoyée par https://wttr.in?format=j1, afin que les tests smoke ne
 * dépendent d'aucun réseau externe. Ne fait AUCUN appel Internet et ne lit
 * aucun secret.
 *
 - Écoute uniquement sur 127.0.0.1.
 - Port fourni via `WEATHER_MOCK_PORT` (optionnel) ou arg `$1`; défaut 3100.
 - Répond à n'importe quelle route météo utiles (query vide, coords, ville) avec le même JSON stable.
 - Répète 404 contrôlée pour les routes inattendues.
 - Arrêt propre sur SIGTERM / SIGINT.
 - Journalise sobrement le port de démarrage (format `PORT <n>`).
 *
 * Intégration : tests/run-smoke-tests.sh démarre ce serveur AVANT l'app
 * AQWELIA et exporte `WTTR_IN_BASE_URL=http://127.0.0.1:<port>`.
 */

import http from 'node:http'

const requestedPort = Number(process.env.WEATHER_MOCK_PORT ?? process.argv[2] ?? 3100)

// Le consumer a besoin au minimum des index hourly [4] et [6] (cf. route
// weather/route.ts) → on fournit 8 entrées horaires par jour pour rester large.
function makeHourly(chanceOfRain) {
  const hours = []
  for (let i = 0; i < 8; i++) {
    hours.push({
      time: `${String(i).padStart(2, '0')}00`,
      weatherCode: '113',
      chanceofrain: String(chanceOfRain),
      chanceofthunder: '0',
      tempC: '24',
    })
  }
  return hours
}

// Un seul document « météo » réaliste et fixe : 3 jours d'aujourd'hui à J+2.
// Valeurs déterministes (aucune date dynamique : c'est la forme qui compte).
const WEATHER_DOC = JSON.stringify({
  current_condition: [{
    temp_C: '25',
    FeelsLikeC: '26',
    humidity: '55',
    uvIndex: '5',
    windspeedKmph: '10',
    precipMM: '0.0',
    weatherCode: '113',
    weatherDesc: [{ value: 'Sunny' }],
  }],
  weather: [
    { date: '2026-07-16', maxtempC: '28', mintempC: '18', hourly: makeHourly(10) },
    { date: '2026-07-17', maxtempC: '29', mintempC: '19', hourly: makeHourly(35) },
    { date: '2026-07-18', maxtempC: '27', mintempC: '17', hourly: makeHourly(5) },
  ],
  nearest_area: [{ areaName: [{ value: 'AQWELIA Test City' }] }],
})

const server = http.createServer((req, res) => {
  // Toutes les routes météo (query vide, coords type `lat,lon`, ville encodée)
  // renvoient le même document stable. Les routes inattendues → 404 contrôlée.
  const url = req.url || '/'
  if (url === '/' || /format=j1/.test(url) || /^[/?].*$/.test(url)) {
    if (req.method && req.method !== 'GET') {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'method_not_allowed' }))
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(WEATHER_DOC)
    return
  }
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'not_found' }))
})

function shutdown() {
  server.close(() => process.exit(0))
  // Force-exit if something keeps the socket alive.
  setTimeout(() => process.exit(0), 1000).unref()
}

server.on('error', (err) => {
  console.error('weather fixture error:', err.message)
  process.exit(1)
})

server.listen(requestedPort, '127.0.0.1', () => {
  const addr = server.address()
  const port = typeof addr === 'object' && addr ? addr.port : requestedPort
  // Format sobre et stable; le script de test lit ce port.
  console.log(`PORT ${port}`)
})

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
