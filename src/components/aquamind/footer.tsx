import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'

const TEXT_OUTLINE = '[text-shadow:_0_1px_2px_rgb(0_0_0),_0_-1px_2px_rgb(0_0_0),_1px_0_2px_rgb(0_0_0),_-1px_0_2px_rgb(0_0_0)]'

export function Footer() {
  const t = useTranslations('landing')
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-gold/20 bg-transparent text-white">
      {/* AQWELIA app footer background image — COMPLETE, not cut, no effect */}
      <div
        className="pointer-events-none absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: 'url(/footer-app-bg.png)',
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Safety disclaimer — centered, 3 lines, light amber background */}
        <div className="mb-6 mx-auto max-w-xl flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3.5 backdrop-blur-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className={`text-[11px] leading-relaxed text-white font-bold text-center ${TEXT_OUTLINE}`}>
            <strong className="text-white">{t('footerDisclaimerTitle')}</strong> {t('disclaimer')}
          </p>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Logo removed per user request */}
          <div className="text-sm">
            <span className={`font-display font-bold tracking-tight text-white ${TEXT_OUTLINE}`}>AQWELIA</span>
            <span className={`ml-2 text-white font-bold ${TEXT_OUTLINE}`}>© {new Date().getFullYear()}</span>
          </div>

          {/* Legal + settings links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
            <Link href="/legal/cgu" className={`text-white font-bold ${TEXT_OUTLINE} transition-colors hover:text-gold`}>
              {t('footerCGU')}
            </Link>
            <Link href="/legal/privacy" className={`text-white font-bold ${TEXT_OUTLINE} transition-colors hover:text-gold`}>
              {t('footerPrivacy')}
            </Link>
            <Link href="/legal/support" className={`text-white font-bold ${TEXT_OUTLINE} transition-colors hover:text-gold`}>
              {t('footerSupport')}
            </Link>
            <Link href="/settings" className={`text-white font-bold ${TEXT_OUTLINE} transition-colors hover:text-gold`}>
              {t('footerSettings')}
            </Link>
          </nav>

          <div className="flex items-center gap-3 text-xs">
            <span className={`rounded-full border border-gold/40 bg-black/30 px-2.5 py-1 font-semibold text-gold ${TEXT_OUTLINE}`}>
              {t('footerVersion')}
            </span>
            <span className={`text-white font-bold ${TEXT_OUTLINE}`}>{t('footerCopyright')}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
