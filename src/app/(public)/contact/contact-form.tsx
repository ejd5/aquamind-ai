'use client'

/**
 * AQWELIA Contact — Public contact form (client component).
 *
 * Submits to POST /api/contact. Validates name/email/subject/message client-side.
 * On success, displays a confirmation message and hides the form. On error,
 * displays the server error string.
 */
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Loader2, AlertCircle, Sparkles, Send } from 'lucide-react'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_MESSAGE = 10
const MAX_MESSAGE = 5000

const SUBJECTS = ['general', 'support', 'partnership', 'press', 'other'] as const
type Subject = (typeof SUBJECTS)[number]

export function ContactForm() {
  const t = useTranslations('contact')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState<Subject>('general')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'submitting') return

    // Client-side validation
    if (!name.trim()) {
      setErrorMsg(t('errorNameRequired'))
      setStatus('error')
      return
    }
    if (!email.trim()) {
      setErrorMsg(t('errorEmailRequired'))
      setStatus('error')
      return
    }
    if (!EMAIL_RE.test(email.trim())) {
      setErrorMsg(t('errorEmailInvalid'))
      setStatus('error')
      return
    }
    if (message.trim().length < MIN_MESSAGE) {
      setErrorMsg(t('errorMessageMin', { n: MIN_MESSAGE }))
      setStatus('error')
      return
    }
    if (message.trim().length > MAX_MESSAGE) {
      setErrorMsg(t('errorMessageMax', { n: MAX_MESSAGE }))
      setStatus('error')
      return
    }

    setStatus('submitting')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          subject,
          message: message.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data?.error ?? t('errorGeneric'))
        setStatus('error')
        return
      }
      setStatus('success')
    } catch {
      setErrorMsg(t('errorGeneric'))
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
          {t('successTitle')}
        </h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {t('successDetail')}
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
          {t('formTitle')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('formSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-foreground">
            {t('formName')}
            <span className="ml-1 text-gold">*</span>
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('formNamePlaceholder')}
            className="input-glass"
            autoComplete="name"
            maxLength={120}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-foreground">
            {t('formEmail')}
            <span className="ml-1 text-gold">*</span>
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('formEmailPlaceholder')}
            className="input-glass"
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-xs font-semibold text-foreground">
          {t('formSubject')}
          <span className="ml-1 text-gold">*</span>
        </span>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value as Subject)}
          className="input-glass"
          required
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {t(`subject_${s}` as const)}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-xs font-semibold text-foreground">
          {t('formMessage')}
          <span className="ml-1 text-gold">*</span>
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('formMessagePlaceholder')}
          className="input-glass min-h-[140px] resize-y"
          maxLength={MAX_MESSAGE}
          required
        />
        <span className="mt-1 block text-right text-[10px] text-muted-foreground">
          {message.length} / {MAX_MESSAGE}
        </span>
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
            {t('formSubmitting')}
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            {t('formSubmit')}
          </>
        )}
      </button>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Sparkles className="h-3 w-3 text-gold" />
        {t('formPrivacy')}
      </p>
    </form>
  )
}
