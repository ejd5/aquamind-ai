/**
 * AQWELIA Affiliation — Standalone program page.
 *
 * URL: /affiliation
 * Server component (SEO-friendly). Pitch: rules of the program, commissions,
 * how it works, sign-up.
 *
 * This page lives OUTSIDE the /partenaires/* layout so it renders its own
 * minimal header (logo + back-home link) and the shared Footer.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  BadgeDollarSign,
  ClipboardCheck,
  Link2,
  Users,
  ShieldCheck,
  Handshake,
  Gift,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Footer } from '@/components/aquamind/footer'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('partners')
  return {
    title: t('affiliationMetaTitle'),
    description: t('affiliationMetaDescription'),
  }
}

export default async function AffiliationPage() {
  const t = await getTranslations('partners')

  const RULES = [
    t('affiliationRule1'),
    t('affiliationRule2'),
    t('affiliationRule3'),
    t('affiliationRule4'),
    t('affiliationRule5'),
  ]

  const STEPS = [
    { num: '1', icon: ClipboardCheck, emoji: '📝', title: t('affStep1Title'), text: t('affStep1Text') },
    { num: '2', icon: Link2, emoji: '🔗', title: t('affStep2Title'), text: t('affStep2Text') },
    { num: '3', icon: Users, emoji: '🤝', title: t('affStep3Title'), text: t('affStep3Text') },
    { num: '4', icon: BadgeDollarSign, emoji: '💰', title: t('affStep4Title'), text: t('affStep4Text') },
  ]

  const FAQ = [
    { q: t('affFaqQ1'), a: t('affFaqA1') },
    { q: t('affFaqQ2'), a: t('affFaqA2') },
    { q: t('affFaqQ3'), a: t('affFaqA3') },
  ]

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Minimal header */}
      <header className="safe-area-top sticky top-0 z-40 border-b border-gold/20 bg-background/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/partenaires"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('ctaBackPartners')}</span>
          </Link>
          <Link href="/partenaires" className="flex items-center gap-2" aria-label="AQWELIA Partenaires">
            <img src="/logo-aqwelia-web.png" alt="AQWELIA" className="h-10 w-auto object-contain" />
            <div className="leading-tight">
              <div className="font-display text-base font-bold tracking-tight">
                <span className="aqua-text-gradient">AQWELIA</span>{' '}
                <span className="text-gold">{t('affiliationBrandSuffix')}</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {t('affiliationBadge')}
              </div>
            </div>
            <Gift className="h-4 w-4 text-gold" />
          </Link>
          <Link
            href="/partenaires/piscinistes#postuler"
            className="glow-gold group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-4 py-2 text-xs font-bold text-[oklch(0.99_0.01_195)] shadow-md transition-all hover:scale-[1.03]"
          >
            <Sparkles className="h-3 w-3" />
            {t('navApply')}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <span className="section-label inline-block">{t('affiliationBadge')}</span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-[3.5rem]">
              {t('affiliationTitle')}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('affiliationSubtitle')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/partenaires/piscinistes#postuler"
                className="glow-gold group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] sm:w-auto"
              >
                <Sparkles className="h-4 w-4" />
                {t('affiliationCta')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>

        {/* Commission highlight */}
        <section className="relative py-16 sm:py-20">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-secondary/40 to-background p-8 text-center shadow-xl sm:p-12">
              <div className="aurora-orb -right-12 -top-12 h-48 w-48 bg-gold/30" />
              <span className="section-label inline-block">{t('affiliationCommissionEyebrow')}</span>
              <div className="mt-4 font-display text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
                <span className="aqua-text-gradient">{t('affiliationCommissionRate')}</span>
              </div>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t('affiliationCommissionSubtitle')}
              </p>
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { icon: BadgeDollarSign, emoji: '💸', label: t('affiliationStat1Label'), value: t('affiliationStat1Value') },
                  { icon: Users, emoji: '🤝', label: t('affiliationStat2Label'), value: t('affiliationStat2Value') },
                  { icon: ShieldCheck, emoji: '🛡️', label: t('affiliationStat3Label'), value: t('affiliationStat3Value') },
                ].map((s) => {
                  const Icon = s.icon
                  return (
                    <div key={s.label} className="rounded-2xl border border-border/60 bg-card/40 p-5 text-center">
                      <Icon className="mx-auto h-5 w-5 text-gold" />
                      <div className="mt-2 font-display text-2xl font-bold text-foreground">{s.value}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="relative py-20 sm:py-28">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <span className="section-label inline-block">{t('affiliationStepsEyebrow')}</span>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {t('affiliationStepsTitle')}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t('affiliationStepsSubtitle')}
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step) => {
                const Icon = step.icon
                return (
                  <div
                    key={step.num}
                    className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/40 shadow-[0_18px_40px_-22px_oklch(0.45_0.12_195/0.25)] transition-all duration-300 hover:-translate-y-1 dark:bg-white/[0.06] dark:border-white/15"
                  >
                    <span className="pointer-events-none absolute right-4 top-3 font-display text-5xl font-bold text-gold/15">{step.num}</span>
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/30">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 flex items-center gap-2 font-display text-lg font-bold text-foreground">
                        <span aria-hidden="true">{step.emoji}</span>
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Rules */}
        <section className="relative py-20 sm:py-28">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="text-center">
              <span className="section-label inline-block">{t('affiliationRulesEyebrow')}</span>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {t('affiliationRulesTitle')}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                {t('affiliationRulesSubtitle')}
              </p>
            </div>
            <ul className="mt-10 space-y-3">
              {RULES.map((rule, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/40 px-5 py-4"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold to-primary text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-foreground">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="relative py-20 sm:py-28">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="text-center">
              <span className="section-label inline-block">{t('affiliationFaqEyebrow')}</span>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {t('affiliationFaqTitle')}
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
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA — Sign-up */}
        <section className="relative py-20 sm:py-28">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-gold/5 to-background" />
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-secondary/40 to-background p-8 text-center shadow-2xl sm:p-12">
              <div className="aurora-orb -right-12 -top-12 h-48 w-48 bg-gold/30" />
              <Handshake className="mx-auto h-12 w-12 text-gold" />
              <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {t('affiliationFinalTitle')}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t('affiliationFinalSubtitle')}
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/partenaires/piscinistes#postuler"
                  className="glow-gold group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] sm:w-auto"
                >
                  <Sparkles className="h-4 w-4" />
                  {t('affiliationFinalCta')}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/partenaires"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/40 bg-background/80 px-7 py-3.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold sm:w-auto"
                >
                  {t('ctaBackPartners')}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
