/**
 * ARQWELIA Lot 1 — Module teaser shown inside the consumer dashboard.
 *
 * Surfaces ARQWELIA to pool owners when NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED=true.
 * Hidden entirely (zero DOM) when the flag is off — no nav leak.
 *
 * Visually coherent with the existing AQWELIA glass-card style + the ARQWELIA
 * premium accent tokens (it uses the AQWELIA brand button gradient so it sits
 * naturally in the consumer dash, but the ARQWELIA symbol + aqua/champagne
 * accents reveal the sub-product).
 */
'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { isArqweliaLot1Enabled } from '@/lib/features'
import { ArqweliaSymbol } from '@/components/arqwelia/brand'
import { ArqweliaFutureFeature } from '@/components/arqwelia/ui'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const ARQ_DASH_SUPPORT = ['fr', 'en']

export function ArqweliaDashboardTeaser() {
  const enabled = isArqweliaLot1Enabled()
  const locale = useLocale()
  const dash = useTranslations('arqwelia.dashboard')

  const supported = ARQ_DASH_SUPPORT.includes(locale)
  if (!enabled || !supported) return null

  return (
    <Card className="glass-card overflow-hidden border-white/[0.08]" style={{ background: 'var(--arqwelia-gradient-card)' }}>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-arq-aqua/30 bg-arq-aqua/10"
            style={{ boxShadow: 'var(--arqwelia-glow-aqua)' }}
          >
            <ArqweliaSymbol className="h-6 w-6" withGlow={false} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-bold text-white">
                {dash('title')}
              </h3>
              <Badge className="border-gold/40 bg-gold/10 text-[10px] font-bold uppercase tracking-wider text-gold">
                {dash('newBadge')}
              </Badge>
              <ArqweliaFutureFeature kind="demo">{dash('demoBadge')}</ArqweliaFutureFeature>
            </div>
            <p className="mt-1 text-sm text-white/65">{dash('subtitle')}</p>
            <p className="mt-1.5 max-w-xl text-xs text-white/50">{dash('description')}</p>
          </div>
        </div>
        <Link
          href="/arqwelia"
          className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold text-arq-navy-deep transition-transform hover:scale-[1.02]"
          style={{ background: 'var(--arqwelia-gradient-premium)', boxShadow: 'var(--arqwelia-glow-aqua)' }}
        >
          {dash('cta')}
        </Link>
      </div>
    </Card>
  )
}