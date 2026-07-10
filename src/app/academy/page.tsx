/**
 * AQWELIA Academy — Home page (P8-INFRA, Phase 12)
 *
 * Public landing for /academy. Showcases the 6 pillars of the Academy:
 *   1. Formations (video courses)
 *   2. Guides professionnels (in-depth articles)
 *   3. Procédures (step-by-step playbooks)
 *   4. Sécurité (chemical safety + drowning prevention)
 *   5. Bonnes pratiques (industry best practices)
 *   6. Certification AQWELIA (verified badge)
 *
 * Each pillar is a card with an icon + title + description + "Browse" link.
 * Below the cards: a "How it works" 3-step section (Learn → Practice → Get
 * certified) + a final CTA pointing to /academy/certification.
 *
 * Server component — no client hooks. All text is localised via the
 * `academy` i18n namespace.
 *
 * SEO: includes a SoftwareApplication + Course structured-data block so
 * Google can show rich results for "AQWELIA Academy" queries.
 */
import Link from 'next/link'
import {
  GraduationCap,
  BookOpen,
  ListChecks,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowRight,
  Clock,
  BarChart3,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Breadcrumbs, BreadcrumbListSchema, CourseSchema, OrganizationSchema } from '@/components/seo/structured-data'
import { buildMetadata } from '@/lib/seo'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('academy')
  return buildMetadata({
    title: t('homeMetaTitle'),
    description: t('homeMetaDescription'),
    path: '/academy',
  })
}

export default async function AcademyHomePage() {
  const t = await getTranslations('academy')

  const PILLARS = [
    {
      icon: GraduationCap,
      title: t('pillarFormationsTitle'),
      description: t('pillarFormationsDesc'),
      cta: t('pillarFormationsCta'),
      href: '/academy/guides',
    },
    {
      icon: BookOpen,
      title: t('pillarGuidesTitle'),
      description: t('pillarGuidesDesc'),
      cta: t('pillarGuidesCta'),
      href: '/academy/guides',
    },
    {
      icon: ListChecks,
      title: t('pillarProceduresTitle'),
      description: t('pillarProceduresDesc'),
      cta: t('pillarProceduresCta'),
      href: '/academy/guides',
    },
    {
      icon: ShieldCheck,
      title: t('pillarSecurityTitle'),
      description: t('pillarSecurityDesc'),
      cta: t('pillarSecurityCta'),
      href: '/academy/guides',
    },
    {
      icon: Sparkles,
      title: t('pillarBestPracticesTitle'),
      description: t('pillarBestPracticesDesc'),
      cta: t('pillarBestPracticesCta'),
      href: '/academy/guides',
    },
    {
      icon: Award,
      title: t('pillarCertificationTitle'),
      description: t('pillarCertificationDesc'),
      cta: t('pillarCertificationCta'),
      href: '/academy/certification',
    },
  ]

  const STEPS = [
    {
      icon: BookOpen,
      title: t('step1Title'),
      description: t('step1Desc'),
    },
    {
      icon: BarChart3,
      title: t('step2Title'),
      description: t('step2Desc'),
    },
    {
      icon: Award,
      title: t('step3Title'),
      description: t('step3Desc'),
    },
  ]

  return (
    <article>
      <OrganizationSchema />
      <CourseSchema
        name={t('homeMetaTitle')}
        description={t('homeMetaDescription')}
        path="/academy"
      />
      <BreadcrumbListSchema
        items={[
          { name: t('breadcrumbHome'), path: '/' },
          { name: t('breadcrumbAcademy'), path: '/academy' },
        ]}
      />
      <Breadcrumbs
        items={[
          { name: t('breadcrumbHome'), path: '/' },
          { name: t('breadcrumbAcademy'), path: '/academy' },
        ]}
      />

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
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/academy/guides"
              className="glow-gold inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-6 py-3 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-lg shadow-primary/20 transition-all hover:scale-[1.03]"
            >
              {t('heroCtaBrowse')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/academy/certification"
              className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-background/80 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-gold hover:text-gold"
            >
              <Award className="h-4 w-4 text-gold" />
              {t('heroCtaCert')}
            </Link>
          </div>
        </div>
      </section>

      {/* Pillars grid */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {t('pillarsHeading')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('pillarsSubheading')}</p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((pillar) => (
            <Link
              key={pillar.title}
              href={pillar.href}
              className="glass-card group flex flex-col gap-3 rounded-2xl border border-gold/20 bg-background/60 p-5 backdrop-blur-xl transition-all hover:border-gold/40 hover:bg-background/80"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold">
                  <pillar.icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-gold" />
              </div>
              <h3 className="font-display text-lg font-semibold leading-tight">{pillar.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{pillar.description}</p>
              <span className="mt-auto text-xs font-semibold uppercase tracking-wider text-gold">
                {pillar.cta}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative overflow-hidden border-y border-gold/10 bg-gradient-to-b from-transparent via-gold/[0.03] to-transparent">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t('howHeading')}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
            {t('howSubheading')}
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div
                key={step.title}
                className="glass-card relative rounded-2xl border border-gold/20 bg-background/60 p-6 backdrop-blur-xl"
              >
                <div className="absolute -top-3 left-6 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-gold to-[oklch(0.55_0.10_195)] text-xs font-bold text-[oklch(0.99_0.01_195)] shadow">
                  {index + 1}
                </div>
                <step.icon className="mt-2 h-6 w-6 text-gold" />
                <h3 className="mt-3 font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 rounded-2xl border border-gold/20 bg-background/60 p-6 backdrop-blur-xl sm:grid-cols-3">
          <div className="flex flex-col items-center gap-1 text-center">
            <Clock className="h-5 w-5 text-gold" />
            <span className="font-display text-2xl font-bold">{t('statHoursValue')}</span>
            <span className="text-xs text-muted-foreground">{t('statHoursLabel')}</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-center sm:border-x sm:border-gold/20">
            <BookOpen className="h-5 w-5 text-gold" />
            <span className="font-display text-2xl font-bold">{t('statCoursesValue')}</span>
            <span className="text-xs text-muted-foreground">{t('statCoursesLabel')}</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <Award className="h-5 w-5 text-gold" />
            <span className="font-display text-2xl font-bold">{t('statCertValue')}</span>
            <span className="text-xs text-muted-foreground">{t('statCertLabel')}</span>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {t('ctaHeading')}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {t('ctaSubheading')}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/academy/certification"
            className="glow-gold inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-6 py-3 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-lg shadow-primary/20 transition-all hover:scale-[1.03]"
          >
            <Award className="h-4 w-4" />
            {t('ctaCertButton')}
          </Link>
        </div>
      </section>
    </article>
  )
}
