'use client'

import { motion } from 'framer-motion'
import { Clock, Coins, TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AnimatedCounter, GlassCard, Reveal, SectionHeading, staggerContainer, fadeUpVariants } from '../landing-utils'

export function Savings() {
  const t = useTranslations('landing')

  const TIME_BREAKDOWN = [
    t('savingsTimeBreakdown1'),
    t('savingsTimeBreakdown2'),
    t('savingsTimeBreakdown3'),
    t('savingsTimeBreakdown4'),
  ]

  const MONEY_BREAKDOWN = [
    t('savingsMoneyBreakdown1'),
    t('savingsMoneyBreakdown2'),
    t('savingsMoneyBreakdown3'),
    t('savingsMoneyBreakdown4'),
  ]

  const BARS = [
    { label: t('savingsBar1'), value: 96, color: 'from-primary to-gold', highlight: true },
    { label: t('savingsBar2'), value: 1000, color: 'from-amber-400 to-amber-600', highlight: false },
    { label: t('savingsBar3'), value: 1500, color: 'from-rose-400 to-rose-600', highlight: false },
  ]

  return (
    <section id="gains" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t('savingsEyebrow')}
          title={<>{t('savingsTitle')}</>}
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2"
        >
          {/* Time saved card */}
          <motion.div variants={fadeUpVariants}>
            <GlassCard className="h-full p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/30">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('savingsTimeGained')}</p>
                  <p className="font-display text-3xl font-bold sm:text-4xl">
                    <AnimatedCounter value={25} prefix="~" suffix=" h" />
                  </p>
                  <p className="text-xs text-muted-foreground">{t('savingsPerSeason')}</p>
                </div>
              </div>
              <ul className="mt-5 space-y-1.5 text-sm text-foreground/80">
                {TIME_BREAKDOWN.map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                    {b}
                  </li>
                ))}
              </ul>
            </GlassCard>
          </motion.div>

          {/* Money saved card */}
          <motion.div variants={fadeUpVariants}>
            <GlassCard className="h-full p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-primary text-white shadow-lg shadow-gold/30">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('savingsMoneySaved')}</p>
                  <p className="font-display text-3xl font-bold sm:text-4xl">
                    <AnimatedCounter value={550} prefix="~" suffix=" €" />
                  </p>
                  <p className="text-xs text-muted-foreground">{t('savingsPerYear')}</p>
                </div>
              </div>
              <ul className="mt-5 space-y-1.5 text-sm text-foreground/80">
                {MONEY_BREAKDOWN.map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                    {b}
                  </li>
                ))}
              </ul>
            </GlassCard>
          </motion.div>
        </motion.div>

        {/* ROI card */}
        <Reveal delay={0.1} className="mt-6">
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border-2 border-gold/50 bg-gradient-to-br from-gold/[0.1] via-white/40 to-white/30 p-6 backdrop-blur-xl dark:via-white/[0.03] dark:to-white/[0.02]">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 shrink-0 text-gold" />
              <p className="font-display text-base leading-relaxed text-foreground sm:text-lg">
                {t('savingsRoi1')} <span className="font-bold">~96€{t('savingsRoiYearSuffix')}</span> {t('savingsRoi2')}{' '}
                <span className="font-bold text-gold">550€</span>.{' '}
                <span className="gradient-text-premium font-bold">{t('savingsROI')}</span>. {t('savingsRoi3')}
              </p>
            </div>
          </div>
        </Reveal>

        {/* Comparison bars */}
        <Reveal delay={0.15} className="mt-8">
          <div className="rounded-2xl border border-white/40 bg-white/60 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {t('savingsComparison')}
            </p>
            <div className="mt-4 space-y-4">
              {BARS.map((bar, i) => {
                const max = 1500
                return (
                  <motion.div
                    key={bar.label}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  >
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className={`font-medium ${bar.highlight ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {bar.highlight && <span className="mr-1.5 text-gold">★</span>}
                        {bar.label}
                      </span>
                      <span className={`font-bold ${bar.highlight ? 'text-gold' : 'text-foreground'}`}>
                        {bar.value}€
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        className={`h-full rounded-full bg-gradient-to-r ${bar.color}`}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(bar.value / max) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
