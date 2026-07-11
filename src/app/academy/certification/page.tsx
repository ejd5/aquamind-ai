/**
 * AQWELIA Academy — Certification page (P8-INFRA, Phase 12)
 *
 * Public page explaining the AQWELIA certification process:
 *   1. Enroll (free for AQWELIA users — sign in)
 *   2. Complete courses (track progress)
 *   3. Pass the assessment (≥ 70% to certify)
 *   4. Get certified (1-year valid badge, verifiable URL)
 *
 * Includes:
 *   - A 4-step timeline
 *   - A "what's in the assessment" section
 *   - The benefits of being AQWELIA-certified (consumer trust, pro directory
 *     listing, exclusive resources)
 *   - Final CTA linking to /academy (browse courses) and /auth/signin
 *
 * Server component — all text via the `academy` i18n namespace.
 */
import Link from 'next/link'
import { Award, BookOpen, CheckCircle2, BadgeCheck, ArrowRight, Clock, Shield } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import {
  Breadcrumbs,
  BreadcrumbListSchema,
  CourseSchema,
} from '@/components/seo/structured-data'
import { buildMetadata } from '@/lib/seo'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('academy')
  return buildMetadata({
    title: t('certMetaTitle'),
    description: t('certMetaDescription'),
    path: '/academy/certification',
  })
}

export default async function CertificationPage() {
  const t = await getTranslations('academy')

  const STEPS = [
    { icon: BookOpen, title: t('certStep1Title'), desc: t('certStep1Desc') },
    { icon: Clock, title: t('certStep2Title'), desc: t('certStep2Desc') },
    { icon: CheckCircle2, title: t('certStep3Title'), desc: t('certStep3Desc') },
    { icon: Award, title: t('certStep4Title'), desc: t('certStep4Desc') },
  ]

  const BENEFITS = [
    t('certBenefit1'),
    t('certBenefit2'),
    t('certBenefit3'),
    t('certBenefit4'),
  ]

  return (
    <article>
      <CourseSchema
        name={t('certMetaTitle')}
        description={t('certMetaDescription')}
        path="/academy/certification"
      />
      <BreadcrumbListSchema
        items={[
          { name: t('breadcrumbHome'), path: '/' },
          { name: t('breadcrumbAcademy'), path: '/academy' },
          { name: t('breadcrumbCertification'), path: '/academy/certification' },
        ]}
      />
      <Breadcrumbs
        items={[
          { name: t('breadcrumbHome'), path: '/' },
          { name: t('breadcrumbAcademy'), path: '/academy' },
          { name: t('breadcrumbCertification'), path: '/academy/certification' },
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
            <BadgeCheck className="h-3.5 w-3.5" />
            {t('certBadge')}
          </div>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {t('certHeroTitle')}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('certHeroSubtitle')}
          </p>
        </div>
      </section>

      {/* 4-step timeline */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {t('certStepsHeading')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('certStepsSubheading')}</p>

        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="glass-card relative rounded-2xl border border-gold/20 bg-background/60 p-6 backdrop-blur-xl"
            >
              <div className="absolute -top-3 left-6 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-gold to-[oklch(0.55_0.10_195)] text-xs font-bold text-[oklch(0.99_0.01_195)] shadow">
                {index + 1}
              </div>
              <step.icon className="mt-2 h-6 w-6 text-gold" />
              <h3 className="mt-3 font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Assessment details */}
      <section className="relative overflow-hidden border-y border-gold/10 bg-gradient-to-b from-transparent via-gold/[0.03] to-transparent">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {t('certAssessmentHeading')}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t('certAssessmentDesc')}
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                {BENEFITS.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Shield className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-card rounded-2xl border border-gold/30 bg-background/70 p-6 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-[oklch(0.55_0.10_195)] text-[oklch(0.99_0.01_195)] shadow-lg">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold">{t('certCardTitle')}</p>
                  <p className="text-xs text-muted-foreground">{t('certCardSubtitle')}</p>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-4 text-center">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t('certCardPassingScore')}
                  </dt>
                  <dd className="mt-1 font-display text-xl font-bold text-gold">70%</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t('certCardDuration')}
                  </dt>
                  <dd className="mt-1 font-display text-xl font-bold text-gold">45min</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t('certCardValidity')}
                  </dt>
                  <dd className="mt-1 font-display text-xl font-bold text-gold">12mo</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {t('certCtaHeading')}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {t('certCtaSubheading')}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/academy"
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-background/80 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-gold hover:text-gold"
          >
            <BookOpen className="h-4 w-4" />
            {t('certCtaBrowse')}
          </Link>
          <Link
            href="/auth/signin"
            className="glow-gold inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-6 py-3 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-lg shadow-primary/20 transition-all hover:scale-[1.03]"
          >
            {t('certCtaStart')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </article>
  )
}
