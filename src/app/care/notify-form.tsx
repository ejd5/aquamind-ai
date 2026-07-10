'use client'

/**
 * AQWELIA Care — Launch notification form (client component).
 *
 * Submits to POST /api/care/notify. On success, displays a success message
 * and hides the form. On error, displays the server error string.
 *
 * Validation client-side mirrors the API: email required, format checked.
 */
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Loader2, AlertCircle, Sparkles } from 'lucide-react'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function NotifyForm() {
  const t = useTranslations('care')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'submitting') return

    // Client-side validation
    if (!email.trim()) {
      setErrorMsg(t('notifyErrorEmailRequired'))
      setStatus('error')
      return
    }
    if (!EMAIL_RE.test(email.trim())) {
      setErrorMsg(t('notifyErrorEmailInvalid'))
      setStatus('error')
      return
    }

    setStatus('submitting')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/care/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data?.error ?? t('notifyErrorGeneric'))
        setStatus('error')
        return
      }
      setStatus('success')
    } catch {
      setErrorMsg(t('notifyErrorGeneric'))
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
          {t('notifySuccess')}
        </h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {t('notifySuccessDetail')}
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
          {t('notifyFormTitle')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('notifyFormSubtitle')}
        </p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-foreground">
          {t('notifyFormEmail')}
          <span className="ml-1 text-gold">*</span>
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('notifyFormEmailPlaceholder')}
          className="input-glass"
          autoComplete="email"
          required
        />
      </label>

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
            {t('notifyFormSubmitting')}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {t('notifyFormSubmit')}
          </>
        )}
      </button>
    </form>
  )
}
