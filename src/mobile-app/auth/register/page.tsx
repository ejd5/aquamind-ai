'use client'

/**
 * AQWELIA Wave A3 — mobile B2C registration.
 *
 * Creates the account via /api/auth/register then auto-logs-in through the
 * NextAuth credentials flow, mirroring the web register behaviour. After a
 * successful sign-in the session hook triggers the RevenueCat identity bridge.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, Lock, Mail, User } from 'lucide-react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

export default function MobileRegisterPage() {
  const router = useRouter()
  const t = useTranslations('auth')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: name || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('errorSignup'))
      const result = await signIn('credentials', { email, password, redirect: false })
      if (!result?.ok) throw new Error(t('errorCreatedNeedSignin'))
      router.replace('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="safe-area-top flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-6 shadow-xl">
        <img src="/logo-aqwelia-web.png" alt="AQWELIA" className="mx-auto h-14 w-auto object-contain" />
        <h1 className="mt-4 text-center text-lg font-bold">{t('signUp')}</h1>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <label className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background px-3 py-2.5">
            <User className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('name')}
              className="w-full bg-transparent text-sm outline-none"
              autoComplete="name"
            />
          </label>
          <label className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background px-3 py-2.5">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('email')}
              className="w-full bg-transparent text-sm outline-none"
              autoComplete="email"
            />
          </label>
          <label className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background px-3 py-2.5">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('password')}
              className="w-full bg-transparent text-sm outline-none"
              autoComplete="new-password"
            />
          </label>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('signUp')}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t('alreadyAccount')}{' '}
          <Link href="/auth/signin" className="font-semibold text-primary">{t('signIn')}</Link>
        </p>
      </section>
    </main>
  )
}
