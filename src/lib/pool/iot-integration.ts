/**
 * AQWELIA Home™ — IoT integration layer.
 *
 * This module defines the TypeScript interfaces + provider adapters for
 * connected water-quality sensors. The actual API calls are stubbed for v1:
 * `connectSensor` validates the config and returns true, `fetchSensorData`
 * returns a stubbed reading. Real implementations will be added per-provider
 * once we obtain API credentials / partnership with Ondilo + iopool.
 *
 * Supported providers:
 *   - ico        → Ondilo ICO (REST API, OAuth2 + API key)
 *   - iopool     → iopool EcO (REST API, API key)
 *   - esphome    → ESPHome / Home Assistant (REST or MQTT, custom URL)
 *
 * Auth: handled by the API route (/api/pool/iot) — this module is purely
 * the adapter layer.
 */

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────

export type IotProvider = 'ico' | 'iopool' | 'esphome'

export type IotSensorStatus = 'connected' | 'disconnected' | 'error'

export interface IotSensorConfig {
  provider: IotProvider
  /** User-facing label for the sensor. */
  label: string
  /** External id (ICO serial, iopool EcO id, HA entity id). */
  deviceId?: string | null
  /** Base URL for REST providers (esphome / HA / custom). */
  apiUrl?: string | null
  /** Secret API token. Stored server-side only (Prisma IotSensor.apiKey). */
  apiKey?: string | null
  /** Provider-specific options (refresh interval, MQTT topic, etc.). */
  options?: Record<string, string | number | boolean> | null
}

export interface WaterTestInput {
  ph?: number
  freeChlorine?: number
  totalChlorine?: number
  alkalinity?: number
  calciumHardness?: number
  cyanuricAcid?: number
  salt?: number
  temperature?: number
  /** Source indicator — always 'device' for IoT sync. */
  source: 'device'
  /** ISO timestamp of the reading. */
  measuredAt?: string
}

export interface IotSensor {
  id: string
  userId: string
  poolId?: string | null
  provider: IotProvider
  label: string
  deviceId?: string | null
  apiUrl?: string | null
  /** Never returned to the client — kept server-side only. */
  apiKey?: string | null
  config?: Record<string, unknown> | null
  status: IotSensorStatus
  lastSyncAt?: string | null
  createdAt: string
  updatedAt: string
}

// ───────────────────────────────────────────────────────────────────────────
// Provider metadata (for the UI — labels, descriptions, icon hints)
// ───────────────────────────────────────────────────────────────────────────

export interface ProviderMeta {
  id: IotProvider
  /** i18n key under `iot` namespace, e.g. `providerIco`. */
  labelKey: string
  /** i18n key under `iot` namespace, e.g. `providerIcoDesc`. */
  descKey: string
  /** Emoji-style icon (UI may swap for a real logo later). */
  icon: string
  /** Whether the provider requires an API URL (esphome/HA: yes, ICO/iopool: no). */
  requiresApiUrl: boolean
  /** Whether the provider requires a device id. */
  requiresDeviceId: boolean
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: 'ico',
    labelKey: 'providerIco',
    descKey: 'providerIcoDesc',
    icon: '🔵',
    requiresApiUrl: false,
    requiresDeviceId: true,
  },
  {
    id: 'iopool',
    labelKey: 'providerIopool',
    descKey: 'providerIopoolDesc',
    icon: '🟢',
    requiresApiUrl: false,
    requiresDeviceId: true,
  },
  {
    id: 'esphome',
    labelKey: 'providerEsphome',
    descKey: 'providerEsphomeDesc',
    icon: '🟠',
    requiresApiUrl: true,
    requiresDeviceId: false,
  },
]

export function getProvider(id: string): ProviderMeta | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

// ───────────────────────────────────────────────────────────────────────────
// Connection & sync — STUBBED for v1
// ───────────────────────────────────────────────────────────────────────────

/**
 * Validate + "connect" a sensor. For v1 we just validate that the required
 * fields are present (deviceId for ICO/iopool, apiUrl for ESPHome) and return
 * true. The real OAuth2 / API key validation will be added per provider.
 *
 * Returns true on success, throws on validation error.
 */
export async function connectSensor(config: IotSensorConfig): Promise<boolean> {
  const provider = getProvider(config.provider)
  if (!provider) {
    throw new Error(`Unsupported provider: ${config.provider}`)
  }
  if (!config.label || !config.label.trim()) {
    throw new Error('Sensor label is required')
  }
  if (provider.requiresDeviceId && !config.deviceId) {
    throw new Error(`Device ID required for ${config.provider}`)
  }
  if (provider.requiresApiUrl && !config.apiUrl) {
    throw new Error(`API URL required for ${config.provider}`)
  }
  if (!config.apiKey) {
    throw new Error('API key required')
  }
  // Simulate network round-trip for the stub.
  await new Promise((r) => setTimeout(r, 300))
  return true
}

/**
 * Fetch the latest reading from the sensor. STUBBED — returns a deterministic
 * reading based on the current time so the UI can demonstrate the data flow.
 *
 * Real implementations:
 *   - ico:    GET https://api.ondilo.com/v1.0/.../lastmeasure
 *   - iopool: GET https://api.iopool.com/v1/ecO/.../latest-measurement
 *   - esphome: GET <apiUrl>/api/sensor/... (HA REST) or via MQTT subscription
 */
export async function fetchSensorData(
  provider: IotProvider,
  _config: IotSensorConfig,
): Promise<WaterTestInput> {
  // Simulate network latency.
  await new Promise((r) => setTimeout(r, 250))

  // Deterministic stub reading. Real API call would replace this body.
  const now = new Date()
  const hourOfDay = now.getHours()
  // Small diurnal variation to make the stub feel "real".
  const ph = 7.2 + Math.sin((hourOfDay / 24) * Math.PI * 2) * 0.15
  const freeChlorine = provider === 'iopool' ? 1.8 : 2.1
  const temperature = 24 + Math.sin((hourOfDay / 24) * Math.PI * 2) * 1.5

  return {
    ph: Math.round(ph * 100) / 100,
    freeChlorine: Math.round(freeChlorine * 100) / 100,
    alkalinity: 100,
    temperature: Math.round(temperature * 10) / 10,
    source: 'device',
    measuredAt: now.toISOString(),
  }
}

/**
 * Disconnect a sensor (best-effort). For most providers we just mark the local
 * record as disconnected — no remote side-effect.
 */
export async function disconnectSensor(_provider: IotProvider): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 100))
  return true
}
