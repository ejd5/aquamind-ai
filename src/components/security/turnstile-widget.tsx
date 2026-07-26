'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string
      remove: (widgetId: string) => void
    }
    __aqweliaTurnstilePromise?: Promise<void>
  }
}

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (window.__aqweliaTurnstilePromise) return window.__aqweliaTurnstilePromise
  window.__aqweliaTurnstilePromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-aqwelia-turnstile]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Turnstile unavailable')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.dataset.aqweliaTurnstile = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Turnstile unavailable'))
    document.head.appendChild(script)
  })
  return window.__aqweliaTurnstilePromise
}

export function TurnstileWidget({
  siteKey,
  onToken,
  onError,
}: {
  siteKey: string
  onToken: (token: string | null) => void
  onError: () => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onTokenRef.current = onToken
    onErrorRef.current = onError
  }, [onError, onToken])

  useEffect(() => {
    let cancelled = false
    void loadTurnstile().then(() => {
      if (cancelled || !hostRef.current || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(hostRef.current, {
        sitekey: siteKey,
        action: 'signup',
        theme: 'auto',
        size: 'flexible',
        callback: (token: string) => onTokenRef.current(token),
        'expired-callback': () => onTokenRef.current(null),
        'error-callback': () => {
          onTokenRef.current(null)
          onErrorRef.current()
        },
      })
    }).catch(() => onErrorRef.current())
    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current)
      widgetIdRef.current = null
    }
  }, [siteKey])

  return <div ref={hostRef} className="min-h-[65px] w-full overflow-hidden rounded-xl" />
}
