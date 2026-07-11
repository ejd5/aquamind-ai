'use client'

import { motion } from 'framer-motion'
import { Check, X, AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Reveal, SectionHeading } from '../landing-utils'

type Cell = 'yes' | 'no' | 'partial'

type FeatureKey =
  | 'comparatorFeature1'
  | 'comparatorFeature2'
  | 'comparatorFeature3'
  | 'comparatorFeature4'
  | 'comparatorFeature5'
  | 'comparatorFeature6'
  | 'comparatorFeature7'
  | 'comparatorFeature8'
  | 'comparatorFeature9'
  | 'comparatorFeature10'
  | 'comparatorFeature11'
  | 'comparatorFeature12'
  | 'comparatorFeature13'
  | 'comparatorFeature14'
  | 'comparatorFeature15'
  | 'comparatorFeature16'

interface FeatureRow {
  key: FeatureKey
  cells: Cell[]
}

const FEATURES: FeatureRow[] = [
  { key: 'comparatorFeature1', cells: ['yes', 'partial', 'no', 'no', 'no', 'yes'] },
  { key: 'comparatorFeature2', cells: ['yes', 'no', 'partial', 'partial', 'partial', 'yes'] },
  { key: 'comparatorFeature3', cells: ['yes', 'no', 'yes', 'yes', 'yes', 'yes'] },
  { key: 'comparatorFeature4', cells: ['yes', 'no', 'no', 'no', 'no', 'yes'] },
  { key: 'comparatorFeature5', cells: ['yes', 'no', 'no', 'no', 'no', 'yes'] },
  { key: 'comparatorFeature6', cells: ['yes', 'no', 'no', 'no', 'no', 'no'] },
  { key: 'comparatorFeature7', cells: ['yes', 'no', 'partial', 'partial', 'partial', 'no'] },
  { key: 'comparatorFeature8', cells: ['yes', 'yes', 'yes', 'yes', 'yes', 'yes'] },
  { key: 'comparatorFeature9', cells: ['yes', 'no', 'yes', 'no', 'yes', 'no'] },
  { key: 'comparatorFeature10', cells: ['yes', 'no', 'no', 'no', 'yes', 'yes'] },
  { key: 'comparatorFeature11', cells: ['yes', 'no', 'no', 'partial', 'partial', 'no'] },
  { key: 'comparatorFeature12', cells: ['yes', 'no', 'no', 'no', 'no', 'no'] },
  { key: 'comparatorFeature13', cells: ['yes', 'no', 'no', 'no', 'no', 'yes'] },
  { key: 'comparatorFeature14', cells: ['yes', 'yes', 'no', 'no', 'no', 'yes'] },
  { key: 'comparatorFeature15', cells: ['yes', 'yes', 'yes', 'yes', 'yes', 'partial'] },
  { key: 'comparatorFeature16', cells: ['yes', 'yes', 'yes', 'yes', 'yes', 'yes'] },
]

const AVAILABILITY_KEY: FeatureKey = 'comparatorFeature15'
const COST_KEY: FeatureKey = 'comparatorFeature16'

function CellIcon({ value, label }: { value: Cell; label?: string }) {
  if (label) {
    return <span className="text-xs font-medium text-foreground/80">{label}</span>
  }
  if (value === 'yes')
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
        <Check className="h-3.5 w-3.5" />
      </span>
    )
  if (value === 'no')
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <X className="h-3.5 w-3.5" />
      </span>
    )
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
      <AlertTriangle className="h-3.5 w-3.5" />
    </span>
  )
}

export function Comparator() {
  const t = useTranslations('landing')

  const COLS = ['AQWELIA', 'PoolMath', 'Pooli', 'Clorox Pool', "Leslie's", t('comparatorColPisciniste')]

  const CELL_TEXT: Record<string, string> = {
    // Availability row text
    'avail-0': '24/7',
    'avail-1': '24/7',
    'avail-2': '24/7',
    'avail-3': '24/7',
    'avail-4': '24/7',
    'avail-5': t('comparatorAvailVisit'),
    // Cost row text
    'cost-0': '0-25€',
    'cost-1': t('comparatorCostFree'),
    'cost-2': t('comparatorCostFree'),
    'cost-3': t('comparatorCostFree'),
    'cost-4': t('comparatorCostFree'),
    'cost-5': '80-150€',
  }

  return (
    <section id="comparatif" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t('comparatorEyebrow')}
          title={<>{t('comparatorTitle')}</>}
        />

        <Reveal delay={0.1} className="mt-12">
          <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    {/* Sticky first column header */}
                    <th className="sticky left-0 z-10 bg-white/85 px-4 py-4 text-left font-semibold backdrop-blur-xl dark:bg-[oklch(0.19_0.02_200)]/90 sm:px-6">
                      {t('comparatorFunctionality')}
                    </th>
                    {COLS.map((c, idx) => (
                      <th
                        key={c}
                        className={`px-3 py-4 text-center font-semibold sm:px-5 ${
                          idx === 0
                            ? 'bg-gradient-to-b from-gold/20 to-gold/5 text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {idx === 0 ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-gold" />
                            {c}
                          </span>
                        ) : (
                          c
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map((row, rowIdx) => {
                    const isAvailRow = row.key === AVAILABILITY_KEY
                    const isCostRow = row.key === COST_KEY
                    const rowLabel = t(row.key)
                    return (
                      <motion.tr
                        key={row.key}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.35, delay: rowIdx * 0.03 }}
                        className={`border-b border-border/40 transition-colors hover:bg-gold/5 ${
                          rowIdx % 2 === 1 ? 'bg-secondary/20' : ''
                        }`}
                      >
                        <td className="sticky left-0 z-10 bg-white/85 px-4 py-3.5 font-medium text-foreground backdrop-blur-xl dark:bg-[oklch(0.19_0.02_200)]/90 sm:px-6">
                          {rowLabel}
                        </td>
                        {row.cells.map((cell, idx) => (
                          <td
                            key={idx}
                            className={`px-3 py-3.5 text-center sm:px-5 ${
                              idx === 0 ? 'bg-gradient-to-b from-gold/10 to-gold/[0.03]' : ''
                            }`}
                          >
                            <div className="flex items-center justify-center">
                              {isAvailRow ? (
                                <CellIcon value={cell} label={CELL_TEXT[`avail-${idx}`]} />
                              ) : isCostRow ? (
                                <CellIcon value={cell} label={CELL_TEXT[`cost-${idx}`]} />
                              ) : (
                                <CellIcon value={cell} />
                              )}
                            </div>
                          </td>
                        ))}
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-6">
          <p className="mx-auto max-w-3xl text-center text-sm italic text-muted-foreground">
            {t('comparatorConclusion1')}{' '}
            <span className="font-semibold text-gold not-italic">{t('comparatorConclusion2')}</span>
          </p>
        </Reveal>
      </div>
    </section>
  )
}
