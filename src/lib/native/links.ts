/**
 * External links & deep links — Capacitor Browser + App wrappers.
 *
 * SSR-safe: web/server falls back to `window.open` (server: no-op).
 * Native uses the in-app browser (`@capacitor/browser`) which keeps
 * users inside the app's session rather than kicking them to Safari/Chrome.
 *
 * Usage:
 *   import { openExternalLink, setupDeepLinks } from '@/lib/native'
 *   await openExternalLink('https://example.com')
 *   useEffect(() => setupDeepLinks((url) => router.push(url)), [])
 */

import { Browser } from '@capacitor/browser'
import { App } from '@capacitor/app'
import { isNative } from '@/lib/platform'

/**
 * Open a URL externally.
 * - Native: in-app browser (fullscreen) via Capacitor Browser.
 * - Web:    `window.open(..., '_blank', 'noopener,noreferrer')`.
 * - Server: no-op.
 * Falls back to `window.open` if the native Browser plugin fails.
 */
export async function openExternalLink(url: string): Promise<void> {
  if (!isNative()) {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
    return
  }
  try {
    await Browser.open({ url, presentationStyle: 'fullscreen' })
  } catch {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }
}

export type DeepLinkHandler = (url: string, path?: string) => void

/**
 * Subscribe to deep-link events (universal links on iOS, App Links on Android).
 * Also handles cold-start: if the app was launched via a deep link, the
 * handler is invoked once with the launch URL.
 * No-op on web/server. Returns a cleanup function.
 */
export function setupDeepLinks(handler: DeepLinkHandler): () => void {
  if (!isNative()) return () => {}

  const listener = App.addListener('appUrlOpen', ({ url }) => {
    try {
      // Parse path portion if the URL is an aqwelia:// or https:// scheme
      let path: string | undefined
      try {
        const u = new URL(url)
        path = u.pathname || undefined
      } catch {
        /* not a parseable URL — pass through as-is */
      }
      handler(url, path)
    } catch {
      /* defensive: never let a handler error break the listener */
    }
  })

  // Cold-start: app was launched via deep link.
  // NOTE: getLaunchUrl() may resolve to `undefined` — guard against that.
  App.getLaunchUrl()
    .then((result) => {
      if (result?.url) handler(result.url)
    })
    .catch(() => {
      /* graceful degradation */
    })

  return () => {
    listener.then((l) => l.remove()).catch(() => {})
  }
}
