/**
 * ARQWELIA V2 — Brand mark + symbol.
 *
 * Symbol concept: a rotated diamond (projet/plan) cradling a water drop
 * (eau), wrapped by a concentric AR ring (visualisation immersive) with
 * connection nodes (mise en relation). Real SVG — not a static image.
 *
 * Server-safe (no 'use client'). Pure presentational.
 */
import type { ReactNode } from 'react'

interface BrandProps {
  size?: 'sm' | 'md' | 'lg'
  showTagline?: boolean
  /** Renders "by AQWELIA" sub-brand text (typographic, never a logo replacement). */
  showByAqwelia?: boolean
  className?: string
}

export function ArqweliaSymbol({ className = '', withGlow = true }: { className?: string; withGlow?: boolean }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      style={withGlow ? { filter: 'var(--arqwelia-glow-aqua)' } : undefined}
      aria-hidden
    >
      <defs>
        <linearGradient id="arq-sym-aq" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5CF2E6" />
          <stop offset="100%" stopColor="#00D6C5" />
        </linearGradient>
      </defs>
      {/* AR immersive ring */}
      <circle cx="24" cy="24" r="22" fill="none" stroke="url(#arq-sym-aq)" strokeWidth="1" strokeOpacity="0.45" strokeDasharray="3 4" />
      {/* Project diamond */}
      <rect x="11" y="11" width="26" height="26" transform="rotate(45 24 24)" fill="none" stroke="url(#arq-sym-aq)" strokeWidth="1.6" />
      {/* Water drop */}
      <path
        d="M24 16 C 20 22, 18 25, 18 28 a 6 6 0 0 0 12 0 c 0 -3 -2 -6 -6 -12 z"
        fill="url(#arq-sym-aq)"
        fillOpacity="0.85"
      />
      {/* Location pin node (mise en relation) */}
      <circle cx="34.5" cy="13.5" r="2.2" fill="#C6A56B" />
      <circle cx="13.5" cy="34.5" r="2.2" fill="#43CFF5" />
      <line x1="24" y1="24" x2="34.5" y2="13.5" stroke="url(#arq-sym-aq)" strokeWidth="1" strokeOpacity="0.6" />
      <line x1="24" y1="24" x2="13.5" y2="34.5" stroke="url(#arq-sym-aq)" strokeWidth="1" strokeOpacity="0.6" />
    </svg>
  )
}

export function ArqweliaBrand({ size = 'md', showByAqwelia = true, className = '' }: BrandProps) {
  const dim = size === 'sm' ? 28 : size === 'lg' ? 56 : 40
  const text = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl'
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <ArqweliaSymbol className="shrink-0" />
      <span className="flex flex-col leading-none">
        <span className={`font-aq-display font-semibold tracking-wide text-arq-mist ${text}`}>
          ARQWELIA
        </span>
        {showByAqwelia && (
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-arq-gold-soft/80">
            by AQWELIA
          </span>
        )}
      </span>
    </span>
  )
}

/** A premium "photography-grade" scene block (CSS/SVG, not an external image). */
export function ArqweliaScene({
  variant = 'dusk-pool',
  className = '',
  children,
}: {
  variant?: 'dusk-pool' | 'property' | 'ar-overlay'
  className?: string
  children?: ReactNode
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background:
          variant === 'dusk-pool'
            ? 'radial-gradient(70% 60% at 30% 20%, rgba(92,242,230,0.28), transparent 60%), radial-gradient(80% 50% at 80% 30%, rgba(67,207,245,0.15), transparent 65%), linear-gradient(155deg, #0A2A3C 0%, #061826 55%, #040E18 100%)'
            : variant === 'ar-overlay'
            ? 'radial-gradient(60% 50% at 50% 50%, rgba(0,214,197,0.12), transparent 60%), linear-gradient(160deg, #0C2533, #061826)'
            : 'linear-gradient(160deg, #0A2A3C 0%, #14334A 50%, #061826 100%)',
      }}
      aria-hidden={children ? undefined : true}
    >
      {/* Water caustics (two soft light blobs) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(22% 14% at 28% 34%, rgba(234,251,248,0.22), transparent 70%), radial-gradient(18% 10% at 66% 26%, rgba(234,251,248,0.15), transparent 70%), radial-gradient(26% 16% at 52% 62%, rgba(234,251,248,0.10), transparent 70%)',
        }}
      />
      {/* Subtle AR grid for ar-overlay variant */}
      {variant === 'ar-overlay' && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,214,197,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,214,197,0.5) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            transform: 'perspective(600px) rotateX(60deg)',
            transformOrigin: 'bottom',
          }}
        />
      )}
      {children}
    </div>
  )
}