import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { getComplianceCopy } from '@/i18n/locales/compliance-copy'
import { LegalHeader, LegalSection } from '@/components/legal/legal-document'

export async function generateMetadata(): Promise<Metadata> {
  const copy = getComplianceCopy(await getLocale()).accessibility
  return { title: copy.metaTitle, description: copy.metaDescription, alternates: { canonical: '/legal/accessibilite' } }
}

export default async function AccessibilityPage() {
  const locale = await getLocale()
  const root = getComplianceCopy(locale)
  const copy = root.accessibility
  return <article className="space-y-8"><LegalHeader eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro} lastUpdatedLabel={root.common.lastUpdated} locale={locale} translationWarning={root.common.legalTranslationWarning} /><LegalSection title={copy.title} items={copy.items} /><LegalSection title={root.common.contact} paragraphs={[copy.contact]} /></article>
}
