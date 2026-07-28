'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

/**
 * ARQWELIA Lot 1 — Pisciniste partner waitlist form.
 * Client-side validation + submits to /api/arqwelia/partner-waitlist.
 * Consent is NOT pre-checked. Dedups by email server-side.
 */
export function ArqweliaPartnerForm() {
  const t = useTranslations('arqwelia')
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    postalCode: '',
    radiusKm: '',
  })
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'already' | 'error'>('idle')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setStatus('loading')
    try {
      const res = await fetch('/api/arqwelia/partner-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, consent }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus(data.exists ? 'already' : 'success')
      } else {
        if (data.errors) setErrors(data.errors)
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success' || status === 'already') {
    return (
      <p className="rounded-xl border border-arq-aqua/25 bg-arq-aqua/5 p-5 text-sm font-semibold text-arq-aqua">
        {status === 'success' ? t('partner.form.success') : t('partner.form.already')}
      </p>
    )
  }

  const fieldCls =
    'w-full rounded-lg border border-white/[0.12] bg-white/[0.04] px-3.5 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-arq-aqua/50'

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-white/65">
            {t('partner.form.companyName')}
          </label>
          <input
            className={fieldCls}
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            aria-invalid={!!errors.companyName}
            aria-describedby={errors.companyName ? 'err-company' : undefined}
            aria-label={t('partner.form.companyName')}
          />
          {errors.companyName && (
            <p id="err-company" className="mt-1 text-xs text-red-400">{errors.companyName}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-white/65">
            {t('partner.form.contactName')}
          </label>
          <input
            className={fieldCls}
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            aria-invalid={!!errors.contactName}
            aria-label={t('partner.form.contactName')}
          />
          {errors.contactName && <p className="mt-1 text-xs text-red-400">{errors.contactName}</p>}
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-white/65">
          {t('partner.form.email')}
        </label>
        <input
          type="email"
          className={fieldCls}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          aria-invalid={!!errors.email}
          aria-label={t('partner.form.email')}
        />
        {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-white/65">
            {t('partner.form.phone')}
          </label>
          <input className={fieldCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} aria-label={t('partner.form.phone')} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-white/65">
            {t('partner.form.postalCode')}
          </label>
          <input className={fieldCls} value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} aria-label={t('partner.form.postalCode')} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-white/65">
            {t('partner.form.radiusKm')}
          </label>
          <input
            type="number"
            className={fieldCls}
            value={form.radiusKm}
            onChange={(e) => setForm({ ...form, radiusKm: e.target.value })}
            aria-label={t('partner.form.radiusKm')}
          />
        </div>
      </div>
      <label className="flex items-start gap-3 text-xs text-white/60">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-white/25 bg-arq-navy accent-arq-aqua"
          aria-invalid={!!errors.consent}
        />
        <span>{t('partner.form.consent')}</span>
      </label>
      <p className="-mt-2 text-[11px] text-white/35">{t('partner.form.consentHint')}</p>
      {errors.consent && <p className="text-xs text-red-400">{errors.consent}</p>}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-arq-aqua px-8 py-3.5 text-sm font-bold text-arq-navy transition-transform hover:scale-[1.01] disabled:opacity-50 sm:w-auto"
      >
        {status === 'loading' ? '…' : t('partner.form.submit')}
      </button>
    </form>
  )
}