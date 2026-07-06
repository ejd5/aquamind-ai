'use client'

import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { GlassCard, Reveal, SectionHeading, staggerContainer, fadeUpVariants } from '../landing-utils'

const INCLUDED = [
  '1 visite par semaine',
  "Test d'eau",
  'Ajout de produits',
  'Nettoyage filtre & skimmer',
  'Brossage des parois',
  'Conseil de base',
]

const NOT_INCLUDED = [
  'Être là le dimanche quand l\'eau tourne',
  'Surveiller entre 2 visites (orage mardi, visite vendredi)',
  'Vous dire « LÀ, maintenant, puis-je me baigner ? »',
  'Anticiper la météo (canicule, orage)',
  'Gérer les urgences le soir',
  'Vous apprendre à comprendre votre piscine',
  'Optimiser vos achats produits',
  'Être disponible 24/7 pour 8€/mois',
]

export function PiscinisteCost() {
  return (
    <section id="pisciniste" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="03 — Le pisciniste"
          title={<>Le pisciniste est utile. Mais il ne résout pas tout.</>}
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2"
        >
          {/* Included column */}
          <motion.div variants={fadeUpVariants}>
            <GlassCard hover={false} className="h-full p-6">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                  <Check className="h-4 w-4" />
                </span>
                <h3 className="font-display text-xl font-bold">Ce que fait le pisciniste</h3>
              </div>
              <ul className="mt-5 space-y-2.5">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/85">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </motion.div>

          {/* Not included column */}
          <motion.div variants={fadeUpVariants}>
            <div className="relative h-full overflow-hidden rounded-2xl border-2 border-gold/40 bg-gradient-to-br from-gold/[0.08] to-white/40 p-6 backdrop-blur-xl dark:to-white/[0.02]">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-gold">
                  <X className="h-4 w-4" />
                </span>
                <h3 className="font-display text-xl font-bold">Ce que le pisciniste ne fait PAS</h3>
              </div>
              <ul className="mt-5 space-y-2.5">
                {NOT_INCLUDED.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm font-medium text-foreground"
                  >
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>

        {/* Callout */}
        <Reveal delay={0.1} className="mt-8">
          <div className="mx-auto max-w-3xl rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-gold/5 to-transparent p-5 text-center">
            <p className="font-display text-base leading-relaxed text-foreground sm:text-lg">
              Avec un pisciniste, vous restez seul{' '}
              <span className="font-bold text-gold">6 jours sur 7</span>.{' '}
              <span className="gradient-text-premium font-bold">AQWELIA couvre ces 6 jours.</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
