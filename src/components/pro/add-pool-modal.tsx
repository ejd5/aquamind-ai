'use client'

/**
 * AQWELIA Pro — AddPoolModal (glassmorphism modal).
 *
 * Controlled modal: parent owns the `open` state and gets notified on
 * `onCreated(pool)` after a successful POST to /api/pro/pools.
 *
 * Form fields: name, type, volume, shape, surface, treatmentType, filterType,
 * saltSystem. The `clientId` is required by the API and must be passed by the
 * parent (the client the pool belongs to).
 *
 * Glassmorphism DA: bg-white/60 backdrop-blur-xl border-white/40, gold accents.
 */
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { X, Loader2, AlertCircle, Sparkles, Check, Waves } from 'lucide-react'

interface Props {
  open: boolean
  clientId: string
  onClose: () => void
  onCreated?: (pool: CreatedPool) => void
}

export interface CreatedPool {
  id: string
  name: string
  type: string
  volume?: number | null
  shape?: string | null
  surface?: string | null
  treatmentType?: string | null
  filterType?: string | null
  saltSystem?: boolean
}

interface FormState {
  name: string
  type: string
  volume: string
  shape: string
  surface: string
  treatmentType: string
  filterType: string
  saltSystem: boolean
}

const EMPTY: FormState = {
  name: '',
  type: 'pool',
  volume: '',
  shape: 'rectangular',
  surface: 'liner',
  treatmentType: 'chlorine',
  filterType: 'sand',
  saltSystem: false,
}

const POOL_TYPES = ['pool', 'spa', 'both']
const SHAPES = ['rectangular', 'round', 'oval', 'free']
const SURFACES = ['liner', 'shell', 'concrete', 'tile']
const TREATMENTS = ['chlorine', 'salt', 'bromine', 'active_oxygen', 'other']
const FILTERS = ['sand', 'cartridge', 'glass', 'diatom']

export function AddPoolModal({ open, clientId, onClose, onCreated }: Props) {
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

    if (!form.name.trim()) {
      setErrorMsg(t('addPoolErrorName'))
      return
    }

    setStatus('submitting')
    setErrorMsg(null)

    const volumeNum = form.volume.trim() ? parseFloat(form.volume) : undefined

    try {
      const res = await fetch('/api/pro/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proClientId: clientId,
          name: form.name.trim(),
          type: form.type,
          volume: Number.isFinite(volumeNum) ? volumeNum : undefined,
          shape: form.shape,
          surface: form.surface,
          treatmentType: form.treatmentType,
          filterType: form.filterType,
          saltSystem: form.saltSystem,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.pool) {
        setErrorMsg(data?.error ?? t('addPoolErrorGeneric'))
        setStatus('idle')
        return
      }
      setStatus('success')
      onCreated?.(data.pool as CreatedPool)
      setTimeout(() => {
        reset()
        onClose()
      }, 1200)
    } catch {
      setErrorMsg(t('addPoolErrorGeneric'))
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
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-md shadow-primary/30">
              <Waves className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">
                {t('addPoolTitle')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('addPoolSubtitle')}
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

        {status === 'success' ? (
          <div className="rounded-2xl border border-gold/40 bg-gold/5 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-white shadow-lg">
              <Check className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold">{t('addPoolSuccess')}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('addPoolName')} required full>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder={t('addPoolNamePlaceholder')}
                  className="input-glass"
                  required
                />
              </Field>
              <Field label={t('addPoolType')}>
                <select
                  value={form.type}
                  onChange={(e) => update('type', e.target.value)}
                  className="input-glass"
                >
                  {POOL_TYPES.map((opt) => (
                    <option key={opt} value={opt}>
                      {t(`poolType${cap(opt)}` as any)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('addPoolVolume')}>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.volume}
                  onChange={(e) => update('volume', e.target.value)}
                  className="input-glass"
                  inputMode="decimal"
                />
              </Field>
              <Field label={t('addPoolShape')}>
                <select
                  value={form.shape}
                  onChange={(e) => update('shape', e.target.value)}
                  className="input-glass"
                >
                  {SHAPES.map((opt) => (
                    <option key={opt} value={opt}>
                      {t(`shape${cap(opt)}` as any)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('addPoolSurface')}>
                <select
                  value={form.surface}
                  onChange={(e) => update('surface', e.target.value)}
                  className="input-glass"
                >
                  {SURFACES.map((opt) => (
                    <option key={opt} value={opt}>
                      {t(`surface${cap(opt)}` as any)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('addPoolTreatment')}>
                <select
                  value={form.treatmentType}
                  onChange={(e) => update('treatmentType', e.target.value)}
                  className="input-glass"
                >
                  {TREATMENTS.map((opt) => (
                    <option key={opt} value={opt}>
                      {t(`treatment${cap(opt)}` as any)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('addPoolFilter')}>
                <select
                  value={form.filterType}
                  onChange={(e) => update('filterType', e.target.value)}
                  className="input-glass"
                >
                  {FILTERS.map((opt) => (
                    <option key={opt} value={opt}>
                      {t(`filter${cap(opt)}` as any)}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.saltSystem}
                  onChange={(e) => update('saltSystem', e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-xs font-semibold text-foreground">
                  {t('treatmentSalt')}
                </span>
              </label>
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
                    {t('addPoolSubmitting')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    {t('addPoolSubmit')}
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

function cap(s: string): string {
  // active_oxygen → ActiveOxygen
  return s
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
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
