'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useTranslations } from 'next-intl'
import { Reveal, SectionHeading, staggerContainer, fadeUpVariants } from '../landing-utils'

export function Faq() {
  const t = useTranslations('landing')

  const FAQ = [
    { q: t('faqQ1'), a: t('faqA1') },
    { q: t('faqQ2'), a: t('faqA2') },
    { q: t('faqQ3'), a: t('faqA3') },
    { q: t('faqQ4'), a: t('faqA4') },
    { q: t('faqQ5'), a: t('faqA5') },
    { q: t('faqQ6'), a: t('faqA6') },
    { q: t('faqQ7'), a: t('faqA7') },
    { q: t('faqQ8'), a: t('faqA8') },
  ]

  return (
    <section id="faq" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading eyebrow={t('faqEyebrow')} title={<>{t('faqTitle')}</>} />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-10"
        >
          <motion.div variants={fadeUpVariants}>
            <Accordion type="single" collapsible className="w-full">
              {FAQ.map((item, idx) => (
                <AccordionItem
                  key={idx}
                  value={`item-${idx}`}
                  className="rounded-xl border border-white/40 bg-white/50 px-4 backdrop-blur-xl transition-colors hover:bg-white/70 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] data-[state=open]:border-gold/40 data-[state=open]:bg-white/70 mb-2.5"
                >
                  <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline sm:text-base">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </motion.div>

        <Reveal delay={0.1} className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t('faqContact')}{' '}
            <a
              href="mailto:contact@aqwelia.app"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              contact@aqwelia.app
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  )
}
