'use client'

import { useEffect, useState } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { defaultLocale, normalizeLocale, type Locale } from '@/i18n/config'
import fr from '@/i18n/locales/fr.json'
import en from '@/i18n/locales/en.json'
import es from '@/i18n/locales/es.json'
import de from '@/i18n/locales/de.json'
import it from '@/i18n/locales/it.json'
import pt from '@/i18n/locales/pt.json'
import nl from '@/i18n/locales/nl.json'

const messagesByLocale = { fr, en, es, de, it, pt, nl } as const
const MOBILE_LOCALE_KEY = 'aqwelia-mobile-locale'

export function MobileIntlProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale)

  useEffect(() => {
    const stored = window.localStorage.getItem(MOBILE_LOCALE_KEY)
    const detected = normalizeLocale(stored || window.navigator.language)
    setLocale(detected)
    window.localStorage.setItem(MOBILE_LOCALE_KEY, detected)
  }, [])

  return (
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
      {children}
    </NextIntlClientProvider>
  )
}
