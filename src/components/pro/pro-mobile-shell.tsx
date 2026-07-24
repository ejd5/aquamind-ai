'use client'

import { useEffect, useState, type ComponentType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  UsersRound,
  Waves,
  Wrench,
  X,
} from 'lucide-react'

type ProNavKey =
  | 'navDashboard'
  | 'navPlanning'
  | 'navInterventions'
  | 'navClients'
  | 'navTeam'
  | 'navPools'
  | 'navReports'
  | 'navSettings'

type MobileNavItem = {
  href: string
  key: ProNavKey
  icon: ComponentType<{ className?: string }>
  exact?: boolean
}

const PRIMARY_ITEMS = [
  { href: '/pro/app', key: 'navDashboard', icon: LayoutDashboard, exact: true },
  { href: '/pro/app/planning', key: 'navPlanning', icon: CalendarDays },
  { href: '/pro/app/interventions', key: 'navInterventions', icon: Wrench },
  { href: '/pro/app/clients', key: 'navClients', icon: Users },
  { href: '/pro/app/team', key: 'navTeam', icon: UsersRound },
] satisfies readonly MobileNavItem[]

const SECONDARY_ITEMS = [
  { href: '/pro/app/pools', key: 'navPools', icon: Waves },
  { href: '/pro/app/reports', key: 'navReports', icon: FileText },
  { href: '/pro/app/settings', key: 'navSettings', icon: Settings },
] satisfies readonly MobileNavItem[]

async function tapFeedback() {
  if (!Capacitor.isNativePlatform()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // Haptics are an enhancement: navigation must continue if unavailable.
  }
}

function routeIsActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function ProMobileShell({ companyName }: { companyName: string }) {
  const pathname = usePathname()
  const t = useTranslations('proApp')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void tapFeedback()
          setOpen(true)
        }}
        className="aq-pro-mobile-menu-trigger flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-background/85 text-foreground shadow-sm md:hidden"
        aria-label={t('navSettings')}
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" />
      </button>

      <nav
        className="aq-pro-bottom-tabs fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-border/70 bg-background/95 px-1 pt-1 shadow-[0_-12px_32px_rgba(2,52,60,0.12)] backdrop-blur-2xl md:hidden"
        aria-label="AQWELIA Pro"
      >
        {PRIMARY_ITEMS.map((item) => {
          const Icon = item.icon
          const active = routeIsActive(pathname, item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => { void tapFeedback() }}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 pb-1 text-[10px] font-semibold transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              {active ? (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
              ) : null}
              <span className={`flex h-7 w-9 items-center justify-center rounded-xl ${active ? 'bg-primary/10' : ''}`}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="max-w-full truncate">{t(item.key)}</span>
            </Link>
          )
        })}
      </nav>

      {open ? (
        <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-label={t('navSettings')}
          />

          <section className="aq-pro-mobile-sheet absolute inset-x-0 bottom-0 rounded-t-[2rem] border-t border-white/70 bg-background px-4 pb-6 pt-3 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/25" />

            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-bold text-foreground">{companyName}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">AQWELIA Pro</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground"
                aria-label={t('navSettings')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-2 py-4">
              {SECONDARY_ITEMS.map((item) => {
                const Icon = item.icon
                const active = routeIsActive(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => { void tapFeedback() }}
                    className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-sm font-bold ${
                      active
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border/60 bg-card/70 text-foreground'
                    }`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                      <Icon className="h-5 w-5" />
                    </span>
                    {t(item.key)}
                  </Link>
                )
              })}
            </div>

            <Link
              href="/auth/signin"
              onClick={() => { void tapFeedback() }}
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-red-300/50 bg-red-500/5 text-sm font-bold text-red-600"
            >
              <LogOut className="h-4 w-4" />
              {t('signout')}
            </Link>
          </section>
        </div>
      ) : null}
    </>
  )
}
