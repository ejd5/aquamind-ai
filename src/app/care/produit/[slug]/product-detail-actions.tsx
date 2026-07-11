'use client'

/**
 * AQWELIA Care — Product detail "Add to cart" actions (client component).
 *
 * Renders the appropriate CTA based on the product state:
 *  - partnerOnly → link to /care/partenaires
 *  - outOfStock → disabled button
 *  - default → POST to /api/care/cart/item (redirects to /auth/signin on 401)
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShoppingCart, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react'

interface Props {
  productId: string
  partnerOnly: boolean
  outOfStock: boolean
  labels: {
    addToCart: string
    partnerOnly: string
    outOfStock: string
    partners: string
  }
}

export function ProductDetailActions({
  productId,
  partnerOnly,
  outOfStock,
  labels,
}: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  if (partnerOnly) {
    return (
      <Link
        href="/care/partenaires"
        className="flex w-full items-center justify-center gap-2 rounded-full border border-amber-500/50 bg-amber-500/10 px-6 py-3.5 text-sm font-bold text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-300"
      >
        <AlertTriangle className="h-4 w-4" />
        {labels.partners}
      </Link>
    )
  }

  if (outOfStock) {
    return (
      <button
        type="button"
        disabled
        className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border border-border/60 bg-muted/30 px-6 py-3.5 text-sm font-bold text-muted-foreground"
      >
        {labels.outOfStock}
      </button>
    )
  }

  async function onAdd() {
    setStatus('submitting')
    try {
      const res = await fetch('/api/care/cart/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      })
      if (res.status === 401) {
        router.push('/auth/signin')
        return
      }
      if (!res.ok) {
        setStatus('error')
        return
      }
      setStatus('success')
    } catch {
      setStatus('error')
    }
    setTimeout(() => setStatus('idle'), 2500)
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={status === 'submitting'}
      className="glow-gold group flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-6 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-70"
    >
      {status === 'submitting' ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {labels.addToCart}
        </>
      ) : status === 'success' ? (
        <>
          <CheckCircle2 className="h-4 w-4" />
          {labels.addToCart} ✓
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" />
          {labels.addToCart}
        </>
      )}
    </button>
  )
}
