'use client'

import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Reveal, SectionHeading, staggerContainer, fadeUpVariants } from '../landing-utils'

export function RealCosts() {
  const t = useTranslations('landing')

  const ROWS = [
    { poste: t('costsRow1'), low: '500€', high: '1 200€', note: t('costsRow1Note') },
    { poste: t('costsRow2'), low: '300€', high: '600€', note: t('costsRow2Note') },
    { poste: t('costsRow3'), low: '200€', high: '500€', note: t('costsRow3Note') },
    { poste: t('costsRow4'), low: '100€', high: '300€', note: t('costsRow4Note') },
    { poste: t('costsRow5'), low: '300€', high: '800€', note: t('costsRow5Note') },
    { poste: t('costsRow6'), low: '100€', high: '400€', note: t('costsRow6Note') },
  ]

  return (
    <section id="couts" className="relative py-20 sm:py-28">
      {/* BLOC02 background image — complete, no filter, no opacity */}
      <div
        className="pointer-events-none absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: 'url(/bloc02-bg.png)',
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

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t('costsEyebrow')}
          title={<>{t('costsTitle')}</>}
          subtitle={t('costsSubtitle')}
        />

        <Reveal delay={0.1} className="mt-12">
          <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-gradient-to-r from-primary/5 to-gold/5">
                    <th className="px-4 py-3.5 font-semibold text-foreground sm:px-6">{t('costsPoste')}</th>
                    <th className="px-4 py-3.5 font-semibold text-muted-foreground sm:px-6">{t('costsLow')}</th>
                    <th className="px-4 py-3.5 font-semibold text-muted-foreground sm:px-6">{t('costsHigh')}</th>
                    <th className="hidden px-4 py-3.5 font-semibold text-muted-foreground sm:table-cell sm:px-6">{t('costsComment')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r, i) => (
                    <motion.tr
                      key={r.poste}
                      initial={{ opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: i * 0.06 }}
                      className="border-b border-border/40 transition-colors hover:bg-gold/5"
                    >
                      <td className="px-4 py-3.5 font-medium sm:px-6">{r.poste}</td>
                      <td className="px-4 py-3.5 text-muted-foreground sm:px-6">{r.low}</td>
                      <td className="px-4 py-3.5 text-muted-foreground sm:px-6">{r.high}</td>
                      <td className="hidden px-4 py-3.5 text-xs text-muted-foreground sm:table-cell sm:px-6">{r.note}</td>
                    </motion.tr>
                  ))}
                  <motion.tr
                    initial={{ opacity: 0, scale: 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="bg-gradient-to-r from-primary/10 via-gold/10 to-primary/10 font-bold"
                  >
                    <td className="px-4 py-4 text-foreground sm:px-6">{t('costsTotal')}</td>
                    <td className="px-4 py-4 text-foreground sm:px-6">1 500€</td>
                    <td className="px-4 py-4 text-foreground sm:px-6">3 800€</td>
                    <td className="hidden px-4 py-4 text-xs font-semibold text-foreground sm:table-cell sm:px-6">
                      {t('costsAvgNote')}
                    </td>
                  </motion.tr>
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        {/* Callout */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-6"
        >
          <motion.div
            variants={fadeUpVariants}
            className="rounded-2xl border-2 border-gold/50 bg-gradient-to-br from-gold/10 to-transparent p-5"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
              <p className="text-sm leading-relaxed text-foreground/90">
                <strong>{t('costsCalloutTitle')}</strong> {t('costsCalloutText')}
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
