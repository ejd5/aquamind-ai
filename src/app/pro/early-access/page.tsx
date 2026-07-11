/**
 * AQWELIA Pro — Early Access landing page.
 *
 * URL: /pro/early-access
 * Server component. Renders:
 *  - Hero with eyebrow + title + subtitle
 *  - 7 Founders advantages (glassmorphism list)
 *  - EarlyAccessForm (client component) with success/error states
 *
 * The form POSTs to /api/pro/early-access which stores the lead in the
 * `EarlyAccessLead` Prisma model.
 */
import type { Metadata } from 'next'
import { Check, Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { EarlyAccessForm } from './early-access-form'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pro')
  return {
    title: t('earlyAccessTitle'),
    description: t('earlyAccessSubtitle'),
  }
}

export default async function EarlyAccessPage() {
  const t = await getTranslations('pro')

  const ADVANTAGES = [
    t('earlyAccessAdvantage1'),
    t('earlyAccessAdvantage2'),
    t('earlyAccessAdvantage3'),
    t('earlyAccessAdvantage4'),
    t('earlyAccessAdvantage5'),
    t('earlyAccessAdvantage6'),
    t('earlyAccessAdvantage7'),
  ]

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('earlyAccessEyebrow')}</span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
            {t('earlyAccessTitle')}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('earlyAccessSubtitle')}
          </p>
        </div>
      </section>

      {/* ===== Two columns: advantages + form ===== */}
      <section className="relative py-10 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Advantages */}
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                {t('earlyAccessAdvantagesTitle')}
              </h2>
              <ul className="mt-5 space-y-3">
                {ADVANTAGES.map((advantage, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 rounded-xl border border-white/40 bg-white/50 p-3.5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-white shadow-md shadow-primary/20">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm leading-relaxed text-foreground/90">
                      {advantage}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/5 p-3.5 text-xs text-muted-foreground">
                <Sparkles className="h-4 w-4 shrink-0 text-gold" />
                <span>{t('earlyAccessFormSubtitle')}</span>
              </div>
            </div>

            {/* Form */}
            <div>
              <EarlyAccessForm />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
