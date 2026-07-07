/**
 * AQWELIA — Conditions Générales d'Utilisation (CGU).
 * Server component — no client hooks.
 *
 * URL: /legal/cgu
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { getTranslations, getLocale } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.cgu')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

const LAST_UPDATED_ISO = '2026-01-15'

export default async function CGUPage() {
  const t = await getTranslations('legal.cgu')
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
        <p>{t.rich('article1Body1', { bold: (chunks) => <strong>{chunks}</strong> })}</p>
        <p>{t('article1Body2')}</p>
      </Section>

      <Section title={t('article2Title')}>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t.rich('article2Item1', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('article2Item2', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('article2Item3', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('article2Item4', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('article2Item5', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
      </Section>

      <Section title={t('article3Title')}>
        <p>{t('article3Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('article3Item1')}</li>
          <li>{t('article3Item2')}</li>
          <li>{t('article3Item3')}</li>
          <li>{t('article3Item4')}</li>
          <li>{t('article3Item5')}</li>
          <li>{t('article3Item6')}</li>
        </ul>
        <p>{t('article3Body2')}</p>
      </Section>

      <Section title={t('article4Title')}>
        <p>{t('article4Body1')}</p>
        <p>{t('article4Body2')}</p>
        <p>{t('article4Body3')}</p>
      </Section>

      <Section title={t('article5Title')}>
        <p>{t('article5Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('article5Item1')}</li>
          <li>{t('article5Item2')}</li>
          <li>{t('article5Item3')}</li>
          <li>{t('article5Item4')}</li>
        </ul>
        <p>{t('article5Body2')}</p>
      </Section>

      <Section title={t('article6Title')}>
        <p>{t('article6Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t.rich('article6Item1', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('article6Item2', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('article6Item3', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
        <p>
          {t.rich('article6Body2', {
            link: (chunks) => <Link href="/#tarifs" className="text-gold underline">{chunks}</Link>,
          })}
        </p>
      </Section>

      <Section title={t('article7Title')}>
        <p>{t('article7Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t.rich('article7Item1', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('article7Item2', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('article7Item3', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
        <p>{t('article7Body2')}</p>
      </Section>

      <Section title={t('article8Title')}>
        <p>
          {t.rich('article8Body1', {
            link: (chunks) => <Link href="/settings" className="text-gold underline">{chunks}</Link>,
          })}
        </p>
        <p>{t('article8Body2')}</p>
      </Section>

      <Section title={t('article9Title')}>
        <p>
          {t.rich('article9Body1', {
            link: (chunks) => <Link href="/legal/privacy" className="text-gold underline">{chunks}</Link>,
          })}
        </p>
        <p>
          {t.rich('article9Body2', {
            link: (chunks) => <Link href="/settings" className="text-gold underline">{chunks}</Link>,
            alink: (chunks) => <a href="mailto:privacy@aqwelia.app" className="text-gold underline">{chunks}</a>,
          })}
        </p>
      </Section>

      <Section title={t('article10Title')}>
        <p>{t('article10Body1')}</p>
        <p>{t('article10Body2')}</p>
      </Section>

      <Section title={t('article11Title')}>
        <p>{t('article11Body1')}</p>
        <p>{t('article11Body2')}</p>
      </Section>

      <Section title={t('article12Title')}>
        <p>{t('article12Body1')}</p>
      </Section>

      <Section title={t('article13Title')}>
        <p>{t('article13Body1')}</p>
      </Section>

      <Section title={t('contactTitle')}>
        <p>
          {t.rich('contactBody1', {
            alink: (chunks) => <a href="mailto:legal@aqwelia.app" className="text-gold underline">{chunks}</a>,
          })}
        </p>
        <p>
          {t.rich('contactBody2', {
            alink: (chunks) => <a href="mailto:privacy@aqwelia.app" className="text-gold underline">{chunks}</a>,
          })}
        </p>
        <p>
          {t.rich('contactBody3', {
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
