'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWizardStore } from '@/lib/arqwelia/wizard-store'
import { buildConcepts } from '@/lib/arqwelia/fixtures'
import type { ArqConcept } from '@/lib/arqwelia/types'
import { arqTrackClient } from '@/lib/arqwelia/analytics-client'

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
      <p className="mt-3 rounded-xl border border-arq-sand/20 bg-arq-sand/5 p-3 text-xs text-arq-sand/80">
        ⚠ {t('wizard.concepts.desc')}
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
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
              className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-6 transition-all ${
                isSel
                  ? 'border-arq-aqua bg-arq-aqua/5 shadow-lg shadow-arq-aqua/20'
                  : 'border-arq-mist/12 bg-arq-ink/40 hover:border-arq-aqua/40'
              }`}
            >
              {/* Visual preview — local composition, no external service */}
              <div className="relative mb-5 flex h-32 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-arq-ink to-arq-navy">
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-30"
                  style={{
                    background:
                      c.tone === 'realiste'
                        ? 'radial-gradient(circle at 50% 60%, rgba(0,214,197,0.4), transparent 60%)'
                        : 'radial-gradient(circle at 30% 40%, rgba(67,207,245,0.45), transparent 55%), radial-gradient(circle at 70% 70%, rgba(232,216,183,0.3), transparent 50%)',
                  }}
                />
                <span className="relative font-aq-display text-3xl font-semibold text-arq-mist/80">
                  {c.id}
                </span>
                {/* Conceptual pool silhouette (CSS-only) */}
                <div
                  aria-hidden
                  className="absolute bottom-0 left-1/2 h-10 w-24 -translate-x-1/2 rounded-t-full bg-arq-aqua/20"
                />
              </div>

              <h2 className="text-lg font-bold text-arq-mist">{c.title}</h2>
              <p className="mt-1 text-sm text-arq-mist/60">{c.subtitle}</p>
              <p className="mt-3 text-sm text-arq-mist/70">{c.dimensions}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-arq-aqua/25 px-2.5 py-1 text-[11px] font-semibold text-arq-aqua">
                  {c.badgeSun}
                </span>
                <span className="rounded-full border border-arq-sand/25 px-2.5 py-1 text-[11px] font-semibold text-arq-sand/80">
                  {c.badgeAccess}
                </span>
                <span className="rounded-full border border-arq-mist/15 px-2.5 py-1 text-[11px] font-semibold text-arq-mist/60">
                  {c.badgeBudget}
                </span>
              </div>

              {/* Select button */}
              <div className="mt-5">
                <span
                  className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-4 py-3 text-sm font-bold transition-colors ${
                    isSel
                      ? 'bg-arq-aqua text-arq-navy'
                      : 'border border-arq-mist/20 text-arq-mist/70'
                  }`}
                >
                  {isSel ? '✓ ' + t('wizard.concepts.selected') : t('wizard.concepts.selectBtn')}
                </span>
              </div>
            </article>
          )
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          disabled={!selected}
          onClick={() => router.push('/arqwelia/start/contact')}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-arq-aqua px-7 py-3 text-sm font-bold text-arq-navy transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('wizard.next')}
        </button>
      </div>
    </div>
  )
}