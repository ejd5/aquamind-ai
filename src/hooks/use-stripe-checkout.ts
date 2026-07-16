'use client'

import { useCallback, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { billing } from '@/lib/billing'
import {
  getWebProductId,
  type Duration,
  type PlanId,
} from '@/lib/billing/plans'
import { useToast } from '@/hooks/use-toast'

type PaidPlanId = Exclude<PlanId, 'decouverte'>
type WebDuration = Exclude<Duration, 'week'>

export function useStripeCheckout() {
  const { status } = useSession()
  const t = useTranslations('landing')
  const { toast } = useToast()

  // Synchronous lock: set BEFORE any async call, cleared on error.
  // Uses useRef so it does not depend on a React re-render — two
  // rapid clicks cannot create two Stripe sessions because the ref
  // is mutated synchronously on the first click.
  const checkoutInFlightRef = useRef(false)

  // State only for UI feedback (button spinner / disabled).
  const [pendingProductId, setPendingProductId] = useState<string | null>(null)

  const startCheckout = useCallback(
    async (planId: PaidPlanId, duration: WebDuration) => {
      if (status === 'loading') return

      // Synchronous double-click guard: check and set the ref in the
      // same tick, before any await. This prevents a second click from
      // creating a second Stripe session even if React has not
      // re-rendered yet.
      if (checkoutInFlightRef.current) return
      checkoutInFlightRef.current = true

      if (status !== 'authenticated') {
        // Preserve the selected plan + duration through the sign-in flow.
        const params = new URLSearchParams(window.location.search)
        params.set('plan', planId)
        params.set('duration', duration)
        const callbackUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`
        window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
        checkoutInFlightRef.current = false
        return
      }

      const productId = getWebProductId(planId, duration)
      setPendingProductId(productId)

      const result = await billing.purchase(productId)
      if (!result.success) {
        toast({
          title: t('errorTitle'),
          description: result.error,
          variant: 'destructive',
        })
        checkoutInFlightRef.current = false
        setPendingProductId(null)
      }
      // On success, billing.purchase() navigates to Stripe Checkout.
      // We keep the lock active during the brief window before navigation.
    },
    [status, t, toast],
  )

  const isCheckoutPending = useCallback(
    (planId: PaidPlanId, duration: WebDuration) =>
      pendingProductId === getWebProductId(planId, duration),
    [pendingProductId],
  )

  // Global pending state for UI feedback: true while ANY checkout
  // session is being created. Derived from state only (not from the
  // ref) so it is safe to read during render.
  const isAnyCheckoutPending = pendingProductId !== null

  return {
    startCheckout,
    isCheckoutPending,
    isAnyCheckoutPending,
  }
}
