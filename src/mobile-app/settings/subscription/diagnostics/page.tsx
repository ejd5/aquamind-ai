'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { MobileSubHeader } from '@/components/mobile/mobile-sub-header'
import { billing } from '@/lib/billing'
import { revenueCatIdentityBridge } from '@/lib/billing/revenuecat-identity'
import type { Product, SubscriptionApiResponse } from '@/lib/billing/types'
import { api, apiUrl } from '@/lib/api-client'
import { getPlatform, isNative } from '@/lib/platform'

const ENABLED = process.env.NEXT_PUBLIC_MOBILE_SANDBOX_DIAGNOSTICS === 'true'
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '')

type Readiness = {
  ok?: boolean
  vercelEnvironment?: string
  deploymentEnvironment?: string
  sandboxAllowed?: boolean
  billingAccessEnvironment?: string
}

type DiagnosticState = {
  refreshing: boolean
  backendReachable: boolean | null
  authenticated: boolean | null
  plan: string | null
  identityState: string
  serverIdentityBound: boolean
  billingEnvironment: string | null
  products: Product[]
  readiness: Readiness | null
  error: string | null
}

const INITIAL: DiagnosticState = {
  refreshing: false,
  backendReachable: null,
  authenticated: null,
  plan: null,
  identityState: 'idle',
  serverIdentityBound: false,
  billingEnvironment: null,
  products: [],
  readiness: null,
  error: null,
}

function Status({ value }: { value: boolean | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>
  return value ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label="OK" />
  ) : (
    <XCircle className="h-4 w-4 text-destructive" aria-label="Error" />
  )
}

export default function MobileSandboxDiagnosticsPage() {
  const [state, setState] = useState<DiagnosticState>(INITIAL)
  const backendHost = useMemo(() => {
    try {
      return API_BASE ? new URL(API_BASE).host : 'relative'
    } catch {
      return API_BASE || 'invalid'
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!ENABLED) return
    setState((current) => ({ ...current, refreshing: true, error: null }))

    let backendReachable = false
    let authenticated = false
    let plan: string | null = null
    let products: Product[] = []
    let readiness: Readiness | null = null
    let error: string | null = null

    try {
      const readinessResponse = await fetch(apiUrl('/api/mobile/sandbox-readiness'), {
        credentials: 'include',
        cache: 'no-store',
      })
      readiness = (await readinessResponse.json().catch(() => null)) as Readiness | null
      backendReachable = readinessResponse.status === 200 || readinessResponse.status === 503
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Backend unreachable'
    }

    try {
      await api.get('/api/auth/me')
      authenticated = true
    } catch {
      authenticated = false
    }

    if (authenticated) {
      try {
        const projection = await api.get<SubscriptionApiResponse>('/api/subscription')
        plan = projection?.plan?.id ?? null
      } catch (cause) {
        error = error ?? (cause instanceof Error ? cause.message : 'Subscription projection unavailable')
      }

      try {
        products = await billing.getProducts()
      } catch (cause) {
        error = error ?? (cause instanceof Error ? cause.message : 'RevenueCat products unavailable')
      }
    }

    const identity = revenueCatIdentityBridge.snapshot()
    setState({
      refreshing: false,
      backendReachable,
      authenticated,
      plan,
      identityState: identity.state,
      serverIdentityBound: identity.serverIdentityBound,
      billingEnvironment: identity.billingAccessEnvironment,
      products,
      readiness,
      error,
    })
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (!ENABLED) {
    return (
      <main className="safe-area-top min-h-screen bg-background pb-12">
        <MobileSubHeader title="Sandbox diagnostics" backHref="/settings/subscription" />
        <div className="px-4 pt-4">
          <section className="rounded-3xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
            Diagnostics are disabled in this build.
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="safe-area-top min-h-screen bg-background pb-12">
      <MobileSubHeader title="Sandbox diagnostics" backHref="/settings/subscription" />
      <div className="space-y-3 px-4 pt-4">
        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <p className="font-semibold">Native runtime</p>
          </div>
          <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Platform</dt><dd>{isNative() ? getPlatform() : 'web'}</dd>
            <dt className="text-muted-foreground">Backend</dt><dd className="max-w-52 truncate text-right">{backendHost}</dd>
            <dt className="text-muted-foreground">Backend reachable</dt><dd><Status value={state.backendReachable} /></dd>
            <dt className="text-muted-foreground">Authenticated</dt><dd><Status value={state.authenticated} /></dd>
            <dt className="text-muted-foreground">Server plan</dt><dd>{state.plan ?? '—'}</dd>
            <dt className="text-muted-foreground">RevenueCat identity</dt><dd>{state.identityState}</dd>
            <dt className="text-muted-foreground">Server identity bound</dt><dd><Status value={state.serverIdentityBound} /></dd>
            <dt className="text-muted-foreground">Billing environment</dt><dd>{state.billingEnvironment ?? '—'}</dd>
          </dl>
        </section>

        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
          <p className="font-semibold">Staging backend</p>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Deployment</dt><dd>{state.readiness?.deploymentEnvironment ?? '—'}</dd>
            <dt className="text-muted-foreground">Sandbox allowed</dt><dd><Status value={state.readiness?.sandboxAllowed ?? null} /></dd>
            <dt className="text-muted-foreground">Server billing mode</dt><dd>{state.readiness?.billingAccessEnvironment ?? '—'}</dd>
            <dt className="text-muted-foreground">Ready</dt><dd><Status value={state.readiness?.ok ?? null} /></dd>
          </dl>
        </section>

        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
          <p className="font-semibold">RevenueCat offering</p>
          {state.products.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No store products loaded.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {state.products.map((product) => (
                <li key={product.id} className="rounded-2xl border border-border/60 p-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{product.plan} · {product.duration}</span>
                    <span className="font-bold text-primary">{product.priceString}</span>
                  </div>
                  <p className="mt-1 break-all text-muted-foreground">{product.id}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {state.error ? (
          <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">
            {state.error}
          </section>
        ) : null}

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={state.refreshing}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {state.refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh diagnostics
        </button>
      </div>
    </main>
  )
}
