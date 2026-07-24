'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Footer } from '@/components/aquamind/footer'

export function ProRouteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const t = useTranslations('pro')
  const isAuthenticatedWorkspace = pathname === '/pro/app' || pathname.startsWith('/pro/app/')

  // /pro/app owns its header, navigation and responsive workspace layout.
  // Keeping the marketing chrome here would render two headers and two footers.
  if (isAuthenticatedWorkspace) return <>{children}</>

  const navLinks = [
    { href: '/pro#fonctions', label: t('navFeatures') },
    { href: '/pro#tarifs', label: t('navPricing') },
    { href: '/pro/faq', label: t('navFaq') },
    { href: '/pro/demo', label: t('navDemo') },
  ]

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <header className="safe-area-top sticky top-0 z-40 border-b border-gold/20 bg-background/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('ctaBackHome')}</span>
          </Link>

          <Link href="/pro" className="flex items-center gap-2" aria-label="AQWELIA Pro">
            <img src="/logo-aqwelia-web.png" alt="AQWELIA" className="h-10 w-auto object-contain" />
            <div className="leading-tight">
              <div className="font-display text-base font-bold tracking-tight">
                <span className="aqua-text-gradient">AQWELIA</span>{' '}
                <span className="text-gold">Pro</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {t('badgeEarlyAccess')}
              </div>
            </div>
            <Sparkles className="h-3.5 w-3.5 text-gold" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/pro/early-access"
            className="glow-gold group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-4 py-2 text-xs font-bold text-[oklch(0.99_0.01_195)] shadow-md transition-all hover:scale-[1.03]"
          >
            {t('navEarlyAccess')}
          </Link>
        </div>

        <div className="border-t border-border/40 bg-background/60 backdrop-blur md:hidden">
          <nav className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2">
            {navLinks.map((link) => (
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

      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
