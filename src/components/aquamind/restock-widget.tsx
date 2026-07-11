'use client'

/**
 * AQWELIA AutoRestock™ — dashboard widget.
 *
 * Card shown on the dashboard: lists products that will run out within ~7 days,
 * with a stock bar, a "Commander" button (link to /care) and an Auto-order
 * toggle (opt-in). Empty state if no inventory.
 *
 * i18n: all visible strings come from the `restock` namespace.
 */
import { useCallback, useEffect, useState } from 'react'
import { Package, ShoppingCart, Zap, Loader2, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'

interface RestockItem {
  productId: string
  productName: string
  category: string
  categoryLabelKey: string
  currentQuantity: number
  unit: string
  weeklyConsumption: number
  daysRemaining: number
  recommendedOrderQty: number
  urgency: 'low' | 'medium' | 'high'
  carePath: string
}

interface RestockAssessment {
  items: RestockItem[]
  lowStockCount: number
  hasInventory: boolean
}

interface RestockWidgetProps {
  activePoolId?: string | null
}

const URGENCY_CFG: Record<
  RestockItem['urgency'],
  { cls: string; bar: string; labelKey: string }
> = {
  high: {
    cls: 'border-destructive/40 bg-destructive/10 text-destructive',
    bar: 'from-destructive to-[oklch(0.4_0.18_25)]',
    labelKey: 'lowStock',
  },
  medium: {
    cls: 'border-orange-400/40 bg-orange-400/10 text-orange-700 dark:text-orange-300',
    bar: 'from-orange-400 to-amber-500',
    labelKey: 'lowStock',
  },
  low: {
    cls: 'border-[oklch(0.7_0.15_155)]/40 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.45_0.13_155)]',
    bar: 'from-[oklch(0.7_0.15_155)] to-[oklch(0.55_0.13_195)]',
    labelKey: 'okStock',
  },
}

export function RestockWidget({ activePoolId }: RestockWidgetProps) {
  const t = useTranslations('restock')
  const tc = useTranslations('common')
  const [data, setData] = useState<RestockAssessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoOrder, setAutoOrder] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const path = activePoolId
        ? `/api/pool/restock?poolId=${encodeURIComponent(activePoolId)}`
        : '/api/pool/restock'
      const res = await fetch(path, { cache: 'no-store' })
      if (!res.ok) throw new Error('fetch failed')
      const json: RestockAssessment = await res.json()
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [activePoolId])

  useEffect(() => {
    load()
  }, [load])

  // tr helper: translate a categoryLabelKey or fallback to category string.
  const trCategory = (key: string, fallback: string) => {
    try {
      return t(key as any)
    } catch {
      return fallback
    }
  }

  // Build a 0-100 stock bar: 0 days = 0%, ≥14 days = 100%.
  const stockPct = (days: number) => Math.max(5, Math.min(100, (days / 14) * 100))

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 text-gold" />
          {t('subtitle')}
        </CardDescription>
        <CardTitle className="flex items-center justify-between font-display text-base">
          <span className="flex items-center gap-1.5">
            <ShoppingCart className="h-4 w-4 text-gold" />
            {t('title')}
          </span>
          {data && data.hasInventory && data.lowStockCount > 0 && (
            <Badge className="border-orange-400/40 bg-orange-400/10 text-orange-700 dark:text-orange-300">
              <AlertTriangle className="mr-1 h-3 w-3" />
              {t('lowStockWarning', { count: data.lowStockCount })}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !data || !data.hasInventory ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-secondary/20 p-5 text-center">
            <Package className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">{t('noInventoryTitle')}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{t('noInventoryDesc')}</p>
            <Link href="/maintenance">
              <Button size="sm" variant="outline" className="mt-3 h-7">
                {t('manageInventory')}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        ) : data.items.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 p-3 text-[oklch(0.45_0.13_155)]">
            <CheckCircle2 className="h-4 w-4" />
            <p className="text-sm font-semibold">{t('emptyTitle')}</p>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {data.items
                .filter((i) => i.urgency !== 'low')
                .slice(0, 4)
                .map((item) => {
                  const cfg = URGENCY_CFG[item.urgency]
                  const pct = stockPct(item.daysRemaining)
                  return (
                    <li
                      key={item.productId}
                      className={`rounded-xl border p-2.5 ${cfg.cls}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {item.productName}
                          </p>
                          <p className="text-[10px] uppercase tracking-wide opacity-70">
                            {trCategory(item.categoryLabelKey, item.category)}
                          </p>
                        </div>
                        <Badge variant="outline" className={cfg.cls}>
                          {t(cfg.labelKey as any)}
                        </Badge>
                      </div>
                      {/* Stock bar */}
                      <div className="mt-2">
                        <div className="relative h-2 overflow-hidden rounded-full bg-background/60">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${cfg.bar} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] opacity-80">
                          <span>
                            {t('unitRemaining', { qty: item.currentQuantity, unit: item.unit })}
                          </span>
                          <span>
                            {item.daysRemaining >= 9999
                              ? '∞'
                              : t('daysRemaining', { days: item.daysRemaining })}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <Link href={item.carePath} className="flex-1">
                          <Button
                            size="sm"
                            className="h-7 w-full bg-gradient-to-r from-primary to-gold text-primary-foreground"
                          >
                            <ShoppingCart className="h-3 w-3" />
                            {t('orderNow')}
                          </Button>
                        </Link>
                        <span className="rounded-md border border-border/50 bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {item.recommendedOrderQty} {item.unit}
                        </span>
                      </div>
                    </li>
                  )
                })}
            </ul>

            {data.items.filter((i) => i.urgency !== 'low').length === 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 p-3 text-[oklch(0.45_0.13_155)]">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-sm font-semibold">{t('emptyTitle')}</p>
              </div>
            )}

            {/* Auto-order toggle */}
            <div className="mt-3 flex items-center justify-between rounded-xl border border-border/50 bg-background/60 p-2.5">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-gold" />
                <div>
                  <p className="text-xs font-semibold">{t('auto')}</p>
                  <p className="text-[10px] text-muted-foreground">{t('autoDesc')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {autoOrder ? t('autoEnabled') : t('autoDisabled')}
                </span>
                <Switch
                  checked={autoOrder}
                  onCheckedChange={setAutoOrder}
                  aria-label={t('auto')}
                />
              </div>
            </div>

            <Link
              href="/care"
              className="mt-3 flex items-center justify-center gap-1 text-[11px] font-medium text-gold transition-colors hover:text-primary"
            >
              {t('careCta')}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}
