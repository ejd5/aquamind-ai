/**
 * AQWELIA Business — Visual demo page.
 *
 * URL: /business/demo
 * Server component. 5 sections of mockups (Dashboard, Sanitary journal,
 * Tasks, Photos, Alerts) + final CTA. Mirrors the /pro/demo pattern.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Sparkles, LayoutDashboard, FileText, ClipboardList, Camera, BellRing } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('business')
  return {
    title: t('demoTitle'),
    description: t('demoSubtitle'),
  }
}

export default async function BusinessDemoPage() {
  const t = await getTranslations('business')

  const SECTIONS = [
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      title: t('demoSectionDashboard'),
      text: t('demoSectionDashboardText'),
      bars: [60, 80, 45, 92, 70, 55, 88],
    },
    {
      id: 'journal',
      icon: FileText,
      title: t('demoSectionJournal'),
      text: t('demoSectionJournalText'),
      rows: 6,
    },
    {
      id: 'tasks',
      icon: ClipboardList,
      title: t('demoSectionTasks'),
      text: t('demoSectionTasksText'),
      bars: [30, 70, 50, 90, 40],
    },
    {
      id: 'photos',
      icon: Camera,
      title: t('demoSectionPhotos'),
      text: t('demoSectionPhotosText'),
      bars: [40, 65, 80, 55, 75],
    },
    {
      id: 'alerts',
      icon: BellRing,
      title: t('demoSectionAlerts'),
      text: t('demoSectionAlertsText'),
      bars: [85, 50, 95, 60, 75, 40],
    },
  ]

  return (
    <>
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('demoEyebrow')}</span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
            {t('demoTitle')}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('demoSubtitle')}
          </p>
        </div>
      </section>

      <section className="relative py-8 sm:py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="space-y-12 sm:space-y-16">
            {SECTIONS.map((section, idx) => {
              const Icon = section.icon
              const isReversed = idx % 2 === 1
              return (
                <div
                  key={section.id}
                  id={section.id}
                  className={`grid grid-cols-1 items-center gap-8 lg:grid-cols-2 ${
                    isReversed ? 'lg:grid-flow-dense' : ''
                  }`}
                >
                  <div className={isReversed ? 'lg:col-start-2' : ''}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/30">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                        {section.title}
                      </h2>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {section.text}
                    </p>
                  </div>

                  <div className={isReversed ? 'lg:col-start-1 lg:row-start-1' : ''}>
                    <BrowserMockup
                      label={section.title}
                      bars={section.bars}
                      rows={section.rows}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="relative py-20 sm:py-24">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/40 to-background" />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-white/40 p-8 backdrop-blur-xl dark:bg-white/[0.04] sm:p-10">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <Sparkles className="mx-auto h-6 w-6 text-gold" />
            <h2 className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              {t('demoCtaTitle')}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t('demoCtaSubtitle')}
            </p>
            <Link
              href="/business#contact"
              className="glow-gold group mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl"
            >
              {t('ctaQuote')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

/* ---------------- Browser-frame mockup ---------------- */

function BrowserMockup({
  label,
  bars = [],
  rows = 0,
}: {
  label: string
  bars?: number[]
  rows?: number
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/70 shadow-[0_25px_60px_-25px_oklch(0.45_0.12_195/0.3)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center gap-2 border-b border-border/40 bg-white/50 px-4 py-2.5 dark:bg-white/[0.03]">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        </div>
        <div className="mx-auto rounded-md bg-white/70 px-3 py-0.5 text-[10px] font-medium text-muted-foreground dark:bg-white/10">
          aqwelia.app/business
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-3 w-24 rounded bg-foreground/15" />
            <div className="mt-1.5 h-2 w-32 rounded bg-foreground/10" />
          </div>
          <div className="h-7 w-20 rounded-full bg-gradient-to-r from-gold/40 to-[oklch(0.65_0.11_195)/40]" />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-white/40 bg-white/40 p-2.5 dark:border-white/10 dark:bg-white/[0.04]"
            >
              <div className="h-2 w-10 rounded bg-foreground/10" />
              <div className="mt-1.5 h-4 w-12 rounded bg-gradient-to-r from-primary/60 to-gold/60" />
            </div>
          ))}
        </div>

        {bars.length > 0 && (
          <div className="mt-5 flex h-24 items-end gap-2">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-primary/40 to-gold/60"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        )}

        {rows > 0 && (
          <div className="mt-5 space-y-2">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-foreground/10" />
                <div className="h-2 flex-1 rounded bg-foreground/10" />
                <div className="h-2 w-12 rounded bg-foreground/10" />
                <div className="h-5 w-14 rounded-full bg-gradient-to-r from-primary/40 to-gold/40" />
              </div>
            ))}
          </div>
        )}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  )
}
