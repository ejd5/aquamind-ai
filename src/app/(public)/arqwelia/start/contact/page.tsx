'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWizardStore } from '@/lib/arqwelia/wizard-store'
import { ARQ_CONSENT_VERSION } from '@/lib/arqwelia/types'
import { arqTrackClient } from '@/lib/arqwelia/analytics-client'

export default function ContactStep() {
  const t = useTranslations('arqwelia')
  const router = useRouter()
  const store = useWizardStore()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setStatus('loading')
    try {
      const res = await fetch('/api/arqwelia/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionnaire: store.questionnaire,
          selectedConcept: store.selectedConcept,
          contact: {
            ...store.contact,
            consentVersion: ARQ_CONSENT_VERSION,
          },
          demoMode: store.demoMode,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        void arqTrackClient('arq_contact_submitted', { publicId: data.publicId })
        // Stash the result for the success page.
        try {
          sessionStorage.setItem('arqwelia-result', JSON.stringify(data))
        } catch {}
        void arqTrackClient('arq_project_created', { publicId: data.publicId })
        router.push('/arqwelia/start/success')
      } else {
        if (data.errors) setErrors(data.errors)
        setStatus('idle')
      }
    } catch {
      setStatus('idle')
    }
  }

  const fieldCls =
    'w-full rounded-lg border border-arq-mist/15 bg-arq-navy/60 px-3.5 py-3 text-sm text-arq-mist placeholder:text-arq-mist/30 outline-none transition-colors focus:border-arq-aqua/50'

  return (
    <div>
      <Link href="/arqwelia/start/concepts" className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-arq-aqua">
        ← {t('wizard.back')}
      </Link>
      <h1 className="font-aq-display text-3xl font-semibold text-arq-mist sm:text-4xl">
        {t('wizard.contact.title')}
      </h1>

      <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-arq-mist/70">
            {t('wizard.contact.firstName')}
          </label>
          <input
            className={fieldCls}
            value={store.contact.firstName}
            onChange={(e) => store.setContact({ firstName: e.target.value })}
            aria-invalid={!!errors.firstName}
          />
          {errors.firstName && <p className="mt-1 text-xs text-red-400">{errors.firstName}</p>}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-arq-mist/70">
              {t('wizard.contact.email')}
            </label>
            <input
              type="email"
              className={fieldCls}
              value={store.contact.email}
              onChange={(e) => store.setContact({ email: e.target.value })}
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-arq-mist/70">
              {t('wizard.contact.phone')}
            </label>
            <input className={fieldCls} value={store.contact.phone} onChange={(e) => store.setContact({ phone: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-arq-mist/70">
            {t('wizard.contact.postalCode')}
          </label>
          <input
            inputMode="numeric"
            className={fieldCls}
            value={store.contact.postalCode}
            onChange={(e) => store.setContact({ postalCode: e.target.value })}
            aria-invalid={!!errors.postalCode}
          />
          {errors.postalCode && <p className="mt-1 text-xs text-red-400">{errors.postalCode}</p>}
        </div>

        {/* Consent — NOT pre-checked */}
        <label className="flex items-start gap-3 rounded-xl border border-arq-mist/10 bg-arq-ink/30 p-4">
          <input
            type="checkbox"
            checked={store.contact.consent}
            onChange={(e) => store.setContact({ consent: e.target.checked })}
            className="mt-0.5 h-5 w-5 rounded border-arq-mist/30 bg-arq-navy accent-arq-aqua"
            aria-invalid={!!errors.consent}
          />
          <span className="text-sm text-arq-mist/70">{t('wizard.contact.consentText')}</span>
        </label>
        <p className="-mt-2 text-xs text-arq-mist/40">{t('wizard.contact.consentHint')}</p>
        {errors.consent && <p className="text-xs text-red-400">{errors.consent}</p>}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-arq-aqua px-7 py-3 text-sm font-bold text-arq-navy transition-transform hover:scale-[1.01] disabled:opacity-50"
        >
          {status === 'loading' ? '…' : t('wizard.submit')}
        </button>
      </form>
    </div>
  )
}