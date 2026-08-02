'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { ArrowRight, Sparkles, Eye, FileText, Ruler, BarChart3, Handshake } from 'lucide-react'
import { isArqweliaLot1Enabled } from '@/lib/features'

const SUPPORTED_LOCALES = ['fr', 'en']

export function ArqweliaLandingSection() {
  const t = useTranslations('landing')
  const locale = useLocale()
  const enabled = isArqweliaLot1Enabled()

  if (!enabled || !SUPPORTED_LOCALES.includes(locale)) return null

  const features = [
    {
      icon: Eye,
      title: t('arqweliaFeature1Title'),
      text: t('arqweliaFeature1Text'),
    },
    {
      icon: Sparkles,
      title: t('arqweliaFeature2Title'),
      text: t('arqweliaFeature2Text'),
    },
    {
      icon: Ruler,
      title: t('arqweliaFeature3Title'),
      text: t('arqweliaFeature3Text'),
    },
    {
      icon: BarChart3,
      title: t('arqweliaFeature4Title'),
      text: t('arqweliaFeature4Text'),
    },
    {
      icon: FileText,
      title: t('arqweliaFeature5Title'),
      text: t('arqweliaFeature5Text'),
    },
    {
      icon: Handshake,
      title: t('arqweliaFeature6Title'),
      text: t('arqweliaFeature6Text'),
    },
  ]

  return (
    <section
      id="arqwelia"
      className="relative overflow-hidden border-t border-white/10 py-20 sm:py-28"
      style={{ background: 'var(--arqwelia-gradient-hero)' }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/[0.06] via-transparent to-transparent" />
      <div className="pointer-events-none absolute -left-40 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full blur-[120px]" style={{ background: 'rgba(0, 214, 197, 0.10)' }} />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-[400px] w-[400px] rounded-full blur-[100px]" style={{ background: 'rgba(67, 207, 245, 0.06)' }} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: 'var(--arqwelia-aqua-bright)', background: 'rgba(0, 214, 197, 0.10)' }}
            >
              <Sparkles className="h-3 w-3" />
              {t('arqweliaEyebrow')}
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'var(--arqwelia-gradient-premium)' }}
            >
              {t('arqweliaTitle')}
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-base leading-relaxed text-white/80 sm:text-lg"
          >
            {t('arqweliaPromise')}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <div
                key={i}
                className="group rounded-2xl border border-white/10 bg-white/[0.05] p-6 shadow-[var(--arqwelia-shadow-deep)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-[var(--arqwelia-aqua)]/40 hover:bg-white/[0.08]"
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl border transition-colors group-hover:bg-[rgba(0,214,197,0.20)]"
                  style={{ borderColor: 'rgba(0, 214, 197, 0.30)', background: 'rgba(0, 214, 197, 0.12)', color: 'var(--arqwelia-aqua)', boxShadow: 'var(--arqwelia-glow-aqua)' }}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  {feature.text}
                </p>
              </div>
            )
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href="/arqwelia"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02]"
            style={{ background: 'var(--arqwelia-gradient-premium)', boxShadow: 'var(--arqwelia-glow-aqua)' }}
            aria-label={t('arqweliaCtaPrimary')}
          >
            {t('arqweliaCtaPrimary')}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/arqwelia"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-sm font-bold transition-all hover:border-white/50 hover:bg-white/10"
            style={{ color: 'var(--arqwelia-aqua-bright)' }}
            aria-label={t('arqweliaCtaSecondary')}
          >
            {t('arqweliaCtaSecondary')}
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-6 text-center text-xs text-white/60"
        >
          {t('arqweliaDisclaimer')}
        </motion.p>
      </div>
    </section>
  )
}
