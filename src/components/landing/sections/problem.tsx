'use client'

import { motion } from 'framer-motion'
import { Quote } from 'lucide-react'
import { GlassCard, Reveal, SectionHeading, staggerContainer, fadeUpVariants } from '../landing-utils'

const PAINS = [
  {
    emoji: '🟢',
    title: 'Eau verte',
    text: "Vous vous réveillez, l'eau est verte. Panique. Que faire ? Dans quel ordre ?",
  },
  {
    emoji: '🌧️',
    title: 'Après l\'orage',
    text: 'Le chlore a fondu, le pH a bougé. Baignade risquée ?',
  },
  {
    emoji: '👀',
    title: 'Yeux qui piquent',
    text: '« Trop de chlore » pensez-vous. Erreur : ce sont les chloramines.',
  },
  {
    emoji: '💸',
    title: 'Surdosage',
    text: 'Vous versez au pif. 30% des produits partent à l\'égout.',
  },
  {
    emoji: '📅',
    title: 'Retour de vacances',
    text: '2 semaines sans surveillance = 1 semaine de traitement lourd.',
  },
  {
    emoji: '🤔',
    title: 'Doute permanent',
    text: '« Est-ce que je peux me baigner là, maintenant ? »',
  },
]

export function Problem() {
  return (
    <section id="probleme" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="01 — Le problème"
          title={
            <>
              Entretenir une piscine est un cauchemar pour la plupart des propriétaires.
            </>
          }
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {PAINS.map((p) => (
            <motion.div key={p.title} variants={fadeUpVariants}>
              <GlassCard className="h-full p-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {p.emoji}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      {p.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {p.text}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Quote card */}
        <Reveal delay={0.1} className="mt-10">
          <div className="mx-auto max-w-2xl rounded-2xl border border-gold/30 bg-gradient-to-br from-white/70 to-white/40 p-6 backdrop-blur-xl dark:from-white/5 dark:to-white/[0.02]">
            <Quote className="h-6 w-6 text-gold" />
            <p className="mt-3 font-display text-lg italic leading-relaxed text-foreground sm:text-xl">
              « On passe plus de temps à chercher sur Google qu&apos;à profiter de la piscine. »
            </p>
            <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
              — Témoignage anonyme
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
