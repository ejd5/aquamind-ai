import type { Metadata } from 'next'
import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { getComplianceCopy } from '@/i18n/locales/compliance-copy'
import { AccountDeletionRequestForm } from '@/components/privacy/account-deletion-request-form'
import { LegalHeader, LegalSection } from '@/components/legal/legal-document'

export async function generateMetadata(): Promise<Metadata> {
  const copy = getComplianceCopy(await getLocale()).deletion
  return { title: copy.metaTitle, description: copy.metaDescription, alternates: { canonical: '/legal/suppression-compte' } }
}

export default async function AccountDeletionPage() {
  const locale = await getLocale()
  const root = getComplianceCopy(locale)
  const copy = root.deletion
  return (
    <article className="space-y-8">
      <LegalHeader eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro} lastUpdatedLabel={root.common.lastUpdated} locale={locale} translationWarning={root.common.legalTranslationWarning} />
      <LegalSection title={copy.stepsTitle} items={copy.steps}>
        <p><Link href="/settings#delete" className="font-semibold text-gold underline">{copy.signedIn}</Link></p>
      </LegalSection>
      <LegalSection title={copy.formTitle}><AccountDeletionRequestForm /></LegalSection>
    </article>
  )
}
