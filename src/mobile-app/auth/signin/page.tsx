'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckCircle2, Loader2, Lock, Mail } from 'lucide-react'
import { api, apiUrl } from '@/lib/api-client'

type CsrfResponse = { csrfToken?: string }
type AuthCallbackResponse = { url?: string }

export default function MobileSigninPage() {
  const router = useRouter()
  const params = useSearchParams()
  const t = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const registered = params.get('registered') === '1'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const csrfResponse = await fetch(apiUrl('/api/auth/csrf'), {
        credentials: 'include',
        cache: 'no-store',
      })
      const csrf = (await csrfResponse.json()) as CsrfResponse
      if (!csrfResponse.ok || !csrf.csrfToken) throw new Error(t('errorGeneric'))

      const body = new URLSearchParams({
        csrfToken: csrf.csrfToken,
        email: email.trim().toLowerCase(),
        password,
        callbackUrl: apiUrl('/'),
        json: 'true',
      })

      const callbackResponse = await fetch(apiUrl('/api/auth/callback/credentials'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Auth-Return-Redirect': '1',
        },
        body: body.toString(),
      })

      const callback = (await callbackResponse.json().catch(() => ({}))) as AuthCallbackResponse
      if (
        !callbackResponse.ok ||
        !callback.url ||
        callback.url.includes('error=CredentialsSignin')
      ) {
        throw new Error(t('errorInvalidCredentials'))
      }

      await api.get('/api/auth/me')
      router.replace('/')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="safe-area-top flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-6 shadow-xl">
        <div className="text-center">
          <img
            src="/logo-aqwelia-web.png"
            alt="AQWELIA"
            className="mx-auto h-16 w-auto object-contain"
          />
          <h1 className="mt-4 font-display text-2xl font-bold">{t('loginTitle')}</h1>
        </div>

        {registered ? (
          <p
            role="status"
            className="mt-6 flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm text-foreground"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{t('registered')}</span>
          </p>
        ) : null}

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-xs font-semibold text-muted-foreground">
            <span className="mb-1.5 block">{t('emailLabel')}</span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('emailPlaceholder')}
                className="input-glass min-h-12 w-full pl-10"
              />
            </span>
          </label>

          <label className="block text-xs font-semibold text-muted-foreground">
            <span className="mb-1.5 block">{t('passwordLabel')}</span>
            <span className="relative block">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('passwordPlaceholder')}
                className="input-glass min-h-12 w-full pl-10"
              />
            </span>
          </label>

          {error ? (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? t('connecting') : t('signIn')}
          </button>
        </form>
      </section>
    </main>
  )
}
