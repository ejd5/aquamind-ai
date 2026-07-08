'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, ShieldCheck, Gift, Lock, ChevronDown, Droplets } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AnimatedCounter, scrollToId } from '../landing-utils'

interface HeroProps {
  hasProfile: boolean
  onEnterApp: () => void
}

export function Hero({ hasProfile, onEnterApp }: HeroProps) {
  const t = useTranslations('landing')

  const STATS = [
    { value: 11, suffix: '', label: t('statModules'), decimals: 0 },
    { value: 20, suffix: '+', label: t('statGuides'), decimals: 0 },
    { value: 550, prefix: '-', suffix: '€', label: t('statSavings'), decimals: 0 },
    { value: 25, suffix: 'h', label: t('statHours'), decimals: 0 },
  ]

  const TRUST = [
    { icon: Gift, label: t('trustNoCard') },
    { icon: ShieldCheck, label: t('trustNoCommitment') },
    { icon: Lock, label: t('trustPrivate') },
    { icon: Sparkles, label: t('trustFrance') },
  ]

  return (
    <section id="top" className="relative isolate overflow-hidden pb-16 sm:pb-24">
      {/* AQWELIA hero background image — complete, fills entire section, no truncation */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-no-repeat"
        style={{
          backgroundImage: 'url(/aqwelia-hero-bg.png)',
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
        }}
        aria-hidden="true"
      />
      {/* Light overlay — minimal, only left side for text readability */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-background/60 via-background/10 to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-28 sm:pt-32">
        <div className="max-w-xl text-left">
          {/* Eyebrow badge — signature AQWELIA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/70 px-4 py-1.5 text-xs font-semibold text-foreground backdrop-blur-md dark:bg-white/5"
          >
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <span className="tracking-[0.18em]">{t('heroBadge')}</span>
          </motion.div>

          {/* Headline — professional, sales-oriented */}
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mt-6 font-display text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl"
          >
            {t('heroTitle')}
          </motion.h1>

          {/* Subtitle — punchy, professional */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-5"
          >
            <p className="max-w-lg text-lg font-semibold leading-relaxed text-foreground/90 sm:text-xl">
              {t('heroSubtitle').split('.')[0]}.
            </p>
            <p className="mt-1 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('heroSubtitle').split('.').slice(1).join('.').trim()}
            </p>
          </motion.div>

          {/* Dual CTA */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-9 flex flex-col items-start gap-3 sm:flex-row"
          >
            <button
              onClick={onEnterApp}
              className="glow-gold group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-lg transition-all hover:scale-[1.02] hover:shadow-[0_0_50px_-8px_oklch(0.65_0.11_195/0.7)] sm:w-auto"
            >
              {hasProfile ? t('navMySpace') : t('heroCtaStart')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => scrollToId('solution')}
              className="glass-pill inline-flex w-full items-center justify-center gap-2 rounded-full border-white/50 px-7 py-3.5 text-sm font-semibold text-foreground transition-all hover:border-gold/50 hover:text-gold sm:w-auto"
            >
              {t('heroCtaHowItWorks')}
            </button>
          </motion.div>

          {/* Trust row — new arguments */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-start gap-x-5 gap-y-2 text-xs text-muted-foreground"
          >
            {TRUST.map((trust) => {
              const Icon = trust.icon
              return (
                <span key={trust.label} className="inline-flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-gold" />
                  {trust.label}
                </span>
              )
            })}
          </motion.div>
        </div>

        {/* Stats strip — inside the image, pushed down further */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto mt-64 grid max-w-4xl grid-cols-2 gap-3 sm:mt-80 sm:grid-cols-4 sm:gap-4"
        >
          {STATS.map((s) => (
            <div
              key={s.label}
              className="glass-card rounded-2xl p-4 text-center"
            >
              <p className="font-display text-2xl font-bold gradient-text-premium sm:text-3xl">
                <AnimatedCounter
                  value={s.value}
                  prefix={s.prefix}
                  suffix={s.suffix}
                  decimals={s.decimals}
                />
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground sm:text-xs">
                {s.label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.button
          onClick={() => scrollToId('probleme')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mx-auto mt-14 flex flex-col items-center gap-1 text-muted-foreground transition-colors hover:text-gold"
          aria-label={t('heroScrollAria')}
        >
          <span className="text-[10px] uppercase tracking-widest">{t('heroScroll')}</span>
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </motion.button>
      </div>
    </section>
  )
}
