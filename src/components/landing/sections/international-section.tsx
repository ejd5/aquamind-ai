'use client'

import { motion } from 'framer-motion'
import { Globe, Languages, Ruler, ShoppingBag } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  GlassCard,
  Reveal,
  SectionHeading,
  staggerContainer,
  fadeUpVariants,
} from '../landing-utils'

const LANGUAGES = [
  { flag: '🇫🇷', label: 'Français' },
  { flag: '🇬🇧', label: 'English' },
  { flag: '🇪🇸', label: 'Español' },
  { flag: '🇩🇪', label: 'Deutsch' },
  { flag: '🇮🇹', label: 'Italiano' },
  { flag: '🇵🇹', label: 'Português' },
  { flag: '🇳🇱', label: 'Nederlands' },
]

const COUNTRIES = [
  { flag: '🇫🇷', label: 'France' },
  { flag: '🇺🇸', label: 'USA' },
  { flag: '🇬🇧', label: 'UK' },
  { flag: '🇩🇪', label: 'Deutschland' },
  { flag: '🇪🇸', label: 'España' },
  { flag: '🇮🇹', label: 'Italia' },
  { flag: '🇳🇱', label: 'Nederland' },
  { flag: '🇵🇹', label: 'Portugal' },
  { flag: '🇨🇦', label: 'Canada' },
  { flag: '🇦🇺', label: 'Australia' },
]

const MARKETPLACE_TEASERS = [
  { country: '🇫🇷 France', store: 'Amazon.fr' },
  { country: '🇺🇸 USA', store: "Leslie's" },
  { country: '🇬🇧 UK', store: 'Poolstore UK' },
  { country: '🇩🇪 DE', store: 'Poolshop.de' },
  { country: '🇪🇸 ES', store: 'Quimipool' },
  { country: '🇮🇹 IT', store: 'Piscine Center' },
]

export function InternationalSection() {
  const t = useTranslations('landing')

  const FEATURE_CARDS = [
    {
      icon: Globe,
      emoji: '🌍',
      title: t('internationalNorms'),
      text: t('internationalNormsDesc'),
      accent: 'from-[oklch(0.65_0.11_195)]/15 to-transparent',
    },
    {
      icon: Languages,
      emoji: '🗣️',
      title: t('internationalLanguage'),
      text: t('internationalLanguageDesc'),
      accent: 'from-gold/15 to-transparent',
    },
    {
      icon: Ruler,
      emoji: '📏',
      title: t('internationalUnits'),
      text: t('internationalUnitsDesc'),
      accent: 'from-[oklch(0.55_0.10_195)]/15 to-transparent',
    },
  ]

  return (
    <section id="international" className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-[oklch(0.55_0.10_195/0.06)] to-background" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t('internationalEyebrow')}
          title={
            <>
              {t('internationalTitle1')} <span className="aqua-text-gradient">{t('internationalTitle2')}</span>
            </>
          }
          subtitle={t('internationalSubtitle')}
        />

        {/* Languages grid */}
        <Reveal delay={0.1} className="mt-12">
          <div className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] sm:p-6">
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-gold" />
              <h3 className="font-display text-base font-bold sm:text-lg">
                {t('internationalLangTitle')}
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('internationalLangDesc')}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {LANGUAGES.map((lang) => (
                <div
                  key={lang.label}
                  className="rounded-xl border border-white/40 bg-background/60 px-3 py-3 text-center transition-all hover:-translate-y-0.5 hover:border-gold/40 dark:border-white/10"
                >
                  <span className="block text-3xl" aria-hidden="true">
                    {lang.flag}
                  </span>
                  <span className="mt-1 block text-[11px] font-semibold text-foreground">
                    {lang.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Countries grid */}
        <Reveal delay={0.1} className="mt-6">
          <div className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] sm:p-6">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-gold" />
              <h3 className="font-display text-base font-bold sm:text-lg">
                {t('internationalCountriesTitle')}
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('internationalCountriesDesc')}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {COUNTRIES.map((country) => (
                <div
                  key={country.label}
                  className="rounded-xl border border-white/40 bg-background/60 px-3 py-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-gold/40 dark:border-white/10"
                >
                  <span className="mr-1.5 text-xl" aria-hidden="true">
                    {country.flag}
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {country.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* 3 feature cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
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
                    <h3 className="mt-3 font-display text-base font-bold">
                      {card.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {card.text}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Marketplace teaser */}
        <Reveal delay={0.1} className="mt-8">
          <div className="relative overflow-hidden rounded-2xl border-2 border-gold/40 bg-gradient-to-br from-gold/15 via-gold/5 to-transparent p-5 sm:p-6">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-base font-bold text-gold sm:text-lg">
                  {t('internationalMarketplaceTitle')}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-foreground/85 sm:text-sm">
                  {t('internationalMarketplaceText')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {MARKETPLACE_TEASERS.map((m) => (
                    <span
                      key={m.store}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/5 px-2.5 py-1 text-[11px] font-medium text-gold"
                    >
                      <span aria-hidden="true">{m.country.split(' ')[0]}</span>
                      {m.store}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
