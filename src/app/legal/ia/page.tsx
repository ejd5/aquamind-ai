import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { getComplianceCopy } from '@/i18n/locales/compliance-copy'
import { LegalHeader, LegalSection } from '@/components/legal/legal-document'

export async function generateMetadata(): Promise<Metadata> {
  const copy = getComplianceCopy(await getLocale()).ai
  return { title: copy.metaTitle, description: copy.metaDescription, alternates: { canonical: '/legal/ia' } }
}

export default async function AITransparencyPage() {
  const locale = await getLocale()
  const root = getComplianceCopy(locale)
  const copy = root.ai
  return (
    <article className="space-y-8">
      <LegalHeader eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro} lastUpdatedLabel={root.common.lastUpdated} locale={locale} translationWarning={root.common.legalTranslationWarning} />
      {copy.sections.map((section) => <LegalSection key={section.title} title={section.title} paragraphs={'paragraphs' in section ? section.paragraphs : []} items={'items' in section ? section.items : []} />)}
    </article>
  )
}
