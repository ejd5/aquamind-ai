/**
 * ARQWELIA V2 — presentational UI primitives.
 *
 * Server-safe unless noted. All premium, additive (no changes to AQWELIA's
 * own component library). Reused across /arqwelia/* and /pro/arqwelia/*.
 */
import Link from 'next/link'
import type { ReactNode } from 'react'

/* ── Buttons ───────────────────────────────────────────────────────────── */

export function ArqweliaPrimaryButton({
  children,
  href,
  onClick,
  disabled,
  type = 'button',
  className = '',
}: {
  children: ReactNode
  href?: string
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
}) {
  const base = `group inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-full px-8 py-3.5 text-[13px] font-bold tracking-wide text-arq-navy-deep transition-all disabled:cursor-not-allowed disabled:opacity-50 ${className}`
  const style = { background: 'var(--arqwelia-gradient-premium)', boxShadow: 'var(--arqwelia-glow-aqua), 0 4px 14px -4px rgba(0,214,197,0.35)' }
  if (href) {
    return (
      <Link href={href} className={`${base} hover:scale-[1.02]`} style={style}>
        {children}
      </Link>
    )
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} hover:scale-[1.02]`} style={style}>
      {children}
    </button>
  )
}

export function ArqweliaSecondaryButton({
  children,
  href,
  onClick,
  disabled,
  type = 'button',
  className = '',
}: {
  children: ReactNode
  href?: string
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
}) {
  const cls = `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/[0.12] px-8 py-3.5 text-[13px] font-semibold text-white/80 backdrop-blur-sm transition-all hover:border-arq-aqua/50 hover:bg-arq-aqua/5 hover:text-white ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`
  if (href) return <Link href={href} className={cls}>{children}</Link>
  return <button type={type} onClick={onClick} disabled={disabled} className={cls}>{children}</button>
}

/* ── Glass card ─────────────────────────────────────────────────────────── */

export function ArqweliaGlassCard({
  children,
  className = '',
  border = 'default',
  glow = false,
}: {
  children: ReactNode
  className?: string
  border?: 'default' | 'gold' | 'strong'
  glow?: boolean
}) {
  const borderCls =
    border === 'gold'
      ? 'border-[var(--arqwelia-border-gold)]'
      : border === 'strong'
      ? 'border-[var(--arqwelia-border-strong)]'
      : 'border-white/[0.08]'
  return (
    <div
      className={`rounded-2xl border ${borderCls} backdrop-blur-xl ${glow ? 'shadow-arq-glow' : 'shadow-arq-deep'} ${className}`}
      style={{ background: 'var(--arqwelia-gradient-card)' }}
    >
      {children}
    </div>
  )
}

/* ── Section label (eyebrow) ─────────────────────────────────────────────── */

export function ArqweliaLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-arq-aqua">
      {children}
    </span>
  )
}

/* ── Future feature badge (Prochainement / Démonstration / Fonction future) ── */

export type ArqFutureKind = 'demo' | 'soon' | 'future'

export function ArqweliaFutureFeature({ kind = 'soon', children }: { kind?: ArqFutureKind; children?: ReactNode }) {
  const styles: Record<ArqFutureKind, string> = {
    demo: 'border-[var(--arqwelia-border-gold)] bg-arq-champagne/5 text-arq-gold-soft',
    soon: 'border-arq-aqua/35 bg-arq-aqua/5 text-arq-aqua',
    future: 'border-arq-cyan/30 bg-arq-cyan/5 text-arq-cyan',
  }
  const labels: Record<ArqFutureKind, string> = {
    demo: 'Démonstration',
    soon: 'Prochainement',
    future: 'Fonction future',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${styles[kind]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children ?? labels[kind]}
    </span>
  )
}

/* ── Step (parcours card, with status) ────────────────────────────────────── */

export function ArqweliaStep({
  n,
  title,
  desc,
  status = 'live',
}: {
  n: number | string
  title: string
  desc: string
  status?: 'live' | 'demo' | 'soon'
}) {
  return (
    <ArqweliaGlassCard className="p-6" glow={status === 'live'}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-arq-aqua/40 font-aq-display text-lg font-bold text-arq-aqua">
          {n}
        </div>
        {status === 'live' ? (
          <ArqweliaFutureFeature kind="soon" />
        ) : status === 'demo' ? (
          <ArqweliaFutureFeature kind="demo" />
        ) : (
          <ArqweliaFutureFeature kind="future" />
        )}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/55">{desc}</p>
    </ArqweliaGlassCard>
  )
}

/* ── Score (Reality Score gauge) ──────────────────────────────────────────── */

export function ArqweliaScore({
  value,
  max = 100,
  label,
  demo = true,
}: {
  value: number
  max?: number
  label?: string
  demo?: boolean
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const r = 62
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  return (
    <div className="relative inline-flex flex-col items-center">
      <svg viewBox="0 0 160 160" className="h-40 w-40">
        <defs>
          <linearGradient id="arq-score" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5CF2E6" />
            <stop offset="100%" stopColor="#00D6C5" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(234,251,248,0.07)" strokeWidth="9" />
        <circle
          cx="80" cy="80" r={r} fill="none" stroke="url(#arq-score)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`} transform="rotate(-90 80 80)" style={{ filter: 'var(--arqwelia-glow-aqua)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-aq-display text-5xl font-semibold text-white">{value}</span>
        <span className="text-xs text-white/40">/ {max}</span>
      </div>
      {label && <span className="mt-2 text-sm font-semibold text-arq-aqua">{label}</span>}
      {demo && <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-arq-gold-soft/80">Démo</span>}
    </div>
  )
}

/* ── Before / After split ─────────────────────────────────────────────────── */

export function ArqweliaBeforeAfter({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-arq-deep ${className}`} role="img" aria-label="Avant / après — visualisation conceptuelle">
      <div className="grid grid-cols-2">
        {/* Avant */}
        <div className="relative aspect-[4/3] bg-gradient-to-br from-[#030F1A] to-[#061826]">
          <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Avant</span>
          {/* Stark empty terrain */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[#03191A]" />
          <div className="absolute left-1/2 top-1/2 h-24 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-arq-mist/20" />
        </div>
        {/* Après */}
        <div className="relative aspect-[4/3]" style={{ background: 'radial-gradient(70% 60% at 50% 0%, rgba(0,214,197,0.28), transparent 60%), linear-gradient(155deg, #0A2A3C, #061826)' }}>
          <span className="absolute left-3 top-3 rounded-full border border-arq-aqua/40 bg-arq-aqua/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-arq-aqua">Après</span>
          {/* Premium pool silhouette */}
          <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: 'linear-gradient(180deg, rgba(0,214,197,0.05), rgba(0,214,197,0.15))' }} />
          <div className="absolute left-1/2 top-[58%] h-16 w-28 -translate-x-1/2 rounded-xl" style={{ background: 'linear-gradient(180deg, #00D6C5, #073C45)', boxShadow: 'var(--arqwelia-glow-aqua)' }} />
          <div className="absolute left-1/2 top-[58%] h-16 w-28 -translate-x-1/2 rounded-xl border border-arq-aqua-bright/40" />
        </div>
      </div>
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-arq-aqua/50 to-transparent" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-arq-aqua/40 bg-arq-navy-deep px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-arq-aqua">
        AR
      </div>
    </div>
  )
}

/* ── Verified professional card ────────────────────────────────────────────── */

export function ArqweliaProfessionalCard({
  name,
  specialty,
  location,
  initials,
}: {
  name: string
  specialty: string
  location: string
  initials: string
}) {
  return (
    <ArqweliaGlassCard className="p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-arq-aqua/35 font-aq-display text-lg font-semibold text-arq-aqua">
          {initials}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-white">{name}</h4>
            <span className="inline-flex items-center gap-1 rounded-full border border-arq-aqua/30 bg-arq-aqua/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-arq-aqua">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00D6C5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              Vérifié
            </span>
          </div>
          <p className="mt-1 text-xs text-white/55">{specialty}</p>
          <p className="text-xs text-white/40">{location}</p>
        </div>
      </div>
    </ArqweliaGlassCard>
  )
}

/* ── Wizard progress (client-aware via CSS only) ────────────────────────── */

export function ArqweliaProgress({ step, total }: { step: number; total: number }) {
  const pct = Math.max(0, Math.min(100, (step / total) * 100))
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-valuenow={step} aria-valuemax={total}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, background: 'var(--arqwelia-gradient-premium)', boxShadow: 'var(--arqwelia-glow-aqua)' }}
      />
    </div>
  )
}