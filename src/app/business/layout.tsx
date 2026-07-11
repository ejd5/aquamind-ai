/**
 * AQWELIA Business — Shared layout for /business/* marketing pages.
 *
 * Server component. Renders:
 *  - a sticky brand header with logo + Business nav (Solutions / Pricing / Demo / Quote)
 *  - the page content
 *  - the AQWELIA footer (shared with the rest of the marketing surface)
 *
 * Same design system as the landing page and Pro pages (glassmorphism,
 * gold accents, font-display, backdrop-blur). Respects the iOS safe-area-top
 * inset.
 */
import Link from 'next/link'
import { Sparkles, ArrowLeft } from 'lucide-react'
import { Footer } from '@/components/aquamind/footer'
import { getTranslations } from 'next-intl/server'

export default async function BusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getTranslations('business')

  const NAV_LINKS = [
    { href: '/business#solutions', label: t('navSolutions') },
    { href: '/business/hotels', label: t('navHotels') },
    { href: '/business/campings', label: t('navCampings') },
    { href: '/business/multisite', label: t('navMultisite') },
    { href: '/business/tarifs', label: t('navPricing') },
    { href: '/business/demo', label: t('navDemo') },
  ]

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
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
          <Link
            href="/business"
            className="flex items-center gap-2"
            aria-label="AQWELIA Business"
          >
            <img
              src="/logo-aqwelia-web.png"
              alt="AQWELIA"
              className="h-10 w-auto object-contain"
            />
            <div className="leading-tight">
              <div className="font-display text-base font-bold tracking-tight">
                <span className="aqua-text-gradient">AQWELIA</span>{' '}
                <span className="text-gold">Business</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {t('badgePro')}
              </div>
            </div>
            <Sparkles className="h-3.5 w-3.5 text-gold" />
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

          {/* CTA Quote — always visible */}
          <Link
            href="/business#contact"
            className="glow-gold group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-4 py-2 text-xs font-bold text-[oklch(0.99_0.01_195)] shadow-md transition-all hover:scale-[1.03]"
          >
            {t('navQuote')}
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
