/**
 * AQWELIA — Support page.
 * Server component — no client hooks.
 *
 * URL: /legal/support
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { Mail, Clock, HelpCircle, Bug, Lightbulb, BookOpen, MessageSquare, ChevronRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.support')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function SupportPage() {
  const t = await getTranslations('legal.support')

  const cards = [
    {
      icon: <HelpCircle className="h-5 w-5" />,
      title: t('cardFaqTitle'),
      description: t('cardFaqDesc'),
      link: '/#faq',
      linkLabel: t('cardFaqLink'),
      disabled: false,
    },
    {
      icon: <BookOpen className="h-5 w-5" />,
      title: t('cardKbTitle'),
      description: t('cardKbDesc'),
      link: '/#faq',
      linkLabel: t('cardKbLink'),
      disabled: true,
    },
    {
      icon: <Bug className="h-5 w-5" />,
      title: t('cardBugTitle'),
      description: t('cardBugDesc'),
      link: 'mailto:support@aqwelia.app?subject=Bug%20AQWELIA',
      linkLabel: t('cardBugLink'),
      disabled: false,
    },
    {
      icon: <Lightbulb className="h-5 w-5" />,
      title: t('cardFeatureTitle'),
      description: t('cardFeatureDesc'),
      link: `mailto:support@aqwelia.app?subject=${encodeURIComponent(t('cardFeatureSubject'))}`,
      linkLabel: t('cardFeatureLink'),
      disabled: false,
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: t('cardAssistantTitle'),
      description: t('cardAssistantDesc'),
      link: '/',
      linkLabel: t('cardAssistantLink'),
      disabled: false,
    },
    {
      icon: <Mail className="h-5 w-5" />,
      title: t('cardLegalTitle'),
      description: t('cardLegalDesc'),
      link: 'mailto:privacy@aqwelia.app',
      linkLabel: t('cardLegalLink'),
      disabled: false,
    },
  ]

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="section-label">{t('eyebrow')}</p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('subtitle')}
        </p>
        <div className="gold-divider" />
      </header>

      {/* Primary contact card */}
      <section className="glass-card rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                {t('emailTitle')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('emailDesc')}
              </p>
              <a
                href="mailto:support@aqwelia.app"
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
              >
                <Mail className="h-3.5 w-3.5" />
                support@aqwelia.app
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Response times */}
      <section className="glass-card rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold">
            <Clock className="h-4 w-4" />
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
            {t('responseTimeTitle')}
          </h2>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
            {t.rich('responseTimeFree', { bold: (chunks) => <strong className="text-foreground">{chunks}</strong> })}
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
            {t.rich('responseTimePremium', { bold: (chunks) => <strong className="text-foreground">{chunks}</strong> })}
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
            {t.rich('responseTimeExpert', { bold: (chunks) => <strong className="text-foreground">{chunks}</strong> })}
          </li>
        </ul>
      </section>

      {/* Quick links grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <SupportCard
            key={card.title}
            icon={card.icon}
            title={card.title}
            description={card.description}
            link={card.link}
            linkLabel={card.linkLabel}
            disabled={card.disabled}
          />
        ))}
      </section>

      {/* Bottom links */}
      <section className="glass-card rounded-2xl p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
          {t('resourcesTitle')}
        </h2>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href="/legal/cgu"
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 font-semibold text-gold transition-colors hover:bg-gold/20"
          >
            {t('resourcesCguLink')}
          </Link>
          <Link
            href="/legal/privacy"
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 font-semibold text-gold transition-colors hover:bg-gold/20"
          >
            {t('resourcesPrivacyLink')}
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-2 font-medium text-foreground transition-colors hover:bg-secondary"
          >
            {t('resourcesSettingsLink')}
          </Link>
        </div>
      </section>
    </article>
  )
}

interface SupportCardProps {
  icon: React.ReactNode
  title: string
  description: string
  link: string
  linkLabel: string
  disabled?: boolean
}

function SupportCard({ icon, title, description, link, linkLabel, disabled = false }: SupportCardProps) {
  const isExternal = link.startsWith('mailto:') || link.startsWith('http')
  const className = `mt-auto inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
    disabled
      ? 'cursor-not-allowed text-muted-foreground/60'
      : 'text-gold hover:text-gold/80'
  }`

  return (
    <div className="glass-card flex flex-col gap-3 rounded-2xl p-5 sm:p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold">
        {icon}
      </div>
      <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      {isExternal ? (
        <a
          href={disabled ? undefined : link}
          className={className}
          aria-disabled={disabled}
        >
          {linkLabel}
          {!disabled && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
        </a>
      ) : (
        <Link
          href={disabled ? '#' : link}
          className={className}
          aria-disabled={disabled}
          data-disabled={disabled || undefined}
        >
          {linkLabel}
          {!disabled && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
        </Link>
      )}
    </div>
  )
}
