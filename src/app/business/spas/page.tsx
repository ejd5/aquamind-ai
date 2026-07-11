/**
 * AQWELIA Business — Spa centers offer page.
 *
 * URL: /business/spas
 * Server component. Hero + benefits + checklist + CTA.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Sparkles, Droplets, Thermometer, ShieldCheck, ClipboardCheck } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('business')
  return {
    title: t('spasMetaTitle'),
    description: t('spasMetaDescription'),
  }
}

export default async function BusinessSpasPage() {
  const t = await getTranslations('business')

  const BENEFITS = [
    { icon: Droplets, title: t('spasBenefit1Title'), text: t('spasBenefit1Text') },
    { icon: Thermometer, title: t('spasBenefit2Title'), text: t('spasBenefit2Text') },
    { icon: ClipboardCheck, title: t('spasBenefit3Title'), text: t('spasBenefit3Text') },
    { icon: ShieldCheck, title: t('spasBenefit4Title'), text: t('spasBenefit4Text') },
    { icon: Droplets, title: t('spasBenefit5Title'), text: t('spasBenefit5Text') },
    { icon: Thermometer, title: t('spasBenefit6Title'), text: t('spasBenefit6Text') },
  ]

  const CHECKLIST = t.raw('spasChecklist') as string[]

  return (
    <>
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('spasEyebrow')}</span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[3rem]">
            {t('spasTitle')}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('spasSubtitle')}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/business#contact"
              className="glow-gold group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              {t('ctaQuote')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/business/demo"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/40 bg-background/80 px-7 py-3.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold sm:w-auto"
            >
              {t('ctaDemo')}
            </Link>
          </div>
        </div>
      </section>

      <section className="relative py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => {
              const Icon = b.icon
              return (
                <div
                  key={b.title}
                  className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/40 shadow-[0_18px_40px_-22px_oklch(0.45_0.12_195/0.25)] transition-all duration-300 hover:-translate-y-1 dark:bg-white/[0.06] dark:border-white/15"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/80 to-gold/80 text-white shadow-md shadow-primary/20">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="mt-4 font-display text-base font-bold text-foreground">
                      {b.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {b.text}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="relative py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-2xl border border-gold/40 bg-white/40 p-8 backdrop-blur-xl dark:bg-white/[0.04]">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              {t('spasChecklistTitle')}
            </h2>
            <ul className="mt-5 space-y-3">
              {CHECKLIST.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-foreground/90"
                >
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
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
              {t('spasCtaTitle')}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t('spasCtaSubtitle')}
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
