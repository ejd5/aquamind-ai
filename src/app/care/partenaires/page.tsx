/**
 * AQWELIA Care — Supplier partners page.
 *
 * URL: /care/partenaires
 * Server component. Renders the list of regulated-biocide partner suppliers
 * (the only place where users can buy red-category products) + the partner
 * application CTA. Mirrors the existing /partenaires marketing surface but
 * scoped to Care.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, Store, ArrowRight, Building2, Handshake, ShieldCheck } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('care')
  return {
    title: t('partnersMetaTitle'),
    description: t('partnersMetaDescription'),
  }
}

export default async function CarePartenairesPage() {
  const t = await getTranslations('care')

  const PARTNERS = [
    { name: 'AquaChem Pro', specialty: t('partnersSpecChemicals'), regions: 'FR · BE · LU' },
    { name: 'FiltraPure Distribution', specialty: t('partnersSpecFilters'), regions: 'FR · ES' },
    { name: 'WinterPool France', specialty: t('partnersSpecWinter'), regions: 'FR · CH' },
    { name: 'SensorPool Network', specialty: t('partnersSpecSensors'), regions: 'EU' },
  ]

  const BENEFITS = [
    { icon: ShieldCheck, title: t('partnersBenefit1Title'), text: t('partnersBenefit1Text') },
    { icon: Store, title: t('partnersBenefit2Title'), text: t('partnersBenefit2Text') },
    { icon: Handshake, title: t('partnersBenefit3Title'), text: t('partnersBenefit3Text') },
  ]

  return (
    <>
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('partnersEyebrow')}</span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[3rem]">
            {t('partnersTitle')}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('partnersSubtitle')}
          </p>
        </div>
      </section>

      <section className="relative py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
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

      <section className="relative py-8 sm:py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t('partnersListTitle')}
          </h2>
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PARTNERS.map((p) => (
              <li
                key={p.name}
                className="flex items-start gap-3 rounded-xl border border-white/40 bg-white/50 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]"
              >
                <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                <div>
                  <div className="text-sm font-semibold text-foreground">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.specialty}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {p.regions}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-white/40 p-8 backdrop-blur-xl dark:bg-white/[0.04] sm:p-10">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <Sparkles className="mx-auto h-6 w-6 text-gold" />
            <h2 className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              {t('partnersApplyTitle')}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t('partnersApplySubtitle')}
            </p>
            <Link
              href="/partenaires/fournisseurs"
              className="glow-gold group mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl"
            >
              {t('partnersApplyCta')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
