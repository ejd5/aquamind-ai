'use client'

import { useEffect, type ReactNode } from 'react'
import { __setPostHogClient, isPostHogClientEnabled } from '@/lib/analytics-client'
import {
  CONSENT_CHANGED_EVENT,
  analyticsConsentGranted,
  type ConsentPreference,
} from '@/lib/privacy/consent'

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let cancelled = false
    let client: any | null = null

    async function applyConsent(allowed: boolean) {
      if (!allowed || !isPostHogClientEnabled()) {
        if (client) {
          try {
            client.opt_out_capturing?.()
            client.reset?.()
          } catch {
            // Analytics withdrawal must never break the application.
          }
        }
        __setPostHogClient(null)
        return
      }

      if (client) {
        try {
          client.opt_in_capturing?.()
          __setPostHogClient(client)
        } catch {
          __setPostHogClient(null)
        }
        return
      }
      if (cancelled) return
      try {
        // Privacy by design: the analytics SDK is not downloaded before the
        // user has explicitly accepted audience measurement.
        const postHogPackage = await import('posthog-js')
        if (cancelled || !analyticsConsentGranted()) return
        client = postHogPackage.default
        client.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST as string,
          capture_pageview: true,
          capture_pageleave: true,
          persistence: 'localStorage+cookie',
          autocapture: false,
          disable_session_recording: true,
          respect_dnt: true,
          person_profiles: 'identified_only',
        })
        client.opt_in_capturing?.()
        __setPostHogClient(client)
      } catch (error) {
        console.warn('[posthog] consented initialization failed:', error)
        client = null
        __setPostHogClient(null)
      }
    }

    void applyConsent(analyticsConsentGranted())
    const onConsentChange = (event: Event) => {
      const preference = (event as CustomEvent<ConsentPreference>).detail
      void applyConsent(preference?.analytics === true)
    }
    window.addEventListener(CONSENT_CHANGED_EVENT, onConsentChange)

    return () => {
      cancelled = true
      window.removeEventListener(CONSENT_CHANGED_EVENT, onConsentChange)
      __setPostHogClient(null)
    }
  }, [])

  return <>{children}</>
}
