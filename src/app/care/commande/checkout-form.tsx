'use client'

/**
 * AQWELIA Care — Checkout form (client component).
 *
 * POSTs the shipping address to /api/care/checkout. On success redirects to
 * /care/suivi. Displays inline validation errors.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface Props {
  labels: {
    address: string
    addressPlaceholder: string
    city: string
    zip: string
    country: string
    submit: string
    submitting: string
    success: string
    error: string
  }
}

export function CheckoutForm({ labels }: Props) {
  const router = useRouter()
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [country, setCountry] = useState('FR')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'submitting') return
    if (!address.trim() || !city.trim() || !zipCode.trim()) {
      setErrorMsg(labels.error)
      setStatus('error')
      return
    }
    setStatus('submitting')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/care/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.trim(),
          city: city.trim(),
          zipCode: zipCode.trim(),
          country: country.trim() || 'FR',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data?.error ?? labels.error)
        setStatus('error')
        return
      }
      setStatus('success')
      setTimeout(() => router.push('/care/suivi'), 800)
    } catch {
      setErrorMsg(labels.error)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-gold/40 bg-white/60 p-8 text-center backdrop-blur-xl dark:bg-white/[0.04]">
        <CheckCircle2 className="mx-auto h-12 w-12 text-gold" />
        <h3 className="mt-4 font-display text-xl font-bold">{labels.success}</h3>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-white/40 bg-white/50 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] sm:p-8"
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-foreground">
            {labels.address} <span className="text-gold">*</span>
          </span>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={labels.addressPlaceholder}
            className="input-glass w-full"
            autoComplete="street-address"
            required
          />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-foreground">
              {labels.city} <span className="text-gold">*</span>
            </span>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input-glass w-full"
              autoComplete="address-level2"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-foreground">
              {labels.zip} <span className="text-gold">*</span>
            </span>
            <input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className="input-glass w-full"
              autoComplete="postal-code"
              required
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-foreground">
            {labels.country}
          </span>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="input-glass w-full"
            autoComplete="country-name"
            maxLength={2}
          />
        </label>
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
            {labels.submitting}
          </>
        ) : (
          <>{labels.submit}</>
        )}
      </button>
    </form>
  )
}
