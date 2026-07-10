/**
 * AQWELIA — Page /tarifs (standalone pricing page)
 *
 * Server component. Renders:
 *  - hero + duration selector + 3 plans (interactive, in PricingExplorer)
 *  - pass urgence card (in PricingExplorer)
 *  - comparison table (15+ functions × 3 plans)
 *  - FAQ tarifaire
 *  - moyens de paiement
 *  - conditions de résiliation
 *  - CTA final
 *
 * Same DA as the landing page (glassmorphism, gold accents, font-display).
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { Check, X, ArrowRight, CreditCard, RotateCcw, ShieldCheck } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { getTranslations } from 'next-intl/server'
import { PricingExplorer } from './pricing-explorer'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('tarifs')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/tarifs' },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
    },
  }
}

export default async function TarifsPage() {
  const t = await getTranslations('tarifs')

  // Comparison table rows: feature label + per-plan availability (D / O / W)
  // 'yes' | 'no' | 'partial'
  type RowKind = 'yes' | 'no' | 'partial'
  const ROWS: { label: string; d: RowKind; o: RowKind; w: RowKind }[] = [
    { label: t('cmpRow1'), d: 'yes', o: 'yes', w: 'yes' },
    { label: t('cmpRow2'), d: 'partial', o: 'yes', w: 'yes' },
    { label: t('cmpRow3'), d: 'partial', o: 'yes', w: 'yes' },
    { label: t('cmpRow4'), d: 'no', o: 'yes', w: 'yes' },
    { label: t('cmpRow5'), d: 'no', o: 'yes', w: 'yes' },
    { label: t('cmpRow6'), d: 'partial', o: 'yes', w: 'yes' },
    { label: t('cmpRow7'), d: 'no', o: 'yes', w: 'yes' },
    { label: t('cmpRow8'), d: 'no', o: 'yes', w: 'yes' },
    { label: t('cmpRow9'), d: 'no', o: 'yes', w: 'yes' },
    { label: t('cmpRow10'), d: 'no', o: 'yes', w: 'yes' },
    { label: t('cmpRow11'), d: 'partial', o: 'yes', w: 'yes' },
    { label: t('cmpRow12'), d: 'no', o: 'yes', w: 'yes' },
    { label: t('cmpRow13'), d: 'no', o: 'yes', w: 'yes' },
    { label: t('cmpRow14'), d: 'no', o: 'yes', w: 'yes' },
    { label: t('cmpRow15'), d: 'no', o: 'no', w: 'yes' },
    { label: t('cmpRow16'), d: 'no', o: 'no', w: 'yes' },
    { label: t('cmpRow17'), d: 'no', o: 'no', w: 'yes' },
  ]

  const FAQ = [
    { q: t('faq1Q'), a: t('faq1A') },
    { q: t('faq2Q'), a: t('faq2A') },
    { q: t('faq3Q'), a: t('faq3A') },
    { q: t('faq4Q'), a: t('faq4A') },
    { q: t('faq5Q'), a: t('faq5A') },
    { q: t('faq6Q'), a: t('faq6A') },
    { q: t('faq7Q'), a: t('faq7A') },
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
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" /> {t('heroBullet1')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-gold" /> {t('heroBullet2')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5 text-gold" /> {t('heroBullet3')}
            </span>
          </div>
          <div className="gold-divider mt-12" />
        </div>
      </section>

      {/* Interactive pricing explorer (client island) */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <PricingExplorer />
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="mb-8 text-center">
          <p className="section-label">{t('cmpEyebrow')}</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('cmpTitle')}
          </h2>
        </div>

        <div className="glass-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto custom-scroll">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="p-4 text-left font-display font-bold text-foreground">
                    {t('cmpColFeature')}
                  </th>
                  <th className="p-4 text-center font-display font-bold text-foreground">
                    {t('cmpColD')}
                  </th>
                  <th className="bg-gold/5 p-4 text-center font-display font-bold text-gold">
                    {t('cmpColO')}
                  </th>
                  <th className="p-4 text-center font-display font-bold text-foreground">
                    {t('cmpColW')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, idx) => (
                  <tr
                    key={row.label}
                    className={`border-b border-border/30 last:border-0 ${idx % 2 === 1 ? 'bg-background/30' : ''}`}
                  >
                    <td className="p-4 text-left text-muted-foreground">{row.label}</td>
                    <td className="p-4 text-center"><CellIcon kind={row.d} /></td>
                    <td className="bg-gold/5 p-4 text-center"><CellIcon kind={row.o} /></td>
                    <td className="p-4 text-center"><CellIcon kind={row.w} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">{t('cmpLegend')}</p>
      </section>

      {/* Payment methods + cancellation */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Payment methods */}
          <div className="glass-card rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold">
                <CreditCard className="h-4 w-4" />
              </div>
              <h3 className="font-display text-xl font-bold tracking-tight text-foreground">
                {t('payTitle')}
              </h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{t('payDesc')}</p>
            <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
              {[t('payB1'), t('payB2'), t('payB3'), t('payB4'), t('payB5')].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cancellation */}
          <div className="glass-card rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold">
                <RotateCcw className="h-4 w-4" />
              </div>
              <h3 className="font-display text-xl font-bold tracking-tight text-foreground">
                {t('cancelTitle')}
              </h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{t('cancelDesc')}</p>
            <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
              {[t('cancelB1'), t('cancelB2'), t('cancelB3'), t('cancelB4')].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <div className="mb-8 text-center">
          <p className="section-label">{t('faqEyebrow')}</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('faqTitle')}
          </h2>
        </div>
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, idx) => (
              <AccordionItem
                key={item.q}
                value={`item-${idx}`}
                className="border-b border-border/40 last:border-0"
              >
                <AccordionTrigger className="py-4 text-left font-display text-base font-semibold text-foreground hover:text-gold hover:no-underline">
                  {item.q}
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
              href="/contact"
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

function CellIcon({ kind }: { kind: 'yes' | 'no' | 'partial' }) {
  if (kind === 'yes') {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gold/15 text-gold">
        <Check className="h-3.5 w-3.5" />
      </span>
    )
  }
  if (kind === 'partial') {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gold/10 text-xs font-bold text-gold">
        ~
      </span>
    )
  }
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
      <X className="h-3.5 w-3.5" />
    </span>
  )
}
