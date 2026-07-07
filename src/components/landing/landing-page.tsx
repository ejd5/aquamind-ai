'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Menu, X, ShieldAlert, ArrowRight } from 'lucide-react'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useTranslations } from 'next-intl'
import { Hero } from './sections/hero'
import { Problem } from './sections/problem'
import { RealCosts } from './sections/real-costs'
import { PiscinisteCost } from './sections/pisciniste-cost'
import { Solution } from './sections/solution'
import { Comparator } from './sections/comparator'
import { Simulations } from './sections/simulations'
import { Savings } from './sections/savings'
import { Story } from './sections/story'
import { Variations } from './sections/variations'
import { SpaSection } from './sections/spa-section'
import { FeaturesGrid } from './sections/features-grid'
import { InternationalSection } from './sections/international-section'
import { Pricing } from './sections/pricing'
import { Faq } from './sections/faq'
import { FinalCta } from './sections/final-cta'
import { scrollToId } from './landing-utils'

interface LandingPageProps {
  hasProfile: boolean
  onEnterApp: () => void
}

export function LandingPage({ hasProfile, onEnterApp }: LandingPageProps) {
  const t = useTranslations('landing')
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const NAV_LINKS = [
    { id: 'probleme', label: t('navProblem') },
    { id: 'solution', label: t('navSolution') },
    { id: 'comparatif', label: t('navComparatif') },
    { id: 'simulations', label: t('navSimulations') },
    { id: 'gains', label: t('navGains') },
    { id: 'tarifs', label: t('navTarifs') },
    { id: 'faq', label: t('navFaq') },
  ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ===== Sticky top nav ===== */}
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? 'border-b border-gold/20 bg-background/80 backdrop-blur-2xl shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <button
            onClick={() => scrollToId('top')}
            className="flex items-center gap-2.5"
            aria-label={t('headerAriaLogo')}
          >
            <div className="relative">
              <div className="absolute -inset-[3px] rounded-[14px] bg-gradient-to-br from-gold via-ocean-light to-primary opacity-80 blur-[2px]" />
              <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl shadow-lg shadow-primary/30">
                <img src="/icon-aqwelia-48.png" alt="AQWELIA" className="h-10 w-10 object-cover" />
              </div>
              <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-gold to-[oklch(0.55_0.10_195)] shadow-md shadow-gold/40">
                <Sparkles className="h-2.5 w-2.5 text-white" />
              </div>
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5 text-base font-bold tracking-tight">
                <span className="aqua-text-gradient">AQWELIA</span>
              </div>
              <div className="hidden text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:block">
                {t('headerCopilote')}
              </div>
            </div>
          </button>

          {/* Desktop nav links */}
          <nav className="hidden items-center gap-0.5 lg:flex">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToId(link.id)}
                className="nav-link rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-2 lg:flex">
            {hasProfile && (
              <button
                onClick={onEnterApp}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-gold/50 hover:text-gold"
              >
                Accéder à l&apos;app
              </button>
            )}
            {/* Language switcher */}
            <LanguageSwitcher />
            {/* Bouton Connexion — toujours visible */}
            <a
              href="/auth/signin"
              className="rounded-full border border-gold/40 bg-background/80 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-gold hover:text-gold"
            >
              Connexion
            </a>
            <button
              onClick={onEnterApp}
              className="glow-gold group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-4 py-2 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-md transition-all hover:scale-[1.03] hover:shadow-[0_0_35px_-6px_oklch(0.65_0.11_195/0.6)]"
            >
              {hasProfile ? t('navMySpace') : t('navStart')}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="glass-pill flex h-10 w-10 items-center justify-center rounded-full lg:hidden"
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-border/40 bg-background/95 backdrop-blur-xl lg:hidden"
            >
              <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => {
                      scrollToId(link.id)
                      setMobileOpen(false)
                    }}
                    className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                  >
                    {link.label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    onEnterApp()
                    setMobileOpen(false)
                  }}
                  className="mt-2 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-4 py-2.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-md"
                >
                  {hasProfile ? t('navMySpace') : t('navStart')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <a
                  href="/auth/signin"
                  className="mt-2 flex items-center justify-center gap-2 rounded-full border border-gold/40 bg-background/80 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-gold hover:text-gold"
                >
                  Connexion
                </a>
                <div className="mt-2 flex items-center justify-center">
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ===== Main content ===== */}
      <main className="flex-1">
        <Hero hasProfile={hasProfile} onEnterApp={onEnterApp} />
        <Problem />
        <RealCosts />
        <PiscinisteCost />
        <Solution />
        <Comparator />
        <Simulations />
        <Savings />
        <Story />
        <Variations />
        <SpaSection />
        <FeaturesGrid />
        <InternationalSection />
        <Pricing hasProfile={hasProfile} onEnterApp={onEnterApp} />
        <Faq />
        <FinalCta hasProfile={hasProfile} onEnterApp={onEnterApp} />
      </main>

      {/* ===== Footer ===== */}
      <footer className="relative mt-auto overflow-hidden border-t border-gold/20 bg-gradient-to-br from-[oklch(0.18_0.025_200)] via-[oklch(0.15_0.02_195)] to-[oklch(0.12_0.015_200)] text-white/80">
        <div className="gold-divider" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='80' height='20' viewBox='0 0 80 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q 20 0 40 10 T 80 10' stroke='%23ffffff' fill='none' stroke-width='1'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'repeat',
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6">
          {/* Safety disclaimer */}
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-gold/20 bg-white/5 p-4">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <p className="text-[11px] leading-relaxed text-white/70">
              <strong className="text-white/90">Avis de prudence.</strong> AQWELIA aide au
              diagnostic et à l&apos;entretien mais ne remplace pas un professionnel. Les dosages
              {t('disclaimer')}
              
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl shadow-md shadow-primary/30">
                  <img src="/icon-aqwelia-48.png" alt="AQWELIA" className="h-9 w-9 object-cover" />
                  <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-gold" />
                </div>
                <div>
                  <div className="font-display text-base font-bold tracking-tight text-white">
                    <span className="aqua-text-gradient">AQWELIA</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">
                    {t('footerTagline2')}
                  </div>
                </div>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/65">
                {t('footerTagline')}
              </p>
              {hasProfile && (
                <button
                  onClick={onEnterApp}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold transition-colors hover:bg-gold/20"
                >
                  {t('navApp')}
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Produit */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{t('footerProduct')}</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <button onClick={() => scrollToId('solution')} className="text-white/70 transition-colors hover:text-gold">{t('navSolution')}</button>
                </li>
                <li>
                  <button onClick={() => scrollToId('comparatif')} className="text-white/70 transition-colors hover:text-gold">{t('navComparatif')}</button>
                </li>
                <li>
                  <button onClick={() => scrollToId('fonctionnalites')} className="text-white/70 transition-colors hover:text-gold">{t('featuresTitle')}</button>
                </li>
                <li>
                  <button onClick={() => scrollToId('tarifs')} className="text-white/70 transition-colors hover:text-gold">{t('navTarifs')}</button>
                </li>
                <li>
                  <button onClick={() => scrollToId('faq')} className="text-white/70 transition-colors hover:text-gold">{t('navFaq')}</button>
                </li>
              </ul>
            </div>

            {/* Liens */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{t('footerInfo')}</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><span className="text-white/70">{t('footerGuides')}</span></li>
                <li><span className="text-white/70">{t('footerBlog')} <span className="text-white/35">({t('footerComingSoon')})</span></span></li>
                <li>
                  <Link href="/legal/support" className="text-white/70 transition-colors hover:text-gold">
                    {t('footerContact')}
                  </Link>
                </li>
                <li>
                  <Link href="/legal/cgu" className="text-white/70 transition-colors hover:text-gold">
                    {t('footerCGU')}
                  </Link>
                </li>
                <li>
                  <Link href="/legal/privacy" className="text-white/70 transition-colors hover:text-gold">
                    {t('footerPrivacy')}
                  </Link>
                </li>
                <li>
                  <Link href="/settings" className="text-white/70 transition-colors hover:text-gold">
                    {t('footerSettings')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
            <p className="text-xs text-white/50">
              © {new Date().getFullYear()} AQWELIA. {t('footerCopyright')}
            </p>
            <div className="flex items-center gap-3 text-xs text-white/50">
              <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 font-semibold text-gold">
                {t('footerVersion')}
              </span>
              <span className="hidden sm:inline">{t('trustFrance')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
