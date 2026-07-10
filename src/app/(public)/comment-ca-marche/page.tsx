/**
 * AQWELIA — Page /comment-ca-marche
 *
 * 5 étapes: Renseigner la piscine → Saisir/photographier → Diagnostic →
 * Plan d'action → Commander. FAQ courte. CTA "Commencer gratuitement".
 *
 * Server component — no client hooks. Same DA as the landing page
 * (glassmorphism, gold accents, font-display, transparent background).
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ClipboardList,
  Camera,
  Microscope,
  ListChecks,
  ShoppingBag,
  ArrowRight,
  HelpCircle,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('commentCaMarche')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/comment-ca-marche' },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
    },
  }
}

export default async function CommentCaMarchePage() {
  const t = await getTranslations('commentCaMarche')

  const STEPS = [
    {
      icon: ClipboardList,
      num: '01',
      title: t('step1Title'),
      desc: t('step1Desc'),
      bullets: [t('step1B1'), t('step1B2'), t('step1B3')],
    },
    {
      icon: Camera,
      num: '02',
      title: t('step2Title'),
      desc: t('step2Desc'),
      bullets: [t('step2B1'), t('step2B2'), t('step2B3')],
    },
    {
      icon: Microscope,
      num: '03',
      title: t('step3Title'),
      desc: t('step3Desc'),
      bullets: [t('step3B1'), t('step3B2'), t('step3B3')],
    },
    {
      icon: ListChecks,
      num: '04',
      title: t('step4Title'),
      desc: t('step4Desc'),
      bullets: [t('step4B1'), t('step4B2'), t('step4B3')],
    },
    {
      icon: ShoppingBag,
      num: '05',
      title: t('step5Title'),
      desc: t('step5Desc'),
      bullets: [t('step5B1'), t('step5B2'), t('step5B3')],
    },
  ]

  const FAQ = [
    { q: t('faq1Q'), a: t('faq1A') },
    { q: t('faq2Q'), a: t('faq2A') },
    { q: t('faq3Q'), a: t('faq3A') },
    { q: t('faq4Q'), a: t('faq4A') },
    { q: t('faq5Q'), a: t('faq5A') },
    { q: t('faq6Q'), a: t('faq6A') },
  ]

  return (
    <article>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="section-label">{t('heroEyebrow')}</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {t('heroTitle')}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('heroSubtitle')}
          </p>
          <div className="gold-divider mt-12" />
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="space-y-5">
          {STEPS.map((step) => {
            const Icon = step.icon
            return (
              <div
                key={step.num}
                className="glass-card group relative grid gap-5 rounded-2xl p-6 sm:p-8 md:grid-cols-[auto_1fr]"
              >
                <div className="flex items-center gap-4 md:flex-col md:items-start md:gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 text-gold">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="font-display text-2xl font-bold text-muted-foreground/30">
                    {step.num}
                  </span>
                </div>

                <div>
                  <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {step.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {step.desc}
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5">
                    {step.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-gold" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <div className="mb-8 text-center">
          <p className="section-label">{t('faqEyebrow')}</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('faqTitle')}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">{t('faqSubtitle')}</p>
        </div>

        <div className="glass-card rounded-2xl p-6 sm:p-8">
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, idx) => (
              <AccordionItem key={item.q} value={`item-${idx}`} className="border-b border-border/40 last:border-0">
                <AccordionTrigger className="py-4 text-left font-display text-base font-semibold text-foreground hover:text-gold hover:no-underline">
                  <span className="flex items-start gap-3">
                    <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    {item.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="glass-card rounded-3xl p-10 text-center sm:p-14">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('ctaTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            {t('ctaSubtitle')}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/signin"
              className="glow-gold inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-lg shadow-primary/20 transition-all hover:scale-[1.03]"
            >
              {t('ctaPrimary')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/fonctionnalites"
              className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-7 py-3.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
            >
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>
    </article>
  )
}
