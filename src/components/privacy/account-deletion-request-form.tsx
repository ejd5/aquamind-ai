'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { Loader2, Send } from 'lucide-react'
import { getComplianceCopy } from '@/i18n/locales/compliance-copy'

export function AccountDeletionRequestForm() {
  const locale = useLocale()
  const copy = getComplianceCopy(locale).deletion
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setStatus('idle')
    try {
      const detail = message.trim() || 'Account deletion requested through the public AQWELIA deletion page.'
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          subject: 'support',
          message: `[ACCOUNT_DELETION_REQUEST]\n${detail}`,
        }),
      })
      if (!response.ok) throw new Error('request_failed')
      setStatus('success')
      setMessage('')
    } catch {
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-1.5 text-sm font-semibold text-foreground">
        {copy.name}
        <input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="min-h-12 rounded-xl border border-border bg-background px-3 font-normal outline-none focus:border-gold/60" autoComplete="name" />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-foreground">
        {copy.email}
        <input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-12 rounded-xl border border-border bg-background px-3 font-normal outline-none focus:border-gold/60" autoComplete="email" />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-foreground">
        {copy.message}
        <textarea maxLength={4500} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} className="rounded-xl border border-border bg-background p-3 font-normal outline-none focus:border-gold/60" />
      </label>
      <button disabled={loading} type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold to-primary px-5 text-sm font-bold text-white disabled:opacity-60">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {copy.submit}
      </button>
      {status === 'success' ? <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">{copy.success}</p> : null}
      {status === 'error' ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{copy.error}</p> : null}
    </form>
  )
}
