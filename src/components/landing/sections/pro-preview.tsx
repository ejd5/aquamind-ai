'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Users, Calendar, FileText, ShoppingBag } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { GlassCard, Reveal, SectionHeading, staggerContainer, fadeUpVariants } from '../landing-utils'

export function ProPreview() {
  const t = useTranslations('landing')

  const CARDS = [
    {
      icon: Users,
      emoji: '📋',
      title: t('proPreviewCard1Title'),
      text: t('proPreviewCard1Text'),
    },
    {
      icon: Calendar,
      emoji: '📅',
      title: t('proPreviewCard2Title'),
      text: t('proPreviewCard2Text'),
    },
    {
      icon: FileText,
      emoji: '📊',
      title: t('proPreviewCard3Title'),
      text: t('proPreviewCard3Text'),
    },
    {
      icon: ShoppingBag,
      emoji: '🛒',
      title: t('proPreviewCard4Title'),
      text: t('proPreviewCard4Text'),
    },
  ]

  return (
    <section id="pro-preview" className="relative py-20 sm:py-28">
      {/* Subtle gradient background — no green/turquoise tint */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t('proPreviewEyebrow')}
          title={<>{t('proPreviewTitle')}</>}
          subtitle={t('proPreviewSubtitle')}
        />

        {/* Early Access badge */}
        <Reveal delay={0.08} className="mt-6 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gold">
            <Sparkles className="h-3 w-3" />
            {t('proPreviewBadge')}
            <span className="text-muted-foreground">·</span>
            <span className="font-semibold text-foreground/80">{t('proPreviewBadgeText')}</span>
          </span>
        </Reveal>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {CARDS.map((card, idx) => {
            const Icon = card.icon
            return (
              <motion.div key={idx} variants={fadeUpVariants}>
                <GlassCard className="relative h-full p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/30">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 flex items-center gap-2 font-display text-lg font-bold text-foreground">
                    <span aria-hidden="true">{card.emoji}</span>
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {card.text}
                  </p>
                </GlassCard>
              </motion.div>
            )
          })}
        </motion.div>

        {/* CTA */}
        <Reveal delay={0.15} className="mt-10 text-center">
          <a
            href="/pro"
            className="glow-gold group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl"
          >
            {t('proPreviewCta')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </Reveal>
      </div>
    </section>
  )
}
