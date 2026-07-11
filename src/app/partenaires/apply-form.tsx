'use client'

/**
 * AQWELIA Partenaires — Partner application form (client component).
 *
 * Shared by /partenaires/fournisseurs and /partenaires/piscinistes. The
 * `type` prop is sent to /api/partners/apply and selects the partner
 * track ("fournisseur" | "pisciniste").
 *
 * Fields:
 *  - companyName (required)
 *  - email      (required, email format)
 *  - products   (required for fournisseurs, optional for piscinistes)
 *  - message    (optional)
 *
 * Mirrors the UX of /care/notify-form and /pro/early-access/early-access-form
 * (idle → submitting → success/error, glassmorphism, gold accents).
 */
import { useState } from 'react'
import { Loader2, Check, AlertCircle, Send } from 'lucide-react'
import { useTranslations } from 'next-intl'

type FormState = 'idle' | 'submitting' | 'success' | 'error'

interface Props {
  type: 'fournisseur' | 'pisciniste'
}

export function ApplyForm({ type }: Props) {
  const t = useTranslations('partners')
  const [state, setState] = useState<FormState>('idle')
  const [error, setError] = useState<string | null>(null)

  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [products, setProducts] = useState('')
  const [message, setMessage] = useState('')

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setState('submitting')

    // Client-side mirror of API validations.
    if (!companyName.trim()) {
      setError(t('formErrorCompanyName'))
      setState('error')
      return
    }
    if (!EMAIL_RE.test(email.toLowerCase().trim())) {
      setError(t('formErrorEmail'))
      setState('error')
      return
    }
    if (type === 'fournisseur' && !products.trim()) {
      setError(t('formErrorProducts'))
      setState('error')
      return
    }

    try {
      const res = await fetch('/api/partners/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          email: email.toLowerCase().trim(),
          type,
          products: products.trim() || null,
          message: message.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || t('formErrorGeneric'))
      }
      setState('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('formErrorGeneric'))
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 to-background p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gold to-primary text-white shadow-lg shadow-gold/30">
          <Check className="h-7 w-7" />
        </div>
        <h3 className="mt-4 font-display text-xl font-bold text-foreground">
          {t('formSuccessTitle')}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t('formSuccessDetail')}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Company name */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          {t('formCompanyName')} *
        </label>
        <input
          type="text"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder={t('formCompanyNamePlaceholder')}
          className="input-glass"
          disabled={state === 'submitting'}
        />
      </div>

      {/* Email */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          {t('formEmail')} *
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@entreprise.com"
          className="input-glass"
          disabled={state === 'submitting'}
        />
      </div>

      {/* Products — required for fournisseurs only */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          {t('formProducts')}
          {type === 'fournisseur' ? ' *' : ''}
        </label>
        <textarea
          rows={3}
          value={products}
          onChange={(e) => setProducts(e.target.value)}
          placeholder={
            type === 'fournisseur'
              ? t('formProductsPlaceholderFournisseur')
              : t('formProductsPlaceholderPisciniste')
          }
          className="input-glass resize-none"
          disabled={state === 'submitting'}
        />
      </div>

      {/* Message */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          {t('formMessage')}
        </label>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('formMessagePlaceholder')}
          className="input-glass resize-none"
          disabled={state === 'submitting'}
        />
      </div>

      {/* Error banner */}
      {state === 'error' && error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={state === 'submitting'}
        className="group flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-6 py-3 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-lg transition-all hover:scale-[1.01] hover:shadow-[0_0_40px_-8px_oklch(0.65_0.11_195/0.7)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === 'submitting' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('formSubmitting')}
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            {t('formSubmit')}
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-muted-foreground">
        {t('formDisclaimer')}
      </p>
    </form>
  )
}
