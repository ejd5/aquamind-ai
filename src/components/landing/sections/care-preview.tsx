'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Search, Calculator, CheckCircle2, ShoppingCart } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { GlassCard, Reveal, SectionHeading, staggerContainer, fadeUpVariants } from '../landing-utils'

export function CarePreview() {
  const t = useTranslations('landing')

  const STEPS = [
    {
      num: '1',
      icon: Search,
      emoji: '🔍',
      title: t('carePreviewStep1'),
      text: t('carePreviewStep1Text'),
    },
    {
      num: '2',
      icon: Calculator,
      emoji: '🧮',
      title: t('carePreviewStep2'),
      text: t('carePreviewStep2Text'),
    },
    {
      num: '3',
      icon: CheckCircle2,
      emoji: '✅',
      title: t('carePreviewStep3'),
      text: t('carePreviewStep3Text'),
    },
    {
      num: '4',
      icon: ShoppingCart,
      emoji: '🛒',
      title: t('carePreviewStep4'),
      text: t('carePreviewStep4Text'),
    },
  ]

  return (
    <section id="care-preview" className="relative py-20 sm:py-28">
      {/* Subtle gradient background — no green/turquoise tint */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t('carePreviewEyebrow')}
          title={<>{t('carePreviewTitle')}</>}
          subtitle={t('carePreviewSubtitle')}
        />

        {/* Bientôt disponible badge */}
        <Reveal delay={0.08} className="mt-6 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gold">
            <Sparkles className="h-3 w-3" />
            {t('carePreviewBadge')}
          </span>
        </Reveal>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
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
                  <h3 className="mt-4 flex items-center gap-2 font-display text-lg font-bold text-foreground">
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

        {/* CTA */}
        <Reveal delay={0.15} className="mt-10 text-center">
          <a
            href="/care"
            className="glow-gold group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl"
          >
            {t('carePreviewCta')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </Reveal>
      </div>
    </section>
  )
}
