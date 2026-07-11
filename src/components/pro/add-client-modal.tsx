'use client'

/**
 * AQWELIA Pro — AddClientModal (glassmorphism modal).
 *
 * Controlled modal: parent owns the `open` state and gets notified on
 * `onCreated(client)` after a successful POST to /api/pro/clients.
 *
 * Form fields: firstName, lastName, email, phone, address, city, zipCode, notes.
 * Client-side validation mirrors the API (firstName/lastName required, email
 * format checked if provided). Glassmorphism DA, backdrop-blur, gold accents.
 */
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { X, Loader2, AlertCircle, Sparkles, Check, UserPlus } from 'lucide-react'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface CreatedClient {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  zipCode?: string | null
  notes?: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: (client: CreatedClient) => void
}

interface FormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  zipCode: string
  notes: string
}

const EMPTY: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  zipCode: '',
  notes: '',
}

export function AddClientModal({ open, onClose, onCreated }: Props) {
  const t = useTranslations('proApp')
  const [form, setForm] = useState<FormState>(EMPTY)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!open) return null

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function reset() {
    setForm(EMPTY)
    setStatus('idle')
    setErrorMsg(null)
  }

  function handleClose() {
    if (status === 'submitting') return
    reset()
    onClose()
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'submitting') return

    if (!form.firstName.trim()) {
      setErrorMsg(t('addClientErrorFirstName'))
      return
    }
    if (!form.lastName.trim()) {
      setErrorMsg(t('addClientErrorLastName'))
      return
    }
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
      setErrorMsg(t('addClientErrorEmail'))
      return
    }

    setStatus('submitting')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/pro/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          zipCode: form.zipCode.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.client) {
        setErrorMsg(data?.error ?? t('addClientErrorGeneric'))
        setStatus('idle')
        return
      }
      setStatus('success')
      onCreated?.(data.client as CreatedClient)
      // Auto-close after a brief success flash
      setTimeout(() => {
        reset()
        onClose()
      }, 1200)
    } catch {
      setErrorMsg(t('addClientErrorGeneric'))
      setStatus('idle')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/40 bg-background/90 p-6 shadow-2xl backdrop-blur-2xl sm:rounded-3xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold top accent */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-md shadow-primary/30">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">
                {t('addClientTitle')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('addClientSubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={t('modalClose')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Success state */}
        {status === 'success' ? (
          <div className="rounded-2xl border border-gold/40 bg-gold/5 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-white shadow-lg">
              <Check className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold">{t('addClientSuccess')}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('addClientFirstName')} required>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => update('firstName', e.target.value)}
                  className="input-glass"
                  autoComplete="given-name"
                  required
                />
              </Field>
              <Field label={t('addClientLastName')} required>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => update('lastName', e.target.value)}
                  className="input-glass"
                  autoComplete="family-name"
                  required
                />
              </Field>
              <Field label={t('addClientEmail')}>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  className="input-glass"
                  autoComplete="email"
                />
              </Field>
              <Field label={t('addClientPhone')}>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  className="input-glass"
                  autoComplete="tel"
                />
              </Field>
              <Field label={t('addClientAddress')} full>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  className="input-glass"
                  autoComplete="street-address"
                />
              </Field>
              <Field label={t('addClientCity')}>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  className="input-glass"
                  autoComplete="address-level2"
                />
              </Field>
              <Field label={t('addClientZip')}>
                <input
                  type="text"
                  value={form.zipCode}
                  onChange={(e) => update('zipCode', e.target.value)}
                  className="input-glass"
                  autoComplete="postal-code"
                />
              </Field>
              <Field label={t('addClientNotes')} full>
                <textarea
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  rows={3}
                  className="input-glass resize-none"
                />
              </Field>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={status === 'submitting'}
                className="rounded-full border border-white/40 bg-white/40 px-4 py-2 text-xs font-semibold text-foreground backdrop-blur transition-colors hover:bg-white/60 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04]"
              >
                {t('modalCancel')}
              </button>
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="glow-gold inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-5 py-2 text-xs font-bold text-[oklch(0.99_0.01_195)] shadow-lg transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('addClientSubmitting')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    {t('addClientSubmit')}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
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
