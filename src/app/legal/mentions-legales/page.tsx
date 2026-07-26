import type { Metadata } from 'next'
import { AlertTriangle } from 'lucide-react'
import { getLocale } from 'next-intl/server'
import { getComplianceCopy } from '@/i18n/locales/compliance-copy'
import { LEGAL_CONFIG, missingLegalFields, type LegalFieldKey } from '@/lib/legal/config'
import { LegalHeader, LegalSection } from '@/components/legal/legal-document'

export async function generateMetadata(): Promise<Metadata> {
  const copy = getComplianceCopy(await getLocale()).mentions
  return { title: copy.metaTitle, description: copy.metaDescription, alternates: { canonical: '/legal/mentions-legales' } }
}

function Fields({ fields, labels, missing }: { fields: readonly { key: LegalFieldKey; value: string | null }[]; labels: Record<LegalFieldKey, string>; missing: string }) {
  return <dl className="grid gap-3 sm:grid-cols-2">{fields.map((field) => <div key={field.key} className="rounded-xl border border-border/60 p-4"><dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{labels[field.key]}</dt><dd className={`mt-1 text-sm ${field.value ? 'text-foreground' : 'font-semibold text-amber-600'}`}>{field.value || missing}</dd></div>)}</dl>
}

export default async function LegalNoticePage() {
  const locale = await getLocale()
  const root = getComplianceCopy(locale)
  const copy = root.mentions
  const missing = missingLegalFields()
  return (
    <article className="space-y-8">
      <LegalHeader eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro} lastUpdatedLabel={root.common.lastUpdated} locale={locale} translationWarning={root.common.legalTranslationWarning} />
      {missing.length ? <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-800 dark:text-amber-200"><p className="flex gap-2 font-bold"><AlertTriangle className="h-5 w-5 shrink-0" />{root.common.statusIncomplete}</p><p className="mt-2">{missing.map((key) => copy.fields[key as keyof typeof copy.fields] || key).join(' · ')}</p></div> : null}
      <LegalSection title={copy.publisher}><Fields fields={LEGAL_CONFIG.publisher} labels={copy.fields} missing={copy.missing} /></LegalSection>
      <LegalSection title={copy.director}><p className={LEGAL_CONFIG.publicationDirector ? 'text-foreground' : 'font-semibold text-amber-600'}>{LEGAL_CONFIG.publicationDirector || copy.missing}</p></LegalSection>
      <LegalSection title={copy.hosting}><Fields fields={LEGAL_CONFIG.host} labels={copy.fields} missing={copy.missing} /></LegalSection>
      <LegalSection title={copy.consumer}><Fields fields={LEGAL_CONFIG.mediator} labels={copy.fields} missing={copy.missing} /></LegalSection>
      <LegalSection title={copy.intellectual} paragraphs={[copy.intellectualBody]} />
    </article>
  )
}
