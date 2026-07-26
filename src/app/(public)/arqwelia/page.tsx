/**
 * ARQWELIA Lot 1 — Landing page (12 sections, fully responsive).
 *
 * Server component (SEO-friendly). All visible strings via next-intl `arqwelia.*`.
 * Premium navy+aqua palette, blueprint-grid accent, no generic purple, no logo
 * replacement. Touch targets ≥44px. Honors prefers-reduced-motion.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { isArqweliaLot1Enabled } from '@/lib/features'
import { ArqweliaPartnerForm } from '@/components/arqwelia/partner-form'

export const viewport = { width: 'device-width', initialScale: 1 }

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('arqwelia')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/arqwelia' },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
      url: '/arqwelia',
    },
    robots: isArqweliaLot1Enabled() ? 'index, follow' : 'noindex, nofollow',
  }
}

export default async function ArqweliaLanding() {
  const t = await getTranslations('arqwelia')
  const enabled = isArqweliaLot1Enabled()
  const startHref = enabled ? '/arqwelia/start/photos' : '/arqwelia/start/analysis?demo=1'

  return (
    <div className="relative overflow-hidden">
      {/* Blueprint grid background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,214,197,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,214,197,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* ── 1. Hero ───────────────────────────────────────────────────── */}
      <section className="relative px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-arq-aqua/30 bg-arq-aqua/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-arq-aqua">
            by AQWELIA
          </span>
          <h1 className="mt-6 font-aq-display text-4xl font-semibold leading-[1.08] text-arq-mist sm:text-6xl">
            {t('tagline')}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-arq-mist/65 sm:text-lg">
            {t('subtitle')}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={startHref}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-arq-aqua px-7 py-3 text-sm font-bold text-arq-navy shadow-lg shadow-arq-aqua/30 transition-transform hover:scale-[1.02]"
            >
              {t('ctaPrimary')}
            </Link>
            <Link
              href="/arqwelia/start/analysis?demo=1"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-arq-mist/20 px-7 py-3 text-sm font-semibold text-arq-mist/85 transition-colors hover:bg-arq-mist/5"
            >
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. Bande de confiance ──────────────────────────────────────── */}
      <section className="border-y border-arq-aqua/10 bg-arq-ink/40 py-5">
        <p className="mx-auto max-w-4xl px-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-arq-sand/70 sm:px-6">
          {t('trustStrip')}
        </p>
      </section>

      {/* ── 6. Parcours en 4 étapes ────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-aq-display text-3xl font-semibold text-arq-mist sm:text-4xl">
            {t('stepsTitle')}
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="rounded-2xl border border-arq-aqua/15 bg-arq-ink/60 p-6 text-center"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-arq-aqua/40 text-lg font-bold text-arq-aqua">
                  {n}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-arq-mist">
                  {t(`steps.${n}.title` as const)}
                </h3>
                <p className="mt-2 text-sm text-arq-mist/55">
                  {t(`steps.${n}.desc` as const)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Bloc différenciation ────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center font-aq-display text-3xl font-semibold text-arq-mist">
            {t('diffTitle')}
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {(['declared', 'detected', 'estimated', 'toConfirm'] as const).map((k) => (
              <div key={k} className="rounded-xl border border-arq-aqua/12 bg-arq-navy/60 p-5">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-arq-aqua">
                  {k === 'toConfirm' ? '⚠' : '✓'} {k}
                </span>
                <p className="mt-2 text-sm text-arq-mist/70">{t(`diff.${k}` as const)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Confidentialité ─────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-arq-aqua/20 bg-gradient-to-br from-arq-ink/80 to-arq-navy p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-arq-aqua/10">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00D6C5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <p className="mt-5 text-lg font-medium text-arq-mist">{t('privacyPromise')}</p>
        </div>
      </section>

      {/* ── 9. Project Passport ────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center font-aq-display text-3xl font-semibold text-arq-mist">
            {t('passportTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-arq-mist/55">{t('passportDesc')}</p>
        </div>
      </section>

      {/* ── 10. Bloc partenaire pisciniste ──────────────────────────────── */}
      <section id="partenaire" className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-arq-sand/20 bg-arq-ink/50 p-8">
          <h2 className="font-aq-display text-2xl font-semibold text-arq-mist sm:text-3xl">
            {t('partnerTitle')}
          </h2>
          <p className="mt-2 text-sm text-arq-mist/60">{t('partnerSubtitle')}</p>
          <div className="mt-6">
            <ArqweliaPartnerForm />
          </div>
        </div>
      </section>

      {/* ── 11. FAQ courte ─────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-aq-display text-3xl font-semibold text-arq-mist">
            {t('faqTitle')}
          </h2>
          <div className="mt-8 space-y-4">
            {[1, 2, 3].map((n) => (
              <details key={n} className="rounded-xl border border-arq-aqua/12 bg-arq-ink/40 p-5">
                <summary className="cursor-pointer text-sm font-semibold text-arq-mist">
                  {t(`faq.q${n}` as const)}
                </summary>
                <p className="mt-3 text-sm text-arq-mist/55">{t(`faq.a${n}` as const)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── 12. CTA final ──────────────────────────────────────────────── */}
      <section className="px-4 pb-24 pt-8 text-center sm:px-6">
        <h2 className="font-aq-display text-3xl font-semibold text-arq-mist sm:text-4xl">
          {t('finalCtaTitle')}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-arq-mist/55">{t('finalCtaSubtitle')}</p>
        <Link
          href={startHref}
          className="mt-7 inline-flex min-h-[44px] items-center justify-center rounded-full bg-arq-aqua px-8 py-3 text-sm font-bold text-arq-navy shadow-lg shadow-arq-aqua/30 transition-transform hover:scale-[1.02]"
        >
          {t('ctaPrimary')}
        </Link>
      </section>
    </div>
  )
}