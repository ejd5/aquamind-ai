/**
 * AQWELIA — Déclaration d'accessibilité.
 * Server component — no client hooks.
 *
 * URL: /legal/accessibilite
 *
 * Niveau de conformité WCAG, points conformes, points non conformes,
 * contact pour problèmes d'accessibilité. Conforme au schéma français
 * obligatoire pour les services de communication au public en ligne (RGAA).
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { Check, X, AlertCircle } from 'lucide-react'
import { getTranslations, getLocale } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.accessibilite')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/legal/accessibilite' },
  }
}

const LAST_UPDATED_ISO = '2026-01-15'

export default async function AccessibilitePage() {
  const t = await getTranslations('legal.accessibilite')
  const tLegal = await getTranslations('legal')
  const locale = await getLocale()
  const lastUpdated = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(LAST_UPDATED_ISO))

  const CONFORMANT = [
    t('conf1'), t('conf2'), t('conf3'), t('conf4'),
    t('conf5'), t('conf6'), t('conf7'), t('conf8'),
  ]
  const NON_CONFORMANT = [t('nonConf1'), t('nonConf2'), t('nonConf3'), t('nonConf4')]
  const DEROGATIONS = [t('derog1'), t('derog2')]

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
        <p>{t('section1Body3')}</p>
      </Section>

      <Section title={t('section2Title')}>
        <p>{t.rich('section2Body1', { bold: (chunks) => <strong>{chunks}</strong> })}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('section2Item1')}</li>
          <li>{t('section2Item2')}</li>
          <li>{t('section2Item3')}</li>
        </ul>
      </Section>

      <Section title={t('section3Title')}>
        <div className="space-y-2.5">
          {CONFORMANT.map((c) => (
            <div key={c} className="flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
                <Check className="h-3 w-3" />
              </span>
              <span className="text-sm text-muted-foreground">{c}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t('section4Title')}>
        <div className="space-y-2.5">
          {NON_CONFORMANT.map((c) => (
            <div key={c} className="flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-500">
                <X className="h-3 w-3" />
              </span>
              <span className="text-sm text-muted-foreground">{c}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs italic">{t('section4Body1')}</p>
      </Section>

      <Section title={t('section5Title')}>
        <div className="space-y-2.5">
          {DEROGATIONS.map((c) => (
            <div key={c} className="flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
                <AlertCircle className="h-3 w-3" />
              </span>
              <span className="text-sm text-muted-foreground">{c}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t('section6Title')}>
        <p>{t.rich('section6Body1', { bold: (chunks) => <strong>{chunks}</strong> })}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('section6Item1')}</li>
          <li>{t('section6Item2')}</li>
          <li>{t('section6Item3')}</li>
          <li>{t('section6Item4')}</li>
        </ul>
      </Section>

      <Section title={t('section7Title')}>
        <p>
          {t.rich('section7Body1', {
            alink: (chunks) => <a href="mailto:a11y@aqwelia.app" className="text-gold underline">{chunks}</a>,
          })}
        </p>
        <p>
          {t.rich('section7Body2', {
            link: (chunks) => <Link href="/contact" className="text-gold underline">{chunks}</Link>,
            link2: (chunks) => <Link href="/legal/support" className="text-gold underline">{chunks}</Link>,
          })}
        </p>
        <p>{t('section7Body3')}</p>
      </Section>

      <Section title={t('section8Title')}>
        <p>{t('section8Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            {t.rich('section8Item1', {
              alink: (chunks) => <a href="https://formulaire.defenseurdesdroits.fr/" className="text-gold underline" target="_blank" rel="noopener noreferrer">{chunks}</a>,
            })}
          </li>
          <li>{t('section8Item2')}</li>
          <li>{t('section8Item3')}</li>
        </ul>
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
