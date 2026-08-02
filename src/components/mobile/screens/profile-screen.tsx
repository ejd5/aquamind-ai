'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'

import {
  User,
  Crown,
  Settings,
  Droplets,
  ChevronRight,
  Bell,
  Shield,
  HelpCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { ModulePaywall } from '../../aquamind/module-paywall'
import { isArqweliaLot1Enabled } from '@/lib/features'
import type { PoolProfileLite } from '../../aquamind/app-shell'

interface ProfileScreenProps {
  /** Pool profile (or null if not yet configured). */
  profile: PoolProfileLite | null
  /** Back to landing page (used by the "Paramètres" link list). */
  onBackToLanding?: () => void
}

/**
 * Mobile "Profil" screen — combines:
 *   1. A profile summary card (pool name, volume, treatment type, salt system)
 *   2. `<ModulePaywall />` for subscription management
 *   3. A "Paramètres" section with quick links (notifications, privacy, help)
 *
 * The settings links are placeholders — actual settings pages will be added
 * in a later lot.
 */
export function ProfileScreen({ profile, onBackToLanding }: ProfileScreenProps) {
  const tNav = useTranslations('nav')
  const tScr = useTranslations('mobile.screens')
  const tHl = useTranslations('modules.healthLog')

  return (
    <div className="mobile-scroll px-4 pb-24 pt-4">
      <div className="mb-3 flex items-center gap-2">
        <User className="h-5 w-5 text-primary" aria-hidden />
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {tNav('profile')}
        </h1>
      </div>

      {/* Profile summary card */}
      <section
        className="glass-card mb-5 rounded-2xl p-4"
        aria-label={tScr('profileAriaPoolProfile')}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-ocean-light text-primary-foreground shadow-md shadow-primary/30">
            <Droplets className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">
              {profile?.name ?? tScr('profilePoolNotConfigured')}
            </p>
            <p className="text-xs text-muted-foreground">
              {profile
                ? `${profile.volume} ${profile.unit === 'm3' ? 'm³' : 'gal'} · ${profile.treatmentType}${profile.saltSystem ? ` · ${tScr('profileElectrolysisSalt')}` : ''}`
                : tScr('profileConfigureToStart')}
            </p>
          </div>
        </div>
      </section>

      {/* Subscription management */}
      <section className="mb-5" aria-label={tScr('profileAriaSubscription')}>
        <div className="mb-2 flex items-center gap-2">
          <Crown className="h-4 w-4 text-gold" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {tScr('profileSubscriptionTitle')}
          </h2>
        </div>
        <ModulePaywall />
      </section>

      {/* ARQWELIA — entry point from mobile */}
      {isArqweliaLot1Enabled() && (
        <section className="mb-5" aria-label="ARQWELIA">
          <Link
            href="/arqwelia"
            className="group flex items-center gap-3 rounded-2xl border border-white/15 p-4 shadow-[var(--arqwelia-shadow-deep)] transition-all hover:border-white/30"
            style={{ background: 'var(--arqwelia-gradient-card)' }}
            aria-label={tScr('profileArqweliaAria')}
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
              style={{ borderColor: 'rgba(0, 214, 197, 0.30)', background: 'rgba(0, 214, 197, 0.12)', color: 'var(--arqwelia-aqua)' }}
            >
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white">ARQWELIA</p>
                <span
                  className="rounded-full border border-white/25 px-1.5 py-0.5 text-[9px] font-bold"
                  style={{ color: 'var(--arqwelia-aqua-bright)', background: 'rgba(0, 214, 197, 0.15)' }}
                >
                  {tScr('profileNewBadge')}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-white/75">
                {tScr('profileArqweliaDesc')}
              </p>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--arqwelia-aqua)' }} />
          </Link>
        </section>
      )}

      {/* Settings — placeholder list */}
      <section aria-label={tScr('profileAriaSettings')}>
        <div className="mb-2 flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {tNav('settings')}
          </h2>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/40">
          <SettingsRow
            icon={<Bell className="h-4 w-4 text-primary" />}
            label={tScr('profileNotifReminders')}
            hint={tHl('comingSoon')}
          />
          <SettingsRow
            icon={<Shield className="h-4 w-4 text-primary" />}
            label={tScr('profilePrivacyData')}
            hint={tHl('comingSoon')}
          />
          <SettingsRow
            icon={<HelpCircle className="h-4 w-4 text-primary" />}
            label={tScr('profileHelpSupport')}
            hint={tScr('profileFaqContact')}
          />
          {onBackToLanding && (
            <SettingsRow
              icon={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
              label={tNav('backToLanding')}
              onClick={onBackToLanding}
            />
          )}
        </div>
      </section>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        {tScr('profileVersionLine')}
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Settings row helper                                                       */
/* -------------------------------------------------------------------------- */

interface SettingsRowProps {
  icon: React.ReactNode
  label: string
  hint?: string
  onClick?: () => void
}

function SettingsRow({ icon, label, hint, onClick }: SettingsRowProps) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-b border-border/40 px-4 py-3 text-left last:border-b-0 ${
        onClick ? 'transition-colors active:bg-secondary/50' : ''
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/60">
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {hint && (
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {hint}
        </span>
      )}
      {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />}
    </Comp>
  )
}
