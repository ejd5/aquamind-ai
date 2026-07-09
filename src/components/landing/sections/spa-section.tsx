'use client'

import { motion } from 'framer-motion'
import { Droplets, RotateCcw, Thermometer, Users, Settings2, Lock, Waves } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  GlassCard,
  Reveal,
  SectionHeading,
  staggerContainer,
  fadeUpVariants,
  scrollToId,
} from '../landing-utils'
import { SPA_BRANDS, SPA_TREATMENTS, SPA_MAINTENANCE } from '@/lib/pool/spa-data'

export function SpaSection() {
  const t = useTranslations('landing')
  const td = useTranslations('spaData')

  const drainageTasks = SPA_MAINTENANCE.filter((task) => task.isDrainage)

  const FEATURE_CARDS = [
    {
      icon: Droplets,
      emoji: '🧪',
      title: t('spaCard1Title'),
      text: t('spaCard1Text'),
      accent: 'from-[oklch(0.65_0.11_195)]/15 to-transparent',
    },
    {
      icon: RotateCcw,
      emoji: '💧',
      title: t('spaCard2Title'),
      text: t('spaCard2Text'),
      accent: 'from-gold/15 to-transparent',
    },
    {
      icon: Thermometer,
      emoji: '🌡️',
      title: t('spaCard3Title'),
      text: t('spaCard3Text'),
      accent: 'from-[oklch(0.55_0.10_195)]/15 to-transparent',
    },
    {
      icon: Settings2,
      emoji: '⚙️',
      title: t('spaCard4Title'),
      text: t('spaCard4Text'),
      accent: 'from-gold/15 to-transparent',
    },
    {
      icon: Users,
      emoji: '💺',
      title: t('spaCard5Title'),
      text: t('spaCard5Text'),
      accent: 'from-[oklch(0.65_0.11_195)]/15 to-transparent',
    },
  ]

  return (
    <section id="spa" className="relative py-20 sm:py-28">
      {/* SPA background image — complete, no filter, no opacity */}
      <div
        className="pointer-events-none absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: 'url(/spa-bg.png)',
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
          eyebrow={t('spaEyebrow')}
          title={
            <>
              <span className="aqua-text-gradient">{t('spaTitle1')}</span> {t('spaTitle2')}
            </>
          }
          subtitle={t('spaSubtitle')}
        />

        {/* 5 cards — spa features */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURE_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <motion.div key={card.title} variants={fadeUpVariants}>
                <GlassCard className="relative h-full overflow-hidden p-5">
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent}`}
                  />
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl" aria-hidden="true">
                        {card.emoji}
                      </span>
                      <Icon className="h-5 w-5 text-gold" />
                    </div>
                    <h3 className="mt-3 font-display text-base font-bold">{card.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {card.text}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}

          {/* 6th card — note Premium */}
          <motion.div variants={fadeUpVariants}>
            <div className="relative h-full overflow-hidden rounded-2xl border-2 border-gold/50 bg-gradient-to-br from-gold/15 via-gold/5 to-transparent p-5">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
              <Lock className="h-5 w-5 text-gold" />
              <h3 className="mt-3 font-display text-base font-bold text-gold">
                {t('spaPremiumTitle')}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-foreground/85">
                {t('spaPremiumText1')} <strong className="text-gold">Premium</strong> {t('spaPremiumText2')}
              </p>
              <button
                onClick={() => scrollToId('tarifs')}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold transition-colors hover:bg-gold/20"
              >
                {t('spaPremiumCta')}
                <Waves className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* Treatments comparison — recommended vs not */}
        <Reveal delay={0.1} className="mt-12">
          <div className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] sm:p-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-display text-lg font-bold">
                {t('spaTreatmentsTitle')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t('spaTreatmentsDesc')}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              {SPA_TREATMENTS.map((treatment) => {
                const isRecommended = treatment.recommended
                return (
                  <div
                    key={treatment.type}
                    className={`rounded-xl border p-4 ${
                      isRecommended
                        ? 'border-gold/40 bg-gold/[0.06]'
                        : 'border-red-400/30 bg-red-500/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-display text-sm font-bold ${isRecommended ? 'text-gold' : 'text-red-500'}`}>
                        {td(treatment.name)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          isRecommended
                            ? 'bg-gold/20 text-gold'
                            : 'bg-red-500/15 text-red-500'
                        }`}
                      >
                        {isRecommended ? td('recommended') : td('notRecommended')}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {t('spaTempMax')} <strong>{treatment.temperatureMax}°C</strong>
                    </p>
                    <ul className="mt-2 space-y-1 text-[11px]">
                      {treatment.pros.map((p) => (
                        <li key={p} className="flex items-start gap-1.5 text-foreground/85">
                          <span className="mt-0.5 text-green-500">+</span>
                          <span>{td(p)}</span>
                        </li>
                      ))}
                      {treatment.cons.map((c) => (
                        <li key={c} className="flex items-start gap-1.5 text-muted-foreground">
                          <span className="mt-0.5 text-red-400">−</span>
                          <span>{td(c)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        </Reveal>

        {/* Drainage emphasis — economic argument */}
        <Reveal delay={0.1} className="mt-6">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-r from-gold/15 via-transparent to-[oklch(0.55_0.10_195/0.15)] p-5 sm:p-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-base font-bold text-foreground sm:text-lg">
                  {t('spaDrainageTitle')}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-foreground/85 sm:text-sm">
                  {t('spaDrainageText1')}{' '}
                  <strong>{t('spaDrainageText2')}</strong>{' '}
                  {t('spaDrainageText3')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {drainageTasks.map((task) => (
                    <span
                      key={task.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/5 px-2.5 py-1 text-[10px] font-medium text-gold"
                    >
                      <Droplets className="h-3 w-3" />
                      {td(task.frequencyKey, task.frequencyParams)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Brand wall */}
        <Reveal delay={0.1} className="mt-6">
          <div className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] sm:p-6">
            <h3 className="font-display text-base font-bold sm:text-lg">
              {t('spaBrandsTitle')}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('spaBrandsDesc')}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {SPA_BRANDS.map((brand) => (
                <div
                  key={brand.id}
                  className="rounded-lg border border-white/40 bg-background/60 px-3 py-2 text-center transition-colors hover:border-gold/40 dark:border-white/10"
                >
                  <p className="text-xs font-semibold text-foreground">{brand.name}</p>
                  <p className="text-[10px] text-muted-foreground">{brand.origin}</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      brand.category === 'premium'
                        ? 'bg-gold/15 text-gold'
                        : brand.category === 'mid_range'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {brand.category === 'premium'
                      ? t('spaBrandCategoryPremium')
                      : brand.category === 'mid_range'
                        ? t('spaBrandCategoryMid')
                        : t('spaBrandCategoryEco')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Mini CTA */}
        <Reveal delay={0.1} className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t('spaCtaText1')}{' '}
            <button
              onClick={() => scrollToId('tarifs')}
              className="font-semibold text-gold underline-offset-4 hover:underline"
            >
              {t('spaCtaText2')}
            </button>
          </p>
        </Reveal>
      </div>
    </section>
  )
}
