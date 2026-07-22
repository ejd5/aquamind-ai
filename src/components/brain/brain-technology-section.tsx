'use client'

import Link from 'next/link'
import {
  BrainCircuit,
  Database,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

type BrainTechnologyVariant = 'home' | 'pro' | 'growth' | 'diagnostic'
type BrainTechnologyHeading = 'h1' | 'h2'

interface BrainTechnologySectionProps {
  variant?: BrainTechnologyVariant
  headingLevel?: BrainTechnologyHeading
}

export function BrainTechnologySection({
  variant = 'home',
  headingLevel = 'h2',
}: BrainTechnologySectionProps) {
  const t = useTranslations('aqweliaBrain.marketing')
  const Heading = headingLevel
  const items = [
    { icon: Database, title: t('memoryTitle'), text: t('memoryText') },
    { icon: TrendingUp, title: t('outcomesTitle'), text: t('outcomesText') },
    { icon: ShieldCheck, title: t('knowledgeTitle'), text: t('knowledgeText') },
    {
      icon: Sparkles,
      title: t('personalizationTitle'),
      text: t('personalizationText'),
    },
  ]

  return (
    <section id="aqwelia-brain" className="relative overflow-hidden py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <span className="section-label inline-flex items-center gap-2">
            <BrainCircuit className="h-4 w-4" aria-hidden="true" />
            {t('eyebrow')}
          </span>
          <Heading className="mt-4 font-display text-3xl font-bold sm:text-5xl">
            {t('title')}
          </Heading>
          <p className="mt-5 text-muted-foreground sm:text-lg">{t('subtitle')}</p>
          <p className="mt-3 text-sm font-semibold text-primary">
            {t(`variant.${variant}`)}
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, text }) => (
            <article key={title} className="glass-card rounded-2xl p-6">
              <Icon className="text-gold" aria-hidden="true" />
              <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border bg-background/70 p-5 sm:flex-row">
          <p className="text-xs text-muted-foreground">{t('trust')}</p>
          <Link
            href="/technologie"
            className="shrink-0 rounded-full border border-gold/40 px-5 py-2.5 text-sm font-semibold text-gold"
          >
            {t('discover')}
          </Link>
        </div>
      </div>
    </section>
  )
}
