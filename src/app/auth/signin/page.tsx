'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User as UserIcon, ArrowRight, ArrowLeft, Loader2, ShieldCheck, Gift } from 'lucide-react'

type Mode = 'signin' | 'signup'

// Inline SVG brand icons (Google G + Apple logo) — avoids extra deps
function GoogleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/>
    </svg>
  )
}

function AppleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.25 3.06-.85.88-1.88 1.39-3.04 1.27-.04-1.1.41-2.16 1.18-2.95.78-.79 1.94-1.39 3.11-1.38ZM20.7 17.36c-.55 1.27-.82 1.84-1.53 2.96-.99 1.56-2.38 3.5-4.1 3.52-1.53.01-1.92-1-3.99-.99-2.07.01-2.5.99-4.03.97-1.72-.02-3.04-1.77-4.03-3.32C-.13 16.84-.4 12.18 1.1 9.71c1.07-1.77 2.76-2.81 4.35-2.81 1.62 0 2.63 1 3.96 1 1.29 0 2.08-1 3.95-1 1.42 0 2.93.77 4 2.11-3.52 1.93-2.95 6.96.34 8.35Z"/>
    </svg>
  )
}

export default function AuthPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const params = useSearchParams()
  const requestedCallbackUrl = params.get('callbackUrl')
  const callbackUrl =
    requestedCallbackUrl?.startsWith('/') && !requestedCallbackUrl.startsWith('//')
      ? requestedCallbackUrl
      : '/auth/entry'
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Available OAuth providers (populated from /api/auth/providers — server-driven
  // so we only render buttons for providers that have their env vars configured).
  const [oauthProviders, setOauthProviders] = useState<{ google?: boolean; apple?: boolean }>({})

  useEffect(() => {
    const m = params.get('mode')
    if (m === 'signup' || m === 'signin') setMode(m)
    // Discover which OAuth providers are configured server-side.
    fetch('/api/auth/providers')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, { id: string }>) => {
        setOauthProviders({
          google: Boolean(data.google),
          apple: Boolean(data.apple),
        })
      })
      .catch(() => setOauthProviders({}))
  }, [params])

  async function handleOAuth(provider: 'google' | 'apple') {
    setError(null)
    setOauthLoading(provider)
    try {
      // Full-page redirect: OAuth flow needs to leave the SPA.
      await signIn(provider, { callbackUrl })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'))
      setOauthLoading(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'signup') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name: name || undefined }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || t('errorSignup'))
        // Auto-login after register
        const result = await signIn('credentials', { email, password, redirect: false })
        if (!result?.ok) throw new Error(t('errorCreatedNeedSignin'))
        router.push(callbackUrl)
        router.refresh()
      } else {
        const result = await signIn('credentials', { email, password, redirect: false })
        if (!result?.ok) {
          throw new Error(t('errorInvalidCredentials'))
        }
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Aurora background */}
      <div className="aurora-bg pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div
        className="aurora-orb -left-20 top-10 h-72 w-72 bg-[oklch(0.69_0.10_195/0.5)]"
        aria-hidden="true"
      />
      <div
        className="aurora-orb right-0 top-32 h-80 w-80 bg-[oklch(0.65_0.11_195/0.4)]"
        style={{ animationDelay: '-6s' }}
        aria-hidden="true"
      />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
        {/* Back to home */}
        <Link
          href="/"
          className="mb-6 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {t('backHome')}
        </Link>

        {/* Logo + title */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center">
            <div className="relative">
              <img src="/logo-aqwelia-web.png" alt="AQWELIA" className="h-16 w-auto object-contain" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            <span className="aqua-text-gradient">AQWELIA</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === 'signin' ? t('loginTitle') : t('signupTitle')}
          </p>
        </div>

        {/* Form card */}
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          {/* Mode tabs */}
          <div className="mb-6 flex rounded-full bg-secondary/60 p-1">
            <button
              type="button"
              aria-pressed={mode === 'signin'}
              onClick={() => { setMode('signin'); setError(null) }}
              className={`min-h-11 flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 ${
                mode === 'signin' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('loginTab')}
            </button>
            <button
              type="button"
              aria-pressed={mode === 'signup'}
              onClick={() => { setMode('signup'); setError(null) }}
              className={`min-h-11 flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 ${
                mode === 'signup' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('signupTab')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <label htmlFor="auth-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    {t('nameLabel')}
                  </label>
                  <div className="relative">
                    <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <input
                      id="auth-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('namePlaceholder')}
                      aria-describedby={error ? 'auth-error' : undefined}
                      className="min-h-12 w-full rounded-xl border border-border bg-background/60 py-2.5 pl-10 pr-3 text-sm outline-none transition-all focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label htmlFor="auth-email" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t('emailLabel')}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  aria-describedby={error ? 'auth-error' : undefined}
                  className="min-h-12 w-full rounded-xl border border-border bg-background/60 py-2.5 pl-10 pr-3 text-sm outline-none transition-all focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t('passwordLabel')}
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                  minLength={mode === 'signup' ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? t('passwordHint') : t('passwordPlaceholder')}
                  aria-describedby={error ? 'auth-error' : undefined}
                  className="min-h-12 w-full rounded-xl border border-border bg-background/60 py-2.5 pl-10 pr-3 text-sm outline-none transition-all focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
                />
              </div>
            </div>

            {error && (
              <motion.div
                id="auth-error"
                role="alert"
                aria-live="assertive"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-6 py-3 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-lg transition-all hover:scale-[1.01] hover:shadow-[0_0_40px_-8px_oklch(0.65_0.11_195/0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {mode === 'signin' ? t('connecting') : t('creating')}
                </>
              ) : (
                <>
                  {mode === 'signin' ? t('signIn') : t('signUp')}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* OAuth providers (Google + Apple) — only rendered if the server
              reports them as configured in /api/auth/providers. App Store
              requires "Sign in with Apple" whenever any social login is offered. */}
          {(oauthProviders.google || oauthProviders.apple) && (
            <div className="mt-6">
              <div className="relative mb-4 text-center">
                <span className="relative z-10 inline-flex items-center gap-2 bg-background px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <span className="h-px w-6 bg-border/60" />
                  {t('orContinueWith')}
                  <span className="h-px w-6 bg-border/60" />
                </span>
                <span className="absolute inset-x-0 top-1/2 -z-0 h-px -translate-y-1/2 bg-border/40" />
              </div>
              <div className="grid gap-2">
                {oauthProviders.google && (
                  <button
                    type="button"
                    onClick={() => handleOAuth('google')}
                    disabled={oauthLoading !== null}
                    className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:border-gold/40 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {oauthLoading === 'google' ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <GoogleIcon />
                    )}
                    {t('signInWithGoogle')}
                  </button>
                )}
                {oauthProviders.apple && (
                  <button
                    type="button"
                    onClick={() => handleOAuth('apple')}
                    disabled={oauthLoading !== null}
                    className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {oauthLoading === 'apple' ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <AppleIcon className="text-background" />
                    )}
                    {t('signInWithApple')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Trust indicators */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-gold" aria-hidden="true" />
              {t('encryptedData')}
            </span>
            <span className="inline-flex items-center gap-1">
              <Gift className="h-3 w-3 text-gold" aria-hidden="true" />
              {t('freePlan')}
            </span>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t('agreeTermsStart')}
          <Link href="/legal/cgu" className="inline-flex min-h-11 items-center rounded px-1 underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40">{t('cgu')}</Link>
          {t('agreeTermsAnd')}
          <Link href="/legal/privacy" className="inline-flex min-h-11 items-center rounded px-1 underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40">{t('privacyPolicy')}</Link>
        </p>
      </div>
    </div>
  )
}
