'use client'

/**
 * AQWELIA mobile API fetch bridge.
 *
 * The Capacitor application embeds a static Next.js export. Shared B2C and
 * NextAuth client code still performs relative requests such as `/api/auth/me`
 * or `/api/pool/profile`. Inside a native WebView those URLs would otherwise
 * target the local app origin instead of the deployed AQWELIA backend.
 *
 * This idempotent bridge is installed before SessionProvider renders and only
 * activates when NEXT_PUBLIC_API_BASE_URL was compiled as an absolute HTTPS
 * URL. It keeps the shared web components usable without duplicating every
 * API call in the mobile tree.
 */

import { apiUrl } from '@/lib/api-client'

type BridgedFetch = typeof fetch & {
  __aqweliaMobileApiBridge?: true
}

function localApiPath(value: string): string | null {
  if (value.startsWith('/api/')) return value

  try {
    const url = new URL(value)
    const isLocalAppOrigin =
      (typeof window !== 'undefined' && url.origin === window.location.origin) ||
      url.protocol === 'capacitor:' ||
      url.protocol === 'ionic:' ||
      url.protocol === 'file:'

    if (isLocalAppOrigin && url.pathname.startsWith('/api/')) {
      return `${url.pathname}${url.search}${url.hash}`
    }
  } catch {
    // Non-URL strings are passed through unchanged.
  }

  return null
}

export function resolveMobileApiInput(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input === 'string') {
    const path = localApiPath(input)
    return path ? apiUrl(path) : input
  }

  if (input instanceof URL) {
    const path = localApiPath(input.toString())
    return path ? new URL(apiUrl(path)) : input
  }

  return input
}

export function installMobileApiFetchBridge(): void {
  if (typeof window === 'undefined') return

  const probe = apiUrl('/api/__aqwelia_mobile_probe__')
  if (!/^https:\/\//i.test(probe)) return

  const current = window.fetch as BridgedFetch
  if (current.__aqweliaMobileApiBridge) return

  const original = current.bind(window)
  const bridged = ((input: RequestInfo | URL, init?: RequestInit) =>
    original(resolveMobileApiInput(input), init)) as BridgedFetch

  bridged.__aqweliaMobileApiBridge = true
  window.fetch = bridged
}
