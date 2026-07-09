'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { scrollToId } from '../landing-utils'

interface FinalCtaProps {
  hasProfile: boolean
  onEnterApp: () => void
}

export function FinalCta({ hasProfile, onEnterApp }: FinalCtaProps) {
  const t = useTranslations('landing')

  return (
    <section id="final-cta" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-3xl p-8 text-center shadow-2xl shadow-primary/30 sm:p-14"
        >
          {/* BLOCBASDEPAGE background image — no crop, no effect */}
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: 'url(/bloc-bas.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            aria-hidden="true"
          />

          {/* Glass card for text readability over bright image — AQWELIA DA */}
          <div className="relative mx-auto max-w-2xl rounded-2xl border border-white/20 bg-[oklch(0.15_0.02_195)]/60 px-6 py-8 backdrop-blur-md sm:px-10 sm:py-10">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              <Sparkles className="h-3 w-3 text-gold" />
              {t('finalCtaEyebrow')}
            </span>

            <h2 className="mx-auto mt-5 max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
              {t('finalCtaTitle')}
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
              {t('finalCtaSubtitle')}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={onEnterApp}
                className="glow-gold group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-black/20 transition-all hover:scale-[1.02] hover:shadow-2xl sm:w-auto"
              >
                {hasProfile ? t('finalCtaMySpace') : t('finalCtaStart')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => scrollToId('tarifs')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/50 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
              >
                {t('finalCtaSeePricing')}
              </button>
            </div>

            <p className="mt-6 text-[11px] uppercase tracking-widest text-white/80">
              {t('finalCtaDisclaimer')}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
