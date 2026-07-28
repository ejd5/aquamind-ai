'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
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
    <div className="pb-8">
      <Link href="/arqwelia/start/analysis" className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-arq-aqua transition-colors hover:text-arq-aqua-bright">
        ← {t('wizard.back')}
      </Link>

      <div className="relative mb-10">
        <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-arq-aqua/5 blur-3xl" aria-hidden />
        <h1 className="relative font-aq-display text-3xl font-semibold text-white sm:text-4xl">
          {t('wizard.concepts.title')}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
          {t('wizard.concepts.desc')}
        </p>
        <div className="mt-4"><ArqweliaFutureFeature kind="demo" /></div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {concepts.map((c, i) => {
          const isSel = selected === c.id
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, duration: 0.4 }}
              role="button"
              tabIndex={0}
              aria-pressed={isSel}
              onClick={() => selectConcept(c.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectConcept(c.id) }}
              className="group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-arq-aqua/60 focus-visible:ring-offset-2 focus-visible:ring-offset-arq-navy-deep rounded-2xl"
            >
              <ArqweliaGlassCard
                className={`overflow-hidden p-0 transition-all duration-300 ${isSel ? 'shadow-arq-glow scale-[1.02]' : 'hover:scale-[1.01]'}`}
                border={isSel ? 'strong' : 'default'}
                glow={isSel}
              >
                {/* Premium scene header */}
                <ArqweliaScene
                  variant={c.tone === 'realiste' ? 'dusk-pool' : 'ar-overlay'}
                  className="relative aspect-[16/9] w-full"
                >
                  {/* Concept letter watermark */}
                  <span className="absolute left-4 top-3 font-aq-display text-4xl font-bold text-white/40">{c.id}</span>

                  {/* Tone badge */}
                  <span className={`absolute right-4 top-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${c.tone === 'realiste' ? 'border-arq-aqua/40 bg-arq-aqua/10 text-arq-aqua' : 'border-[var(--arqwelia-border-gold)] bg-arq-champagne/5 text-arq-gold-soft'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${c.tone === 'realiste' ? 'bg-arq-aqua' : 'bg-arq-gold-soft'}`} />
                    {c.tone === 'realiste' ? t('wizard.concepts.toneRealiste') : t('wizard.concepts.toneInspiration')}
                  </span>

                  {/* Premium garden scene for Realiste */}
                  {c.tone === 'realiste' ? (
                    <>
                      <div className="absolute inset-x-0 bottom-0 h-[40%]" aria-hidden style={{
                        background: 'linear-gradient(180deg, rgba(12,37,51,0.3), rgba(6,24,38,0.6))',
                      }}>
                        <div className="absolute inset-x-[12%] bottom-[15%] h-[60%] rounded-[1.5rem] border border-white/[0.04]" style={{
                          background: 'linear-gradient(180deg, rgba(50,40,30,0.35), rgba(25,20,15,0.5))',
                        }} />
                      </div>
                      <div className="absolute left-[18%] right-[18%] top-[28%] bottom-[32%]" aria-hidden style={{
                        background: 'linear-gradient(135deg, rgba(0,214,197,0.3), rgba(92,242,230,0.12) 40%, rgba(0,100,120,0.25) 100%)',
                        borderRadius: '45% 55% 50% 50% / 40% 45% 55% 60%',
                        boxShadow: 'inset 0 -4px 20px rgba(0,214,197,0.12)',
                      }}>
                        <div className="absolute inset-0" style={{
                          background: 'radial-gradient(40% 20% at 30% 40%, rgba(255,255,255,0.1), transparent 70%)',
                          borderRadius: 'inherit',
                        }} />
                      </div>
                      <div className="absolute bottom-[34%] left-[6%] h-[35%] w-[10%]" aria-hidden style={{
                        background: 'radial-gradient(80% 100% at 50% 100%, rgba(40,80,50,0.5), transparent 70%)',
                        filter: 'blur(3px)',
                      }} />
                      <div className="absolute bottom-[30%] right-[4%] h-[40%] w-[12%]" aria-hidden style={{
                        background: 'radial-gradient(80% 100% at 50% 100%, rgba(50,90,60,0.4), transparent 70%)',
                        filter: 'blur(4px)',
                      }} />
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-x-0 bottom-0 h-[40%]" aria-hidden style={{
                        background: 'linear-gradient(180deg, rgba(67,207,245,0.04), rgba(198,165,107,0.14))',
                      }}>
                        <div className="absolute inset-x-[15%] bottom-[12%] h-[55%] rounded-[2rem] border border-white/[0.03]" style={{
                          background: 'linear-gradient(180deg, rgba(40,35,30,0.3), rgba(20,15,10,0.5))',
                        }} />
                      </div>
                      <div className="absolute left-[20%] right-[20%] top-[25%] bottom-[35%]" aria-hidden style={{
                        background: 'linear-gradient(135deg, rgba(67,207,245,0.2), rgba(198,165,107,0.08) 50%, rgba(0,100,120,0.15) 100%)',
                        borderRadius: '50% 45% 55% 45% / 45% 50% 50% 55%',
                        boxShadow: 'inset 0 -4px 20px rgba(198,165,107,0.08)',
                      }}>
                        <div className="absolute inset-0" style={{
                          background: 'radial-gradient(30% 15% at 60% 35%, rgba(198,165,107,0.08), transparent 60%)',
                          borderRadius: 'inherit',
                        }} />
                      </div>
                      <div className="absolute bottom-[32%] right-[6%] h-[38%] w-[14%]" aria-hidden style={{
                        background: 'radial-gradient(80% 100% at 50% 100%, rgba(60,80,50,0.35), transparent 70%)',
                        filter: 'blur(4px)',
                      }} />
                    </>
                  )}

                  {/* AR scan line */}
                  <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-arq-aqua/20 to-transparent" aria-hidden />
                  <div className="absolute inset-0" aria-hidden style={{ boxShadow: 'inset 0 0 60px 0 rgba(3,15,26,0.45)' }} />
                </ArqweliaScene>

                {/* Body */}
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold text-white">{t(c.title)}</h2>
                      <p className="mt-0.5 text-sm text-white/60">{t(c.subtitle)}</p>
                    </div>
                    {isSel && (
                      <span className="shrink-0 rounded-full border border-arq-aqua/40 bg-arq-aqua/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-arq-aqua">
                        ✓ {t('wizard.concepts.selected')}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-sm text-white/75">{c.dimensions}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-arq-aqua/25 px-2.5 py-1 text-[11px] font-semibold text-arq-aqua">{t(c.badgeSun as any)}</span>
                    <span className="rounded-full border border-[var(--arqwelia-border-gold)] px-2.5 py-1 text-[11px] font-semibold text-arq-gold-soft/80">{t(c.badgeAccess as any)}</span>
                    <span className="rounded-full border border-white/[0.10] px-2.5 py-1 text-[11px] font-semibold text-white/55">{t(c.badgeBudget as any)}</span>
                  </div>

                  <div className="mt-5">
                    <span className={`inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-4 py-3 text-sm font-bold transition-all duration-300 ${isSel ? 'text-arq-navy-deep shadow-lg' : 'border border-white/[0.12] text-white/65 hover:border-arq-aqua/40 hover:text-white/90'}`} style={isSel ? { background: 'var(--arqwelia-gradient-premium)', boxShadow: 'var(--arqwelia-glow-aqua)' } : undefined}>
                      {isSel ? (
                        <span className="inline-flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                          {t('wizard.concepts.selected')}
                        </span>
                      ) : t('wizard.concepts.selectBtn')}
                    </span>
                  </div>
                </div>
              </ArqweliaGlassCard>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-10 flex items-center justify-between gap-4">
        <p className="text-xs text-white/40">
          {selected ? t('wizard.concepts.confirmHint') : t('wizard.concepts.promptHint')}
        </p>
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