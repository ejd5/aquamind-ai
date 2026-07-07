'use client'

import { motion } from 'framer-motion'
import { Droplets, RotateCcw, Thermometer, Users, Settings2, Lock, Waves } from 'lucide-react'
import {
  GlassCard,
  Reveal,
  SectionHeading,
  staggerContainer,
  fadeUpVariants,
  scrollToId,
} from '../landing-utils'
import { SPA_BRANDS, SPA_TREATMENTS, SPA_MAINTENANCE } from '@/lib/pool/spa-data'

const FEATURE_CARDS = [
  {
    icon: Droplets,
    emoji: '🧪',
    title: 'Traitement adapté eau chaude',
    text: 'Brome ou oxygène actif — pas de chlore qui s\'évapore en eau chaude. AQWELIA vous guide vers le bon désinfectant selon la température de votre spa.',
    accent: 'from-[oklch(0.65_0.11_195)]/15 to-transparent',
  },
  {
    icon: RotateCcw,
    emoji: '💧',
    title: 'Vidange intelligente',
    text: 'Rappels de vidange calculés selon votre usage. Vidanger tous les 3-4 mois est souvent PLUS économique que de saturer l\'eau en produits.',
    accent: 'from-gold/15 to-transparent',
  },
  {
    icon: Thermometer,
    emoji: '🌡️',
    title: 'Bâchage & température',
    text: 'Couvrez après chaque bain : anti-évaporation, anti-algues, conservation de la chaleur. AQWELIA vous rappelle les bons gestes au quotidien.',
    accent: 'from-[oklch(0.55_0.10_195)]/15 to-transparent',
  },
  {
    icon: Settings2,
    emoji: '⚙️',
    title: 'Marques & équipements',
    text: 'Jacuzzi, Sundance, Hot Spring, Bestway, Intex, Wellis, Desjoyaux… ou générique chinois. AQWELIA reconnaît votre spa et adapte ses conseils.',
    accent: 'from-gold/15 to-transparent',
  },
  {
    icon: Users,
    emoji: '💺',
    title: 'Détails spa',
    text: 'Nombre de places, fréquence d\'usage, programmes de pompe, température cible. AQWELIA calcule les vidanges et cycles de filtration selon VOTRE réalité.',
    accent: 'from-[oklch(0.65_0.11_195)]/15 to-transparent',
  },
]

