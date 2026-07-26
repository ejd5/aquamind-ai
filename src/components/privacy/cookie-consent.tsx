'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { ShieldCheck, SlidersHorizontal, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { getComplianceCopy } from '@/i18n/locales/compliance-copy'
import {
  OPEN_CONSENT_EVENT,
  readConsentPreference,
  persistConsentPreference,
} from '@/lib/privacy/consent'

export function CookieConsent() {
  const locale = useLocale()
  const copy = getComplianceCopy(locale).consent
  const [open, setOpen] = useState(false)
  const [customizing, setCustomizing] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasExistingChoice, setHasExistingChoice] = useState(false)
  const [saveError, setSaveError] = useState(false)

  useEffect(() => {
    const existing = readConsentPreference()
    setAnalytics(existing?.analytics ?? false)
    setHasExistingChoice(Boolean(existing))
    setOpen(!existing)
    const reopen = () => {
      const current = readConsentPreference()
      setAnalytics(current?.analytics ?? false)
      setHasExistingChoice(Boolean(current))
      setCustomizing(true)
      setOpen(true)
    }
    window.addEventListener(OPEN_CONSENT_EVENT, reopen)
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen)
  }, [])

  async function save(value: boolean, source: string) {
    setSaving(true)
    setSaveError(false)
    try {
      const preference = await persistConsentPreference(value, source)
      setAnalytics(preference.analytics)
      setHasExistingChoice(true)
      setOpen(false)
      setCustomizing(false)
    } catch {
      // Fail closed: no optional analytics SDK is enabled without a recorded choice.
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title">
      <div className="mx-auto max-w-3xl rounded-3xl border border-gold/30 bg-background/95 p-5 shadow-2xl backdrop-blur-2xl sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="cookie-consent-title" className="font-display text-lg font-bold text-foreground">{copy.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
          </div>
          {hasExistingChoice ? (
            <button type="button" onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary" aria-label={copy.close}>
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {saveError ? <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{copy.saveError}</p> : null}

        {customizing ? (
          <div className="mt-5 grid gap-3">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/60 p-4">
              <div>
                <p className="text-sm font-bold text-foreground">{copy.necessaryTitle}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.necessaryBody}</p>
              </div>
              <Switch checked disabled aria-label={copy.necessaryTitle} />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/60 p-4">
              <div>
                <p className="text-sm font-bold text-foreground">{copy.analyticsTitle}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.analyticsBody}</p>
              </div>
              <Switch checked={analytics} onCheckedChange={setAnalytics} aria-label={copy.analyticsTitle} />
            </div>
            <button type="button" disabled={saving} onClick={() => void save(analytics, 'cookie_preferences')} className="min-h-12 rounded-full bg-gradient-to-r from-gold to-primary px-5 text-sm font-bold text-white disabled:opacity-60">
              {copy.save}
            </button>
          </div>
        ) : (
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <button type="button" disabled={saving} onClick={() => void save(false, 'cookie_banner_reject')} className="min-h-12 rounded-full border border-gold/40 bg-background px-4 text-sm font-bold text-foreground hover:bg-secondary disabled:opacity-60">
              {copy.reject}
            </button>
            <button type="button" disabled={saving} onClick={() => setCustomizing(true)} className="min-h-12 rounded-full border border-border bg-secondary/40 px-4 text-sm font-bold text-foreground hover:bg-secondary disabled:opacity-60">
              <SlidersHorizontal className="mr-2 inline h-4 w-4" />{copy.customize}
            </button>
            <button type="button" disabled={saving} onClick={() => void save(true, 'cookie_banner_accept')} className="min-h-12 rounded-full border border-gold/40 bg-background px-4 text-sm font-bold text-foreground hover:bg-secondary disabled:opacity-60">
              {copy.accept}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
