'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useWizardStore } from '@/lib/arqwelia/wizard-store'
import { ANALYSIS_STEPS_FR, demoRealityScore } from '@/lib/arqwelia/fixtures'
import { arqTrackClient } from '@/lib/arqwelia/analytics-client'
import {
  ArqweliaGlassCard,
  ArqweliaLabel,
  ArqweliaFutureFeature,
  ArqweliaPrimaryButton,
  ArqweliaScore,
} from '@/components/arqwelia/ui'
import { ArqweliaScene } from '@/components/arqwelia/brand'

export default function AnalysisStep() {
  const t = useTranslations('arqwelia')
  const router = useRouter()
  const sp = useSearchParams()
  const store = useWizardStore()
  const isDemo = sp.get('demo') === '1' || store.demoMode
  const [progress, setProgress] = useState(0)
  const reducedMotion = useReducedMotion()

  // If demo=1 and no questionnaire yet, prime the store (one-time sync).
  useEffect(() => {
    if (isDemo && !store.questionnaire.projectType) {
      store.startDemo()
    }
  }, [isDemo, store.questionnaire.projectType])

  useEffect(() => {
    let cancelled = false
    let raf = 0
    const total = ANALYSIS_STEPS_FR.reduce((s, x) => s + x.durationMs, 0)
    if (reducedMotion) { setProgress(100); return }
    let elapsed = 0
    const tick = () => {
      if (cancelled) return
      elapsed += 80
      setProgress(Math.min(100, (elapsed / total) * 100))
      if (elapsed < total) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelled = true; cancelAnimationFrame(raf) }
  }, [reducedMotion])

  const done = progress >= 100
  const score = demoRealityScore(store.questionnaire)
  useEffect(() => {
    if (done) void arqTrackClient('arq_analysis_completed', { demo: isDemo, realityScore: score })
  }, [done, isDemo, score])

  const q = store.questionnaire

  return (
    <div>
      <Link href={isDemo ? '/arqwelia' : '/arqwelia/start/project'} className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-arq-aqua">
        ← {t('wizard.back')}
      </Link>
      <h1 className="font-aq-display text-3xl font-semibold text-arq-mist sm:text-4xl">
        {t('wizard.analysis.title')}
      </h1>
      <p className="mt-3 text-sm text-arq-mist/60">{t('wizard.analysis.desc')}</p>

      {/* Permanent demo badge */}
      <div className="mt-4">
        <ArqweliaFutureFeature kind="demo">{t('demoBadge')}</ArqweliaFutureFeature>
      </div>

      {/* Deterministic progress (4 steps) */}
      <ArqweliaGlassCard className="mt-8 p-6" border={done ? 'strong' : 'default'} glow={done}>
        <div className="h-2 w-full overflow-hidden rounded-full bg-arq-aqua/10" role="status" aria-live="polite">
          <div className="h-full transition-[width] duration-150" style={{ width: `${progress}%`, background: 'var(--arqwelia-gradient-premium)', boxShadow: 'var(--arqwelia-glow-aqua)' }} />
        </div>
        <ul className="mt-5 space-y-2.5">
          {ANALYSIS_STEPS_FR.map((s, i) => {
            const reached = progress >= stepsCumulative(i) || reducedMotion
            return (
              <li key={s.key} className="flex items-center gap-3 text-sm">
                <span className={reached ? 'text-arq-aqua' : 'text-arq-mist/30'}>{reached ? '✓' : '○'}</span>
                <span className={reached ? 'text-arq-mist' : 'text-arq-mist/40'}>{s.label}</span>
              </li>
            )
          })}
        </ul>
      </ArqweliaGlassCard>

      {done && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {/* Score */}
          <ArqweliaGlassCard className="p-6 text-center" border="gold">
            <ArqweliaLabel>{t('scoreTag')}</ArqweliaLabel>
            <div className="mt-4 flex justify-center">
              <ArqweliaScore value={score} label={t('wizard.analysis.realityScore')} demo />
            </div>
          </ArqweliaGlassCard>

          {/* Declared vs estimated (demo) */}
          <ArqweliaGlassCard className="p-6">
            <ArqweliaLabel>{t('diffTitle')}</ArqweliaLabel>
            <div className="mt-4 space-y-3 text-sm">
              <DeclRow label={t('wizard.questionnaire.projectType')} value={q.projectType ? safeT(t, `wizard.questionnaire.projectTypes.${q.projectType}`) : '—'} kind="declared" />
              <DeclRow label={t('wizard.questionnaire.budget')} value={q.budget ? safeT(t, `wizard.questionnaire.budgets.${q.budget}`) : '—'} kind="declared" />
              <DeclRow label={t('diff.detected')} value={isDemo ? '≈ 70 m²' : '—'} kind="estimated" />
              <DeclRow label={t('diff.estimated')} value={isDemo ? '8 × 4 m — 1,5 m' : '—'} kind="estimated" />
              <DeclRow label={t('diff.toConfirm')} value="—" kind="toConfirm" />
            </div>
          </ArqweliaGlassCard>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <ArqweliaPrimaryButton
          href={undefined}
          onClick={() => router.push('/arqwelia/start/concepts')}
          disabled={!done}
        >
          {t('wizard.next')}
        </ArqweliaPrimaryButton>
      </div>
    </div>
  )

  function stepsCumulative(idx: number) {
    return ANALYSIS_STEPS_FR.slice(0, idx + 1).reduce((s, x) => s + x.durationMs, 0) / ANALYSIS_STEPS_FR.reduce((s, x) => s + x.durationMs, 0) * 100
  }
}

function DeclRow({ label, value, kind }: { label: string; value: string; kind: 'declared' | 'estimated' | 'toConfirm' }) {
  const dotColor = kind === 'declared' ? '#00D6C5' : kind === 'estimated' ? '#C6A56B' : '#FF9C9C'
  return (
    <div className="flex items-center justify-between border-t border-arq-border pt-3 first:border-t-0 first:pt-0">
      <span className="flex items-center gap-2 text-arq-mist/55"><span className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor }} />{label}</span>
      <span className="font-semibold text-arq-mist">{value}</span>
    </div>
  )
}

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

function safeT(t: (k: string) => string, key: string): string {
  try { const v = t(key); return v || key } catch { return key }
}