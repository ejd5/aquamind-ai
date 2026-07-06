'use client'

import { motion } from 'framer-motion'
import { Camera, Brain, CheckCircle2, Calculator } from 'lucide-react'
import { GlassCard, Reveal, SectionHeading, staggerContainer, fadeUpVariants } from '../landing-utils'

const STEPS = [
  {
    num: '1',
    icon: Camera,
    emoji: '📸',
    title: 'Photo + mesures',
    text: "Prenez une photo de l'eau / filtre / bandelette, entrez vos valeurs (ou scannez).",
  },
  {
    num: '2',
    icon: Brain,
    emoji: '🧠',
    title: 'Diagnostic prudent',
    text: "L'IA + le moteur déterministe analysent : profil piscine, météo, historique.",
  },
  {
    num: '3',
    icon: CheckCircle2,
    emoji: '✅',
    title: "Plan d'action exact",
    text: '1. TAC+ 2040g → 2. pH- 900ml → 3. Chlore choc → filtration 4h → re-test 3h → baignade interdite 8h.',
  },
]

export function Solution() {
  return (
    <section id="solution" className="relative py-20 sm:py-28">
      {/* Subtle aurora wash */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/20 to-background" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="04 — La solution"
          title={<>AQWELIA : votre pisciniste intelligent, 24/7.</>}
        />

        {/* Steps */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3"
        >
          {STEPS.map((step) => {
            const Icon = step.icon
            return (
              <motion.div key={step.num} variants={fadeUpVariants}>
                <GlassCard className="relative h-full p-6">
                  {/* Big number */}
                  <span className="pointer-events-none absolute right-4 top-3 font-display text-5xl font-bold text-gold/15">
                    {step.num}
                  </span>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/30">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 flex items-center gap-2 font-display text-xl font-bold">
                    <span aria-hidden="true">{step.emoji}</span>
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.text}
                  </p>
                </GlassCard>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Differentiator card */}
        <Reveal delay={0.15} className="mt-8">
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border-2 border-gold/50 bg-gradient-to-br from-gold/[0.08] via-white/40 to-white/30 p-6 backdrop-blur-xl dark:via-white/[0.03] dark:to-white/[0.02]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-primary text-white shadow-lg shadow-gold/30">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold sm:text-xl">
                  Le moteur de dosage est <span className="gradient-text-premium">DÉTERMINISTE</span> (pas de l&apos;IA).
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/85 sm:text-base">
                  On ne confie pas votre sécurité à un LLM. Les calculs sont exacts, testables,
                  prudents. <strong className="text-foreground">L&apos;IA explique, le moteur calcule.</strong>
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
