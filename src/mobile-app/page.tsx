'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, RefreshCw } from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'

type MobileSessionResponse = {
  user: { id?: string; email?: string | null; name?: string | null } | null
  entryTarget?: string
}

export default function MobileEntryPage() {
  const router = useRouter()
  const t = useTranslations('proApp')
  const [error, setError] = useState(false)

  const resolveEntry = useCallback(async () => {
    setError(false)
    try {
      const response = await api.get<MobileSessionResponse>('/api/auth/me')
      if (!response.user) {
        router.replace('/auth/signin')
        return
      }

      if (response.entryTarget?.startsWith('/pro/app')) {
        router.replace('/pro/app/today')
        return
      }

      setError(true)
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        router.replace('/auth/signin')
        return
      }
      setError(true)
    }
  }, [router])

  useEffect(() => {
    void resolveEntry()
  }, [resolveEntry])

  return (
    <main className="safe-area-top flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-6 text-center shadow-xl">
        <img
          src="/logo-aqwelia-web.png"
          alt="AQWELIA"
          className="mx-auto h-16 w-auto object-contain"
        />
        <p className="mt-4 text-sm font-semibold text-muted-foreground">{t('brandTagline')}</p>

        {error ? (
          <>
            <p className="mt-6 text-sm text-destructive">{t('errorGeneric')}</p>
            <button
              type="button"
              onClick={() => void resolveEntry()}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              {t('retry')}
            </button>
          </>
        ) : (
          <Loader2 className="mx-auto mt-6 h-7 w-7 animate-spin text-primary" />
        )}
      </section>
    </main>
  )
}
