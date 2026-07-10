/**
 * AQWELIA — Politique cookies.
 * Server component — no client hooks.
 *
 * URL: /legal/cookies
 *
 * Liste des cookies utilisés, consentement, gestion des préférences.
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { getTranslations, getLocale } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.cookies')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/legal/cookies' },
  }
}

const LAST_UPDATED_ISO = '2026-01-15'

export default async function CookiesPage() {
  const t = await getTranslations('legal.cookies')
  const tLegal = await getTranslations('legal')
  const locale = await getLocale()
  const lastUpdated = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(LAST_UPDATED_ISO))

  // Cookie inventory: name | provider | purpose | duration | category
  const COOKIES = [
    { name: 'aqwelia_session', purpose: t('cookie1Purpose'), duration: t('cookie1Duration'), category: t('catEssential') },
    { name: 'aqwelia_locale', purpose: t('cookie2Purpose'), duration: t('cookie2Duration'), category: t('catEssential') },
    { name: 'aqwelia_theme', purpose: t('cookie3Purpose'), duration: t('cookie3Duration'), category: t('catEssential') },
    { name: 'aqwelia_consent', purpose: t('cookie4Purpose'), duration: t('cookie4Duration'), category: t('catEssential') },
    { name: '_ga / _ga_*', purpose: t('cookie5Purpose'), duration: t('cookie5Duration'), category: t('catAnalytics') },
    { name: '_gid', purpose: t('cookie6Purpose'), duration: t('cookie6Duration'), category: t('catAnalytics') },
    { name: 'rc_id / rc_*', purpose: t('cookie7Purpose'), duration: t('cookie7Duration'), category: t('catFunctional') },
    { name: 'stripe_*', purpose: t('cookie8Purpose'), duration: t('cookie8Duration'), category: t('catFunctional') },
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
        <p>{t('section1Body1')}</p>
        <p>{t.rich('section1Body2', { bold: (chunks) => <strong>{chunks}</strong> })}</p>
      </Section>

      <Section title={t('section2Title')}>
        <p>{t('section2Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t.rich('section2Item1', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section2Item2', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section2Item3', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section2Item4', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
      </Section>

      <Section title={t('section3Title')}>
        <div className="overflow-x-auto custom-scroll rounded-xl border border-border/40">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/30">
                <th className="p-3 text-left font-display font-bold text-foreground">{t('tableColName')}</th>
                <th className="p-3 text-left font-display font-bold text-foreground">{t('tableColPurpose')}</th>
                <th className="p-3 text-left font-display font-bold text-foreground">{t('tableColDuration')}</th>
                <th className="p-3 text-left font-display font-bold text-foreground">{t('tableColCategory')}</th>
              </tr>
            </thead>
            <tbody>
              {COOKIES.map((c) => (
                <tr key={c.name} className="border-b border-border/30 last:border-0">
                  <td className="p-3 font-mono text-[11px] text-foreground">{c.name}</td>
                  <td className="p-3 text-muted-foreground">{c.purpose}</td>
                  <td className="p-3 text-muted-foreground">{c.duration}</td>
                  <td className="p-3">
                    <span className="inline-block rounded-full bg-gold/10 px-2.5 py-0.5 text-[10px] font-semibold text-gold">
                      {c.category}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={t('section4Title')}>
        <p>{t('section4Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('section4Item1')}</li>
          <li>{t('section4Item2')}</li>
          <li>{t('section4Item3')}</li>
        </ul>
        <p>
          {t.rich('section4Body2', {
            link: (chunks) => <Link href="/settings" className="text-gold underline">{chunks}</Link>,
          })}
        </p>
      </Section>

      <Section title={t('section5Title')}>
        <p>{t('section5Body1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t.rich('section5Item1', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section5Item2', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
          <li>{t.rich('section5Item3', { bold: (chunks) => <strong>{chunks}</strong> })}</li>
        </ul>
        <p>{t('section5Body2')}</p>
      </Section>

      <Section title={t('section6Title')}>
        <p>
          {t.rich('section6Body1', {
            link: (chunks) => <Link href="/contact" className="text-gold underline">{chunks}</Link>,
          })}
        </p>
        <p>
          {t.rich('section6Body2', {
            link: (chunks) => <Link href="/legal/privacy" className="text-gold underline">{chunks}</Link>,
          })}
        </p>
        <p>
          {t.rich('section6Body3', {
            alink: (chunks) => <a href="mailto:privacy@aqwelia.app" className="text-gold underline">{chunks}</a>,
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
