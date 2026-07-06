'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ShieldCheck, Lock, RotateCcw, Sparkles, ArrowRight } from 'lucide-react'
import { PLANS, DURATIONS } from '@/lib/pool/freemium'
import { Reveal, SectionHeading, scrollToId } from '../landing-utils'

interface PricingProps {
  hasProfile: boolean
  onEnterApp: () => void
}

type DurationId = (typeof DURATIONS)[number]['id']

export function Pricing({ hasProfile, onEnterApp }: PricingProps) {
  const [duration, setDuration] = useState<DurationId>('month')

  const paidPlans = PLANS.filter((p) => p.id !== 'free')
  const freePlan = PLANS.find((p) => p.id === 'free')!

  return (
    <section id="tarifs" className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="11 — Tarifs"
          title={<>Simple, transparent, sans engagement.</>}
        />

        {/* Duration toggle */}
        <Reveal delay={0.1} className="mt-10">
          <div className="mx-auto flex w-fit flex-wrap items-center justify-center gap-1 rounded-full border border-white/40 bg-white/60 p-1 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
            {DURATIONS.map((d) => {
              const active = duration === d.id
              return (
                <button
                  key={d.id}
                  onClick={() => setDuration(d.id)}
                  className={`relative rounded-full px-4 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                    active ? 'text-[oklch(0.18_0.04_85)]' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="duration-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-gold via-[oklch(0.78_0.13_85)] to-[oklch(0.7_0.12_85)] shadow-md shadow-gold/30"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    {d.label}
                    {'save' in d && d.save && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                          active ? 'bg-white/25 text-[oklch(0.18_0.04_85)]' : 'bg-gold/15 text-gold'
                        }`}
                      >
                        -{d.save}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </Reveal>

        {/* Paid plan cards */}
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {paidPlans.map((plan, idx) => {
            const isPremium = plan.id === 'premium'
            const price = plan.price[duration]
            const suffix = DURATIONS.find((d) => d.id === duration)!.suffix
            return (
              <Reveal key={plan.id} delay={idx * 0.08}>
                <div
                  className={`relative h-full overflow-hidden rounded-2xl backdrop-blur-xl transition-all duration-300 ${
                    isPremium
                      ? 'border-2 border-gold/60 bg-gradient-to-br from-gold/[0.12] via-white/60 to-white/40 shadow-[0_25px_60px_-20px_oklch(0.75_0.13_85/0.5)] md:-translate-y-3 md:scale-[1.03] dark:via-white/[0.04] dark:to-white/[0.02]'
                      : 'border border-white/40 bg-white/60 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.03]'
                  }`}
                >
                  {isPremium && (
                    <>
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
                      <span className="absolute -right-12 top-5 rotate-45 bg-gradient-to-r from-gold to-[oklch(0.7_0.12_85)] px-12 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-[oklch(0.18_0.04_85)] shadow-md">
                        Populaire
                      </span>
                      <div className="pointer-events-none absolute -inset-1 -z-10 rounded-2xl bg-gold/10 blur-2xl" />
                    </>
                  )}

                  <div className="p-6">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl" aria-hidden="true">
                        {plan.icon}
                      </span>
                      <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>

                    {/* Price — crossfade */}
                    <div className="mt-5 flex items-baseline gap-1">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={`${plan.id}-${duration}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.25 }}
                          className="font-display text-4xl font-bold"
                        >
                          {price === 0 ? 'Gratuit' : `${price.toLocaleString('fr-FR')} €`}
                        </motion.span>
                      </AnimatePresence>
                      {price !== 0 && (
                        <span className="text-xs text-muted-foreground">{suffix}</span>
                      )}
                    </div>

                    <button
                      onClick={onEnterApp}
                      className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
                        isPremium
                          ? 'bg-gradient-to-r from-gold via-[oklch(0.78_0.13_85)] to-[oklch(0.7_0.12_85)] text-[oklch(0.18_0.04_85)] shadow-lg shadow-gold/30 hover:scale-[1.02] hover:shadow-[0_0_40px_-6px_oklch(0.75_0.13_85/0.6)]'
                          : 'border border-primary/30 bg-primary/5 text-foreground hover:border-primary/60 hover:bg-primary/10'
                      }`}
                    >
                      {hasProfile ? 'Accéder à l\'app' : 'Commencer'}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>

                    <ul className="mt-5 space-y-2">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2 text-xs text-foreground/85"
                        >
                          <Check
                            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                              isPremium ? 'text-gold' : 'text-primary'
                            }`}
                          />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>

        {/* Free plan — smaller below */}
        <Reveal delay={0.1} className="mt-5">
          <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 rounded-2xl border border-white/40 bg-white/40 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">
                {freePlan.icon}
              </span>
              <div>
                <p className="font-display text-base font-bold">
                  {freePlan.name} <span className="text-gold">— Gratuit</span>
                </p>
                <p className="text-xs text-muted-foreground">{freePlan.tagline}</p>
              </div>
            </div>
            <button
              onClick={onEnterApp}
              className="rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold transition-colors hover:border-gold/50 hover:text-gold"
            >
              Découvrir gratuitement
            </button>
          </div>
        </Reveal>

        {/* Trust row */}
        <Reveal delay={0.1} className="mt-6">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {[
              { icon: RotateCcw, label: 'Sans engagement' },
              { icon: Lock, label: 'Paiement sécurisé' },
              { icon: ShieldCheck, label: 'Résiliable à tout moment' },
              { icon: Sparkles, label: 'Données privées' },
            ].map((t) => {
              const Icon = t.icon
              return (
                <span key={t.label} className="inline-flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-gold" />
                  {t.label}
                </span>
              )
            })}
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-6 text-center">
          <button
            onClick={() => scrollToId('comparatif')}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Comparatif détaillé →
          </button>
        </Reveal>
      </div>
    </section>
  )
}
