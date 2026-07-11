/**
 * AQWELIA — Data management (RGPD/GDPR) page.
 *
 * URL: /gestion-donnees
 * Server component (SEO-friendly). Standalone page (no shared layout —
 * includes its own minimal brand header + Footer).
 *
 * Renders:
 *  - Brand header (back-home + AQWELIA logo + link to /legal/privacy)
 *  - Hero: title + subtitle + intro paragraph
 *  - 5 sections: data collected, processing purpose, retention, rights, consent
 *  - Contact section (DPO email + DPA complaint)
 *  - Final CTA → /legal/privacy
 *
 * Complementary to /legal/privacy (which is the long-form policy). This page
 * is the user-facing summary with actionable sections.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Database,
  Target,
  Clock,
  Scale,
  ToggleLeft,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { Footer } from '@/components/aquamind/footer'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('redirectPages')
  return {
    title: t('dataTitle'),
    description: t('dataSubtitle'),
  }
}

export default async function GestionDonneesPage() {
  const t = await getTranslations('redirectPages')

  const SECTIONS = [
    {
      icon: Database,
      title: t('dataCollectTitle'),
      text: t('dataCollectText'),
    },
    {
      icon: Target,
      title: t('dataPurposeTitle'),
      text: t('dataPurposeText'),
    },
    {
      icon: Clock,
      title: t('dataRetentionTitle'),
      text: t('dataRetentionText'),
    },
    {
      icon: Scale,
      title: t('dataRightsTitle'),
      text: t('dataRightsText'),
    },
    {
      icon: ToggleLeft,
      title: t('dataConsentTitle'),
      text: t('dataConsentText'),
    },
  ]

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Brand header */}
      <header className="safe-area-top sticky top-0 z-40 border-b border-gold/20 bg-background/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">AQWELIA</span>
          </Link>
          <Link
            href="/legal/privacy"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-gold"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('dataCta')}</span>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* ===== Hero ===== */}
        <section className="relative overflow-hidden py-16 sm:py-20">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="text-center">
              <span className="section-label inline-block">RGPD</span>
              <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
                {t('dataTitle')}
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t('dataSubtitle')}
              </p>
            </div>
            <div className="mt-8 rounded-2xl border border-gold/20 bg-white/40 p-6 backdrop-blur-xl dark:bg-white/[0.04]">
              <p className="text-sm leading-relaxed text-foreground/90">{t('dataIntro')}</p>
            </div>
          </div>
        </section>

        {/* ===== 5 sections ===== */}
        <section className="relative py-12 sm:py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="space-y-4">
              {SECTIONS.map((section, idx) => {
                const Icon = section.icon
                return (
                  <div
                    key={idx}
                    className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/50 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/20">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h2 className="font-display text-lg font-bold text-foreground">
                          {section.title}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {section.text}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ===== Contact ===== */}
        <section className="relative py-12 sm:py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl border border-gold/30 bg-white/40 p-6 backdrop-blur-xl dark:bg-white/[0.04] sm:p-8">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">
                    {t('dataContactTitle')}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t('dataContactText')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Final CTA ===== */}
        <section className="relative py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-white/40 p-8 backdrop-blur-xl dark:bg-white/[0.04] sm:p-12">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
              <ShieldCheck className="mx-auto h-6 w-6 text-gold" />
              <h2 className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                {t('dataCta')}
              </h2>
              <Link
                href="/legal/privacy"
                className="glow-gold mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl"
              >
                {t('dataCta')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
