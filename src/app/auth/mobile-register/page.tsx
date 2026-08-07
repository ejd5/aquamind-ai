'use client'

/**
 * AQWELIA Wave A4 — hosted registration dedicated to the native app.
 *
 * The static Capacitor bundle opens this HTTPS page in the system browser so
 * Cloudflare Turnstile can run on the deployed AQWELIA origin. This route is
 * intentionally credentials-only: a user created here can immediately sign in
 * through the native credentials screen after the secure deep-link return.
 *
 * No password, token or user id is ever transported through the deep link.
 */

import { useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRight, Loader2, Lock, Mail, ShieldCheck, User as UserIcon } from 'lucide-react'
import { TurnstileWidget } from '@/components/security/turnstile-widget'
import { AUTH_SECURITY_COPY, type AuthSecurityLocale } from '@/i18n/locales/auth-security-copy'

const COMPLETE_PATH = '/auth/mobile-complete'

export default function MobileHostedRegisterPage() {
  const t = useTranslations('auth')
  const locale = useLocale() as AuthSecurityLocale
  const securityCopy = AUTH_SECURITY_COPY[locale] ?? AUTH_SECURITY_COPY.en
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileVersion, setTurnstileVersion] = useState(0)
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim() || undefined,
          turnstileToken,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error || t('errorSignup'))

      // Registration is complete. The native application establishes its own
      // cookie-backed NextAuth session after the deep-link return.
      window.location.assign(COMPLETE_PATH)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('errorGeneric'))
      if (turnstileSiteKey) {
        setTurnstileToken(null)
        setTurnstileVersion((value) => value + 1)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-xl sm:p-8">
        <div className="text-center">
          <img src="/logo-aqwelia-web.png" alt="AQWELIA" className="mx-auto h-16 w-auto object-contain" />
          <h1 className="mt-4 font-display text-2xl font-bold">{t('signupTitle')}</h1>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {t('encryptedData')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label htmlFor="mobile-register-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t('nameLabel')}
            </label>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                id="mobile-register-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('namePlaceholder')}
                className="min-h-12 w-full rounded-xl border border-border bg-background/60 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="mobile-register-email" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t('emailLabel')}
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                id="mobile-register-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('emailPlaceholder')}
                className="min-h-12 w-full rounded-xl border border-border bg-background/60 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="mobile-register-password" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t('passwordLabel')}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                id="mobile-register-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('passwordHint')}
                className="min-h-12 w-full rounded-xl border border-border bg-background/60 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {turnstileSiteKey ? (
            <TurnstileWidget
              key={turnstileVersion}
              siteKey={turnstileSiteKey}
              onToken={setTurnstileToken}
              onError={() => setError(securityCopy.turnstileUnavailable)}
            />
          ) : null}

          {error ? (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading || (Boolean(turnstileSiteKey) && !turnstileToken)}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {loading ? t('creating') : t('signUp')}
            {!loading ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t('agreeTermsStart')}
          <Link href="/legal/cgu" className="px-1 underline">{t('cgu')}</Link>
          {t('agreeTermsAnd')}
          <Link href="/legal/privacy" className="px-1 underline">{t('privacyPolicy')}</Link>
        </p>
      </section>
    </main>
  )
}
