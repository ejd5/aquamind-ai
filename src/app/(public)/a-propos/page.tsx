/**
 * AQWELIA — Page /a-propos
 *
 * Histoire d'AQWELIA (Aqua + Well + IA), mission, équipe (placeholder),
 * valeurs, contact.
 *
 * Server component — no client hooks. Same DA as the landing page
 * (glassmorphism, gold accents, font-display, transparent background).
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { Droplets, Heart, Brain, Sparkles, Globe2, ShieldCheck, ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('aPropos')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/a-propos' },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
    },
  }
}

export default async function AProposPage() {
  const t = await getTranslations('aPropos')

  const VALUES = [
    { icon: Droplets, title: t('val1Title'), desc: t('val1Desc') },
    { icon: Heart, title: t('val2Title'), desc: t('val2Desc') },
    { icon: Brain, title: t('val3Title'), desc: t('val3Desc') },
    { icon: ShieldCheck, title: t('val4Title'), desc: t('val4Desc') },
    { icon: Globe2, title: t('val5Title'), desc: t('val5Desc') },
    { icon: Sparkles, title: t('val6Title'), desc: t('val6Desc') },
  ]

  const TEAM = [
    { name: t('team1Name'), role: t('team1Role'), initials: 'A' },
    { name: t('team2Name'), role: t('team2Role'), initials: 'B' },
    { name: t('team3Name'), role: t('team3Role'), initials: 'C' },
    { name: t('team4Name'), role: t('team4Role'), initials: 'D' },
  ]

  return (
    <article>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="section-label">{t('heroEyebrow')}</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {t('heroTitle')}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('heroSubtitle')}
          </p>
          <div className="gold-divider mt-12" />
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="glass-card rounded-2xl p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {t('storyTitle')}
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>{t('storyP1')}</p>
              <p>{t('storyP2')}</p>
              <p>{t('storyP3')}</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {t('nameTitle')}
            </h2>
            <div className="mt-4 space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="font-display text-base font-bold text-gold">AQUA</p>
                <p className="mt-1 text-xs leading-relaxed">{t('nameAqua')}</p>
              </div>
              <div>
                <p className="font-display text-base font-bold text-gold">WELL</p>
                <p className="mt-1 text-xs leading-relaxed">{t('nameWell')}</p>
              </div>
              <div>
                <p className="font-display text-base font-bold text-gold">IA</p>
                <p className="mt-1 text-xs leading-relaxed">{t('nameIa')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="glass-card relative overflow-hidden rounded-3xl p-8 sm:p-12">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
          <p className="section-label">{t('missionEyebrow')}</p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {t('missionTitle')}
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('missionBody')}
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="mb-8 text-center">
          <p className="section-label">{t('valuesEyebrow')}</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('valuesTitle')}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((v) => {
            const Icon = v.icon
            return (
              <div key={v.title} className="glass-card rounded-2xl p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-foreground">
                  {v.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{v.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Team (placeholder) */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="mb-8 text-center">
          <p className="section-label">{t('teamEyebrow')}</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('teamTitle')}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">{t('teamSubtitle')}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {TEAM.map((member) => (
            <div key={member.name} className="glass-card rounded-2xl p-5 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold/30 to-gold/5 font-display text-2xl font-bold text-gold">
                {member.initials}
              </div>
              <h3 className="mt-3 font-display text-sm font-bold tracking-tight text-foreground">
                {member.name}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact / CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="glass-card rounded-3xl p-10 text-center sm:p-14">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('ctaTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            {t('ctaSubtitle')}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className="glow-gold inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-lg shadow-primary/20 transition-all hover:scale-[1.03]"
            >
              {t('ctaPrimary')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/fonctionnalites"
              className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-7 py-3.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
            >
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>
    </article>
  )
}
