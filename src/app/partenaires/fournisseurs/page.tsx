/**
 * AQWELIA Partenaires — Fournisseurs (Care marketplace sellers).
 *
 * URL: /partenaires/fournisseurs
 * Server component (SEO-friendly). Pitch: "Vendez vos produits via AQWELIA Care".
 *
 * Sections: Hero → Avantages (4 cards) → Comment ça marche (4 steps) →
 * Formulaire de candidature → CTA final.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Store, Users, ShieldCheck, PackageOpen, TrendingUp, ClipboardCheck, Handshake, Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { ApplyForm } from '../apply-form'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('partners')
  return {
    title: t('fournisseursMetaTitle'),
    description: t('fournisseursMetaDescription'),
  }
}

export default async function FournisseursPage() {
  const t = await getTranslations('partners')

  const ADVANTAGES = [
    { icon: Users, emoji: '👥', title: t('fAv1Title'), text: t('fAv1Text') },
    { icon: TrendingUp, emoji: '📈', title: t('fAv2Title'), text: t('fAv2Text') },
    { icon: ShieldCheck, emoji: '🛡️', title: t('fAv3Title'), text: t('fAv3Text') },
    { icon: PackageOpen, emoji: '📦', title: t('fAv4Title'), text: t('fAv4Text') },
  ]

  const STEPS = [
    { num: '1', icon: ClipboardCheck, emoji: '📝', title: t('fStep1Title'), text: t('fStep1Text') },
    { num: '2', icon: Handshake, emoji: '🤝', title: t('fStep2Title'), text: t('fStep2Text') },
    { num: '3', icon: PackageOpen, emoji: '📦', title: t('fStep3Title'), text: t('fStep3Text') },
    { num: '4', icon: TrendingUp, emoji: '💰', title: t('fStep4Title'), text: t('fStep4Text') },
  ]

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('fournisseursBadge')}</span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-[3.5rem]">
            {t('fournisseursTitle')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('fournisseursSubtitle')}
          </p>
          <div className="mt-8">
            <Link
              href="#postuler"
              className="glow-gold group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] sm:w-auto"
            >
              <Store className="h-4 w-4" />
              {t('fournisseursCta')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label inline-block">{t('fournisseursAvEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {t('fournisseursAvTitle')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('fournisseursAvSubtitle')}
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ADVANTAGES.map((a) => {
              const Icon = a.icon
              return (
                <div
                  key={a.title}
                  className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/40 shadow-[0_18px_40px_-22px_oklch(0.45_0.12_195/0.25)] transition-all duration-300 hover:-translate-y-1 dark:bg-white/[0.06] dark:border-white/15"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/30">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 flex items-center gap-2 font-display text-base font-bold text-foreground">
                      <span aria-hidden="true">{a.emoji}</span>
                      {a.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label inline-block">{t('fournisseursStepsEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {t('fournisseursStepsTitle')}
            </h2>
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

      {/* Application form */}
      <section id="postuler" className="relative py-20 sm:py-28 scroll-mt-24">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-gold/5 to-background" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="section-label inline-block">{t('formEyebrow')}</span>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {t('formFournisseursTitle')}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                {t('formFournisseursSubtitle')}
              </p>
              <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                {[t('fBullet1'), t('fBullet2'), t('fBullet3')].map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-gold/20 bg-card/60 p-6 backdrop-blur-md shadow-xl sm:p-8">
              <ApplyForm type="fournisseur" />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
