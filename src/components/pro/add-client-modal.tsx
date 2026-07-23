'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertCircle, Check, Loader2, Sparkles, UserPlus, X } from 'lucide-react'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const STATUSES = ['prospect', 'active', 'paused', 'archived'] as const
const CONTACTS = ['email', 'phone', 'sms', 'whatsapp'] as const

export interface CreatedClient {
  id: string
  firstName: string
  lastName: string
  companyName?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  zipCode?: string | null
  status?: string
  source?: string | null
  preferredContact?: string
  tags?: string[]
  nextFollowUpAt?: string | null
  notes?: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  onCreated?: (client: CreatedClient) => void
}

type FormState = {
  firstName: string
  lastName: string
  companyName: string
  email: string
  phone: string
  address: string
  city: string
  zipCode: string
  status: (typeof STATUSES)[number]
  source: string
  preferredContact: (typeof CONTACTS)[number]
  tags: string
  nextFollowUpAt: string
  notes: string
}

const EMPTY: FormState = {
  firstName: '',
  lastName: '',
  companyName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  zipCode: '',
  status: 'active',
  source: '',
  preferredContact: 'email',
  tags: '',
  nextFollowUpAt: '',
  notes: '',
}

export function AddClientModal({ open, onClose, onCreated }: Props) {
  const t = useTranslations('proApp')
  const [form, setForm] = useState<FormState>(EMPTY)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!open) return null

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
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

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (status === 'submitting') return
    if (!form.firstName.trim()) return setErrorMsg(t('addClientErrorFirstName'))
    if (!form.lastName.trim()) return setErrorMsg(t('addClientErrorLastName'))
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
      return setErrorMsg(t('addClientErrorEmail'))
    }

    setStatus('submitting')
    setErrorMsg(null)
    try {
      const response = await fetch('/api/pro/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          companyName: form.companyName.trim() || undefined,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          zipCode: form.zipCode.trim() || undefined,
          status: form.status,
          source: form.source.trim() || undefined,
          preferredContact: form.preferredContact,
          tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          nextFollowUpAt: form.nextFollowUpAt
            ? new Date(`${form.nextFollowUpAt}T09:00:00`).toISOString()
            : undefined,
          notes: form.notes.trim() || undefined,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.client) {
        setErrorMsg(data?.error ?? t('addClientErrorGeneric'))
        setStatus('idle')
        return
      }
      setStatus('success')
      onCreated?.(data.client as CreatedClient)
      window.setTimeout(() => {
        reset()
        onClose()
      }, 900)
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
      aria-label={t('addClientTitle')}
    >
      <div
        className="relative max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/40 bg-background/95 p-6 shadow-2xl backdrop-blur-2xl sm:rounded-3xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-md shadow-primary/30">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">{t('addClientTitle')}</h2>
              <p className="text-xs text-muted-foreground">{t('addClientSubtitle')}</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label={t('modalClose')}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {status === 'success' ? (
          <div className="rounded-2xl border border-gold/40 bg-gold/5 p-8 text-center">
            <Check className="mx-auto h-10 w-10 text-gold" />
            <p className="mt-3 text-sm font-semibold">{t('addClientSuccess')}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('addClientFirstName')} required>
                <input className="input-glass" value={form.firstName} onChange={(event) => update('firstName', event.target.value)} autoComplete="given-name" required />
              </Field>
              <Field label={t('addClientLastName')} required>
                <input className="input-glass" value={form.lastName} onChange={(event) => update('lastName', event.target.value)} autoComplete="family-name" required />
              </Field>
              <Field label={t('crmCompanyName')} full>
                <input className="input-glass" value={form.companyName} onChange={(event) => update('companyName', event.target.value)} autoComplete="organization" />
              </Field>
              <Field label={t('addClientEmail')}>
                <input className="input-glass" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" />
              </Field>
              <Field label={t('addClientPhone')}>
                <input className="input-glass" type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} autoComplete="tel" />
              </Field>
            </section>

            <section className="grid grid-cols-1 gap-4 rounded-2xl border border-border/40 bg-secondary/20 p-4 sm:grid-cols-2">
              <Field label={t('crmClientStatus')}>
                <select className="input-glass" value={form.status} onChange={(event) => update('status', event.target.value as FormState['status'])}>
                  {STATUSES.map((value) => <option key={value} value={value}>{t(`crmStatus${capitalize(value)}` as never)}</option>)}
                </select>
              </Field>
              <Field label={t('crmPreferredContact')}>
                <select className="input-glass" value={form.preferredContact} onChange={(event) => update('preferredContact', event.target.value as FormState['preferredContact'])}>
                  {CONTACTS.map((value) => <option key={value} value={value}>{t(`crmContact${capitalize(value)}` as never)}</option>)}
                </select>
              </Field>
              <Field label={t('crmSource')}>
                <input className="input-glass" value={form.source} onChange={(event) => update('source', event.target.value)} />
              </Field>
              <Field label={t('crmNextFollowUp')}>
                <input className="input-glass" type="date" value={form.nextFollowUpAt} onChange={(event) => update('nextFollowUpAt', event.target.value)} />
              </Field>
              <Field label={t('crmTags')} full hint={t('crmTagsHint')}>
                <input className="input-glass" value={form.tags} onChange={(event) => update('tags', event.target.value)} placeholder={t('crmTagsPlaceholder')} />
              </Field>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('addClientAddress')} full>
                <input className="input-glass" value={form.address} onChange={(event) => update('address', event.target.value)} autoComplete="street-address" />
              </Field>
              <Field label={t('addClientCity')}>
                <input className="input-glass" value={form.city} onChange={(event) => update('city', event.target.value)} autoComplete="address-level2" />
              </Field>
              <Field label={t('addClientZip')}>
                <input className="input-glass" value={form.zipCode} onChange={(event) => update('zipCode', event.target.value)} autoComplete="postal-code" />
              </Field>
              <Field label={t('addClientNotes')} full>
                <textarea className="input-glass min-h-24 resize-y" value={form.notes} onChange={(event) => update('notes', event.target.value)} />
              </Field>
            </section>

            {errorMsg && <p className="flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{errorMsg}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={handleClose} disabled={status === 'submitting'} className="rounded-full border border-border px-4 py-2 text-xs font-semibold disabled:opacity-50">{t('modalCancel')}</button>
              <button type="submit" disabled={status === 'submitting'} className="glow-gold inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-primary px-5 py-2 text-xs font-bold text-white disabled:opacity-60">
                {status === 'submitting' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {status === 'submitting' ? t('addClientSubmitting') : t('addClientSubmit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function Field({ label, hint, children, required, full }: { label: string; hint?: string; children: React.ReactNode; required?: boolean; full?: boolean }) {
  return <label className={full ? 'block sm:col-span-2' : 'block'}><span className="mb-1.5 block text-xs font-semibold text-foreground">{label}{required ? <span className="ml-1 text-gold">*</span> : null}</span>{children}{hint ? <span className="mt-1 block text-[10px] text-muted-foreground">{hint}</span> : null}</label>
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
