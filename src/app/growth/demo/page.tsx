/**
 * AQWELIA Growth OS — Demo page.
 *
 * URL: /growth/demo
 * Server component. Visual walkthrough of the Growth OS dashboard
 * (4 sections: Lead inbox, Lead detail + timeline, Agent run log, Analytics).
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Sparkles, Inbox, Activity, Bot, BarChart3 } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('growth')
  return {
    title: t('demoMetaTitle'),
    description: t('demoMetaDescription'),
  }
}

export default async function GrowthDemoPage() {
  const t = await getTranslations('growth')

  const SECTIONS = [
    {
      icon: Inbox,
      title: t('demoSection1Title'),
      desc: t('demoSection1Desc'),
      bullets: t.raw('demoSection1Bullets') as string[],
    },
    {
      icon: Activity,
      title: t('demoSection2Title'),
      desc: t('demoSection2Desc'),
      bullets: t.raw('demoSection2Bullets') as string[],
    },
    {
      icon: Bot,
      title: t('demoSection3Title'),
      desc: t('demoSection3Desc'),
      bullets: t.raw('demoSection3Bullets') as string[],
    },
    {
      icon: BarChart3,
      title: t('demoSection4Title'),
      desc: t('demoSection4Desc'),
      bullets: t.raw('demoSection4Bullets') as string[],
    },
  ]

  return (
    <>
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('demoEyebrow')}</span>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {t('demoTitle')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('demoSubtitle')}
          </p>
        </div>
      </section>

      {/* Sections */}
      <section className="relative py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {SECTIONS.map((s, idx) => {
              const Icon = s.icon
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/40 bg-white/60 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/30">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      {s.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {s.desc}
                  </p>
                  <ul className="mt-4 space-y-1.5">
                    {s.bullets.map((b, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-foreground/80"
                      >
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Link
            href="/growth/app"
            className="glow-gold group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]"
          >
            <Sparkles className="h-4 w-4" />
            {t('ctaOpenDashboard')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </>
  )
}
