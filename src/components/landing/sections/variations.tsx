'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { GlassCard, Reveal, SectionHeading, staggerContainer, fadeUpVariants } from '../landing-utils'

export function Variations() {
  const t = useTranslations('landing')

  const FACTORS = [
    { emoji: '🌧️', title: t('variationsFactor1Title'), text: t('variationsFactor1Text') },
    { emoji: '👥', title: t('variationsFactor2Title'), text: t('variationsFactor2Text') },
    { emoji: '🧴', title: t('variationsFactor3Title'), text: t('variationsFactor3Text') },
    { emoji: '💦', title: t('variationsFactor4Title'), text: t('variationsFactor4Text') },
    { emoji: '🌡️', title: t('variationsFactor5Title'), text: t('variationsFactor5Text') },
    { emoji: '☀️', title: t('variationsFactor6Title'), text: t('variationsFactor6Text') },
    { emoji: '🍂', title: t('variationsFactor7Title'), text: t('variationsFactor7Text') },
    { emoji: '🔧', title: t('variationsFactor8Title'), text: t('variationsFactor8Text') },
  ]

  return (
    <section id="variations" className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/20 to-background" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t('variationsEyebrow')}
          title={<>{t('variationsTitle')}</>}
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
              {t('variationsCallout1')} <span className="font-bold text-gold">{t('variationsCalloutAll')}</span> {t('variationsCallout2')} <span className="font-semibold">{t('variationsCallout3')}</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
