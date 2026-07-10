/**
 * AQWELIA Care — Product safety information page.
 *
 * URL: /care/securite-produits
 * Server component. Static informational page about REACH/BPR regulation,
 * hazard levels, SDS documents, and how AQWELIA Care handles regulated
 * biocides (partner-only).
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  Beaker,
  Droplets,
  Snowflake,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('care')
  return {
    title: t('safetyMetaTitle'),
    description: t('safetyMetaDescription'),
  }
}

export default async function SecuriteProduitsPage() {
  const t = await getTranslations('care')

  const HAZARD_LEVELS = [
    { key: 'none', color: 'emerald', icon: ShieldCheck },
    { key: 'low', color: 'sky', icon: ShieldCheck },
    { key: 'medium', color: 'amber', icon: AlertTriangle },
    { key: 'high', color: 'red', icon: AlertTriangle },
  ]

  const COLOR_LABELS: Record<string, string> = {
    emerald: 'text-emerald-700 dark:text-emerald-300',
    sky: 'text-sky-700 dark:text-sky-300',
    amber: 'text-amber-700 dark:text-amber-300',
    red: 'text-red-700 dark:text-red-300',
  }

  return (
    <>
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('safetyEyebrow')}</span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[3rem]">
            {t('safetyTitle')}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('safetySubtitle')}
          </p>
        </div>
      </section>

      <section className="relative py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-2xl border border-white/40 bg-white/50 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] sm:p-8">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-gold" />
              <h2 className="font-display text-lg font-bold tracking-tight sm:text-xl">
                {t('safetyReachTitle')}
              </h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t('safetyReachText')}
            </p>
          </div>
        </div>
      </section>

      <section className="relative py-8 sm:py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            {t('safetyColorsTitle')}
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  {t('safetyColorGreen')}
                </h3>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t('safetyColorGreenText')}</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300">
                  {t('safetyColorOrange')}
                </h3>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t('safetyColorOrangeText')}</p>
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <h3 className="text-sm font-bold text-red-700 dark:text-red-300">
                  {t('safetyColorRed')}
                </h3>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t('safetyColorRedText')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-8 sm:py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            {t('safetyHazardTitle')}
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {HAZARD_LEVELS.map((h) => {
              const Icon = h.icon
              return (
                <div
                  key={h.key}
                  className="rounded-xl border border-white/40 bg-white/50 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <Icon className={`h-4 w-4 ${COLOR_LABELS[h.color]}`} />
                  <h3 className="mt-2 text-xs font-bold uppercase tracking-wider text-foreground">
                    {t(`safetyHazard_${h.key}`)}
                  </h3>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t(`safetyHazard_${h.key}_text`)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="relative py-8 sm:py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h2 className="font-display text-base font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                {t('safetySdsTitle')}
              </h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground/80">
              {t('safetySdsText')}
            </p>
            <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <Beaker className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                <span>{t('safetySdsItem1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Droplets className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                <span>{t('safetySdsItem2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Snowflake className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                <span>{t('safetySdsItem3')}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="relative py-8 sm:py-10">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Link
            href="/care/partenaires"
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-background/80 px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold"
          >
            {t('safetyCtaPartners')}
          </Link>
        </div>
      </section>
    </>
  )
}
