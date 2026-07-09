/**
 * AQWELIA — Shared layout for public marketing pages
 * (/fonctionnalites, /comment-ca-marche, /tarifs, /a-propos, /contact).
 *
 * Server component. Renders:
 *  - a sticky brand header with logo + main nav (Fonctionnalités, Comment ça
 *    marche, Tarifs, À propos, Contact) + primary CTA "Commencer"
 *  - the page content
 *  - the AQWELIA footer (shared with the in-app experience)
 *
 * Same design system as the landing page (glassmorphism, gold accents,
 * font-display, backdrop-blur). Respects the iOS safe-area-top inset.
 */
import Link from 'next/link'
import { Sparkles, ArrowLeft } from 'lucide-react'
import { Footer } from '@/components/aquamind/footer'
import { getTranslations } from 'next-intl/server'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('publicNav')

  const NAV_LINKS = [
    { href: '/fonctionnalites', label: t('features') },
    { href: '/comment-ca-marche', label: t('howItWorks') },
    { href: '/tarifs', label: t('pricing') },
    { href: '/a-propos', label: t('about') },
    { href: '/contact', label: t('contact') },
  ]

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Top brand bar */}
      <header className="safe-area-top sticky top-0 z-40 border-b border-gold/20 bg-background/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2" aria-label="AQWELIA">
            <img src="/logo-aqwelia-web.png" alt="AQWELIA" className="h-10 w-auto object-contain" />
            <span className="font-display text-base font-bold tracking-tight">
              <span className="aqua-text-gradient">AQWELIA</span>
            </span>
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

          {/* CTA Commencer */}
          <Link
            href="/#tarifs"
            className="glow-gold group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-4 py-2 text-xs font-bold text-[oklch(0.99_0.01_195)] shadow-md transition-all hover:scale-[1.03]"
          >
            {t('cta')}
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
