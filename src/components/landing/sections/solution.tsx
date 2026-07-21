'use client'

import { motion } from 'framer-motion'
import { Brain, Calculator, Camera, CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { AqBadge, AqCard, AqMediaFrame } from '@/components/design-system'
import { fadeUpVariants, staggerContainer } from '../landing-utils'

export function Solution() {
  const t = useTranslations('landing')

  const steps = [
    {
      num: '01',
      icon: Camera,
      title: t('solutionStep1'),
      text: t('solutionStep1Text'),
    },
    {
      num: '02',
      icon: Brain,
      title: t('solutionStep2'),
      text: t('solutionStep2Text'),
    },
    {
      num: '03',
      icon: CheckCircle2,
      title: t('solutionStep3'),
      text: t('solutionStep3Text'),
    },
  ]

  return (
    <section id="solution" className="aq-page-shell py-16 md:py-24">
      <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-5 lg:px-8">
        <AqMediaFrame
          src="/aqwelia-hero-bg.png"
          alt={t('solutionEyebrow')}
          sizes="(max-width: 768px) 100vw, 1440px"
          objectPosition="center 42%"
          className="min-h-[720px] rounded-[var(--aq-radius-hero)] shadow-[var(--aq-shadow-card)]"
          imageClassName="opacity-60 saturate-[0.85]"
        >
          <div className="grid min-h-[720px] gap-8 px-5 py-12 sm:px-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center md:px-14 lg:px-20">
            <div className="max-w-xl">
              <AqBadge tone="champagne" dot>
                {t('solutionEyebrow')}
              </AqBadge>
              <h2 className="aq-heading mt-6">
                {t('solutionDeterminist1')}{' '}
                <span className="text-[var(--aq-lagoon)]">
                  {t('solutionDeterminist2')}
                </span>{' '}
                {t('solutionDeterminist3')}
              </h2>
              <p className="aq-body mt-5 max-w-lg text-base text-[var(--aq-deep-teal)]/80 md:text-lg">
                {t('solutionDeterministText1')}{' '}
                <strong className="font-semibold text-[var(--aq-deep-teal)]">
                  {t('solutionDeterministText2')}
                </strong>
              </p>

              <AqCard tone="dark" className="mt-7 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-[var(--aq-radius-control)] bg-[var(--aq-champagne)] text-[var(--aq-night)]">
                    <Calculator className="size-5" />
                  </span>
                  <div>
                    <p className="aq-eyebrow">AQWELIA</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/75">
                      {t('solutionDeterministText1')}
                    </p>
                  </div>
                </div>
              </AqCard>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              className="grid gap-4 md:grid-cols-3"
            >
              {steps.map((step) => {
                const Icon = step.icon
                return (
                  <motion.div key={step.num} variants={fadeUpVariants}>
                    <AqCard
                      tone="glass"
                      interactive
                      className="relative h-full min-h-[260px] border border-white/50 bg-white/70 p-5 backdrop-blur-2xl"
                    >
                      <span className="pointer-events-none absolute right-4 top-3 font-display text-5xl font-semibold text-[var(--aq-champagne)]/20">
                        {step.num}
                      </span>
                      <span className="flex size-12 items-center justify-center rounded-[var(--aq-radius-control)] bg-[var(--aq-night)] text-[var(--aq-aqua)] shadow-[var(--aq-shadow-soft)]">
                        <Icon className="size-5" />
                      </span>
                      <h3 className="mt-5 font-display text-2xl font-semibold leading-tight tracking-[-0.035em] text-[var(--aq-deep-teal)]">
                        {step.title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-[var(--aq-text-muted)]">
                        {step.text}
                      </p>
                    </AqCard>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        </AqMediaFrame>
      </div>
    </section>
  )
}
