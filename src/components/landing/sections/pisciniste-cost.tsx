'use client'

import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { GlassCard, Reveal, SectionHeading, staggerContainer, fadeUpVariants } from '../landing-utils'

export function PiscinisteCost() {
  const t = useTranslations('landing')

  const INCLUDED = [
    t('piscinisteIncluded1'),
    t('piscinisteIncluded2'),
    t('piscinisteIncluded3'),
    t('piscinisteIncluded4'),
    t('piscinisteIncluded5'),
    t('piscinisteIncluded6'),
  ]

  const NOT_INCLUDED = [
    t('piscinisteNotIncluded1'),
    t('piscinisteNotIncluded2'),
    t('piscinisteNotIncluded3'),
    t('piscinisteNotIncluded4'),
    t('piscinisteNotIncluded5'),
    t('piscinisteNotIncluded6'),
    t('piscinisteNotIncluded7'),
    t('piscinisteNotIncluded8'),
  ]

  return (
    <section id="pisciniste" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t('piscinisteEyebrow')}
          title={<>{t('piscinisteTitle')}</>}
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
                <h3 className="font-display text-xl font-bold">{t('piscinisteIncludedTitle')}</h3>
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

          {/* AQWELIA complement column */}
          <motion.div variants={fadeUpVariants}>
            <div className="relative h-full overflow-hidden rounded-2xl border-2 border-gold/40 bg-gradient-to-br from-gold/[0.08] to-white/40 p-6 backdrop-blur-xl dark:to-white/[0.02]">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-gold">
                  <Sparkles className="h-4 w-4" />
                </span>
                <h3 className="font-display text-xl font-bold">{t('piscinisteNotIncludedTitle')}</h3>
              </div>
              <ul className="mt-5 space-y-2.5">
                {NOT_INCLUDED.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm font-medium text-foreground"
                  >
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
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
              {t('piscinisteCallout1')}{' '}
              <span className="font-bold text-gold">{t('piscinisteCallout2')}</span>.{' '}
              <span className="gradient-text-premium font-bold">{t('piscinisteCallout3')}</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
