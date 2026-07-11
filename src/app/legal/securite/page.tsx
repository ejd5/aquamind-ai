/**
 * AQWELIA — Page sécurité.
 * Server component — no client hooks.
 *
 * URL: /legal/securite
 *
 * Sécurité des données, chiffrement, conformité RGPD, bonnes pratiques.
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { ShieldCheck, Lock, KeyRound, ServerCog, Eye, RefreshCw } from 'lucide-react'
import { getTranslations, getLocale } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.securite')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/legal/securite' },
  }
}

const LAST_UPDATED_ISO = '2026-01-15'

export default async function SecuritePage() {
  const t = await getTranslations('legal.securite')
  const tLegal = await getTranslations('legal')
  const locale = await getLocale()
  const lastUpdated = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(LAST_UPDATED_ISO))

  const PILLARS = [
    { icon: Lock, title: t('pillar1Title'), desc: t('pillar1Desc') },
    { icon: KeyRound, title: t('pillar2Title'), desc: t('pillar2Desc') },
    { icon: ServerCog, title: t('pillar3Title'), desc: t('pillar3Desc') },
    { icon: Eye, title: t('pillar4Title'), desc: t('pillar4Desc') },
    { icon: RefreshCw, title: t('pillar5Title'), desc: t('pillar5Desc') },
    { icon: ShieldCheck, title: t('pillar6Title'), desc: t('pillar6Desc') },
  ]

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="section-label">{t('eyebrow')}</p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {tLegal('lastUpdatedLabel')} {lastUpdated}
        </p>
        <div className="gold-divider" />
      </header>

      <Section title={t('section1Title')}>
        <p>{t.rich('section1Body1', { bold: (chunks) => <strong>{chunks}</strong> })}</p>
        <p>{t('section1Body2')}</p>
      </Section>

      {/* Pillars grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PILLARS.map((p) => {
          const Icon = p.icon
          return (
            <div key={p.title} className="glass-card rounded-2xl p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-foreground">
                {p.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
            </div>
          )
        })}
      </section>

      <Section title={t('section2Title')}>
        <p>{t('section2Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t.rich('section2Item1', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section2Item2', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section2Item3', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section2Item4', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section2Item5', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
      </Section>

      <Section title={t('section3Title')}>
        <p>{t('section3Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('section3Item1')}</li>
          <li>{t('section3Item2')}</li>
          <li>{t('section3Item3')}</li>
          <li>{t('section3Item4')}</li>
        </ul>
        <p>
          {t.rich('section3Body2', {
            link: (chunks) => <Link href="/legal/privacy" className="text-gold underline">{chunks}</Link>,
          })}
        </p>
      </Section>

      <Section title={t('section4Title')}>
        <p>{t('section4Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('section4Item1')}</li>
          <li>{t('section4Item2')}</li>
          <li>{t('section4Item3')}</li>
          <li>{t('section4Item4')}</li>
          <li>{t('section4Item5')}</li>
        </ul>
      </Section>

      <Section title={t('section5Title')}>
        <p>{t('section5Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t.rich('section5Item1', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section5Item2', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section5Item3', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section5Item4', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
      </Section>

      <Section title={t('section6Title')}>
        <p>{t.rich('section6Body1', { bold: (chunks) => <strong>{chunks}</strong> })}</p>
        <p>
          {t.rich('section6Body2', {
            alink: (chunks) => <a href="mailto:security@aqwelia.app" className="text-gold underline">{chunks}</a>,
            link: (chunks) => <Link href="/legal/privacy" className="text-gold underline">{chunks}</Link>,
          })}
        </p>
        <p>{t('section6Body3')}</p>
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-2xl p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
        {children}
      </div>
    </section>
  )
}
