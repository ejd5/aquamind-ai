'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { AqBadge, AqButton, AqMediaFrame } from '@/components/design-system'
import { scrollToId } from '../landing-utils'

interface FinalCtaProps {
  hasProfile: boolean
  onEnterApp: () => void
}

export function FinalCta({ hasProfile, onEnterApp }: FinalCtaProps) {
  const t = useTranslations('landing')

  return (
    <section id="final-cta" className="aq-page-shell py-16 md:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
        >
          <AqMediaFrame
            src="/aqwelia-hero-bg.png"
            alt={t('finalCtaTitle')}
            sizes="(max-width: 768px) 100vw, 1280px"
            objectPosition="right center"
            className="min-h-[360px] rounded-[var(--aq-radius-hero)] shadow-[var(--aq-shadow-floating)] md:min-h-[390px]"
            imageClassName="opacity-92 md:object-right contrast-[1.04] saturate-[0.9]"
          >
            <div className="flex min-h-[360px] items-center px-6 py-10 sm:px-10 md:min-h-[390px] md:px-14 lg:px-16">
              <div className="max-w-2xl">
                <AqBadge tone="dark">
                  <Sparkles className="size-3.5 text-[var(--aq-champagne)]" />
                  {t('finalCtaEyebrow')}
                </AqBadge>

                <h2 className="aq-heading mt-6 max-w-[15ch]">
                  {t('finalCtaTitle')}
                </h2>

                <p className="aq-body mt-5 max-w-xl text-base text-[var(--aq-deep-teal)]/80 md:text-lg">
                  {t('finalCtaSubtitle')}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <AqButton
                    onClick={onEnterApp}
                    tone="lagoon"
                    aqSize="lg"
                    className="group sm:w-auto"
                  >
                    {hasProfile ? t('finalCtaMySpace') : t('finalCtaStart')}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </AqButton>
                  <AqButton
                    onClick={() => scrollToId('tarifs')}
                    tone="outline"
                    aqSize="lg"
                    className="sm:w-auto"
                  >
                    {t('finalCtaSeePricing')}
                  </AqButton>
                </div>

                <p className="mt-6 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--aq-text-muted)]">
                  {t('finalCtaDisclaimer')}
                </p>
              </div>
            </div>
          </AqMediaFrame>
        </motion.div>
      </div>
    </section>
  )
}
