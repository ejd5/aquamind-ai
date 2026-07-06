'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { scrollToId } from '../landing-utils'

interface FinalCtaProps {
  hasProfile: boolean
  onEnterApp: () => void
}

export function FinalCta({ hasProfile, onEnterApp }: FinalCtaProps) {
  return (
    <section id="final-cta" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[oklch(0.45_0.12_195)] via-[oklch(0.5_0.1_170)] to-[oklch(0.75_0.13_85)] p-8 text-center shadow-2xl shadow-primary/30 sm:p-14"
        >
          {/* Decorative orbs */}
          <div
            className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-gold/20 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
              <Sparkles className="h-3 w-3" />
              Démarrage en 2 minutes
            </span>

            <h2 className="mx-auto mt-5 max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
              Votre piscine mérite un vrai copilote.
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
              Gratuit pour commencer. Sans carte bancaire. En 2 minutes vous saurez quoi faire.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={onEnterApp}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-[oklch(0.45_0.12_195)] shadow-xl shadow-black/20 transition-all hover:scale-[1.02] hover:shadow-2xl sm:w-auto"
              >
                {hasProfile ? 'Accéder à mon espace' : 'Démarrer maintenant'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => scrollToId('tarifs')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/40 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
              >
                Voir les tarifs
              </button>
            </div>

            <p className="mt-6 text-[11px] uppercase tracking-widest text-white/70">
              Déjà 11 modules · 20 guides · moteur de dosage déterministe · météo temps réel
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
