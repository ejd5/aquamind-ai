'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { ArrowRight, Sparkles, Eye, FileText, Palette } from 'lucide-react'
import { isArqweliaLot1Enabled } from '@/lib/features'

const SUPPORTED_LOCALES = ['fr', 'en']

export function ArqweliaLandingSection() {
  const t = useTranslations('landing')
  const locale = useLocale()
  const enabled = isArqweliaLot1Enabled()

  if (!enabled || !SUPPORTED_LOCALES.includes(locale)) return null

  const features = [
    {
      icon: Palette,
      title: t('arqweliaFeature1Title'),
      text: t('arqweliaFeature1Text'),
    },
    {
      icon: Eye,
      title: t('arqweliaFeature2Title'),
      text: t('arqweliaFeature2Text'),
    },
    {
      icon: FileText,
      title: t('arqweliaFeature3Title'),
      text: t('arqweliaFeature3Text'),
    },
  ]

  return (
    <section id="arqwelia" className="relative overflow-hidden border-t border-arq-aqua/20 bg-gradient-to-b from-background via-arq-navy-deep/5 to-background py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-arq-aqua/10 via-transparent to-transparent" />
      <div className="pointer-events-none absolute -left-40 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-arq-aqua/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-arq-aqua/30 bg-arq-aqua/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-arq-aqua">
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
            <span className="bg-gradient-to-r from-arq-aqua via-arq-champagne to-arq-aqua bg-clip-text text-transparent">
              {t('arqweliaTitle')}
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-base leading-relaxed text-white/65 sm:text-lg"
          >
            {t('arqweliaSubtitle')}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-14 grid gap-6 sm:grid-cols-3"
        >
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <div
                key={i}
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-all hover:border-arq-aqua/30 hover:bg-arq-aqua/[0.04]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-arq-aqua/20 bg-arq-aqua/10 text-arq-aqua transition-colors group-hover:bg-arq-aqua/20">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">
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
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold text-arq-navy-deep transition-transform hover:scale-[1.02]"
            style={{ background: 'var(--arqwelia-gradient-premium)', boxShadow: 'var(--arqwelia-glow-aqua)' }}
            aria-label={t('arqweliaCta')}
          >
            {t('arqweliaCta')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-6 text-center text-xs text-white/40"
        >
          {t('arqweliaDisclaimer')}
        </motion.p>
      </div>
    </section>
  )
}