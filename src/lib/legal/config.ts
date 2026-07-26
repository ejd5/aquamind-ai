export type LegalFieldKey = 'publisherName' | 'legalForm' | 'capital' | 'registeredAddress' | 'siren' | 'register' | 'vat' | 'email' | 'phone' | 'hostName' | 'hostAddress' | 'hostContact' | 'mediatorName' | 'mediatorUrl'
type LegalField = { key: LegalFieldKey; value: string | null; required?: boolean }

function value(name: string): string | null {
  const raw = process.env[name]?.trim()
  return raw || null
}

export const LEGAL_CONFIG = {
  publisher: [
    { key: 'publisherName', value: value('NEXT_PUBLIC_LEGAL_PUBLISHER_NAME'), required: true },
    { key: 'legalForm', value: value('NEXT_PUBLIC_LEGAL_FORM'), required: true },
    { key: 'capital', value: value('NEXT_PUBLIC_LEGAL_CAPITAL') },
    { key: 'registeredAddress', value: value('NEXT_PUBLIC_LEGAL_ADDRESS'), required: true },
    { key: 'siren', value: value('NEXT_PUBLIC_LEGAL_SIREN'), required: true },
    { key: 'register', value: value('NEXT_PUBLIC_LEGAL_REGISTER') },
    { key: 'vat', value: value('NEXT_PUBLIC_LEGAL_VAT') },
    { key: 'email', value: value('NEXT_PUBLIC_LEGAL_EMAIL') || 'legal@aqwelia.app', required: true },
    { key: 'phone', value: value('NEXT_PUBLIC_LEGAL_PHONE') },
  ] satisfies LegalField[],
  publicationDirector: value('NEXT_PUBLIC_LEGAL_PUBLICATION_DIRECTOR'),
  host: [
    { key: 'hostName', value: value('NEXT_PUBLIC_LEGAL_HOST_NAME'), required: true },
    { key: 'hostAddress', value: value('NEXT_PUBLIC_LEGAL_HOST_ADDRESS'), required: true },
    { key: 'hostContact', value: value('NEXT_PUBLIC_LEGAL_HOST_CONTACT') },
  ] satisfies LegalField[],
  mediator: [
    { key: 'mediatorName', value: value('NEXT_PUBLIC_LEGAL_MEDIATOR_NAME'), required: true },
    { key: 'mediatorUrl', value: value('NEXT_PUBLIC_LEGAL_MEDIATOR_URL'), required: true },
  ] satisfies LegalField[],
}

export function missingLegalFields(): string[] {
  const missing = [
    ...LEGAL_CONFIG.publisher.filter((f) => f.required && !f.value).map((f) => f.key),
    ...LEGAL_CONFIG.host.filter((f) => f.required && !f.value).map((f) => f.key),
    ...LEGAL_CONFIG.mediator.filter((f) => f.required && !f.value).map((f) => f.key),
  ]
  if (!LEGAL_CONFIG.publicationDirector) missing.push('publicationDirector')
  return missing
}
