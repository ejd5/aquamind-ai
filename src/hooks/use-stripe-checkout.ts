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
      const callbackUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
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
