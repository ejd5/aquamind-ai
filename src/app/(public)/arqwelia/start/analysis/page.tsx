'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useWizardStore } from '@/lib/arqwelia/wizard-store'
import { ANALYSIS_STEPS_FR, demoRealityScore } from '@/lib/arqwelia/fixtures'
import { arqTrackClient } from '@/lib/arqwelia/analytics-client'

export default function AnalysisStep() {
  const t = useTranslations('arqwelia')
  const router = useRouter()
  const sp = useSearchParams()
  const store = useWizardStore()
  const isDemo = sp.get('demo') === '1' || store.demoMode
  const [progress, setProgress] = useState(0)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    // If demo=1 and no questionnaire yet, prime the store (one-time sync).
    if (isDemo && !store.questionnaire.projectType) {
      store.startDemo()
    }
  }, [isDemo, store.questionnaire.projectType])

  useEffect(() => {
    // Deterministic progression. prefers-reduced-motion → jump to done.
    let cancelled = false
    let elapsed = 0
    const total = ANALYSIS_STEPS_FR.reduce((s, x) => s + x.durationMs, 0)
    if (reducedMotion) {
      setProgress(100)
      return
    }
    const tick = () => {
      if (cancelled) return
      elapsed += 80
      setProgress(Math.min(100, (elapsed / total) * 100))
      if (elapsed < total) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    return () => { cancelled = true }
  }, [reducedMotion])

  const done = progress >= 100
  const score = demoRealityScore(store.questionnaire)

  useEffect(() => {
    if (done) {
      void arqTrackClient('arq_analysis_completed', { demo: isDemo, realityScore: score })
    }
  }, [done, isDemo, score])

  return (
    <div>
      <Link
        href={isDemo ? '/arqwelia' : '/arqwelia/start/project'}
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-arq-aqua"
      >
        ← {t('wizard.back')}
      </Link>
      <h1 className="font-aq-display text-3xl font-semibold text-arq-mist sm:text-4xl">
        {t('wizard.analysis.title')}
      </h1>
      <p className="mt-3 text-sm text-arq-mist/60">{t('wizard.analysis.desc')}</p>

      {isDemo && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-arq-sand/30 bg-arq-sand/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-arq-sand">
          {t('demoBadge')}
        </p>
      )}

      {/* Progress */}
      <div className="mt-8 space-y-4" role="status" aria-live="polite">
        {reducedMotion && (
          <p className="text-sm text-arq-aqua">{t('wizard.analysis.done')}</p>
        )}
        <div className="h-2 w-full overflow-hidden rounded-full bg-arq-aqua/10">
          <div
            className="h-full bg-gradient-to-r from-arq-aqua to-arq-cyan transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ul className="space-y-2">
          {ANALYSIS_STEPS_FR.map((s, i) => {
            const reached = progress >= stepsCumulative(i) || reducedMotion
            return (
              <li key={s.key} className="flex items-center gap-3 text-sm">
                <span className={reached ? 'text-arq-aqua' : 'text-arq-mist/30'}>
                  {reached ? '✓' : '○'}
                </span>
                <span className={reached ? 'text-arq-mist' : 'text-arq-mist/40'}>
                  {s.label}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      {done && (
        <div className="mt-8 rounded-2xl border border-arq-aqua/20 bg-arq-ink/50 p-6">
          <h2 className="text-lg font-semibold text-arq-mist">{t('wizard.analysis.resultTitle')}</h2>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-aq-display text-5xl font-semibold text-arq-aqua">{score}</span>
            <span className="text-sm text-arq-mist/50">/ 100 — {t('wizard.analysis.realityScore')}</span>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          disabled={!done}
          onClick={() => router.push('/arqwelia/start/concepts')}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-arq-aqua px-7 py-3 text-sm font-bold text-arq-navy transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('wizard.next')}
        </button>
      </div>
    </div>
  )

  function stepsCumulative(idx: number) {
    return ANALYSIS_STEPS_FR.slice(0, idx + 1).reduce((s, x) => s + x.durationMs, 0) / ANALYSIS_STEPS_FR.reduce((s, x) => s + x.durationMs, 0) * 100
  }
}

/** prefers-reduced-motion check (client-side) — lazy init avoids set-state-in-effect. */
function useReducedMotion(): boolean {
  const [r, setR] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const h = () => setR(mq.matches)
    mq.addEventListener?.('change', h)
    return () => mq.removeEventListener?.('change', h)
  }, [])
  return r
}