export const CONSENT_COOKIE_NAME = 'aqwelia_consent_v2'
export const CONSENT_WORDING_VERSION = '2026-07-26-v1'
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180
export const CONSENT_CHANGED_EVENT = 'aqwelia:consent-changed'
export const OPEN_CONSENT_EVENT = 'aqwelia:open-consent'

export type ConsentPreference = {
  version: string
  analytics: boolean
  updatedAt: string
}

export function parseConsentValue(raw: string | null | undefined): ConsentPreference | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<ConsentPreference>
    if (parsed.version !== CONSENT_WORDING_VERSION || typeof parsed.analytics !== 'boolean') return null
    return {
      version: parsed.version,
      analytics: parsed.analytics,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
    }
  } catch {
    return null
  }
}

export function readConsentPreference(): ConsentPreference | null {
  if (typeof document === 'undefined') return null
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${CONSENT_COOKIE_NAME}=`))
  return parseConsentValue(cookie?.slice(CONSENT_COOKIE_NAME.length + 1))
}

function writeConsentPreference(preference: ConsentPreference): void {
  if (typeof document === 'undefined') return
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(preference))}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: preference }))
}

export function analyticsConsentGranted(): boolean {
  return readConsentPreference()?.analytics === true
}

export async function persistConsentPreference(analytics: boolean, source = 'cookie_banner'): Promise<ConsentPreference> {
  const response = await fetch('/api/privacy/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    keepalive: true,
    body: JSON.stringify({ analytics, source, wordingVersion: CONSENT_WORDING_VERSION }),
  })
  if (!response.ok) throw new Error('consent_not_saved')

  const payload = await response.json().catch(() => null) as { preference?: ConsentPreference } | null
  const preference = payload?.preference
  if (!preference || preference.version !== CONSENT_WORDING_VERSION || typeof preference.analytics !== 'boolean') {
    throw new Error('invalid_consent_response')
  }
  // The server also sets this cookie. Rewriting it here makes the preference
  // immediately observable by the current tab before the next navigation.
  writeConsentPreference(preference)
  return preference
}
