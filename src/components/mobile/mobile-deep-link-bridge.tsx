'use client'

import { useEffect } from 'react'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

const MOBILE_AUTH_PROTOCOL = 'aqwelia:'
const MOBILE_AUTH_HOST = 'auth'
const MOBILE_AUTH_PATH = '/complete'

function isMobileAuthCompleteUrl(value: string) {
  try {
    const url = new URL(value)
    return (
      url.protocol === MOBILE_AUTH_PROTOCOL &&
      url.hostname === MOBILE_AUTH_HOST &&
      url.pathname === MOBILE_AUTH_PATH
    )
  } catch {
    return false
  }
}

export function MobileDeepLinkBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let disposed = false

    const handleUrl = (url?: string | null) => {
      if (disposed || !url || !isMobileAuthCompleteUrl(url)) return

      // No credential, token or canonical user id is transported in this URL.
      // The native credentials screen establishes its own backend session.
      void Browser.close().catch(() => undefined)
      window.location.assign('/auth/signin?registered=1')
    }

    void App.getLaunchUrl()
      .then((launch) => handleUrl(launch?.url))
      .catch(() => undefined)

    const listener = App.addListener('appUrlOpen', ({ url }) => handleUrl(url))

    return () => {
      disposed = true
      void listener.then((handle) => handle.remove())
    }
  }, [])

  return null
}
