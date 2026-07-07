'use client'

import { motion } from 'framer-motion'
import { Quote } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { GlassCard, Reveal, SectionHeading, staggerContainer, fadeUpVariants } from '../landing-utils'

export function Problem() {
  const t = useTranslations('landing')
  const t = useTranslations('landing')

  const PAINS = [
    { emoji: '🟢', title: t('problemGreenWater'), text: t('problemGreenWaterText') },
    { emoji: '🌧️', title: t('problemStorm'), text: t('problemStormText') },
    { emoji: '👀', title: t('problemEyes'), text: t('problemEyesText') },
    { emoji: '💸', title: t('problemOverdose'), text: t('problemOverdoseText') },
    { emoji: '📅', title: t('problemVacation'), text: t('problemVacationText') },
    { emoji: '🤔', title: t('problemDoubt'), text: t('problemDoubtText') },
  ]

  return (
    <section id="probleme" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t('problemEyebrow')}
          title={<>{t('problemTitle')}</>}
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
              {t('problemQuote')}
            </p>
            <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
              {t('problemQuoteAuthor')}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
