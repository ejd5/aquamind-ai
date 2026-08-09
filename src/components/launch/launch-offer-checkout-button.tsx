'use client'

import { useCallback, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/hooks/use-toast'

/**
 * Bouton d'achat d'une offre de lancement (Web, Stripe Checkout).
 *
 * Le client n'envoie QUE { offerCode, planId, platform, idempotencyKey }.
 * L'éligibilité, la réservation, le prix et la session Stripe sont résolus
 * exclusivement côté serveur (POST /api/promotions/launch/checkout).
 */
export function LaunchOfferCheckoutButton({
  offerCode,
  planId,
  platform = 'WEB',
  className,
}: {
  offerCode: string
  planId: string
  platform?: 'WEB'
  className?: string
}) {
  const { status } = useSession()
  const { toast } = useToast()
  const inFlightRef = useRef(false)
  const [pending, setPending] = useState(false)

  const start = useCallback(async () => {
    if (inFlightRef.current || pending) return
    inFlightRef.current = true

    if (status !== 'authenticated') {
      inFlightRef.current = false
      const params = new URLSearchParams(window.location.search)
      params.set('offerCode', offerCode)
      params.set('planId', planId)
      window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(`${window.location.pathname}?${params.toString()}`)}`
      return
    }

    setPending(true)
    const idempotencyKey = crypto.randomUUID()
    try {
      const res = await fetch('/api/promotions/launch/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerCode, planId, platform, idempotencyKey }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Offre non disponible', description: data?.error || data?.reasonCode || 'Réessayez plus tard' })
        return
      }
      if (data.url) {
        window.location.assign(data.url)
      } else {
        toast({ title: 'Erreur', description: 'La session de paiement est introuvable.' })
      }
    } catch {
      toast({ title: 'Erreur', description: 'Une erreur est survenue. Réessayez.' })
    } finally {
      setPending(false)
      inFlightRef.current = false
    }
  }, [status, pending, offerCode, planId, platform, toast])

  return (
    <button
      type="button"
      onClick={start}
      disabled={pending}
      className={className ?? 'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold transition-all active:scale-[0.98] disabled:cursor-wait disabled:opacity-70'}
    >
      {pending ? 'Création du paiement…' : 'Profiter de l’offre'}
    </button>
  )
}
