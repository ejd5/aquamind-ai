'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, Smartphone } from 'lucide-react'

const AQWELIA_APP_RETURN_URL = 'aqwelia://auth/complete'

export default function MobileAuthCompletePage() {
  const t = useTranslations('auth')

  useEffect(() => {
    window.location.assign(AQWELIA_APP_RETURN_URL)
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <section className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-6 text-center shadow-xl">
        <img src="/logo-aqwelia-web.png" alt="AQWELIA" className="mx-auto h-16 w-auto object-contain" />
        <CheckCircle2 className="mx-auto mt-6 h-9 w-9 text-primary" aria-hidden="true" />
        <p className="mt-4 text-sm text-muted-foreground">{t('registered')}</p>
        <a
          href={AQWELIA_APP_RETURN_URL}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground"
        >
          <Smartphone className="h-4 w-4" aria-hidden="true" />
          AQWELIA
        </a>
      </section>
    </main>
  )
}
