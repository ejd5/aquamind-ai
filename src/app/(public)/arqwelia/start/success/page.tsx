'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useWizardStore } from '@/lib/arqwelia/wizard-store'

interface ResultData {
  publicId: string
  selectedConcept: string
  realityScoreDemo: number
  projectType: string | null
  timeline: string | null
  budgetRange: string | null
  style: string | null
}

export default function SuccessStep() {
  const t = useTranslations('arqwelia')
  const store = useWizardStore()
  // Lazy init from sessionStorage — avoids setState-in-effect on mount.
  const [data] = useState<ResultData | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = sessionStorage.getItem('arqwelia-result')
      return raw ? (JSON.parse(raw) as ResultData) : null
    } catch {
      return null
    }
  })

  // No-op effect kept for potential future SSR guards; currently unused.
  useEffect(() => {}, [])

  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-arq-aqua/15">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00D6C5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h1 className="mt-6 font-aq-display text-3xl font-semibold text-arq-mist sm:text-4xl">
        {t('wizard.success.title')}
      </h1>

      {data && (
        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-arq-aqua/20 bg-arq-ink/50 p-6 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-arq-aqua/70">
            {t('wizard.success.idLabel')}
          </p>
          <p className="mt-1 font-aq-display text-2xl font-semibold text-arq-mist">{data.publicId}</p>

          <div className="mt-5 flex items-baseline gap-2">
            <span className="font-aq-display text-4xl font-semibold text-arq-aqua">{data.realityScoreDemo}</span>
            <span className="text-sm text-arq-mist/50">/ 100 — {t('wizard.success.realityScoreLabel')}</span>
          </div>

          <div className="mt-5 space-y-2 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-arq-mist/40">
              {t('wizard.success.summary')}
            </p>
            {data.projectType && <Row label={t('wizard.questionnaire.projectType')} value={t(`wizard.questionnaire.projectTypes.${data.projectType}` as any) as string} />}
            {data.timeline && <Row label={t('wizard.questionnaire.timeline')} value={t(`wizard.questionnaire.timelines.${data.timeline}` as any) as string} />}
            {data.budgetRange && <Row label={t('wizard.questionnaire.budget')} value={t(`wizard.questionnaire.budgets.${data.budgetRange}` as any) as string} />}
            {data.style && <Row label={t('wizard.questionnaire.style')} value={t(`wizard.questionnaire.styles.${data.style}` as any) as string} />}
            <Row label={t('wizard.concepts.title')} value={`Concept ${data.selectedConcept}`} />
          </div>
        </div>
      )}

      {/* Three actions */}
      <div className="mx-auto mt-8 grid max-w-md gap-3 sm:grid-cols-3">
        {(['keepPrivate', 'shareLater', 'findPros'] as const).map((a) => {
          const disabled = a !== 'keepPrivate'
          return (
            <div
              key={a}
              className={`rounded-xl border p-4 text-center ${
                disabled
                  ? 'border-arq-mist/10 bg-arq-ink/30 opacity-60'
                  : 'border-arq-aqua/25 bg-arq-aqua/5'
              }`}
            >
              <p className="text-sm font-semibold text-arq-mist">{t(`wizard.success.actions.${a}` as const)}</p>
              {disabled && (
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-arq-sand/70">
                  {t('wizard.success.soon')}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-10">
        <Link
          href="/arqwelia"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-arq-mist/20 px-7 py-3 text-sm font-semibold text-arq-mist/80 transition-colors hover:bg-arq-mist/5"
        >
          {t('wizard.back')}
        </Link>
      </div>

      {/* Privacy cleanup: clear the wizard store on success, photos already gone */}
      <button
        type="button"
        onClick={() => {
          store.reset()
          try { sessionStorage.removeItem('arqwelia-result') } catch {}
        }}
        className="mt-6 text-[11px] text-arq-mist/30 underline underline-offset-2 hover:text-arq-mist/50"
      >
        Effacer mes données de session
      </button>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-t border-arq-mist/8 pt-2">
      <span className="text-arq-mist/50">{label}</span>
      <span className="font-semibold text-arq-mist">{value}</span>
    </div>
  )
}