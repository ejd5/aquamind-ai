import { notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { LocationSharingControl } from '@/components/pro/location-sharing-control'
import { PRO_LIVE_DISPATCH_COPY, type ProLiveDispatchLocale } from '@/i18n/locales/pro-live-dispatch-copy'
import { PRO_GPS_ENABLED } from '@/lib/features'

export default async function ProLocationPage() {
  if (!PRO_GPS_ENABLED) notFound()
  const locale = await getLocale() as ProLiveDispatchLocale
  const copy = PRO_LIVE_DISPATCH_COPY[locale] ?? PRO_LIVE_DISPATCH_COPY.en
  return (
    <div className="mx-auto w-full max-w-2xl py-2 sm:py-6">
      <LocationSharingControl copy={copy} />
    </div>
  )
}
