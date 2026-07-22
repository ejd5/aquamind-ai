'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

import { AqBadge, AqCard, AqMediaFrame, AqSection } from '@/components/design-system'
import { cn } from '@/lib/utils'
import { fadeUpVariants, staggerContainer } from '../landing-utils'

export function FeaturesGrid() {
  const t = useTranslations('landing')

  const features = [
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
    <AqSection
      id="fonctionnalites"
      eyebrow={t('featuresEyebrow')}
      title={t('featuresTitle')}
      align="center"
      className="aq-page-shell relative overflow-hidden"
      containerClassName="max-w-[1440px]"
    >
      <AqMediaFrame
        src="/aqwelia-hero-bg.png"
        alt={t('featuresTitle')}
        sizes="(max-width: 768px) 100vw, 1440px"
        objectPosition="center 72%"
        className="rounded-[var(--aq-radius-hero)] p-4 shadow-[var(--aq-shadow-card)] sm:p-6 md:p-8"
        imageClassName="opacity-38 scale-105 saturate-[0.75]"
      >
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, index) => {
            const darkCard = index === 2 || index === 7

            return (
              <motion.div key={feature.title} variants={fadeUpVariants}>
                <AqCard
                  tone={darkCard ? 'dark' : 'glass'}
                  interactive
                  className={cn(
                    'h-full min-h-[190px] border p-5 backdrop-blur-2xl',
                    darkCard
                      ? 'border-[var(--aq-aqua)]/20 text-white'
                      : 'border-white/45 bg-white/[0.72]'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      aria-hidden="true"
                      className="flex size-11 shrink-0 items-center justify-center rounded-[var(--aq-radius-control)] bg-[var(--aq-lagoon)]/14 text-xl"
                    >
                      {feature.emoji}
                    </span>
                    <AqBadge tone={darkCard ? 'dark' : 'champagne'}>
                      {String(index + 1).padStart(2, '0')}
                    </AqBadge>
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-semibold leading-tight tracking-[-0.035em] text-inherit">
                    {feature.title}
                  </h3>
                  <p
                    className={cn(
                      'mt-3 text-sm leading-relaxed',
                      darkCard ? 'text-white/65' : 'text-[var(--aq-text-muted)]'
                    )}
                  >
                    {feature.text}
                  </p>
                </AqCard>
              </motion.div>
            )
          })}

          <motion.div variants={fadeUpVariants}>
            <AqCard
              tone="dark"
              className="flex h-full min-h-[190px] flex-col items-center justify-center p-6 text-center"
            >
              <p className="font-display text-5xl font-semibold tracking-[-0.05em] text-[var(--aq-aqua)]">
                +1
              </p>
              <p className="mt-3 max-w-[18rem] text-sm leading-relaxed text-white/65">
                {t('featuresMore')}
              </p>
            </AqCard>
          </motion.div>
        </motion.div>
      </AqMediaFrame>
    </AqSection>
  )
}
