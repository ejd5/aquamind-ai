'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Reveal, SectionHeading } from '../landing-utils'

export function Story() {
  const t = useTranslations('landing')

  return (
    <section id="histoire" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t('storyEyebrow')}
          title={<>{t('storyTitle')}</>}
        />

        <Reveal delay={0.1} className="mt-12">
          <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-white/70 via-white/50 to-white/30 p-8 backdrop-blur-xl dark:border-white/10 dark:from-white/[0.05] dark:via-white/[0.03] dark:to-white/[0.02] sm:p-10">
            <span className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
            <span className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

            {/* Etymology signature — AQWELIA = Aqua + Well + IA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative mb-8 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-gold/30 bg-gold/5 px-6 py-4 text-center"
            >
              <span className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                AQWELIA
              </span>
              <span className="text-gold">=</span>
              <span className="text-sm font-semibold text-foreground/80 sm:text-base">
                <span className="text-primary">AQ</span>
                <span className="text-muted-foreground"> {t('storyAquaWord')}</span>
                <span className="mx-1 text-gold">·</span>
                <span className="text-ocean-light">WEL</span>
                <span className="text-muted-foreground"> {t('storyWellWord')}</span>
                <span className="mx-1 text-gold">·</span>
                <span className="text-gold">IA</span>
                <span className="text-muted-foreground"> {t('storyIAWord')}</span>
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative space-y-5 font-display text-lg leading-relaxed text-foreground/90 sm:text-xl"
            >
              <p>
                {t('storyQuote1')}
              </p>
              <p>
                {t('storyQuote2')}
              </p>
              <p>
                {t('storyQuote3')}
              </p>
              <p>
                {t('storyQuote4a')}{' '}
                <span className="gradient-text-premium font-bold">
                  {t('storyQuote4b')}
                </span>
              </p>
              <p>
                {t('storyQuote5')}
              </p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="relative mt-6 text-right text-sm uppercase tracking-widest text-gold"
            >
              {t('storyTeam')}
            </motion.p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
