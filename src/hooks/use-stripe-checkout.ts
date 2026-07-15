'use client'

import { useState } from 'react'
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
  const [pendingProductId, setPendingProductId] = useState<string | null>(null)

  async function startCheckout(planId: PaidPlanId, duration: WebDuration) {
    if (status === 'loading') return

    if (status !== 'authenticated') {
      // Preserve the selected plan + duration through the sign-in flow
      // so the user does not have to re-select after authenticating.
      // The values are validated server-side when checkout is eventually
      // requested (the /api/stripe/checkout route never trusts a
      // client-supplied Price ID and always resolves it from the
      // validated catalogue).
      const params = new URLSearchParams(window.location.search)
      params.set('plan', planId)
      params.set('duration', duration)
      const callbackUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`
      window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
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
      setPendingProductId(null)
    }
  }

  return {
    startCheckout,
    isCheckoutPending: (planId: PaidPlanId, duration: WebDuration) =>
      pendingProductId === getWebProductId(planId, duration),
  }
}
