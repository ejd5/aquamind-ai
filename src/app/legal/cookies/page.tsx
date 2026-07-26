import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { CookiePreferencesButton } from '@/components/privacy/cookie-preferences-button'
import { getComplianceCopy } from '@/i18n/locales/compliance-copy'
import { LegalHeader, LegalSection } from '@/components/legal/legal-document'

export async function generateMetadata(): Promise<Metadata> {
  const copy = getComplianceCopy(await getLocale()).cookies
  return { title: copy.metaTitle, description: copy.metaDescription, alternates: { canonical: '/legal/cookies' } }
}

export default async function CookiesPage() {
  const locale = await getLocale()
  const root = getComplianceCopy(locale)
  const copy = root.cookies
  return (
    <article className="space-y-8">
      <LegalHeader eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro} lastUpdatedLabel={root.common.lastUpdated} locale={locale} translationWarning={root.common.legalTranslationWarning} />
      <LegalSection title={copy.necessaryTitle} paragraphs={[copy.manageBody]}>
        <CookiePreferencesButton className="inline-flex min-h-11 items-center rounded-full border border-gold/40 bg-gold/10 px-5 text-sm font-bold text-gold hover:bg-gold/20">
          {root.common.manageCookies}
        </CookiePreferencesButton>
      </LegalSection>
      <LegalSection title={copy.analyticsTitle}>
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs sm:text-sm">
            <thead className="bg-secondary/50"><tr>{copy.tableHeaders.map((header) => <th key={header} className="p-3 font-bold text-foreground">{header}</th>)}</tr></thead>
            <tbody>{copy.rows.map((row) => <tr key={row[0]} className="border-t border-border/50">{row.map((cell, index) => <td key={`${row[0]}-${index}`} className={index === 0 ? 'p-3 font-mono text-[11px] text-foreground' : 'p-3 text-muted-foreground'}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <p>{copy.thirdParties}</p>
      </LegalSection>
    </article>
  )
}
