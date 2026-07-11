/**
 * AQWELIA Academy — Shared layout (P8-INFRA, Phase 12)
 *
 * Server component. Renders:
 *  - a sticky brand header with logo + Academy nav (Home / Guides /
 *    Certification) + a primary CTA back to the app.
 *  - the page content.
 *  - the shared AQWELIA footer.
 *
 * Same design system as /pro and /(public): glassmorphism, gold accents,
 * font-display, backdrop-blur. Respects the iOS safe-area-top inset.
 *
 * The route `/academy/*` is public (no auth wall) so prospects and Google
 * can crawl the courses for SEO. Individual course completion + certification
 * requires login (handled client-side via the academy API routes).
 */
import Link from 'next/link'
import { Sparkles, ArrowLeft, GraduationCap } from 'lucide-react'
import { Footer } from '@/components/aquamind/footer'
import { getTranslations } from 'next-intl/server'
import { BreadcrumbListSchema } from '@/components/seo/structured-data'
import { buildMetadata } from '@/lib/seo'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('academy')
  return buildMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/academy',
  })
}

export default async function AcademyLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('academy')

  const NAV_LINKS = [
    { href: '/academy', label: t('navHome') },
    { href: '/academy/guides', label: t('navGuides') },
    { href: '/academy/certification', label: t('navCertification') },
  ]

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <BreadcrumbListSchema
        items={[
          { name: t('breadcrumbHome'), path: '/' },
          { name: t('breadcrumbAcademy'), path: '/academy' },
        ]}
      />
      {/* Top brand bar */}
      <header className="safe-area-top sticky top-0 z-40 border-b border-gold/20 bg-background/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('ctaBackHome')}</span>
          </Link>

          {/* Brand */}
          <Link href="/academy" className="flex items-center gap-2" aria-label="AQWELIA Academy">
            <img src="/logo-aqwelia-web.png" alt="AQWELIA" className="h-10 w-auto object-contain" />
            <div className="leading-tight">
              <div className="font-display text-base font-bold tracking-tight">
                <span className="aqua-text-gradient">AQWELIA</span>{' '}
                <span className="text-gold">Academy</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {t('badgeAcademy')}
              </div>
            </div>
            <GraduationCap className="h-3.5 w-3.5 text-gold" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA — back to app */}
          <Link
            href="/#tarifs"
            className="glow-gold group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-4 py-2 text-xs font-bold text-[oklch(0.99_0.01_195)] shadow-md transition-all hover:scale-[1.03]"
          >
            <Sparkles className="h-3 w-3" />
            {t('ctaStart')}
          </Link>
        </div>

        {/* Mobile nav row */}
        <div className="border-t border-border/40 bg-background/60 backdrop-blur md:hidden">
          <nav className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      <Footer />
    </div>
  )
}
