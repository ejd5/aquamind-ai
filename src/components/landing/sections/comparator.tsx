'use client'

import { motion } from 'framer-motion'
import { Check, X, AlertTriangle } from 'lucide-react'
import { Reveal, SectionHeading } from '../landing-utils'

type Cell = 'yes' | 'no' | 'partial'

const FEATURES: { label: string; cells: Cell[] }[] = [
  { label: 'Moteur de dosage déterministe', cells: ['yes', 'partial', 'no', 'no', 'no', 'yes'] },
  { label: 'Diagnostic photo IA (eau, filtre, électrolyseur, cellule)', cells: ['yes', 'no', 'partial', 'partial', 'partial', 'yes'] },
  { label: 'Scan bandelette avec confiance', cells: ['yes', 'no', 'yes', 'yes', 'yes', 'yes'] },
  { label: "Plan d'action ordonné (TAC→pH→chlore)", cells: ['yes', 'no', 'no', 'no', 'no', 'yes'] },
  { label: 'Sécurité baignade temps réel', cells: ['yes', 'no', 'no', 'no', 'no', 'yes'] },
  { label: 'Météo intelligente + alertes orage/canicule', cells: ['yes', 'no', 'no', 'no', 'no', 'no'] },
  { label: 'Rappels intelligents contextuels', cells: ['yes', 'no', 'partial', 'partial', 'partial', 'no'] },
  { label: 'Carnet de santé + graphiques', cells: ['yes', 'yes', 'yes', 'yes', 'yes', 'yes'] },
  { label: 'Inventaire produits + coût estimé', cells: ['yes', 'no', 'yes', 'no', 'yes', 'no'] },
  { label: 'Maintenance équipements (filtre, électrolyseur, pompe)', cells: ['yes', 'no', 'no', 'no', 'yes', 'yes'] },
  { label: '20+ guides experts intégrés', cells: ['yes', 'no', 'no', 'partial', 'partial', 'no'] },
  { label: 'Mode urgence (14 parcours guidés)', cells: ['yes', 'no', 'no', 'no', 'no', 'no'] },
  { label: 'Multi-piscines / multi-clients pro', cells: ['yes', 'no', 'no', 'no', 'no', 'yes'] },
  { label: 'LSI / mode avancé expert', cells: ['yes', 'yes', 'no', 'no', 'no', 'yes'] },
  { label: 'Disponibilité', cells: ['yes', 'yes', 'yes', 'yes', 'yes', 'partial'] },
  { label: 'Coût mensuel', cells: ['yes', 'yes', 'yes', 'yes', 'yes', 'yes'] },
]

const COLS = ['AQWELIA', 'PoolMath', 'Pooli', 'Clorox Pool', "Leslie's", 'Pisciniste']

const CELL_TEXT: Record<string, string> = {
  // Availability row text
  'avail-0': '24/7',
  'avail-1': '24/7',
  'avail-2': '24/7',
  'avail-3': '24/7',
  'avail-4': '24/7',
  'avail-5': '1 visite/sem',
  // Cost row text
  'cost-0': '0-25€',
  'cost-1': 'gratuit',
  'cost-2': 'gratuit',
  'cost-3': 'gratuit',
  'cost-4': 'gratuit',
  'cost-5': '80-150€',
}

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
  return (
    <section id="comparatif" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="05 — Comparatif"
          title={<>AQWELIA vs tout le reste</>}
        />

        <Reveal delay={0.1} className="mt-12">
          <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    {/* Sticky first column header */}
                    <th className="sticky left-0 z-10 bg-white/85 px-4 py-4 text-left font-semibold backdrop-blur-xl dark:bg-[oklch(0.19_0.02_200)]/90 sm:px-6">
                      Fonctionnalité
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
                    const isAvailRow = row.label === 'Disponibilité'
                    const isCostRow = row.label === 'Coût mensuel'
                    return (
                      <motion.tr
                        key={row.label}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.35, delay: rowIdx * 0.03 }}
                        className={`border-b border-border/40 transition-colors hover:bg-gold/5 ${
                          rowIdx % 2 === 1 ? 'bg-secondary/20' : ''
                        }`}
                      >
                        <td className="sticky left-0 z-10 bg-white/85 px-4 py-3.5 font-medium text-foreground backdrop-blur-xl dark:bg-[oklch(0.19_0.02_200)]/90 sm:px-6">
                          {row.label}
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
            Aucune application ne combine moteur déterministe + VLM multimodale + météo temps
            réel + rappels contextuels. <span className="font-semibold text-gold not-italic">AQWELIA est la seule.</span>
          </p>
        </Reveal>
      </div>
    </section>
  )
}
