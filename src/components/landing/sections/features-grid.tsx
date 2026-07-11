'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { GlassCard, Reveal, SectionHeading, staggerContainer, fadeUpVariants } from '../landing-utils'

export function FeaturesGrid() {
  const t = useTranslations('landing')

  const FEATURES = [
    { emoji: '🏠', title: t('featuresItem1Title'), text: t('featuresItem1Text') },
    { emoji: '📸', title: t('featuresItem2Title'), text: t('featuresItem2Text') },
    { emoji: '🧪', title: t('featuresItem3Title'), text: t('featuresItem3Text') },
    { emoji: '💬', title: t('featuresItem4Title'), text: t('featuresItem4Text') },
    { emoji: '✅', title: t('featuresItem5Title'), text: t('featuresItem5Text') },
    { emoji: '📔', title: t('featuresItem6Title'), text: t('featuresItem6Text') },
    { emoji: '🌤️', title: t('featuresItem7Title'), text: t('featuresItem7Text') },
    { emoji: '🔔', title: t('featuresItem8Title'), text: t('featuresItem8Text') },
    { emoji: '🔧', title: t('featuresItem9Title'), text: t('featuresItem9Text') },
    { emoji: '📚', title: t('featuresItem10Title'), text: t('featuresItem10Text') },
    { emoji: '🛟', title: t('featuresItem11Title'), text: t('featuresItem11Text') },
  ]

  return (
    <section id="fonctionnalites" className="relative py-20 sm:py-28">
      {/* 11MODULES background image — no opacity, no overlay */}
      <div
        className="pointer-events-none absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: 'url(/modules-bg.png)',
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
          eyebrow={t('featuresEyebrow')}
          title={<>{t('featuresTitle')}</>}
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <motion.div key={f.title} variants={fadeUpVariants}>
              <GlassCard className="flex h-full items-start gap-3 p-5">
                <span className="text-2xl" aria-hidden="true">
                  {f.emoji}
                </span>
                <div>
                  <h3 className="font-display text-base font-bold leading-tight">{f.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {f.text}
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          ))}

          {/* 12th cell — branding accent */}
          <motion.div variants={fadeUpVariants}>
            <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-gold/30 bg-white/10 p-5 text-center backdrop-blur-md">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
              <p className="font-display text-3xl font-bold gradient-text-premium">+1</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('featuresMore')}</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
