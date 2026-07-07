'use client'

import { useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Reveal, SectionHeading } from '../landing-utils'

interface Scenario {
  emoji: string
  title: string
  without: string
  withText: string
}

export function Simulations() {
  const t = useTranslations('landing')

  const SCENARIOS: Scenario[] = [
    {
      emoji: '🟢',
      title: t('simulationsS1Title'),
      without: t('simulationsS1Without'),
      withText: t('simulationsS1With'),
    },
    {
      emoji: '🌩️',
      title: t('simulationsS2Title'),
      without: t('simulationsS2Without'),
      withText: t('simulationsS2With'),
    },
    {
      emoji: '✈️',
      title: t('simulationsS3Title'),
      without: t('simulationsS3Without'),
      withText: t('simulationsS3With'),
    },
    {
      emoji: '👀',
      title: t('simulationsS4Title'),
      without: t('simulationsS4Without'),
      withText: t('simulationsS4With'),
    },
    {
      emoji: '🌡️',
      title: t('simulationsS5Title'),
      without: t('simulationsS5Without'),
      withText: t('simulationsS5With'),
    },
    {
      emoji: '🔧',
      title: t('simulationsS6Title'),
      without: t('simulationsS6Without'),
      withText: t('simulationsS6With'),
    },
  ]

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start' })

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  return (
    <section id="simulations" className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/20 to-background" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t('simulationsEyebrow')}
          title={<>{t('simulationsTitle')}</>}
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
                    <ScenarioCard scenario={s} index={idx + 1} withoutLabel={t('simulationsWithoutLabel')} withLabel={t('simulationsWithLabel')} />
                  </div>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={scrollPrev}
                aria-label={t('simulationsPrev')}
                className="glass-pill flex h-10 w-10 items-center justify-center rounded-full border-white/50 text-foreground transition-all hover:border-gold/50 hover:text-gold"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                onClick={scrollNext}
                aria-label={t('simulationsNext')}
                className="glass-pill flex h-10 w-10 items-center justify-center rounded-full border-white/50 text-foreground transition-all hover:border-gold/50 hover:text-gold"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-6">
          <p className="text-center text-xs italic text-muted-foreground">
            {t('simulationsNote')}
          </p>
        </Reveal>
      </div>
    </section>
  )
}

function ScenarioCard({
  scenario,
  index,
  withoutLabel,
  withLabel,
}: {
  scenario: Scenario
  index: number
  withoutLabel: string
  withLabel: string
}) {
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
            ❌ {withoutLabel}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-foreground/80">
            {scenario.without}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            ✅ {withLabel}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-foreground/80">
            {scenario.withText}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
