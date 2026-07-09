'use client'

import { motion } from 'framer-motion'
import { Camera, Brain, CheckCircle2, Calculator } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { GlassCard, Reveal, SectionHeading, staggerContainer, fadeUpVariants } from '../landing-utils'

export function Solution() {
  const t = useTranslations('landing')

  const STEPS = [
    {
      num: '1',
      icon: Camera,
      emoji: '📸',
      title: t('solutionStep1'),
      text: t('solutionStep1Text'),
    },
    {
      num: '2',
      icon: Brain,
      emoji: '🧠',
      title: t('solutionStep2'),
      text: t('solutionStep2Text'),
    },
    {
      num: '3',
      icon: CheckCircle2,
      emoji: '✅',
      title: t('solutionStep3'),
      text: t('solutionStep3Text'),
    },
  ]

  return (
    <section id="solution" className="relative py-20 sm:py-28">
      {/* BLOC04 background image — complete, no filter, no opacity */}
      <div
        className="pointer-events-none absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: 'url(/bloc04-bg.png)',
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
        }}
        aria-hidden="true"
      />
      {/* Gradient fades top + bottom for smooth transition with white background */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t('solutionEyebrow')}
          title={<>{t('solutionTitle')}</>}
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

        {/* Differentiator card — centered, narrower, glassmorphism */}
        <Reveal delay={0.15} className="mt-8">
          <div className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border border-gold/40 bg-white/20 p-6 text-center backdrop-blur-2xl sm:p-8">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-primary text-white shadow-lg shadow-gold/30">
                <Calculator className="h-5 w-5" />
              </div>
            </div>
            <h3 className="mt-4 font-display text-lg font-bold sm:text-xl">
              {t('solutionDeterminist1')}{' '}
              <span className="gradient-text-premium">{t('solutionDeterminist2')}</span>{' '}
              {t('solutionDeterminist3')}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90 sm:text-base">
              {t('solutionDeterministText1')}{' '}
              <strong className="text-foreground">{t('solutionDeterministText2')}</strong>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
