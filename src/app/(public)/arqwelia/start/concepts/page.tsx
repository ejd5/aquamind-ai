'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWizardStore } from '@/lib/arqwelia/wizard-store'
import { buildConcepts } from '@/lib/arqwelia/fixtures'
import type { ArqConcept } from '@/lib/arqwelia/types'
import { arqTrackClient } from '@/lib/arqwelia/analytics-client'
import {
  ArqweliaGlassCard,
  ArqweliaLabel,
  ArqweliaFutureFeature,
  ArqweliaPrimaryButton,
} from '@/components/arqwelia/ui'
import { ArqweliaScene } from '@/components/arqwelia/brand'

export default function ConceptsStep() {
  const t = useTranslations('arqwelia')
  const router = useRouter()
  const store = useWizardStore()
  const concepts = buildConcepts(store.questionnaire)
  const selected = store.selectedConcept

  function selectConcept(c: ArqConcept) {
    store.selectConcept(c)
    void arqTrackClient('arq_concept_selected', { concept: c })
  }

  return (
    <div>
      <Link href="/arqwelia/start/analysis" className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-arq-aqua">
        ← {t('wizard.back')}
      </Link>
      <h1 className="font-aq-display text-3xl font-semibold text-arq-mist sm:text-4xl">
        {t('wizard.concepts.title')}
      </h1>
      <div className="mt-3"><ArqweliaFutureFeature kind="demo">{t('wizard.concepts.desc')}</ArqweliaFutureFeature></div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {concepts.map((c) => {
          const isSel = selected === c.id
          return (
            <article
              key={c.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSel}
              onClick={() => selectConcept(c.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectConcept(c.id) }}
              className="group cursor-pointer focus:outline-none"
            >
              <ArqweliaGlassCard
                className={`overflow-hidden p-0 transition-all ${isSel ? 'shadow-arq-glow' : ''}`}
                border={isSel ? 'strong' : 'default'}
                glow={isSel}
              >
                {/* Rich visual header */}
                <ArqweliaScene
                  variant={c.tone === 'realiste' ? 'dusk-pool' : 'ar-overlay'}
                  className="relative aspect-[16/10] w-full"
                >
                  {/* Concept letter watermark */}
                  <span className="absolute left-4 top-3 font-aq-display text-3xl font-semibold text-arq-mist/70">{c.id}</span>
                  {/* Tone badge */}
                  <span className={`absolute right-4 top-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${c.tone === 'realiste' ? 'border-arq-aqua/40 bg-arq-aqua/10 text-arq-aqua' : 'border-[var(--arqwelia-border-gold)] bg-arq-champagne/5 text-arq-gold-soft'}`}>
                    {c.tone === 'realiste' ? 'Réaliste' : 'Inspiration'}
                  </span>
                  {/* Conceptual pool silhouette */}
                  <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: c.tone === 'realiste' ? 'linear-gradient(180deg, rgba(0,214,197,0.06), rgba(0,214,197,0.20))' : 'linear-gradient(180deg, rgba(67,207,245,0.06), rgba(198,165,107,0.18))' }} />
                  <div
                    className="absolute left-1/2 top-[60%] h-16 w-36 -translate-x-1/2 rounded-xl"
                    style={{ background: c.tone === 'realiste' ? 'linear-gradient(180deg, #5CF2E6, #073C45)' : 'linear-gradient(180deg, #43CFF5, #0A2A3C)', boxShadow: 'var(--arqwelia-glow-aqua)' }}
                  />
                  <div className="absolute left-1/2 top-[60%] h-16 w-36 -translate-x-1/2 rounded-xl border border-arq-aqua-bright/40" />
                </ArqweliaScene>

                {/* Body */}
                <div className="p-5">
                  <h2 className="text-lg font-bold text-arq-mist">{c.title}</h2>
                  <p className="mt-1 text-sm text-arq-mist/60">{c.subtitle}</p>
                  <p className="mt-3 text-sm text-arq-mist/75">{c.dimensions}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-arq-aqua/25 px-2.5 py-1 text-[11px] font-semibold text-arq-aqua">{c.badgeSun}</span>
                    <span className="rounded-full border border-[var(--arqwelia-border-gold)] px-2.5 py-1 text-[11px] font-semibold text-arq-gold-soft/80">{c.badgeAccess}</span>
                    <span className="rounded-full border border-arq-mist/15 px-2.5 py-1 text-[11px] font-semibold text-arq-mist/60">{c.badgeBudget}</span>
                  </div>

                  <div className="mt-5">
                    <span className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-4 py-3 text-sm font-bold transition-colors ${isSel ? 'text-arq-navy-deep' : 'border border-arq-border-strong text-arq-mist/70'}`} style={isSel ? { background: 'var(--arqwelia-gradient-premium)' } : undefined}>
                      {isSel ? '✓ ' + t('wizard.concepts.selected') : t('wizard.concepts.selectBtn')}
                    </span>
                  </div>
                </div>
              </ArqweliaGlassCard>
            </article>
          )
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <ArqweliaPrimaryButton
          onClick={() => router.push('/arqwelia/start/contact')}
          disabled={!selected}
        >
          {t('wizard.next')}
        </ArqweliaPrimaryButton>
      </div>
    </div>
  )
}