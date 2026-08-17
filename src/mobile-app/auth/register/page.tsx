'use client'

/**
 * AQWELIA Wave A4 — secure mobile registration handoff.
 *
 * The static Capacitor bundle cannot safely mint a Cloudflare Turnstile token
 * from its local WebView origin. Registration is therefore performed on a
 * dedicated HTTPS AQWELIA page in the system browser.
 *
 * That hosted page is intentionally credentials-only (no Google/Apple OAuth),
 * so a newly-created mobile account can immediately sign in through the native
 * credentials screen. Once registration succeeds, the hosted page returns to
 * the installed app through aqwelia://auth/complete.
 */

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Browser } from '@capacitor/browser'
import { ExternalLink, Loader2, ShieldCheck } from 'lucide-react'
import { apiUrl } from '@/lib/api-client'

const MOBILE_HOSTED_REGISTER_PATH = '/auth/mobile-register'

export default function MobileRegisterPage() {
  const t = useTranslations('auth')
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function openSecureRegistration() {
    setOpening(true)
    setError(null)
    try {
      const url = apiUrl(MOBILE_HOSTED_REGISTER_PATH)
      if (!/^https:\/\//i.test(url)) throw new Error(t('errorGeneric'))
      await Browser.open({ url })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('errorGeneric'))
    } finally {
      setOpening(false)
    }
  }

  return (
    <main className="safe-area-top flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-6 shadow-xl">
        <img src="/logo-aqwelia-web.png" alt="AQWELIA" className="mx-auto h-14 w-auto object-contain" />
        <h1 className="mt-4 text-center text-lg font-bold">{t('signupTitle')}</h1>

        <div className="mt-6 rounded-2xl border border-border/60 bg-background/70 p-4 text-center">
          <ShieldCheck className="mx-auto h-6 w-6 text-primary" aria-hidden="true" />
          <button
            type="button"
            onClick={openSecureRegistration}
            disabled={opening}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {opening ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ExternalLink className="h-4 w-4" aria-hidden="true" />}
            {t('signUp')}
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <p className="mt-5 text-center text-xs text-muted-foreground">
          {t('alreadyAccount')}{' '}
          <Link href="/auth/signin" className="font-semibold text-primary">{t('signIn')}</Link>
        </p>
      </section>
    </main>
  )
}
