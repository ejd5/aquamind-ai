'use client'

import { useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Reveal, SectionHeading } from '../landing-utils'

interface Scenario {
  emoji: string
  title: string
  without: string
  withText: string
}

const SCENARIOS: Scenario[] = [
  {
    emoji: '🟢',
    title: 'Eau verte, dimanche matin',
    without:
      "Panique. Pisciniste injoignable. Achat au hasard anti-algues + floculant (40€). Eau pas claire lundi. Baignade annulée.",
    withText:
      "Photo → IA détecte algues + pH probable haut. Plan : pH- (4,5€) → chlore choc dosé → brosser → filtrer 24h. Coût : 12€. Eau claire lundi.",
  },
  {
    emoji: '🌩️',
    title: 'Orage prévu ce soir',
    without:
      "On ne sait pas. L'orage passe. Eau déséquilibrée 2 jours. Baignade risquée.",
    withText:
      "Alerte météo « Orage 70% ce soir → vérifiez le chlore avant 20h ». Action proactive. Eau stable.",
  },
  {
    emoji: '✈️',
    title: 'Retour de 2 semaines de vacances',
    without:
      "Eau verte, voire noire. Piscine hors service 1 semaine. 80€ de produits + 2 jours de travail.",
    withText:
      "Avant départ → guide « Mode vacances » (choc, distributeur plein, filtration programmée, couverture). Retour : eau claire, 15 min de check.",
  },
  {
    emoji: '👀',
    title: 'Yeux qui piquent après baignade',
    without:
      "« Trop de chlore » → on coupe le chlore → eau verte 3 jours après.",
    withText:
      "AquaMind explique « chloramines » (chlore combiné). Recommande un choc pour les casser. Diagnostic juste, action juste.",
  },
  {
    emoji: '🌡️',
    title: 'Canicule 35°C, 3 jours',
    without:
      "Eau tourne. Algues. Surconsommation de chlore. Conflit familial.",
    withText:
      "Alerte « Canicule → +2h filtration + test chlore quotidien ». Prévention. Eau stable.",
  },
  {
    emoji: '🔧',
    title: 'Filtre pression haute',
    without:
      "On attend la visite du pisciniste. Eau trouble entre-temps.",
    withText:
      "Photo du manomètre → « Pression haute, backwash recommandé » + guide pas à pas. Action immédiate, gratuite.",
  },
]

export function Simulations() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start' })

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  return (
    <section id="simulations" className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/20 to-background" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="06 — Simulations concrètes"
          title={<>Ce que AquaMind change, scène par scène.</>}
        />

        <Reveal delay={0.1} className="mt-12">
          <div className="relative">
            {/* Carousel viewport */}
            <div ref={emblaRef} className="overflow-hidden">
              <div className="flex">
                {SCENARIOS.map((s, idx) => (
                  <div
                    key={idx}
                    className="min-w-0 shrink-0 grow-0 basis-full pl-4 sm:basis-1/2 lg:basis-1/3 first:pl-0"
                  >
                    <ScenarioCard scenario={s} index={idx + 1} />
                  </div>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={scrollPrev}
                aria-label="Scénario précédent"
                className="glass-pill flex h-10 w-10 items-center justify-center rounded-full border-white/50 text-foreground transition-all hover:border-gold/50 hover:text-gold"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                onClick={scrollNext}
                aria-label="Scénario suivant"
                className="glass-pill flex h-10 w-10 items-center justify-center rounded-full border-white/50 text-foreground transition-all hover:border-gold/50 hover:text-gold"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-6">
          <p className="text-center text-xs italic text-muted-foreground">
            Basé sur des cas réels vécus par les fondateurs.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

function ScenarioCard({ scenario, index }: { scenario: Scenario; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
      className="group relative h-full overflow-hidden rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.03]"
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">
          {scenario.emoji}
        </span>
        <h3 className="font-display text-lg font-bold leading-tight">{scenario.title}</h3>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">
            ❌ Sans AquaMind
          </p>
          <p className="mt-1 text-xs leading-relaxed text-foreground/80">
            {scenario.without}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            ✅ Avec AquaMind
          </p>
          <p className="mt-1 text-xs leading-relaxed text-foreground/80">
            {scenario.withText}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
