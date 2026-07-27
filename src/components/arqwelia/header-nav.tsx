'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

/**
 * ARQWELIA V2 — mobile + tablet nav menu (client island).
 * Renders a hamburger button that opens a full glass panel with the nav
 * items + the primary CTA. Hidden on md+ (desktop nav lives in layout).
 */
export function ArqweliaHeaderNav({ startHref }: { startHref: string }) {
  const t = useTranslations('arqwelia')
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        aria-label={t('nav.menu')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-arq-border bg-arq-navy-2/50 text-arq-mist md:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
        </svg>
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-arq-navy-deep/70 backdrop-blur-sm" />
          <div
            className="absolute right-0 top-0 h-full w-[78%] max-w-sm border-l border-arq-border p-6 shadow-arq-deep"
            style={{ background: 'var(--arqwelia-gradient-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="font-aq-display text-lg font-semibold text-arq-mist">ARQWELIA</span>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-arq-border text-arq-mist"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <nav className="mt-8 flex flex-col gap-1">
              {[
                { href: '/arqwelia#parcours', label: t('nav.howItWorks') },
                { href: '/arqwelia#ia-ar', label: t('nav.technology') },
                { href: '/arqwelia#pros', label: t('nav.professionals') },
                { href: '/arqwelia#faq', label: t('nav.faq') },
                { href: '/pro/arqwelia/opportunities?demo=1', label: t('nav.proSection') },
              ].map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-arq-mist/80 transition-colors hover:bg-arq-aqua/5 hover:text-arq-mist"
                >
                  {it.label}
                </Link>
              ))}
            </nav>
            <Link
              href={startHref}
              onClick={() => setOpen(false)}
              className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-6 py-3 text-sm font-bold text-arq-navy-deep"
              style={{ background: 'var(--arqwelia-gradient-premium)', boxShadow: 'var(--arqwelia-glow-aqua)' }}
            >
              {t('nav.startProject')}
            </Link>
            <Link
              href="/arqwelia/start/analysis?demo=1"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-arq-border-strong px-6 py-3 text-sm font-semibold text-arq-mist/85"
            >
              {t('nav.viewDemo')}
            </Link>
          </div>
        </div>
      )}
    </>
  )
}