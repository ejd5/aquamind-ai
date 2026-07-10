'use client'

/**
 * AQWELIA Care — Cart manager (client component).
 *
 * Renders the list of cart line items with qty controls (− / + / remove).
 * Calls /api/care/cart/item PATCH (qty update) and DELETE (remove). The
 * parent server component reads the cart fresh on each navigation.
 */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus, X, AlertTriangle } from 'lucide-react'

interface LineItem {
  productId: string
  sku: string
  name: string
  unit: string
  price: number
  imageUrl: string | null
  quantity: number
  active: boolean
  stockQty: number
}

interface Props {
  items: LineItem[]
  labels: {
    qty: string
    remove: string
    outOfStock: string
    perUnit: string
    subtotal: string
  }
}

export function CartManager({ items, labels }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  async function updateQty(productId: string, qty: number) {
    if (qty < 0) return
    startTransition(async () => {
      if (qty === 0) {
        await fetch('/api/care/cart/item', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        })
      } else {
        await fetch('/api/care/cart/item', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, quantity: qty }),
        })
      }
      router.refresh()
    })
  }

  async function removeItem(productId: string) {
    startTransition(async () => {
      await fetch('/api/care/cart/item', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      router.refresh()
    })
  }

  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li
          key={it.productId}
          className="rounded-2xl border border-white/40 bg-white/50 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]"
        >
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-secondary/40 to-background">
              {it.imageUrl && (
                <img
                  src={it.imageUrl}
                  alt={it.name}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-foreground">{it.name}</div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    {it.sku}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(it.productId)}
                  disabled={pending}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                  aria-label={labels.remove}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {!it.active && (
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  {labels.outOfStock}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQty(it.productId, it.quantity - 1)}
                    disabled={pending}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                    aria-label="−"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="min-w-[2ch] text-center text-sm font-semibold">
                    {it.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQty(it.productId, it.quantity + 1)}
                    disabled={pending}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                    aria-label="+"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <div className="text-right">
                  <div className="font-display text-base font-bold text-gold">
                    {(it.price * it.quantity).toFixed(2)} €
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {it.price.toFixed(2)} € {labels.perUnit} {it.unit}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
