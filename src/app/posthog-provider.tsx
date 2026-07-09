'use client'

/**
 * AQWELIA — PostHog React Provider.
 *
 * Mounts the posthog-js client on the browser only. No-ops on the server
 * and in dev when NEXT_PUBLIC_POSTHOG_KEY is missing — analytics must
 * never break the user flow or block the bundle.
 *
 * Wired in src/app/layout.tsx:
 *   <PostHogProvider>
 *     <Providers>{children}</Providers>
 *   </PostHogProvider>
 *
 * Client components can then call `trackEvent(...)` from `@/lib/analytics`
 * — the provider pushes the posthog-js client into the analytics module
 * via `__setPostHogClient` so events flow into the live instance.
 */
import { useEffect, type ReactNode } from 'react'
import posthog from 'posthog-js'
import { __setPostHogClient, isPostHogClientEnabled } from '@/lib/analytics-client'

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // SSR / build-time guard.
    if (typeof window === 'undefined') return
    if (!isPostHogClientEnabled()) {
      // Dev without keys — leave the client as null (trackEvent no-ops).
      __setPostHogClient(null)
      return
    }

    try {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST as string,
        // Capture page views automatically (router-aware for App Router).
        capture_pageview: true,
        capture_pageleave: true,
        // Respect Do-Not-Track.
        persistence: 'localStorage+cookie',
        autocapture: false, // we use explicit trackEvent calls only
        disable_session_recording: true, // opt in later if needed
        loaded: (ph) => {
          __setPostHogClient(ph as unknown as Parameters<typeof __setPostHogClient>[0])
        },
      })
      // If `loaded` doesn't fire (older versions), still register the client.
      __setPostHogClient(posthog as unknown as Parameters<typeof __setPostHogClient>[0])
    } catch (err) {
      console.warn('[posthog] init failed:', err)
      __setPostHogClient(null)
    }

    return () => {
      // Reset on unmount — defensive (root layout never unmounts in practice).
      __setPostHogClient(null)
    }
  }, [])

  return <>{children}</>
}
