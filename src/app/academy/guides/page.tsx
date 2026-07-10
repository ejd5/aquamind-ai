/**
 * AQWELIA Academy — Professional guides index (P8-INFRA, Phase 12)
 *
 * Public page listing all professional guides available in the Academy.
 * Fetches the catalogue from the DB (`AcademyCourse` model) and renders it
 * as a filterable grid grouped by level (beginner / intermediate / expert).
 *
 * Falls back to a curated static list (no DB) when the table is empty —
 * this keeps the page useful in dev/preview before content is seeded.
 *
 * Server component — all UI text via the `academy` i18n namespace. Course
 * titles/descriptions resolve through `titleKey` / `descriptionKey` (i18n
 * keys) so the catalogue is fully localised.
 */
import Link from 'next/link'
import { BookOpen, ArrowRight, Clock, BarChart3 } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
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
    title: t('guidesMetaTitle'),
    description: t('guidesMetaDescription'),
    path: '/academy/guides',
  })
}

/** Resolve a dotted i18n key against the messages object (server-side). */
function lookup(messages: Record<string, unknown>, key: string): string | null {
  const segments = key.split('.')
  let node: unknown = messages
  for (const seg of segments) {
    if (node && typeof node === 'object' && seg in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[seg]
    } else {
      return null
    }
  }
  return typeof node === 'string' ? node : null
}

/** Curated fallback catalogue (used when the DB is empty — dev/preview). */
const FALLBACK_COURSES = [
  { slug: 'water-basics', titleKey: 'academy.guide1Title', descriptionKey: 'academy.guide1Desc', level: 'beginner', duration: 25 },
  { slug: 'ph-chlorine-balance', titleKey: 'academy.guide2Title', descriptionKey: 'academy.guide2Desc', level: 'beginner', duration: 30 },
  { slug: 'filtration-optimization', titleKey: 'academy.guide3Title', descriptionKey: 'academy.guide3Desc', level: 'intermediate', duration: 45 },
  { slug: 'algae-prevention', titleKey: 'academy.guide4Title', descriptionKey: 'academy.guide4Desc', level: 'intermediate', duration: 40 },
  { slug: 'spa-water-care', titleKey: 'academy.guide5Title', descriptionKey: 'academy.guide5Desc', level: 'intermediate', duration: 35 },
  { slug: 'winterizing-pool', titleKey: 'academy.guide6Title', descriptionKey: 'academy.guide6Desc', level: 'expert', duration: 50 },
  { slug: 'salt-electrolysis-pro', titleKey: 'academy.guide7Title', descriptionKey: 'academy.guide7Desc', level: 'expert', duration: 55 },
  { slug: 'chemical-safety-pro', titleKey: 'academy.guide8Title', descriptionKey: 'academy.guide8Desc', level: 'beginner', duration: 20 },
] as const

interface GuideItem {
  slug: string
  title: string
  description: string
  level: 'beginner' | 'intermediate' | 'expert'
  duration: number
}

export default async function AcademyGuidesPage() {
  const t = await getTranslations('academy')
  // Load the full message bundle so we can resolve `titleKey` / `descriptionKey`.
  const messages = (await import('@/i18n/locales/fr.json')).default as Record<string, unknown>

  // Fetch the catalogue from the DB. Defensive: the AcademyCourse table may
  // be empty in dev/preview — we fall back to a curated static list.
  let dbCourses: Array<{
    slug: string
    titleKey: string
    descriptionKey: string | null
    title: string
    description: string | null
    level: string
    duration: number
  }> = []
  try {
    dbCourses = await db.academyCourse.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: {
        slug: true,
        titleKey: true,
        descriptionKey: true,
        title: true,
        description: true,
        level: true,
        duration: true,
      },
    })
  } catch {
    // Table not created yet (shouldn't happen post-db-push, but be safe).
    dbCourses = []
  }

  // Resolve i18n keys → localised title + description. Fall back to the
  // static `title` / `description` columns if the key is missing.
  const items: GuideItem[] = []

  if (dbCourses.length > 0) {
    for (const c of dbCourses) {
      items.push({
        slug: c.slug,
        title: lookup(messages, c.titleKey) ?? c.title,
        description: c.descriptionKey
          ? (lookup(messages, c.descriptionKey) ?? c.description ?? '')
          : (c.description ?? ''),
        level: (['beginner', 'intermediate', 'expert'].includes(c.level) ? c.level : 'beginner') as GuideItem['level'],
        duration: c.duration,
      })
    }
  } else {
    for (const c of FALLBACK_COURSES) {
      items.push({
        slug: c.slug,
        title: lookup(messages, c.titleKey) ?? c.slug,
        description: lookup(messages, c.descriptionKey) ?? '',
        level: c.level,
        duration: c.duration,
      })
    }
  }

  // Group by level for the section layout.
  const groups: Array<{ level: GuideItem['level']; items: GuideItem[] }> = [
    { level: 'beginner', items: items.filter((i) => i.level === 'beginner') },
    { level: 'intermediate', items: items.filter((i) => i.level === 'intermediate') },
    { level: 'expert', items: items.filter((i) => i.level === 'expert') },
  ]

  const LEVEL_LABELS: Record<GuideItem['level'], string> = {
    beginner: t('levelBeginner'),
    intermediate: t('levelIntermediate'),
    expert: t('levelExpert'),
  }

  return (
    <article>
      <CourseSchema
        name={t('guidesMetaTitle')}
        description={t('guidesMetaDescription')}
        path="/academy/guides"
      />
      <BreadcrumbListSchema
        items={[
          { name: t('breadcrumbHome'), path: '/' },
          { name: t('breadcrumbAcademy'), path: '/academy' },
          { name: t('breadcrumbGuides'), path: '/academy/guides' },
        ]}
      />
      <Breadcrumbs
        items={[
          { name: t('breadcrumbHome'), path: '/' },
          { name: t('breadcrumbAcademy'), path: '/academy' },
          { name: t('breadcrumbGuides'), path: '/academy/guides' },
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="section-label">{t('guidesEyebrow')}</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {t('guidesTitle')}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('guidesSubtitle')}
          </p>
        </div>
      </section>

      {/* Catalogue by level */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {groups.map((group) => (
          <section key={group.level} className="py-8">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-gold" />
              <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                {LEVEL_LABELS[group.level]}
              </h2>
              <span className="rounded-full border border-gold/30 bg-gold/5 px-2 py-0.5 text-xs font-semibold text-gold">
                {group.items.length}
              </span>
            </div>

            {group.items.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">{t('guidesEmpty')}</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/academy/guides/${item.slug}`}
                    className="glass-card group flex flex-col gap-3 rounded-2xl border border-gold/20 bg-background/60 p-5 backdrop-blur-xl transition-all hover:border-gold/40 hover:bg-background/80"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/10 text-gold">
                        <BookOpen className="h-4.5 w-4.5" />
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {item.duration}min
                      </span>
                    </div>
                    <h3 className="font-display text-base font-semibold leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                      {item.description}
                    </p>
                    <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gold">
                      {t('guideReadMore')}
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {t('guidesCtaHeading')}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {t('guidesCtaSubheading')}
        </p>
        <div className="mt-6">
          <Link
            href="/academy/certification"
            className="glow-gold inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-6 py-3 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-lg shadow-primary/20 transition-all hover:scale-[1.03]"
          >
            {t('guidesCtaButton')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </article>
  )
}
