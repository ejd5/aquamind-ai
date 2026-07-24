import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Waves,
  Calendar,
  Wrench,
  FileText,
  Settings,
  LogOut,
  Sparkles,
  ArrowLeft,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { authOptions } from '@/lib/auth'
import { Footer } from '@/components/aquamind/footer'

export const dynamic = 'force-dynamic'

export default async function ProAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getTranslations('proApp')
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect('/auth/signin?callbackUrl=/pro/app')
  }

  const companyName = (session.user as any).name ?? session.user.email ?? ''

  const NAV = [
    { href: '/pro/app', label: t('navDashboard'), icon: LayoutDashboard },
    { href: '/pro/app/clients', label: t('navClients'), icon: Users },
    { href: '/pro/app/team', label: t('navTeam'), icon: UsersRound },
    { href: '/pro/app/planning', label: t('navPlanning'), icon: Calendar },
    {
      href: '/pro/app/interventions',
      label: t('navInterventions'),
      icon: Wrench,
    },
    { href: '/pro/app/pools', label: t('navPools'), icon: Waves },
    { href: '/pro/app/reports', label: t('navReports'), icon: FileText },
    { href: '/pro/app/settings', label: t('navSettings'), icon: Settings },
  ]

  return (
    <div className="aq-pro-app relative flex min-h-screen flex-col bg-background">
      <header className="aq-pro-header safe-area-top sticky top-0 z-40 border-b border-gold/20 bg-background/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/pro"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              aria-label={t('backToDashboard')}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('backToDashboard')}</span>
            </Link>
          </div>

          <Link
            href="/pro/app"
            className="flex items-center gap-2"
            aria-label="AQWELIA Pro"
          >
            <img
              src="/logo-aqwelia-web.png"
              alt="AQWELIA"
              className="h-9 w-auto object-contain"
            />
            <div className="leading-tight">
              <div className="font-display text-base font-bold tracking-tight">
                <span className="aqua-text-gradient">AQWELIA</span>{' '}
                <span className="text-gold">Pro</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {t('brandTagline')}
              </div>
            </div>
            <Sparkles className="h-3.5 w-3.5 text-gold" />
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight md:block">
              <div className="max-w-[200px] truncate text-xs font-semibold text-foreground">
                {companyName}
              </div>
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-gold"
              >
                <LogOut className="h-3 w-3" />
                {t('signout')}
              </Link>
            </div>
            <span className="inline-flex items-center rounded-full bg-gradient-to-r from-gold to-[oklch(0.55_0.10_195)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[oklch(0.99_0.01_195)] shadow-md">
              {t('badgePro')}
            </span>
          </div>
        </div>

        <div className="aq-pro-mobile-nav border-t border-border/40 bg-background/60 backdrop-blur md:hidden">
          <nav className="custom-scroll mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2">
            {NAV.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className="flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-0 px-0 sm:px-6">
        <aside className="aq-pro-sidebar custom-scroll sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 overflow-y-auto border-r border-border/40 py-6 pr-4 md:block">
          <nav className="space-y-1">
            {NAV.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className="group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary/60 hover:text-foreground"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:text-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="truncate">{link.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="mt-6 rounded-xl border border-gold/30 bg-gold/5 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gold">
              <Sparkles className="h-3 w-3" />
              {t('badgePro')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('brandTagline')}
            </p>
          </div>
        </aside>

        <main className="aq-pro-main min-w-0 flex-1 px-4 py-6 pb-28 sm:px-6 md:pb-10">
          {children}
        </main>
      </div>

      <Footer />
    </div>
  )
}
