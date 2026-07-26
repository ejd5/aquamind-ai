/**
 * ARQWELIA Lot 1 — Shared layout for /arqwelia/* public pages.
 *
 * - Reuses AQWELIA header/footer pattern but adds an ARQWELIA sub-brand bar.
 * - Shows "ARQWELIA" as a typographic sub-brand (NOT a logo replacement).
 * - Respects safe areas + reduced motion.
 * - When ARQWELIA_LOT1_ENABLED is false, nothing links to these routes from
 *   the main nav (handled in the public layout), but the routes still resolve.
 */
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { isArqweliaLot1Enabled, isArqweliaDemoMode } from '@/lib/features'

export default async function ArqweliaLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('arqwelia')
  const enabled = isArqweliaLot1Enabled()
  const demo = isArqweliaDemoMode()

  return (
    <div className="relative flex min-h-screen flex-col bg-arq-navy text-arq-mist">
      {/* Sub-brand bar — typographic, not a logo replacement */}
      <header className="safe-area-top sticky top-0 z-40 border-b border-arq-aqua/15 bg-arq-navy/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/arqwelia" className="inline-flex items-baseline gap-2">
            {/* Reuse the official AQWELIA logo from public/ */}
            <span className="font-aq-display text-lg font-semibold text-arq-mist">
              <span className="text-arq-aqua">A</span>QWELIA
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-arq-sand/80">
              ARQWELIA
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            {enabled && (
              <Link
                href="/arqwelia/start/photos"
                className="hidden rounded-full border border-arq-aqua/30 px-4 py-2 text-xs font-semibold text-arq-aqua transition-colors hover:bg-arq-aqua/10 sm:inline-block"
              >
                {t('ctaPrimary')}
              </Link>
            )}
            <Link
              href="/arqwelia/start/analysis?demo=1"
              className="hidden rounded-full bg-arq-aqua/10 px-4 py-2 text-xs font-semibold text-arq-mist/80 transition-colors hover:text-arq-mist sm:inline-block"
            >
              {t('ctaSecondary')}
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative flex-1">{children}</main>

      <footer className="border-t border-arq-aqua/15 bg-arq-navy px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xs text-arq-mist/40">
            {t('warning')}
          </p>
          {demo && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-arq-sand/30 bg-arq-sand/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-arq-sand">
              {t('demoBadge')}
            </p>
          )}
        </div>
      </footer>
    </div>
  )
}