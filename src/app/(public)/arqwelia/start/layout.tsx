/**
 * ARQWELIA V2 — Wizard layout (premium chrome).
 * Slim premium progress bar + step counter + shared ARQWELIA branding.
 * Pages read/update the shared Zustand store.
 */
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { forceArqLocale } from '@/lib/arqwelia/i18n'

export default async function WizardLayout({ children }: { children: React.ReactNode }) {
  // Force FR + EN (Option B). es/de/it/pt/nl users see EN for ARQWELIA.
  const forced = await forceArqLocale()
  const messages = await getMessages({ locale: forced })
  return (
    <NextIntlClientProvider locale={forced} messages={messages}>
      <div className="relative min-h-[calc(100vh-4rem)]">
        <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">{children}</div>
      </div>
    </NextIntlClientProvider>
  )
}