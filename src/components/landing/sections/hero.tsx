'use client'

import { motion } from 'framer-motion'
import {
  ArrowRight,
  ChevronDown,
  Gift,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
  AqBadge,
  AqButton,
  AqCard,
  AqMediaFrame,
} from '@/components/design-system'
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
    <section id="top" className="aq-page-shell relative isolate overflow-hidden pb-14 pt-5 md:pb-20 md:pt-8">
      <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-5 lg:px-8">
        <AqMediaFrame
          src="/aqwelia-hero-bg.png"
          alt={t('heroTitle')}
          priority
          sizes="(max-width: 768px) 100vw, 1440px"
          className="min-h-[760px] rounded-[var(--aq-radius-hero)] shadow-[var(--aq-shadow-floating)] md:min-h-[820px]"
          imageClassName="opacity-90"
        >
          <div className="grid min-h-[760px] gap-8 px-5 pb-10 pt-20 sm:px-8 md:min-h-[820px] md:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.75fr)] md:items-center md:px-14 md:py-24 lg:px-20">
            <div className="max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <AqBadge tone="dark" dot>
                  {t('heroBadge')}
                </AqBadge>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.05 }}
                className="aq-display mt-7 max-w-[12ch]"
              >
                {t('heroTitle')}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="aq-body mt-6 max-w-xl text-base font-medium text-[var(--aq-deep-teal)] sm:text-lg"
              >
                {t('heroSubtitle')}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 }}
                className="mt-8 flex flex-col gap-3 sm:flex-row"
              >
                <AqButton
                  onClick={onEnterApp}
                  tone="lagoon"
                  aqSize="lg"
                  className="group sm:w-auto"
                >
                  {hasProfile ? t('navMySpace') : t('heroCtaStart')}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </AqButton>
                <AqButton
                  onClick={() => scrollToId('solution')}
                  tone="outline"
                  aqSize="lg"
                  className="sm:w-auto"
                >
                  {t('heroCtaHowItWorks')}
                </AqButton>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[var(--aq-deep-teal)]/75"
              >
                {TRUST.map((trust) => {
                  const Icon = trust.icon
                  return (
                    <span key={trust.label} className="inline-flex items-center gap-1.5">
                      <Icon className="size-3.5 text-[var(--aq-champagne)]" />
                      {trust.label}
                    </span>
                  )
                })}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.75, delay: 0.2 }}
              className="self-end md:self-center"
            >
              <AqCard
                tone="glass"
                className="border border-white/45 bg-white/55 p-4 shadow-[var(--aq-shadow-floating)] backdrop-blur-2xl sm:p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--aq-deep-teal)]">AQWELIA</p>
                    <p className="mt-0.5 text-xs text-[var(--aq-text-muted)]">{t('heroBadge')}</p>
                  </div>
                  <AqBadge tone="success" dot>
                    92 / 100
                  </AqBadge>
                </div>

                <AqCard tone="dark" className="mt-4 p-5 sm:p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="aq-eyebrow">AQWELIA</p>
                      <p className="mt-2 font-display text-5xl font-semibold tracking-[-0.05em] text-white">
                        92
                        <span className="ml-2 font-sans text-sm font-medium tracking-normal text-white/60">
                          /100
                        </span>
                      </p>
                    </div>
                    <span className="size-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.75)]" />
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-emerald-500 to-[var(--aq-lagoon)]" />
                  </div>
                </AqCard>

                <div className="mt-3 grid grid-cols-3 gap-2.5">
                  {[
                    ['pH', '7,2'],
                    ['°C', '27°'],
                    ['Cl', '1,4'],
                  ].map(([label, value]) => (
                    <AqCard key={label} tone="glass" className="p-3.5">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--aq-text-muted)]">
                        {label}
                      </p>
                      <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.04em] text-[var(--aq-deep-teal)]">
                        {value}
                      </p>
                    </AqCard>
                  ))}
                </div>

                <AqCard tone="dark" className="mt-3 p-5">
                  <p className="aq-eyebrow">72 H</p>
                  <p className="mt-2 font-display text-2xl font-semibold leading-tight text-white">
                    {t('heroCtaHowItWorks')}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">
                    {t('heroSubtitle')}
                  </p>
                </AqCard>
              </AqCard>
            </motion.div>
          </div>
        </AqMediaFrame>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="relative z-20 mx-auto -mt-9 grid max-w-5xl grid-cols-2 gap-3 px-3 sm:grid-cols-4 sm:gap-4"
        >
          {STATS.map((stat) => (
            <AqCard key={stat.label} tone="strong" className="p-4 text-center sm:p-5">
              <p className="font-display text-2xl font-semibold tracking-[-0.04em] text-[var(--aq-deep-teal)] sm:text-3xl">
                <AnimatedCounter
                  value={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  decimals={stat.decimals}
                />
              </p>
              <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--aq-text-muted)] sm:text-xs">
                {stat.label}
              </p>
            </AqCard>
          ))}
        </motion.div>

        <motion.button
          onClick={() => scrollToId('probleme')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="aq-touch-target aq-focusable mx-auto mt-8 flex flex-col items-center justify-center gap-1 rounded-full px-4 text-[var(--aq-text-muted)] transition-colors hover:text-[var(--aq-deep-teal)]"
          aria-label={t('heroScrollAria')}
        >
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em]">
            {t('heroScroll')}
          </span>
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronDown className="size-4" />
          </motion.span>
        </motion.button>
      </div>
    </section>
  )
}
