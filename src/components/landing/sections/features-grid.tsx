'use client'

import { motion } from 'framer-motion'
import { GlassCard, Reveal, SectionHeading, staggerContainer, fadeUpVariants } from '../landing-utils'

const FEATURES = [
  { emoji: '🏠', title: 'Dashboard Aujourd\'hui', text: 'Indice eau claire, sécurité baignade, actions du jour.' },
  { emoji: '📸', title: 'Diagnostic Photo IA', text: 'Eau, filtre, électrolyseur, bandelette (VLM prudent).' },
  { emoji: '🧪', title: 'Analyse de l\'eau', text: 'pH, chlore, TAC, TH, CYA, sel, phosphates + plan auto.' },
  { emoji: '💬', title: 'Assistant IA contextuel', text: 'Connaît votre piscine et votre historique.' },
  { emoji: '✅', title: "Plan d'action", text: 'Étapes ordonnées, dosages exacts, « ne pas faire ».' },
  { emoji: '📔', title: 'Carnet de santé', text: 'Historique, graphiques, détection de patterns.' },
  { emoji: '🌤️', title: 'Météo intelligente', text: 'Alertes orage/canicule, filtration recommandée.' },
  { emoji: '🔔', title: 'Rappels intelligents', text: 'Contextuels (météo, historique, inventaire).' },
  { emoji: '🔧', title: 'Maintenance & équipements', text: 'Suivi filtre, électrolyseur, pompe.' },
  { emoji: '📚', title: 'Ressources & guides', text: '20+ guides experts + recommandation auto.' },
  { emoji: '🛟', title: 'Mode urgence', text: '14 parcours (eau verte, orage, vacances, hivernage...).' },
]

export function FeaturesGrid() {
  return (
    <section id="fonctionnalites" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="10 — Fonctionnalités"
          title={<>11 modules. Un copilote complet.</>}
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <motion.div key={f.title} variants={fadeUpVariants}>
              <GlassCard className="flex h-full items-start gap-3 p-5">
                <span className="text-2xl" aria-hidden="true">
                  {f.emoji}
                </span>
                <div>
                  <h3 className="font-display text-base font-bold leading-tight">{f.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {f.text}
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          ))}

          {/* 12th cell — branding accent */}
          <motion.div variants={fadeUpVariants}>
            <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-gold/40 bg-gradient-to-br from-primary/10 via-gold/10 to-primary/5 p-5 text-center backdrop-blur-xl">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
              <p className="font-display text-3xl font-bold gradient-text-premium">+1</p>
              <p className="mt-1 text-xs text-muted-foreground">Bien plus à venir</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
