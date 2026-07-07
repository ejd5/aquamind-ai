'use client'

<<<<<<< HEAD
import { useState, useEffect, Suspense } from 'react'
=======
import { useState, useEffect } from 'react'
>>>>>>> main
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Mail, Lock, User as UserIcon, ArrowRight, ArrowLeft, Loader2, ShieldCheck, Gift } from 'lucide-react'

type Mode = 'signin' | 'signup'

<<<<<<< HEAD
function AuthPageContent() {
=======
export default function AuthPage() {
>>>>>>> main
  const router = useRouter()
  const params = useSearchParams()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const m = params.get('mode')
    if (m === 'signup' || m === 'signin') setMode(m)
  }, [params])

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
        if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'inscription')
        // Auto-login after register
        const result = await signIn('credentials', { email, password, redirect: false })
        if (!result?.ok) throw new Error('Compte créé, veuillez vous connecter')
        router.push('/')
        router.refresh()
      } else {
        const result = await signIn('credentials', { email, password, redirect: false })
        if (!result?.ok) {
          throw new Error('Email ou mot de passe incorrect')
        }
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
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
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à l&apos;accueil
        </Link>

        {/* Logo + title */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center">
            <div className="relative">
              <div className="absolute -inset-[3px] rounded-[14px] bg-gradient-to-br from-gold via-ocean-light to-primary opacity-80 blur-[2px]" />
              <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl shadow-lg shadow-primary/30">
                <img src="/icon-aqwelia-48.png" alt="AQWELIA" className="h-12 w-12 object-cover" />
              </div>
              <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-gold to-[oklch(0.55_0.10_195)] shadow-md shadow-gold/40">
                <Sparkles className="h-2.5 w-2.5 text-white" />
              </div>
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            <span className="aqua-text-gradient">AQWELIA</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === 'signin' ? 'Connectez-vous à votre copilote piscine' : 'Créez votre compte en 30 secondes'}
          </p>
        </div>

        {/* Form card */}
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          {/* Mode tabs */}
          <div className="mb-6 flex rounded-full bg-secondary/60 p-1">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null) }}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
                mode === 'signin' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null) }}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
                mode === 'signup' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Inscription
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
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Nom (optionnel)
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jean Dupont"
                      className="w-full rounded-xl border border-border bg-background/60 py-2.5 pl-10 pr-3 text-sm outline-none transition-all focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full rounded-xl border border-border bg-background/60 py-2.5 pl-10 pr-3 text-sm outline-none transition-all focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={mode === 'signup' ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Minimum 8 caractères' : '••••••••'}
                  className="w-full rounded-xl border border-border bg-background/60 py-2.5 pl-10 pr-3 text-sm outline-none transition-all focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
                />
              </div>
            </div>

            {error && (
              <motion.div
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
              className="group flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-6 py-3 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-lg transition-all hover:scale-[1.01] hover:shadow-[0_0_40px_-8px_oklch(0.65_0.11_195/0.7)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === 'signin' ? 'Connexion…' : 'Création…'}
                </>
              ) : (
                <>
                  {mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Trust indicators */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-gold" />
              Données chiffrées
            </span>
            <span className="inline-flex items-center gap-1">
              <Gift className="h-3 w-3 text-gold" />
              Plan Free à vie
            </span>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          En continuant, vous acceptez nos{' '}
          <Link href="/legal/cgu" className="underline hover:text-foreground">CGU</Link>
          {' '}et{' '}
          <Link href="/legal/privacy" className="underline hover:text-foreground">Politique de confidentialité</Link>
        </p>
      </div>
    </div>
  )
}
<<<<<<< HEAD


export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageContent />
    </Suspense>
  )
}
=======
>>>>>>> main
