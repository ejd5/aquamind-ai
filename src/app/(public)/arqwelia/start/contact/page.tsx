'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWizardStore } from '@/lib/arqwelia/wizard-store'
import { ARQ_CONSENT_VERSION } from '@/lib/arqwelia/types'
import { arqTrackClient } from '@/lib/arqwelia/analytics-client'
import { TurnstileWidget } from '@/components/security/turnstile-widget'
import {
  rotateTurnstileForm,
  canSubmitTurnstileForm,
  isTurnstileFormBlocked,
  EMPTY_TURNSTILE_FORM_STATE,
  type TurnstileFormState,
} from '@/lib/arqwelia/turnstile-form'
import {
  ArqweliaGlassCard,
  ArqweliaLabel,
  ArqweliaPrimaryButton,
} from '@/components/arqwelia/ui'

export default function ContactStep() {
  const t = useTranslations('arqwelia')
  const router = useRouter()
  const store = useWizardStore()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const [turnstile, setTurnstile] = useState<TurnstileFormState>(EMPTY_TURNSTILE_FORM_STATE)
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''
  const turnstileBlocked = isTurnstileFormBlocked({
    isProduction: process.env.NODE_ENV === 'production',
    siteKey: turnstileSiteKey,
  })

  // Any failed submission spent the single-use token — rotate and force a fresh one.
  function failSubmission(formErrorKey: string, fieldErrors?: Record<string, string>) {
    setFormError(formErrorKey)
    if (fieldErrors) setErrors(fieldErrors)
    setStatus('idle')
    setTurnstile((prev) => rotateTurnstileForm(prev))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmitTurnstileForm({ blocked: turnstileBlocked, siteKey: turnstileSiteKey, hasToken: Boolean(turnstile.token) })) {
      return
    }
    setErrors({})
    setFormError(null)
    setStatus('loading')
    try {
      const res = await fetch('/api/arqwelia/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionnaire: store.questionnaire,
          selectedConcept: store.selectedConcept,
          contact: { ...store.contact, consentVersion: ARQ_CONSENT_VERSION },
          demoMode: store.demoMode,
          turnstileToken: turnstile.token,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        void arqTrackClient('arq_contact_submitted', { publicId: data.publicId })
        void arqTrackClient('arq_project_created', { publicId: data.publicId })
        try { sessionStorage.setItem('arqwelia-result', JSON.stringify(data)) } catch {}
        router.push('/arqwelia/start/success')
      } else if (res.status === 429) {
        failSubmission(t('wizard.errors.rateLimit'))
      } else if (res.status === 403) {
        failSubmission(data?.errors?.turnstile || t('wizard.errors.turnstileFailed'))
      } else if (data?.errors) {
        failSubmission(data.errors.generic || t('wizard.errors.internal'), data.errors)
      } else {
        failSubmission(t('wizard.errors.internal'))
      }
    } catch {
      failSubmission(t('wizard.errors.internal'))
    }
  }

  const fieldCls =
    'mt-1.5 w-full rounded-lg border border-white/[0.12] bg-white/[0.04] px-3.5 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-arq-aqua/50'

  return (
    <div>
      <Link href="/arqwelia/start/concepts" className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-arq-aqua">← {t('wizard.back')}</Link>
      <h1 className="font-aq-display text-3xl font-semibold text-white sm:text-4xl">{t('wizard.contact.title')}</h1>

      {/* Why we ask — explicit, premium */}
      <ArqweliaGlassCard className="mt-6 p-5" border="strong">
        <ArqweliaLabel>{t('wizard.contact.whyTitle')}</ArqweliaLabel>
        <p className="mt-3 text-sm text-white/65">
          {t('wizard.contact.whyBody')}
        </p>
      </ArqweliaGlassCard>

      {formError && (
        <p role="alert" className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
          {formError}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
        <div>
          <label className="mb-0 block text-xs font-semibold text-white/65">{t('wizard.contact.firstName')}</label>
          <input className={fieldCls} value={store.contact.firstName} onChange={(e) => store.setContact({ firstName: e.target.value })} aria-invalid={!!errors.firstName} aria-label={t('wizard.contact.firstName')} />
          {errors.firstName && <p className="mt-1 text-xs text-red-400">{errors.firstName}</p>}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-0 block text-xs font-semibold text-white/65">{t('wizard.contact.email')}</label>
            <input type="email" className={fieldCls} value={store.contact.email} onChange={(e) => store.setContact({ email: e.target.value })} aria-invalid={!!errors.email} aria-label={t('wizard.contact.email')} />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>
          <div>
            <label className="mb-0 block text-xs font-semibold text-white/65">{t('wizard.contact.phone')}</label>
            <input className={fieldCls} value={store.contact.phone} onChange={(e) => store.setContact({ phone: e.target.value })} aria-invalid={!!errors.phone} aria-label={t('wizard.contact.phone')} />
            {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
          </div>
        </div>
        <div>
          <label className="mb-0 block text-xs font-semibold text-white/65">{t('wizard.contact.postalCode')}</label>
          <input inputMode="numeric" className={fieldCls} value={store.contact.postalCode} onChange={(e) => store.setContact({ postalCode: e.target.value })} aria-invalid={!!errors.postalCode} aria-label={t('wizard.contact.postalCode')} />
          {errors.postalCode && <p className="mt-1 text-xs text-red-400">{errors.postalCode}</p>}
        </div>

        {/* Consent — never pre-checked */}
        <ArqweliaGlassCard className="p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={store.contact.consent}
              onChange={(e) => store.setContact({ consent: e.target.checked })}
              className="mt-0.5 h-5 w-5 rounded border-white/25 bg-arq-navy accent-arq-aqua"
              aria-invalid={!!errors.consent}
              aria-label={t('wizard.contact.consentText')}
            />
            <span className="text-sm text-white/70">{t('wizard.contact.consentText')}</span>
          </label>
          <p className="mt-2 pl-8 text-xs text-white/35">{t('wizard.contact.consentHint')}</p>
          {errors.consent && <p className="mt-2 text-xs text-red-400">{errors.consent}</p>}
        </ArqweliaGlassCard>

        {turnstileBlocked ? (
          <p role="alert" className="rounded-lg border border-white/15 bg-white/[0.04] p-3 text-sm text-white/70">
            {t('wizard.errors.formUnavailable')}
          </p>
        ) : turnstileSiteKey ? (
          <div>
            <TurnstileWidget
              key={turnstile.widgetKey}
              siteKey={turnstileSiteKey}
              action="arqwelia_contact"
              onToken={(token) => setTurnstile((prev) => ({ ...prev, token }))}
              onError={() => setTurnstile((prev) => ({ ...prev, error: true }))}
            />
            {(turnstile.error || errors.turnstile) && (
              <p role="alert" className="mt-1 text-xs text-red-400">{t('wizard.errors.turnstileFailed')}</p>
            )}
          </div>
        ) : null}

        <ArqweliaPrimaryButton
          type="submit"
          disabled={!canSubmitTurnstileForm({
            blocked: turnstileBlocked,
            siteKey: turnstileSiteKey,
            hasToken: Boolean(turnstile.token),
          }) || status === 'loading'}
          className="w-full"
        >
          {status === 'loading' ? '…' : t('wizard.submit')}
        </ArqweliaPrimaryButton>
      </form>
    </div>
  )
}
