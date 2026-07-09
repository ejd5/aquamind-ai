'use client'

/**
 * AQWELIA Pro — Early Access form (client component).
 *
 * Submits to POST /api/pro/early-access. On success, displays a success
 * message and hides the form. On error, displays the server error string.
 *
 * Validations client-side mirror the API: company + email required, email
 * format checked. Pool/tech counts default to sensible values.
 */
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Loader2, AlertCircle, Sparkles } from 'lucide-react'

interface FormState {
  companyName: string
  email: string
  phone: string
  poolCount: string
  techCount: string
  message: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const POOL_OPTIONS = ['0-20', '20-50', '50-100', '100-200', '200+']
const TECH_OPTIONS = ['1', '2-4', '5-8', '9-12', '12+']

export function EarlyAccessForm() {
  const t = useTranslations('pro')
  const [form, setForm] = useState<FormState>({
    companyName: '',
    email: '',
    phone: '',
    poolCount: POOL_OPTIONS[0],
    techCount: TECH_OPTIONS[0],
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  /** Parse the "poolCount" option into an integer (lower bound). */
  function parsePoolCount(raw: string): number {
    if (raw === '200+') return 200
    const [low] = raw.split('-')
    return parseInt(low, 10) || 0
  }

  /** Parse the "techCount" option into an integer (lower bound). */
  function parseTechCount(raw: string): number {
    if (raw === '12+') return 12
    const [low] = raw.split('-')
    return parseInt(low, 10) || 1
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'submitting') return

    // Client-side validation
    if (!form.companyName.trim()) {
      setErrorMsg(t('earlyAccessErrorCompanyRequired'))
      setStatus('error')
      return
    }
    if (!form.email.trim()) {
      setErrorMsg(t('earlyAccessErrorEmailRequired'))
      setStatus('error')
      return
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      setErrorMsg(t('earlyAccessErrorEmailInvalid'))
      setStatus('error')
      return
    }

    setStatus('submitting')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/pro/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          poolCount: parsePoolCount(form.poolCount),
          techCount: parseTechCount(form.techCount),
          message: form.message.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data?.error ?? t('earlyAccessErrorGeneric'))
        setStatus('error')
        return
      }
      setStatus('success')
    } catch {
      setErrorMsg(t('earlyAccessErrorGeneric'))
      setStatus('error')
    }
  }

  // --- Success state ---
  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-gold/40 bg-white/60 p-8 text-center backdrop-blur-xl dark:bg-white/[0.04] sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/30">
          <Check className="h-7 w-7" />
        </div>
        <h3 className="mt-5 font-display text-2xl font-bold tracking-tight">
          {t('earlyAccessSuccess')}
        </h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {t('earlyAccessSuccessDetail')}
        </p>
      </div>
    )
  }

  // --- Form state ---
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-white/40 bg-white/60 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] sm:p-8"
      noValidate
    >
      <div className="mb-6">
        <h3 className="font-display text-xl font-bold tracking-tight">
          {t('earlyAccessFormTitle')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('earlyAccessFormSubtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('earlyAccessFormCompany')} required>
          <input
            type="text"
            value={form.companyName}
            onChange={(e) => update('companyName', e.target.value)}
            placeholder={t('earlyAccessFormCompanyPlaceholder')}
            className="input-glass"
            autoComplete="organization"
            required
          />
        </Field>

        <Field label={t('earlyAccessFormEmail')} required>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder={t('earlyAccessFormEmailPlaceholder')}
            className="input-glass"
            autoComplete="email"
            required
          />
        </Field>

        <Field label={t('earlyAccessFormPhone')}>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder={t('earlyAccessFormPhonePlaceholder')}
            className="input-glass"
            autoComplete="tel"
          />
        </Field>

        <Field label={t('earlyAccessFormPoolCount')}>
          <select
            value={form.poolCount}
            onChange={(e) => update('poolCount', e.target.value)}
            className="input-glass"
          >
            {POOL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('earlyAccessFormTechCount')}>
          <select
            value={form.techCount}
            onChange={(e) => update('techCount', e.target.value)}
            className="input-glass"
          >
            {TECH_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('earlyAccessFormMessage')} full>
          <textarea
            value={form.message}
            onChange={(e) => update('message', e.target.value)}
            placeholder={t('earlyAccessFormMessagePlaceholder')}
            rows={4}
            className="input-glass resize-none"
          />
        </Field>
      </div>

      {status === 'error' && errorMsg && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="glow-gold group mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-6 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === 'submitting' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('earlyAccessFormSubmitting')}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {t('earlyAccessFormSubmit')}
          </>
        )}
      </button>
    </form>
  )
}

/* ---------------- Field wrapper ---------------- */

function Field({
  label,
  children,
  required,
  full,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
  full?: boolean
}) {
  return (
    <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1.5 block text-xs font-semibold text-foreground">
        {label}
        {required && <span className="ml-1 text-gold">*</span>}
      </span>
      {children}
    </label>
  )
}
