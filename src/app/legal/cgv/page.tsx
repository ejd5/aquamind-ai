/**
 * AQWELIA — Conditions Générales de Vente (CGV).
 * Server component — no client hooks.
 *
 * URL: /legal/cgv
 *
 * Adapté pour abonnements digitaux (Découverte/Oasis/Wellness) + marketplace
 * future AQWELIA Care.
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { getTranslations, getLocale } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.cgv')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/legal/cgv' },
  }
}

const LAST_UPDATED_ISO = '2026-01-15'

export default async function CGVPage() {
  const t = await getTranslations('legal.cgv')
  const tLegal = await getTranslations('legal')
  const locale = await getLocale()
  const lastUpdated = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(LAST_UPDATED_ISO))

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

      <Section title={t('article1Title')}>
        <p>{t('article1Body1')}</p>
        <p>{t('article1Body2')}</p>
      </Section>

      <Section title={t('article2Title')}>
        <p>{t('article2Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('article2Item1')}</li>
          <li>{t('article2Item2')}</li>
          <li>{t('article2Item3')}</li>
        </ul>
      </Section>

      <Section title={t('article3Title')}>
        <p>{t.rich('article3Body1', { bold: (chunks) => <strong>{chunks}</strong> })}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('article3Item1')}</li>
          <li>{t('article3Item2')}</li>
          <li>{t('article3Item3')}</li>
        </ul>
        <p>{t('article3Body2')}</p>
      </Section>

      <Section title={t('article4Title')}>
        <p>{t('article4Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('article4Item1')}</li>
          <li>{t('article4Item2')}</li>
          <li>{t('article4Item3')}</li>
          <li>{t('article4Item4')}</li>
        </ul>
      </Section>

      <Section title={t('article5Title')}>
        <p>{t('article5Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('article5Item1')}</li>
          <li>{t('article5Item2')}</li>
          <li>{t('article5Item3')}</li>
        </ul>
        <p>{t('article5Body2')}</p>
      </Section>

      <Section title={t('article6Title')}>
        <p>{t.rich('article6Body1', { bold: (chunks) => <strong>{chunks}</strong> })}</p>
        <p>{t('article6Body2')}</p>
        <p>{t('article6Body3')}</p>
      </Section>

      <Section title={t('article7Title')}>
        <p>{t('article7Body1')}</p>
        <p>{t('article7Body2')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('article7Item1')}</li>
          <li>{t('article7Item2')}</li>
        </ul>
      </Section>

      <Section title={t('article8Title')}>
        <p>{t('article8Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('article8Item1')}</li>
          <li>{t('article8Item2')}</li>
          <li>{t('article8Item3')}</li>
        </ul>
        <p>
          {t.rich('article8Body2', {
            link: (chunks) => <Link href="/legal/privacy" className="text-gold underline">{chunks}</Link>,
          })}
        </p>
      </Section>

      <Section title={t('article9Title')}>
        <p>{t('article9Body1')}</p>
        <p>{t('article9Body2')}</p>
        <p>{t('article9Body3')}</p>
      </Section>

      <Section title={t('article10Title')}>
        <p>{t('article10Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('article10Item1')}</li>
          <li>{t('article10Item2')}</li>
          <li>{t('article10Item3')}</li>
        </ul>
        <p>{t('article10Body2')}</p>
      </Section>

      <Section title={t('article11Title')}>
        <p>{t('article11Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('article11Item1')}</li>
          <li>{t('article11Item2')}</li>
          <li>{t('article11Item3')}</li>
          <li>{t('article11Item4')}</li>
        </ul>
      </Section>

      <Section title={t('article12Title')}>
        <p>
          {t.rich('article12Body1', {
            link: (chunks) => <Link href="/legal/privacy" className="text-gold underline">{chunks}</Link>,
          })}
        </p>
        <p>
          {t.rich('article12Body2', {
            link: (chunks) => <Link href="/legal/cgu" className="text-gold underline">{chunks}</Link>,
            link2: (chunks) => <Link href="/legal/privacy" className="text-gold underline">{chunks}</Link>,
          })}
        </p>
      </Section>

      <Section title={t('article13Title')}>
        <p>{t('article13Body1')}</p>
        <p>{t('article13Body2')}</p>
      </Section>

      <Section title={t('article14Title')}>
        <p>
          {t.rich('article14Body1', {
            alink: (chunks) => <a href="mailto:legal@aqwelia.app" className="text-gold underline">{chunks}</a>,
            link: (chunks) => <Link href="/legal/support" className="text-gold underline">{chunks}</Link>,
          })}
        </p>
        <p>
          {t.rich('article14Body2', {
            alink: (chunks) => <a href="mailto:legal@aqwelia.app" className="text-gold underline">{chunks}</a>,
            link: (chunks) => <Link href="/legal/support" className="text-gold underline">{chunks}</Link>,
          })}
        </p>
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
