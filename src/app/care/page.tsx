/**
 * AQWELIA Care — Main marketing page.
 *
 * URL: /care
 * Server component (SEO-friendly). Renders:
 *  - Hero: badge Coming soon + title + subtitle + CTA notify
 *  - 4 steps (How it works)
 *  - 8 categories cards
 *  - 3 "not selling" items
 *  - FAQ preview
 *  - Notify email form
 *
 * Same DA as the landing page and Pro pages (glassmorphism, gold accents,
 * font-display). Mirrors the patterns used in /pro/page.tsx.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Sparkles,
  Search,
  Calculator,
  CheckCircle2,
  ShoppingCart,
  XCircle,
  Mail,
  Droplets,
  Filter,
  Disc3,
  Wrench,
  Gauge,
  Snowflake,
  Beaker,
  Cpu,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { NotifyForm } from './notify-form'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('care')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function CarePage() {
  const t = await getTranslations('care')

  const STEPS = [
    {
      num: '1',
      icon: Search,
      emoji: '🔍',
      title: t('step1Title'),
      text: t('step1Text'),
    },
    {
      num: '2',
      icon: Calculator,
      emoji: '🧮',
      title: t('step2Title'),
      text: t('step2Text'),
    },
    {
      num: '3',
      icon: CheckCircle2,
      emoji: '✅',
      title: t('step3Title'),
      text: t('step3Text'),
    },
    {
      num: '4',
      icon: ShoppingCart,
      emoji: '🛒',
      title: t('step4Title'),
      text: t('step4Text'),
    },
  ]

  const CATEGORIES = [
    { icon: Beaker, emoji: '🧪', title: t('category1Title'), text: t('category1Text') },
    { icon: Filter, emoji: '🧯', title: t('category2Title'), text: t('category2Text') },
    { icon: Disc3, emoji: '🧺', title: t('category3Title'), text: t('category3Text') },
    { icon: Wrench, emoji: '🔩', title: t('category4Title'), text: t('category4Text') },
    { icon: Gauge, emoji: '⚙️', title: t('category5Title'), text: t('category5Text') },
    { icon: Snowflake, emoji: '❄️', title: t('category6Title'), text: t('category6Text') },
    { icon: Droplets, emoji: '💧', title: t('category7Title'), text: t('category7Text') },
    { icon: Cpu, emoji: '📡', title: t('category8Title'), text: t('category8Text') },
  ]

  const NOT_SELLING = [
    { title: t('notSelling1Title'), text: t('notSelling1Text') },
    { title: t('notSelling2Title'), text: t('notSelling2Text') },
    { title: t('notSelling3Title'), text: t('notSelling3Text') },
  ]

  const FAQ_PREVIEW = [
    { q: t('faqQ1'), a: t('faqA1') },
    { q: t('faqQ3'), a: t('faqA3') },
    { q: t('faqQ4'), a: t('faqA4') },
  ]

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('badgeComingSoon')}</span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-[3.5rem]">
            {t('pageTitle')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('pageSubtitle')}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/care#notifier"
              className="glow-gold group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              {t('ctaNotify')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/care/catalogue"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/40 bg-background/80 px-7 py-3.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold sm:w-auto"
            >
              {t('ctaCatalogue')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== How it works (4 steps) ===== */}
      <section id="comment" className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label inline-block">{t('howItWorksEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
              {t('howItWorksTitle')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('howItWorksSubtitle')}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => {
              const Icon = step.icon
              return (
                <div
                  key={step.num}
                  className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/40 shadow-[0_18px_40px_-22px_oklch(0.45_0.12_195/0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_55px_-22px_oklch(0.45_0.12_195/0.4)] dark:bg-white/[0.06] dark:border-white/15"
                >
                  <span className="pointer-events-none absolute right-4 top-3 font-display text-5xl font-bold text-gold/15">
                    {step.num}
                  </span>
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/30">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 flex items-center gap-2 font-display text-lg font-bold text-foreground">
                      <span aria-hidden="true">{step.emoji}</span>
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.text}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== Categories (8 cards) ===== */}
      <section id="categories" className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label inline-block">{t('categoriesEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
              {t('categoriesTitle')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('categoriesSubtitle')}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((card) => {
              const Icon = card.icon
              return (
                <div
                  key={card.title}
                  className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/40 shadow-[0_18px_40px_-22px_oklch(0.45_0.12_195/0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_55px_-22px_oklch(0.45_0.12_195/0.4)] dark:bg-white/[0.06] dark:border-white/15"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/30">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 flex items-center gap-2 font-display text-base font-bold text-foreground">
                      <span aria-hidden="true">{card.emoji}</span>
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {card.text}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== Not selling ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label inline-block">{t('notSellingEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
              {t('notSellingTitle')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('notSellingSubtitle')}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {NOT_SELLING.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/30 bg-white/40 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
                  <XCircle className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ preview ===== */}
      <section id="faq" className="relative py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <span className="section-label inline-block">{t('faqEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {t('faqTitle')}
            </h2>
          </div>

          <div className="mt-10 space-y-2.5">
            {FAQ_PREVIEW.map((item, idx) => (
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

      {/* ===== Notify form ===== */}
      <section id="notifier" className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/40 to-background" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            {/* Left: arguments */}
            <div>
              <span className="section-label inline-block">{t('notifyEyebrow')}</span>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {t('notifyTitle')}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t('notifySubtitle')}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/care/catalogue"
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-background/80 px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold"
                >
                  {t('ctaCatalogue')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Right: form */}
            <div>
              <NotifyForm />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
