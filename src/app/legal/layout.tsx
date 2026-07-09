/**
 * AQWELIA — Legal section shared layout.
 *
 * Wraps all `/legal/*` pages (CGU, privacy, support) with the AQWELIA brand
 * header, a back-to-home link, and the application footer. Server component
 * — no client hooks. Uses the AQWELIA design system (glass-card, gold
 * accents, font-display) and respects the iOS safe-area-top inset.
 */
import Link from 'next/link'
import { Sparkles, ArrowLeft } from 'lucide-react'
import { Footer } from '@/components/aquamind/footer'
import { getTranslations } from 'next-intl/server'

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('legal')
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Top brand bar */}
      <header className="safe-area-top sticky top-0 z-40 border-b border-gold/20 bg-background/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('backHome')}
          </Link>

          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg shadow-md shadow-primary/30">
              <img src="/logo-aqwelia-web.png" alt="AQWELIA" className="h-12 w-auto object-contain" />
            </div>
            <span className="font-display text-base font-bold tracking-tight">
              <span className="aqua-text-gradient">AQWELIA</span>
            </span>
            <Sparkles className="h-3 w-3 text-gold" />
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  )
}
