import Link from 'next/link'
import { Sparkles, ShieldAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function Footer() {
  const t = useTranslations('landing')
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-gold/20 bg-[oklch(0.15_0.02_195)] text-white/80">
      {/* AQWELIA footer background image — complete, not cut */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/footer-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-hidden="true"
      />
      {/* Dark overlay for text readability */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[oklch(0.15_0.02_195)]/90 via-[oklch(0.15_0.02_195)]/70 to-[oklch(0.15_0.02_195)]/90"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Safety disclaimer — required by spec */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-gold/20 bg-white/5 p-3.5">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <p className="text-[11px] leading-relaxed text-white/70">
            <strong className="text-white/90">{t('footerDisclaimerTitle')}</strong> {t('disclaimer')}
          </p>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <img src="/logo-aqwelia-web.png" alt="AQWELIA" className="h-24 w-auto object-contain" />
            <div className="text-sm">
              <span className="font-display font-bold tracking-tight text-white">AQWELIA</span>
              <span className="ml-2 text-white/45">© {new Date().getFullYear()}</span>
            </div>
          </div>

          {/* Legal + settings links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-white/65">
            <Link href="/legal/cgu" className="transition-colors hover:text-gold">
              {t('footerCGU')}
            </Link>
            <Link href="/legal/privacy" className="transition-colors hover:text-gold">
              {t('footerPrivacy')}
            </Link>
            <Link href="/legal/support" className="transition-colors hover:text-gold">
              {t('footerSupport')}
            </Link>
            <Link href="/settings" className="transition-colors hover:text-gold">
              {t('footerSettings')}
            </Link>
          </nav>

          <div className="flex items-center gap-3 text-xs text-white/65">
            <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 font-semibold text-gold">
              {t('footerVersion')}
            </span>
            <span className="hidden sm:inline">{t('footerCopyright')}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
