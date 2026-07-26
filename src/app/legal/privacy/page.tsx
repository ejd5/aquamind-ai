import type { Metadata } from 'next'
import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { getComplianceCopy } from '@/i18n/locales/compliance-copy'
import { LegalHeader, LegalSection } from '@/components/legal/legal-document'

export async function generateMetadata(): Promise<Metadata> {
  const copy = getComplianceCopy(await getLocale()).privacy
  return { title: copy.metaTitle, description: copy.metaDescription, alternates: { canonical: '/legal/privacy' } }
}

export default async function PrivacyPage() {
  const locale = await getLocale()
  const root = getComplianceCopy(locale)
  const copy = root.privacy
  return (
    <article className="space-y-8">
      <LegalHeader eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro} lastUpdatedLabel={root.common.lastUpdated} locale={locale} translationWarning={root.common.legalTranslationWarning} />
      {copy.sections.map((section) => (
        <LegalSection key={section.title} title={section.title} paragraphs={'paragraphs' in section ? section.paragraphs : []} items={'items' in section ? section.items : []} />
      ))}
      <LegalSection title={root.common.contact}>
        <p><a href="mailto:privacy@aqwelia.app" className="font-semibold text-gold underline">privacy@aqwelia.app</a></p>
        <p><Link href="/legal/sous-traitants" className="text-gold underline">{root.common.processorsLink}</Link>{' · '}<Link href="/legal/ia" className="text-gold underline">{root.common.aiTransparencyLink}</Link>{' · '}<Link href="/legal/suppression-compte" className="text-gold underline">{root.common.deleteAccountLink}</Link></p>
      </LegalSection>
    </article>
  )
}
