'use client'

import { OPEN_CONSENT_EVENT } from '@/lib/privacy/consent'

export function CookiePreferencesButton({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
    >
      {children}
    </button>
  )
}
