'use client'

import { motion } from 'framer-motion'
import { GlassCard, Reveal, SectionHeading, staggerContainer, fadeUpVariants } from '../landing-utils'

const FACTORS = [
  { emoji: '🌧️', title: 'Météo', text: 'Orage (dilue chlore, modifie pH), canicule (algues), vent (débris), gel (équipements).' },
  { emoji: '👥', title: 'Baignade', text: "Plus de baigneurs = plus de matière organique = chlore consommé plus vite." },
  { emoji: '🧴', title: 'Crème solaire', text: 'Phosphates et résidus gras → eau trouble, algues.' },
  { emoji: '💦', title: 'Transpiration / urine', text: 'Chloramines, eau irritante (oui, ça compte).' },
  { emoji: '🌡️', title: 'Température eau', text: 'Chlore évaporé plus vite à chaud, activité chimique accrue.' },
  { emoji: '☀️', title: 'UV', text: 'Détruit le chlore non stabilisé en 2h.' },
  { emoji: '🍂', title: 'Saison', text: 'Printemps (remise en route), été (intensif), automne (hivernage), hiver (gel).' },
  { emoji: '🔧', title: 'Équipements', text: 'Filtre qui se charge, électrolyseur qui s\'entartre, pompe qui vieillit.' },
]

export function Variations() {
  return (
    <section id="variations" className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/20 to-background" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="09 — La piscine est vivante"
          title={<>Pourquoi l&apos;eau change tout le temps ?</>}
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FACTORS.map((f) => (
            <motion.div key={f.title} variants={fadeUpVariants}>
              <GlassCard className="h-full p-5">
                <span className="text-2xl" aria-hidden="true">
                  {f.emoji}
                </span>
                <h3 className="mt-3 font-display text-base font-bold">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {f.text}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        <Reveal delay={0.15} className="mt-8">
          <div className="mx-auto max-w-3xl rounded-2xl border border-gold/30 bg-gradient-to-r from-gold/10 via-transparent to-primary/10 p-5 text-center">
            <p className="text-sm leading-relaxed text-foreground/90 sm:text-base">
              AquaMind tient compte de <span className="font-bold text-gold">TOUTES</span> ces
              variations pour adapter ses conseils. <span className="font-semibold">Pas une app générique.</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
