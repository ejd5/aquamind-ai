/**
 * AQWELIA Pro — FAQ page.
 *
 * URL: /pro/faq
 * Server component. Renders the 8 Pro-specific questions + answers
 * (proFaqQ1..proFaqQ8) using a native <details> accordion (no JS needed).
 *
 * Final CTA → /pro/early-access.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Sparkles, Mail } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pro')
  return {
    title: t('faqTitle'),
    description: t('faqA1'),
  }
}

export default async function ProFaqPage() {
  const t = await getTranslations('pro')

  const FAQ = [
    { q: t('faqQ1'), a: t('faqA1') },
    { q: t('faqQ2'), a: t('faqA2') },
    { q: t('faqQ3'), a: t('faqA3') },
    { q: t('faqQ4'), a: t('faqA4') },
    { q: t('faqQ5'), a: t('faqA5') },
    { q: t('faqQ6'), a: t('faqA6') },
    { q: t('faqQ7'), a: t('faqA7') },
    { q: t('faqQ8'), a: t('faqA8') },
  ]

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('faqEyebrow')}</span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
            {t('faqTitle')}
          </h1>
        </div>
      </section>

      {/* ===== FAQ accordion ===== */}
      <section className="relative py-8 sm:py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="space-y-2.5">
            {FAQ.map((item, idx) => (
              <details
                key={idx}
                className="group rounded-xl border border-white/40 bg-white/50 px-4 backdrop-blur-xl transition-colors hover:bg-white/70 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] open:border-gold/40 open:bg-white/70"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-sm font-semibold sm:text-base">
                  {item.q}
                  <span className="shrink-0 text-gold transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>

          {/* Contact line */}
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 text-gold" />
            <span>{t('faqContact')}</span>
            <a
              href="mailto:contact@aqwelia.app"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              contact@aqwelia.app
            </a>
          </div>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="relative py-20 sm:py-24">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/40 to-background" />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-white/40 p-8 backdrop-blur-xl dark:bg-white/[0.04] sm:p-10">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <Sparkles className="mx-auto h-6 w-6 text-gold" />
            <h2 className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              {t('ctaEarlyAccess')}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t('earlyAccessSubtitle')}
            </p>
            <Link
              href="/pro/early-access"
              className="glow-gold group mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl"
            >
              {t('ctaEarlyAccess')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
