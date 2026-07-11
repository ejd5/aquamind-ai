/**
 * AQWELIA — Page /contact
 *
 * Formulaire de contact public (nom, email, sujet, message) + liens réseaux
 * sociaux (placeholder). Server component; the form itself is a client island
 * (`ContactForm`).
 *
 * Same DA as the landing page (glassmorphism, gold accents, font-display).
 */
import type { Metadata } from 'next'
import { Mail, MapPin, Clock, Twitter, Linkedin, Instagram, Youtube, MessageCircle } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { ContactForm } from './contact-form'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('contact')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/contact' },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
    },
  }
}

export default async function ContactPage() {
  const t = await getTranslations('contact')

  const SOCIALS = [
    { icon: Twitter, label: 'X / Twitter', handle: '@aqwelia' },
    { icon: Linkedin, label: 'LinkedIn', handle: 'AQWELIA' },
    { icon: Instagram, label: 'Instagram', handle: '@aqwelia.app' },
    { icon: Youtube, label: 'YouTube', handle: 'AQWELIA' },
    { icon: MessageCircle, label: 'Discord', handle: 'AQWELIA' },
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

      {/* Form + info */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          {/* Info column */}
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold">
                  <Mail className="h-4 w-4" />
                </div>
                <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
                  {t('infoEmailTitle')}
                </h2>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{t('infoEmailDesc')}</p>
              <div className="mt-4 space-y-2 text-sm">
                <a
                  href="mailto:support@aqwelia.app"
                  className="block rounded-lg bg-gold/10 px-3 py-2 font-semibold text-gold transition-colors hover:bg-gold/20"
                >
                  support@aqwelia.app
                </a>
                <a
                  href="mailto:legal@aqwelia.app"
                  className="block rounded-lg bg-muted/40 px-3 py-2 font-medium text-foreground transition-colors hover:bg-muted"
                >
                  legal@aqwelia.app
                </a>
                <a
                  href="mailto:press@aqwelia.app"
                  className="block rounded-lg bg-muted/40 px-3 py-2 font-medium text-foreground transition-colors hover:bg-muted"
                >
                  press@aqwelia.app
                </a>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold">
                  <Clock className="h-4 w-4" />
                </div>
                <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
                  {t('infoHoursTitle')}
                </h2>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{t('infoHoursDesc')}</p>
              <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                {[t('hours1'), t('hours2'), t('hours3')].map((h) => (
                  <li key={h} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-gold" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold">
                  <MapPin className="h-4 w-4" />
                </div>
                <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
                  {t('infoLocationTitle')}
                </h2>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {t('infoLocationDesc')}
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 sm:p-8">
              <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
                {t('infoSocialsTitle')}
              </h2>
              <p className="mt-2 text-xs text-muted-foreground">{t('infoSocialsDesc')}</p>
              <ul className="mt-4 space-y-2">
                {SOCIALS.map((s) => {
                  const Icon = s.icon
                  return (
                    <li key={s.label}>
                      <span
                        className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
                        aria-disabled
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 text-gold" />
                        <span className="font-semibold text-foreground">{s.label}</span>
                        <span className="ml-auto opacity-70">{s.handle}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-3 text-[10px] italic text-muted-foreground">{t('socialsSoon')}</p>
            </div>
          </div>

          {/* Form column */}
          <div>
            <ContactForm />
          </div>
        </div>
      </section>
    </article>
  )
}