export function SpaSection() {
  const drainageTasks = SPA_MAINTENANCE.filter((t) => t.isDrainage)

  return (
    <section id="spa" className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-[oklch(0.55_0.10_195/0.06)] to-background" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="10.5 — Spa & Baignade"
          title={
            <>
              <span className="aqua-text-gradient">AQWELIA</span> gère aussi votre spa
            </>
          }
          subtitle={
            <>
              Eau chaude, petit volume, baigneurs nombreux : le spa n&apos;est pas une piscine.
              Traitements spécifiques (brome, oxygène actif), vidanges régulières, bâchage et
              programmes de pompe — AQWELIA s&apos;occupe de tout.
            </>
          }
        />

        {/* 5 cards — spa features */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURE_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <motion.div key={card.title} variants={fadeUpVariants}>
                <GlassCard className="relative h-full overflow-hidden p-5">
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent}`}
                  />
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl" aria-hidden="true">
                        {card.emoji}
                      </span>
                      <Icon className="h-5 w-5 text-gold" />
                    </div>
                    <h3 className="mt-3 font-display text-base font-bold">{card.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {card.text}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}

          {/* 6th card — note Premium */}
          <motion.div variants={fadeUpVariants}>
            <div className="relative h-full overflow-hidden rounded-2xl border-2 border-gold/50 bg-gradient-to-br from-gold/15 via-gold/5 to-transparent p-5">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
              <Lock className="h-5 w-5 text-gold" />
              <h3 className="mt-3 font-display text-base font-bold text-gold">
                Disponible dès Premium
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-foreground/85">
                Le support Spa complet (brome, oxygène actif, vidange intelligente, programmes de
                pompe) est réservé au plan <strong className="text-gold">Premium</strong> et
                Expert.
              </p>
              <button
                onClick={() => scrollToId('tarifs')}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold transition-colors hover:bg-gold/20"
              >
                Voir les plans
                <Waves className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* Treatments comparison — recommended vs not */}
        <Reveal delay={0.1} className="mt-12">
          <div className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] sm:p-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-display text-lg font-bold">
                ♨️ Traitements adaptés au spa
              </h3>
              <p className="text-xs text-muted-foreground">
                À haute température, le choix du désinfectant change tout.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              {SPA_TREATMENTS.map((t) => {
                const isRecommended = t.recommended
                return (
                  <div
                    key={t.type}
                    className={`rounded-xl border p-4 ${
                      isRecommended
                        ? 'border-gold/40 bg-gold/[0.06]'
                        : 'border-red-400/30 bg-red-500/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-display text-sm font-bold ${isRecommended ? 'text-gold' : 'text-red-500'}`}>
                        {t.name}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          isRecommended
                            ? 'bg-gold/20 text-gold'
                            : 'bg-red-500/15 text-red-500'
                        }`}
                      >
                        {isRecommended ? 'Recommandé' : 'Déconseillé'}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      T° max recommandée : <strong>{t.temperatureMax}°C</strong>
                    </p>
                    <ul className="mt-2 space-y-1 text-[11px]">
                      {t.pros.map((p) => (
                        <li key={p} className="flex items-start gap-1.5 text-foreground/85">
                          <span className="mt-0.5 text-green-500">+</span>
                          <span>{p}</span>
                        </li>
                      ))}
                      {t.cons.map((c) => (
                        <li key={c} className="flex items-start gap-1.5 text-muted-foreground">
                          <span className="mt-0.5 text-red-400">−</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        </Reveal>

        {/* Drainage emphasis — economic argument */}
        <Reveal delay={0.1} className="mt-6">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-r from-gold/15 via-transparent to-[oklch(0.55_0.10_195/0.15)] p-5 sm:p-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-base font-bold text-foreground sm:text-lg">
                  Vidanger plutôt que sur-traiter : le calcul économique
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-foreground/85 sm:text-sm">
                  Au bout de 3-4 mois, l&apos;eau d&apos;un spa est saturée en matière organique,
                  minéraux et résidus de traitement. Continuer à ajouter des produits devient
                  <strong> plus cher et moins efficace</strong> qu&apos;une vidange complète.
                  AQWELIA vous alerte au bon moment et calcule la fréquence idéale selon votre
                  usage.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {drainageTasks.map((task) => (
                    <span
                      key={task.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/5 px-2.5 py-1 text-[10px] font-medium text-gold"
                    >
                      <Droplets className="h-3 w-3" />
                      {task.frequency}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Brand wall */}
        <Reveal delay={0.1} className="mt-6">
          <div className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] sm:p-6">
            <h3 className="font-display text-base font-bold sm:text-lg">
              Marques prises en charge
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              AQWELIA reconnaît les principales marques mondiales et les spas génériques chinois.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {SPA_BRANDS.map((brand) => (
                <div
                  key={brand.id}
                  className="rounded-lg border border-white/40 bg-background/60 px-3 py-2 text-center transition-colors hover:border-gold/40 dark:border-white/10"
                >
                  <p className="text-xs font-semibold text-foreground">{brand.name}</p>
                  <p className="text-[10px] text-muted-foreground">{brand.origin}</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      brand.category === 'premium'
                        ? 'bg-gold/15 text-gold'
                        : brand.category === 'mid_range'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {brand.category === 'premium' ? 'Premium' : brand.category === 'mid_range' ? 'Milieu de gamme' : 'Éco'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Mini CTA */}
        <Reveal delay={0.1} className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Vous avez un spa ?{' '}
            <button
              onClick={() => scrollToId('tarifs')}
              className="font-semibold text-gold underline-offset-4 hover:underline"
            >
              Découvrez le plan Premium →
            </button>
          </p>
        </Reveal>
      </div>
    </section>
  )
}
