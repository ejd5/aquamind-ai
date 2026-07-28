'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useWizardStore } from '@/lib/arqwelia/wizard-store'
import {
  ArqweliaGlassCard,
  ArqweliaFutureFeature,
  ArqweliaPrimaryButton,
  ArqweliaScore,
} from '@/components/arqwelia/ui'
import { ArqweliaSymbol } from '@/components/arqwelia/brand'

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
  const [data] = useState<ResultData | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = sessionStorage.getItem('arqwelia-result')
      return raw ? (JSON.parse(raw) as ResultData) : null
    } catch {
      return null
    }
  })

  const conceptLabel = data ? `Concept ${data.selectedConcept}` : '—'

  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-arq-aqua/40 bg-arq-aqua/10" style={{ boxShadow: 'var(--arqwelia-glow-aqua)' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00D6C5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h1 className="mt-6 font-aq-display text-3xl font-semibold text-white sm:text-4xl">
        {t('wizard.success.title')}
      </h1>

      {/* Premium Project Passport card */}
      {data && (
        <ArqweliaGlassCard className="mt-8 overflow-hidden p-0" border="gold">
          {/* Header strip */}
          <div className="flex items-center gap-3 border-b border-[var(--arqwelia-border-gold)] px-6 py-4" style={{ background: 'linear-gradient(120deg, rgba(198,165,107,0.10), transparent)' }}>
            <ArqweliaSymbol className="h-6 w-6" withGlow={false} />
            <span className="font-aq-display text-sm font-semibold tracking-wide text-white">PROJECT PASSPORT</span>
            <span className="ml-auto"><ArqweliaFutureFeature kind="soon">{t('passportActions.keep')}</ArqweliaFutureFeature></span>
          </div>

          <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
            {/* Identity */}
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">{t('wizard.success.idLabel')}</p>
              <p className="mt-1 font-aq-display text-3xl font-semibold text-arq-aqua" style={{ filter: 'var(--arqwelia-glow-aqua)' }}>{data.publicId}</p>

              <div className="mt-6 space-y-3 text-sm">
                <Row label={t('wizard.questionnaire.projectType')} value={data.projectType ? safeT(t, `wizard.questionnaire.projectTypes.${data.projectType}`) : '—'} />
                <Row label={t('wizard.questionnaire.timeline')} value={data.timeline ? safeT(t, `wizard.questionnaire.timelines.${data.timeline}`) : '—'} />
                <Row label={t('wizard.questionnaire.budget')} value={data.budgetRange ? safeT(t, `wizard.questionnaire.budgets.${data.budgetRange}`) : '—'} />
                <Row label={t('wizard.questionnaire.style')} value={data.style ? safeT(t, `wizard.questionnaire.styles.${data.style}`) : '—'} />
                <Row label={t('wizard.concepts.title')} value={conceptLabel} />
                <Row label={t('wizard.contact.postalCode')} value="•••••" muted />
              </div>
            </div>

            {/* Reality Score gauge */}
            <div className="flex flex-col items-center justify-center gap-3 border-t border-white/[0.06] pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
              <ArqweliaScore value={data.realityScoreDemo} label={t('scoreTag')} demo />
              <p className="max-w-[220px] text-center text-[11px] text-white/35">
                {t('scoreDesc')}
              </p>
            </div>
          </div>
        </ArqweliaGlassCard>
      )}

      {/* Three actions — premium row */}
      <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
        {(['keep', 'share', 'findPro'] as const).map((a) => {
          const disabled = a !== 'keep'
          return (
            <ArqweliaGlassCard key={a} className="p-5 text-center" border={disabled ? 'default' : 'strong'}>
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-arq-aqua/30 bg-arq-aqua/10">
                {a === 'keep' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D6C5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
                )}
                {a === 'share' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D6C5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
                )}
                {a === 'findPro' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D6C5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" /></svg>
                )}
              </div>
              <p className="text-sm font-semibold text-white">{t(`passportActions.${a}`)}</p>
              {disabled && <div className="mt-1.5"><ArqweliaFutureFeature kind="soon" /></div>}
            </ArqweliaGlassCard>
          )
        })}
      </div>

      {/* Next steps + privacy cleanup */}
      <div className="mx-auto mt-10 flex flex-col items-center gap-3">
        <Link href="/arqwelia" className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/[0.12] px-8 py-3.5 text-sm font-semibold text-white/80 transition-colors hover:bg-arq-aqua/5">
          {t('wizard.back')}
        </Link>
        <button
          type="button"
          onClick={() => {
            store.reset()
            try { sessionStorage.removeItem('arqwelia-result') } catch {}
          }}
          className="text-[11px] text-white/25 underline underline-offset-2 hover:text-white/45"
        >
          Effacer mes données de session
        </button>
      </div>
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 first:border-t-0 first:pt-0">
      <span className="text-white/45">{label}</span>
      <span className={`font-semibold ${muted ? 'text-white/35' : 'text-white/80'}`}>{value}</span>
    </div>
  )
}

function safeT(t: (k: string) => string, key: string): string {
  try { const v = t(key); return v || key } catch { return key }
}