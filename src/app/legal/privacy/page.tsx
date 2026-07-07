/**
 * AQWELIA — Politique de confidentialité (RGPD).
 * Server component — no client hooks.
 *
 * URL: /legal/privacy
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { getTranslations, getLocale } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.privacy')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

const LAST_UPDATED_ISO = '2026-01-15'

export default async function PrivacyPage() {
  const t = await getTranslations('legal.privacy')
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

      <Section title={t('section1Title')}>
        <p>{t.rich('section1Body1', { bold: (chunks) => <strong>{chunks}</strong> })}</p>
        <p>
          {t.rich('section1Body2', {
            alink: (chunks) => <a href="mailto:privacy@aqwelia.app" className="text-gold underline">{chunks}</a>,
          })}
        </p>
      </Section>

      <Section title={t('section2Title')}>
        <p>{t('section2Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t.rich('section2Item1', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section2Item2', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section2Item3', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section2Item4', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section2Item5', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section2Item6', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section2Item7', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section2Item8', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
      </Section>

      <Section title={t('section3Title')}>
        <p>{t('section3Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('section3Item1')}</li>
          <li>{t('section3Item2')}</li>
          <li>{t('section3Item3')}</li>
          <li>{t('section3Item4')}</li>
          <li>{t('section3Item5')}</li>
          <li>{t('section3Item6')}</li>
        </ul>
      </Section>

      <Section title={t('section4Title')}>
        <p>{t('section4Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t.rich('section4Item1', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section4Item2', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section4Item3', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section4Item4', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
        <p>
          {t.rich('section4Body2', {
            link: (chunks) => <Link href="/settings" className="text-gold underline">{chunks}</Link>,
          })}
        </p>
      </Section>

      <Section title={t('section5Title')}>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t.rich('section5Item1', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section5Item2', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section5Item3', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section5Item4', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section5Item5', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
      </Section>

      <Section title={t('section6Title')}>
        <p>{t('section6Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t.rich('section6Item1', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section6Item2', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section6Item3', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section6Item4', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section6Item5', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section6Item6', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
        <p>{t('section6Body2')}</p>
      </Section>

      <Section title={t('section7Title')}>
        <p>{t('section7Body1')}</p>
      </Section>

      <Section title={t('section8Title')}>
        <p>{t('section8Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t.rich('section8Item1', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section8Item2', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section8Item3', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section8Item4', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section8Item5', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section8Item6', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section8Item7', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
        <p>
          {t.rich('section8Body2', {
            link: (chunks) => <Link href="/settings" className="text-gold underline">{chunks}</Link>,
            alink: (chunks) => <a href="mailto:privacy@aqwelia.app" className="text-gold underline">{chunks}</a>,
          })}
        </p>
        <p>{t('section8Body3')}</p>
      </Section>

      <Section title={t('section9Title')}>
        <p>{t('section9Body1')}</p>
        <p>
          {t.rich('section9Body2', {
            link: (chunks) => <Link href="/settings" className="text-gold underline">{chunks}</Link>,
          })}
        </p>
      </Section>

      <Section title={t('section10Title')}>
        <p>{t('section10Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('section10Item1')}</li>
          <li>{t('section10Item2')}</li>
          <li>{t('section10Item3')}</li>
          <li>{t('section10Item4')}</li>
          <li>{t('section10Item5')}</li>
        </ul>
        <p>{t('section10Body2')}</p>
      </Section>

      <Section title={t('section11Title')}>
        <p>{t('section11Body1')}</p>
        <p className="mt-2">
          <a
            href="mailto:privacy@aqwelia.app"
            className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
          >
            privacy@aqwelia.app
          </a>
        </p>
        <p className="mt-4 text-xs">
          {t.rich('section11Body2', {
            link: (chunks) => <Link href="/legal/cgu" className="text-gold underline">{chunks}</Link>,
            link2: (chunks) => <Link href="/legal/support" className="text-gold underline">{chunks}</Link>,
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
