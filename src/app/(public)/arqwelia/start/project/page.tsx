'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWizardStore } from '@/lib/arqwelia/wizard-store'
import type { ArqProjectType, ArqTimeline, ArqBudget, ArqStyle } from '@/lib/arqwelia/types'
import { arqTrackClient } from '@/lib/arqwelia/analytics-client'
import {
  ArqweliaGlassCard,
  ArqweliaLabel,
  ArqweliaPrimaryButton,
} from '@/components/arqwelia/ui'

const OPTIONS = {
  projectType: [
    { v: 'buried_pool', k: 'buried_pool' },
    { v: 'mini_pool', k: 'mini_pool' },
    { v: 'spa_swim_spa', k: 'spa_swim_spa' },
  ] as { v: ArqProjectType; k: string }[],
  timeline: [
    { v: '<6m', k: '<6m' },
    { v: '6-12m', k: '6-12m' },
    { v: '>12m', k: '>12m' },
    { v: 'undecided', k: 'undecided' },
  ] as { v: ArqTimeline; k: string }[],
  budget: [
    { v: '<25k', k: '<25k' },
    { v: '25-40k', k: '25-40k' },
    { v: '40-60k', k: '40-60k' },
    { v: '>60k', k: '>60k' },
    { v: 'undefined', k: 'undefined' },
  ] as { v: ArqBudget; k: string }[],
  style: [
    { v: 'mediterranean', k: 'mediterranean' },
    { v: 'contemporary', k: 'contemporary' },
    { v: 'natural', k: 'natural' },
    { v: 'familial', k: 'familial' },
  ] as { v: ArqStyle; k: string }[],
}

type FieldKey = 'projectType' | 'timeline' | 'budget' | 'style'

function OptionsSection({
  field,
  options,
  label,
  selected,
  onSelect,
  translate,
}: {
  field: FieldKey
  options: { v: string; k: string }[]
  label: string
  selected: string | undefined
  onSelect: (value: string) => void
  translate: (key: string) => string
}) {
  return (
    <div>
      <p className="mb-2.5 text-sm font-semibold text-white">{label}</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {options.map((o) => {
          const isSel = selected === o.v
          return (
            <button
              type="button"
              key={o.v}
              aria-pressed={isSel}
              onClick={() => onSelect(o.v)}
              className={`min-h-[52px] rounded-xl border px-5 py-3 text-left text-sm transition-all ${
                isSel
                  ? 'border-arq-aqua bg-arq-aqua/10 text-white shadow-arq-glow'
                  : 'border-white/[0.08] text-white/70 hover:border-arq-aqua/40'
              }`}
              style={isSel ? undefined : { background: 'var(--arqwelia-gradient-card)' }}
            >
              <span className="flex items-center gap-3">
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${isSel ? 'border-arq-aqua' : 'border-white/25'}`}>
                  {isSel && <span className="h-2 w-2 rounded-full bg-arq-aqua" />}
                </span>
                {translate(`wizard.questionnaire.${String(field)}s.${o.k}`)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function ProjectStep() {
  const t = useTranslations('arqwelia')
  const router = useRouter()
  const store = useWizardStore()
  const q = store.questionnaire

  const ready = q.projectType && q.timeline && q.budget && q.style

  return (
    <div>
      <Link href="/arqwelia/start/photos" className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-arq-aqua">
        ← {t('wizard.back')}
      </Link>
      <h1 className="font-aq-display text-3xl font-semibold text-white sm:text-4xl">
        {t('wizard.questionnaire.title')}
      </h1>

      <div className="mt-8 space-y-7">
        <OptionsSection field="projectType" options={OPTIONS.projectType} label={t('wizard.questionnaire.projectType')} selected={q.projectType} onSelect={(v) => store.setQuestionnaire({ projectType: v as ArqProjectType })} translate={(k) => t(k as any)} />
        <OptionsSection field="timeline" options={OPTIONS.timeline} label={t('wizard.questionnaire.timeline')} selected={q.timeline} onSelect={(v) => store.setQuestionnaire({ timeline: v as ArqTimeline })} translate={(k) => t(k as any)} />
        <OptionsSection field="budget" options={OPTIONS.budget} label={t('wizard.questionnaire.budget')} selected={q.budget} onSelect={(v) => store.setQuestionnaire({ budget: v as ArqBudget })} translate={(k) => t(k as any)} />
        <OptionsSection field="style" options={OPTIONS.style} label={t('wizard.questionnaire.style')} selected={q.style} onSelect={(v) => store.setQuestionnaire({ style: v as ArqStyle })} translate={(k) => t(k as any)} />

        {/* Optional known measurement */}
        <div className="rounded-xl border border-white/[0.08] p-5" style={{ background: 'var(--arqwelia-gradient-card)' }}>
          <p className="text-sm font-semibold text-white">{t('wizard.questionnaire.knownMeasureTitle')}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input
              aria-label={t('wizard.questionnaire.knownMeasureLabel')}
              placeholder={t('wizard.questionnaire.knownMeasureLabel')}
              value={q.knownMeasureLabel ?? ''}
              onChange={(e) => store.setQuestionnaire({ knownMeasureLabel: e.target.value })}
              className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-arq-aqua/50"
            />
            <input
              type="number"
              aria-label={t('wizard.questionnaire.knownMeasureValue')}
              placeholder={t('wizard.questionnaire.knownMeasureValue')}
              value={q.knownMeasureValue ?? ''}
              onChange={(e) => store.setQuestionnaire({ knownMeasureValue: e.target.value ? Number(e.target.value) : undefined })}
              className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-arq-aqua/50"
            />
            <select
              aria-label={t('wizard.questionnaire.knownMeasureUnit')}
              value={q.knownMeasureUnit ?? 'm'}
              onChange={(e) => store.setQuestionnaire({ knownMeasureUnit: e.target.value })}
              className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-arq-aqua/50"
            >
              <option value="m">{t('wizard.questionnaire.measureUnitM')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          disabled={!ready}
          onClick={() => {
            void arqTrackClient('arq_questionnaire_completed', {
              projectType: q.projectType ?? null,
              timeline: q.timeline ?? null,
              budget: q.budget ?? null,
              style: q.style ?? null,
            })
            router.push('/arqwelia/start/analysis')
          }}
          className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-arq-aqua px-8 py-3.5 text-sm font-bold text-arq-navy transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('wizard.next')}
        </button>
      </div>
    </div>
  )
}