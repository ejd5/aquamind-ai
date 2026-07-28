/**
 * ARQWELIA V2 — Shared layout for /arqwelia/* public pages.
 *
 * Premium navy header with brand symbol + nav + "Commencer mon projet" CTA.
 * Mobile menu (ArqweliaHeaderNav). Footer with ARQWELIA Studio identity.
 *
 * i18n (Round 2, Option B): ARQWELIA is exposed ONLY in FR + EN. Users whose
 * UI locale is es/de/it/pt/nl get an explicit EN fallback for ARQWELIA routes
 * (no fake multilingual — see docs/ARQWELIA_LOT1.md). We force the request
 * locale here (server) and re-scope the client provider (client subtree).
 */
import Link from 'next/link'
import { getLocale, getMessages, setRequestLocale, getTranslations } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'
import { isArqweliaLot1Enabled, isArqweliaDemoMode } from '@/lib/features'
import { ArqweliaBrand, ArqweliaSymbol } from '@/components/arqwelia/brand'
import { ArqweliaPrimaryButton, ArqweliaFutureFeature } from '@/components/arqwelia/ui'
import { ArqweliaHeaderNav } from '@/components/arqwelia/header-nav'
import { normalizeLocale, type Locale } from '@/i18n/config'

const ARQ_SUPPORT: Locale[] = ['fr', 'en']
const ARQ_FALLBACK: Locale = 'en'

export default async function ArqweliaLayout({ children }: { children: React.ReactNode }) {
  const detected = normalizeLocale(await getLocale())
  const forced: Locale = ARQ_SUPPORT.includes(detected) ? detected : ARQ_FALLBACK
  // Force the request locale so server child components (getTranslations) read FR/EN.
  setRequestLocale(forced)

  const t = await getTranslations({ locale: forced, namespace: 'arqwelia' })
  const messages = await getMessages({ locale: forced })
  const enabled = isArqweliaLot1Enabled()
  const demo = isArqweliaDemoMode()
  const startHref = enabled ? '/arqwelia/start/photos' : '/arqwelia/start/analysis?demo=1'

  return (
    <div className="relative flex min-h-screen flex-col text-arq-mist" style={{ background: 'var(--arqwelia-gradient-hero)' }}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.018]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(92,242,230,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(92,242,230,0.35) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <NextIntlClientProvider locale={forced} messages={messages}>
        {/* Premium sticky header */}
        <header className="safe-area-top sticky top-0 z-40 border-b border-white/[0.06] backdrop-blur-2xl" style={{ background: 'rgba(3,15,26,0.82)' }}>
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/arqwelia" aria-label="ARQWELIA — accueil" className="flex items-center gap-2.5">
              <ArqweliaSymbol className="h-7 w-7" withGlow={false} />
              <span className="font-aq-display text-base font-semibold tracking-wide text-white">ARQWELIA</span>
              <span className="hidden text-[9px] font-semibold uppercase tracking-[0.2em] text-arq-gold-soft/60 sm:inline">by AQWELIA</span>
            </Link>
            <nav aria-label="ARQWELIA navigation" className="hidden items-center gap-6 md:flex">
              <Link href="/arqwelia#parcours" className="text-[13px] font-medium text-white/60 transition-colors hover:text-white">{t('nav.howItWorks')}</Link>
              <Link href="/arqwelia#ia-ar" className="text-[13px] font-medium text-white/60 transition-colors hover:text-white">{t('nav.technology')}</Link>
              <Link href="/arqwelia#pros" className="text-[13px] font-medium text-white/60 transition-colors hover:text-white">{t('nav.professionals')}</Link>
              <Link href="/arqwelia#faq" className="text-[13px] font-medium text-white/60 transition-colors hover:text-white">{t('nav.faq')}</Link>
              <Link href="/pro/arqwelia/opportunities?demo=1" className="text-[13px] font-medium text-arq-gold-soft/70 transition-colors hover:text-arq-gold-soft">{t('nav.proSection')}</Link>
            </nav>
            <div className="flex items-center gap-3">
              <ArqweliaPrimaryButton href={startHref} className="hidden !px-5 !py-2 !text-xs sm:inline-flex">{t('nav.startProject')}</ArqweliaPrimaryButton>
              <ArqweliaHeaderNav startHref={startHref} />
            </div>
          </div>
        </header>

        <main className="relative flex-1">{children}</main>

        {/* Footer */}
        <footer className="relative border-t border-white/[0.06] px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-center gap-4 text-center">
              <ArqweliaSymbol className="h-8 w-8 opacity-60" withGlow={false} />
              <p className="font-aq-display text-base font-semibold text-white/80">ARQWELIA <span className="text-arq-gold-soft/50">by AQWELIA</span></p>
              <p className="max-w-xl text-xs leading-relaxed text-white/35">{t('warning')}</p>
              {demo && <div className="mt-1"><ArqweliaFutureFeature kind="demo">{t('demoBadge')}</ArqweliaFutureFeature></div>}
            </div>
          </div>
        </footer>
      </NextIntlClientProvider>
    </div>
  )
}