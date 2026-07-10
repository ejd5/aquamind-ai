'use client'

/**
 * AQWELIA Care — "Add kit to cart" client component.
 *
 * POSTs each kit item to /api/care/cart/item sequentially (small list — usually
 * 4-6 items). Redirects to /auth/signin on 401.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Loader2, CheckCircle2 } from 'lucide-react'

interface Props {
  items: Array<{ productId: string; quantity: number }>
  labels: {
    addKitToCart: string
    added: string
    empty: string
  }
}

export function KitAddToCart({ items, labels }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  if (items.length === 0) {
    return (
      <div className="rounded-full border border-border/60 bg-muted/30 px-5 py-2.5 text-xs font-semibold text-muted-foreground">
        {labels.empty}
      </div>
    )
  }

  async function onAdd() {
    setStatus('submitting')
    try {
      for (const item of items) {
        const res = await fetch('/api/care/cart/item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        })
        if (res.status === 401) {
          router.push('/auth/signin')
          return
        }
        if (!res.ok) {
          setStatus('error')
          return
        }
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
          {labels.addKitToCart}
        </>
      ) : status === 'success' ? (
        <>
          <CheckCircle2 className="h-4 w-4" />
          {labels.added}
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" />
          {labels.addKitToCart}
        </>
      )}
    </button>
  )
}
