/**
 * AQWELIA Partenaires — Main marketing page.
 *
 * URL: /partenaires
 * Server component (SEO-friendly). Renders:
 *  - Hero: badge + title + subtitle + CTA
 *  - 2 partner types (Fournisseurs Care + Piscinistes Pro) — large cards
 *  - Why partner with AQWELIA (4 benefits grid)
 *  - How it works (4 steps)
 *  - FAQ preview
 *  - CTA final "Postuler"
 *
 * Same DA as /care, /pro and the landing (glassmorphism, gold accents,
 * font-display, backdrop-blur).
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Sparkles,
  Store,
  Wrench,
  Users,
  TrendingUp,
  ShieldCheck,
  PackageOpen,
  ClipboardCheck,
  Handshake,
  Mail,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('partners')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function PartenairesPage() {
  const t = await getTranslations('partners')

  const PARTNER_TYPES = [
    {
      id: 'fournisseurs',
      icon: Store,
      emoji: '🛍️',
      title: t('typeFournisseursTitle'),
      text: t('typeFournisseursText'),
      cta: t('typeFournisseursCta'),
      href: '/partenaires/fournisseurs',
    },
    {
      id: 'piscinistes',
      icon: Wrench,
      emoji: '🔧',
      title: t('typePiscinistesTitle'),
      text: t('typePiscinistesText'),
      cta: t('typePiscinistesCta'),
      href: '/partenaires/piscinistes',
    },
  ]

  const BENEFITS = [
    {
      icon: Users,
      emoji: '👥',
      title: t('benefit1Title'),
      text: t('benefit1Text'),
    },
    {
      icon: TrendingUp,
      emoji: '📈',
      title: t('benefit2Title'),
      text: t('benefit2Text'),
    },
    {
      icon: ShieldCheck,
      emoji: '🛡️',
      title: t('benefit3Title'),
      text: t('benefit3Text'),
    },
    {
      icon: PackageOpen,
      emoji: '📦',
      title: t('benefit4Title'),
      text: t('benefit4Text'),
    },
  ]

  const STEPS = [
    {
      num: '1',
      icon: ClipboardCheck,
      emoji: '📝',
      title: t('step1Title'),
      text: t('step1Text'),
    },
    {
      num: '2',
      icon: Handshake,
      emoji: '🤝',
      title: t('step2Title'),
      text: t('step2Text'),
    },
    {
      num: '3',
      icon: PackageOpen,
      emoji: '🚀',
      title: t('step3Title'),
      text: t('step3Text'),
    },
    {
      num: '4',
      icon: TrendingUp,
      emoji: '💎',
      title: t('step4Title'),
      text: t('step4Text'),
    },
  ]

  const FAQ = [
    { q: t('faqQ1'), a: t('faqA1') },
    { q: t('faqQ2'), a: t('faqA2') },
    { q: t('faqQ3'), a: t('faqA3') },
  ]

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('badge')}</span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-[3.5rem]">
            {t('pageTitle')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('pageSubtitle')}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="#postuler"
              className="glow-gold group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              {t('ctaApply')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/affiliation"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/40 bg-background/80 px-7 py-3.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold sm:w-auto"
            >
              {t('ctaAffiliation')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Partner types (2 large cards) ===== */}
      <section id="fournisseurs" className="relative py-20 sm:py-28 scroll-mt-24">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label inline-block">{t('typesEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
              {t('typesTitle')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('typesSubtitle')}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {PARTNER_TYPES.map((card) => {
              const Icon = card.icon
              const isPisciniste = card.id === 'piscinistes'
              return (
                <div
                  key={card.id}
                  id={card.id}
                  className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/40 shadow-[0_18px_40px_-22px_oklch(0.45_0.12_195/0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_55px_-22px_oklch(0.45_0.12_195/0.4)] dark:bg-white/[0.06] dark:border-white/15 scroll-mt-24"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="p-8">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/30">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 flex items-center gap-2 font-display text-2xl font-bold text-foreground">
                      <span aria-hidden="true">{card.emoji}</span>
                      {card.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {card.text}
                    </p>
                    <Link
                      href={card.href}
                      className={`mt-6 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold transition-all ${
                        isPisciniste
                          ? 'border border-gold/40 bg-background/80 text-foreground hover:border-gold hover:text-gold'
                          : 'bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] text-[oklch(0.99_0.01_195)] shadow-lg shadow-primary/20 hover:scale-[1.02]'
                      }`}
                    >
                      {card.cta}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Piscinistes anchor (separate from fournisseurs anchor above) */}
          <div id="piscinistes" className="scroll-mt-24" />
        </div>
      </section>

      {/* ===== Benefits (4 cards) ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label inline-block">{t('benefitsEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
              {t('benefitsTitle')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('benefitsSubtitle')}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => {
              const Icon = b.icon
              return (
                <div
                  key={b.title}
                  className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/40 shadow-[0_18px_40px_-22px_oklch(0.45_0.12_195/0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_55px_-22px_oklch(0.45_0.12_195/0.4)] dark:bg-white/[0.06] dark:border-white/15"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/30">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 flex items-center gap-2 font-display text-base font-bold text-foreground">
                      <span aria-hidden="true">{b.emoji}</span>
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

      {/* ===== How it works (4 steps) ===== */}
      <section className="relative py-20 sm:py-28">
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

      {/* ===== FAQ preview ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <span className="section-label inline-block">{t('faqEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {t('faqTitle')}
            </h2>
          </div>
          <div className="mt-10 space-y-3">
            {FAQ.map((item, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-border/60 bg-card/40 px-5 py-4 transition-colors hover:bg-white/70 open:border-gold/40 open:bg-white/70 dark:hover:bg-white/[0.06] dark:open:bg-white/[0.08]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-display text-base font-semibold text-foreground">
                  <span>{item.q}</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold/15 text-gold transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            <Mail className="mr-1.5 inline h-4 w-4 text-gold" />
            {t('faqContact')}{' '}
            <a href="mailto:partenaires@aqwelia.app" className="font-medium text-foreground underline hover:text-gold">
              partenaires@aqwelia.app
            </a>
          </p>
        </div>
      </section>

      {/* ===== Final CTA — Apply ===== */}
      <section id="postuler" className="relative py-20 sm:py-28 scroll-mt-24">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-gold/5 to-background" />
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-secondary/40 to-background p-8 text-center shadow-2xl sm:p-12">
            <div className="aurora-orb -right-12 -top-12 h-48 w-48 bg-gold/30" />
            <span className="section-label inline-block">{t('finalCtaEyebrow')}</span>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
              {t('finalCtaTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('finalCtaSubtitle')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/partenaires/fournisseurs"
                className="glow-gold group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] sm:w-auto"
              >
                <Store className="h-4 w-4" />
                {t('finalCtaFournisseurs')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/partenaires/piscinistes"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/40 bg-background/80 px-7 py-3.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold sm:w-auto"
              >
                <Wrench className="h-4 w-4" />
                {t('finalCtaPiscinistes')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
