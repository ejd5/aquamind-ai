'use client'

import { useLocale } from 'next-intl'
import { LocationSharingControl } from '@/components/pro/location-sharing-control'
import { PRO_LIVE_DISPATCH_COPY, type ProLiveDispatchLocale } from '@/i18n/locales/pro-live-dispatch-copy'

export default function ProLocationPage() {
  const locale = useLocale() as ProLiveDispatchLocale
  const copy = PRO_LIVE_DISPATCH_COPY[locale] ?? PRO_LIVE_DISPATCH_COPY.en
  return (
    <div className="mx-auto w-full max-w-2xl py-2 sm:py-6">
      <LocationSharingControl copy={copy} />
    </div>
  )
}
