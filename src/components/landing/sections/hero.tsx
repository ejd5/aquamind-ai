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
    <section id="top" className="relative isolate overflow-hidden pt-28 pb-24 sm:pt-32 sm:pb-32">
      {/* Aurora mesh background */}
      <div className="aurora-bg pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      {/* Floating glass orbs */}
      <div
        className="aurora-orb -left-20 top-10 h-72 w-72 bg-[oklch(0.6_0.13_195/0.55)]"
        aria-hidden="true"
      />
      <div
        className="aurora-orb right-0 top-32 h-80 w-80 bg-[oklch(0.65_0.11_195/0.45)]"
        style={{ animationDelay: '-6s' }}
        aria-hidden="true"
      />
      <div
        className="aurora-orb bottom-0 left-1/3 h-72 w-72 bg-[oklch(0.5_0.1_170/0.4)]"
        style={{ animationDelay: '-12s' }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
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

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl"
          >
            {t('heroTitle')}
            <br className="hidden sm:block" />{' '}
            <span className="gradient-text-premium italic">{t('heroTitleSuffix')}</span>
          </motion.h1>

          {/* Subtitle — promise AQWELIA (Option B) */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            {t('heroSubtitle')}
          </motion.p>

          {/* Dual CTA */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
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

          {/* Trust row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
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

        {/* Hero visual: floating phone mockup showing dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35 }}
          className="relative mx-auto mt-16 max-w-3xl"
        >
          <div className="relative mx-auto w-full max-w-sm">
            {/* Glow behind */}
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-primary/30 via-gold/30 to-primary/20 blur-3xl" />
            {/* Phone frame */}
            <div className="overflow-hidden rounded-[2.25rem] border border-white/50 bg-white/80 p-2 shadow-2xl backdrop-blur-xl dark:bg-white/5">
              <div className="rounded-[1.9rem] bg-gradient-to-br from-[oklch(0.96_0.012_195)] to-[oklch(0.99_0.005_195)] p-4 dark:from-[oklch(0.2_0.025_200)] dark:to-[oklch(0.18_0.02_200)]">
                {/* Mock dashboard */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-gold">
                      <Droplets className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-xs font-bold">AQWELIA</span>
                  </div>
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[9px] font-bold text-gold">
                    {t('heroPhoneBadge')}
                  </span>
                </div>

                <div className="mt-4 rounded-xl bg-white/80 p-3 dark:bg-white/5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t('heroPhoneClearIndex')}
                  </p>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="font-display text-3xl font-bold gradient-text-premium">
                      92
                    </span>
                    <span className="pb-1 text-[10px] text-emerald-600">▲ +8</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-primary to-gold" />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    { k: 'pH', v: '7.4', c: 'emerald' },
                    { k: t('heroPhoneChlorine'), v: '1.6', c: 'emerald' },
                    { k: 'TAC', v: '90', c: 'amber' },
                    { k: 'CYA', v: '45', c: 'emerald' },
                  ].map((m) => (
                    <div key={m.k} className="rounded-lg bg-white/70 p-2 dark:bg-white/5">
                      <p className="text-[9px] uppercase text-muted-foreground">{m.k}</p>
                      <p className="font-display text-sm font-bold">{m.v}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-xl border border-gold/30 bg-gold/5 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gold">
                    {t('heroPhoneActionPlan')}
                  </p>
                  <ol className="mt-1.5 space-y-1 text-[10px] text-foreground/80">
                    <li>{t('heroPhoneStep1')}</li>
                    <li>{t('heroPhoneStep2')}</li>
                    <li>{t('heroPhoneStep3')}</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Floating mini badge */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -right-6 top-20 hidden rounded-2xl border border-white/50 bg-white/85 px-3 py-2 shadow-lg backdrop-blur-xl sm:block dark:bg-white/10"
            >
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {t('heroPhoneBaignadeLabel')}
              </p>
              <p className="text-sm font-bold text-emerald-600">{t('heroPhoneBaignadeValue')}</p>
            </motion.div>

            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -left-8 bottom-16 hidden rounded-2xl border border-white/50 bg-white/85 px-3 py-2 shadow-lg backdrop-blur-xl sm:block dark:bg-white/10"
            >
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {t('heroPhoneMeteoLabel')}
              </p>
              <p className="text-sm font-bold text-amber-600">{t('heroPhoneMeteoValue')}</p>
            </motion.div>
          </div>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
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
