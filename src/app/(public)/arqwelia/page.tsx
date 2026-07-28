/**
 * ARQWELIA V2 — Landing page (premium "7 of 10" direction).
 *
 * Server component. All visible copy via next-intl `arqwelia.*` (FR / EN only
 * — see ARQWELIA_LOT1.md). Real React components + SVG scenes, no pasted images.
 *
 * Sections (in order):
 *  1. Hero (with premium AR-scene visual + badge)
 *  2. Bande de confiance (premium cards)
 *  3. Parcours en 7 étapes (with status: live / demo / soon)
 *  4. Avant / après
 *  5. IA + AR
 *  6. Reality Score
 *  7. Project Passport
 *  8. Professionnels vérifiés
 *  9. Protection des coordonnées
 * 10. Liste d'attente piscinistes
 * 11. FAQ
 * 12. CTA final
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { isArqweliaLot1Enabled } from '@/lib/features'
import { ArqweliaPartnerForm } from '@/components/arqwelia/partner-form'
import {
  ArqweliaPrimaryButton,
  ArqweliaSecondaryButton,
  ArqweliaGlassCard,
  ArqweliaLabel,
  ArqweliaFutureFeature,
  ArqweliaStep,
  ArqweliaScore,
  ArqweliaBeforeAfter,
  ArqweliaProfessionalCard,
} from '@/components/arqwelia/ui'
import { ArqweliaScene, ArqweliaSymbol } from '@/components/arqwelia/brand'

export const viewport = { width: 'device-width', initialScale: 1 }

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('arqwelia')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/arqwelia' },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
      url: '/arqwelia',
    },
    robots: isArqweliaLot1Enabled() ? 'index, follow' : 'noindex, nofollow',
  }
}

export default async function ArqweliaLanding() {
  const t = await getTranslations('arqwelia')
  const enabled = isArqweliaLot1Enabled()
  const startHref = enabled ? '/arqwelia/start/photos' : '/arqwelia/start/analysis?demo=1'

  return (
    <div className="relative">
      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <section className="relative px-4 pb-28 pt-20 sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <ArqweliaLabel>
                <ArqweliaSymbol className="h-4 w-4" withGlow={false} />
                {t('demoBadge')}
              </ArqweliaLabel>
              <h1 className="mt-6 font-aq-display text-4xl font-semibold leading-[1.02] text-white sm:text-5xl lg:text-6xl">
                {t('tagline')}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
                {t('subtitle')}
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <ArqweliaPrimaryButton href={startHref}>{t('ctaPrimary')}</ArqweliaPrimaryButton>
                <ArqweliaSecondaryButton href="/arqwelia/start/analysis?demo=1">{t('ctaSecondary')}</ArqweliaSecondaryButton>
              </div>
              <p className="mt-8 text-sm text-white/40">{t('privacyPromise')}</p>
            </div>

            {/* Premium AR-scene visual (CSS/SVG — not an external photo) */}
            <ArqweliaScene variant="dusk-pool" className="aspect-[4/3] w-full rounded-3xl border border-white/[0.08] shadow-arq-deep">
              {/* Conceptual pool silhouette */}
              <div className="absolute inset-x-0 bottom-0 h-2/5" aria-hidden style={{ background: 'linear-gradient(180deg, rgba(0,214,197,0.03), rgba(0,214,197,0.18))' }} />
              <div className="absolute left-1/2 top-[62%] h-20 w-48 -translate-x-1/2 rounded-2xl" aria-hidden style={{ background: 'linear-gradient(180deg, #5CF2E6, #073C45)', boxShadow: 'var(--arqwelia-glow-aqua-strong)' }} />
              <div className="absolute left-1/2 top-[62%] h-20 w-48 -translate-x-1/2 rounded-2xl border border-arq-aqua-bright/45" aria-hidden />
              {/* AR overlay corners */}
              <div className="pointer-events-none absolute inset-6" aria-hidden>
                <span className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-arq-aqua/50" />
                <span className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-arq-aqua/50" />
                <span className="absolute left-0 bottom-0 h-6 w-6 border-l-2 border-b-2 border-arq-aqua/50" />
                <span className="absolute right-0 bottom-0 h-6 w-6 border-r-2 border-b-2 border-arq-aqua/50" />
              </div>
              <div className="absolute inset-0 rounded-3xl" aria-hidden style={{ boxShadow: 'inset 0 0 80px 0 rgba(3,15,26,0.60)' }} />
            </ArqweliaScene>
          </div>
        </div>
      </section>

      {/* ── 2. Bande de confiance ─────────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-white/[0.02] py-8">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 sm:grid-cols-4 sm:px-6">
          {(['IA', 'AR', 'pros', 'privacy'] as const).map((k) => (
            <div key={k} className="flex items-center justify-center gap-2.5 text-center text-xs font-semibold uppercase tracking-wider text-white/55">
              <span className="h-1.5 w-1.5 rounded-full bg-arq-aqua" style={{ boxShadow: 'var(--arqwelia-glow-aqua)' }} />
              {(k === 'IA' ? t('iaArTag').split(' & ')[0] : k === 'AR' ? t('iaArTag').split(' & ')[1] : k === 'pros' ? t('prosTag').split(' ')[0] : t('trustStrip').split(' · ')[3])}
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. Parcours en 7 étapes ────────────────────────────────────── */}
      <section id="parcours" className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="font-aq-display text-3xl font-semibold text-white sm:text-4xl">
              {t('stepsTitle')}
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { n: 1, status: 'live' as const },
              { n: 2, status: 'live' as const },
              { n: 3, status: 'live' as const },
              { n: 4, status: 'demo' as const },
              { n: 5, status: 'live' as const },
              { n: 6, status: 'live' as const },
              { n: 7, status: 'soon' as const },
            ].map((s) => (
              <ArqweliaStep
                key={s.n}
                n={s.n}
                status={s.status}
                title={t(`steps.${s.n}.title` as const)}
                desc={t(`steps.${s.n}.desc` as const)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Avant / après ───────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <ArqweliaLabel>{t('iaArTag').split(' & ')[1]}</ArqweliaLabel>
            <h2 className="mt-2 font-aq-display text-3xl font-semibold text-white sm:text-4xl">{t('beforeAfterTitle')}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/60">{t('beforeAfterDesc')}</p>
          </div>
          <ArqweliaBeforeAfter />
        </div>
      </section>

      {/* ── 5. IA + AR ─────────────────────────────────────────────────── */}
      <section id="ia-ar" className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <ArqweliaGlassCard className="overflow-hidden" border="strong">
            <div className="grid gap-0 lg:grid-cols-2">
              <ArqweliaScene variant="ar-overlay" className="hidden aspect-square lg:block" />
              <div className="p-8 sm:p-10">
                <ArqweliaLabel>{t('iaArTag')}</ArqweliaLabel>
                <h2 className="mt-3 font-aq-display text-2xl font-semibold text-white sm:text-3xl">{t('iaArTitle')}</h2>
                <p className="mt-4 text-sm text-white/65">{t('iaArDesc')}</p>
                <ul className="mt-6 space-y-3">
                  {(['vision', 'ar', 'verified'] as const).map((k) => (
                    <li key={k} className="flex items-start gap-3 text-sm text-white/80">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-arq-aqua" style={{ boxShadow: 'var(--arqwelia-glow-aqua)' }} />
                      <span>
                        {t(`iaArPoints.${k}` as const)}
                        {' '}<ArqweliaFutureFeature kind="future" />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </ArqweliaGlassCard>
        </div>
      </section>

      {/* ── 6. Reality Score ───────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <ArqweliaGlassCard className="p-8 text-center sm:p-12">
            <ArqweliaLabel>{t('scoreTag')}</ArqweliaLabel>
            <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
              <div className="flex justify-center"><ArqweliaScore value={74} label={t('scoreTag')} demo /></div>
              <div className="max-w-md text-left">
                <h2 className="font-aq-display text-2xl font-semibold text-white">{t('scoreTitle')}</h2>
                <p className="mt-3 text-sm text-white/60">{t('scoreDesc')}</p>
              </div>
            </div>
          </ArqweliaGlassCard>
        </div>
      </section>

      {/* ── 7. Project Passport ────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <ArqweliaLabel>{t('passportTag')}</ArqweliaLabel>
          <h2 className="mt-3 font-aq-display text-3xl font-semibold text-white sm:text-4xl">{t('passportTitle')}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/60">{t('passportDesc')}</p>
          <div className="mx-auto mt-10 max-w-md">
            <ArqweliaGlassCard className="overflow-hidden p-0" border="gold">
              <div className="flex items-center gap-3 border-b border-arq-border-gold px-5 py-3">
                <ArqweliaSymbol className="h-5 w-5" withGlow={false} />
                <span className="font-aq-display text-sm font-semibold text-white">PROJECT PASSPORT</span>
                <span className="ml-auto"><ArqweliaFutureFeature kind="soon">{t('passportActions.keep')}</ArqweliaFutureFeature></span>
              </div>
              <div className="space-y-3 p-5 text-left text-sm">
                <div className="flex justify-between"><span className="text-white/45">Identifiant</span><span className="font-aq-display text-base font-semibold text-arq-aqua">ARQ-7K3-XYZ</span></div>
                <div className="flex justify-between"><span className="text-white/45">Concept</span><span className="text-white/80">A — Réaliste</span></div>
                <div className="flex justify-between"><span className="text-white/45">{t('wizard.contact.postalCode')}</span><span className="text-white/80">33000</span></div>
                <div className="flex justify-between border-t border-white/[0.06] pt-3"><span className="text-white/45">{t('scoreTag')}</span><span className="font-semibold text-arq-aqua">74 / 100 <span className="text-[10px] uppercase text-arq-gold-soft/80">Démo</span></span></div>
              </div>
            </ArqweliaGlassCard>
          </div>
        </div>
      </section>

      {/* ── 8. Professionnels vérifiés ─────────────────────────────────── */}
      <section id="pros" className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <ArqweliaLabel>{t('prosTag')}</ArqweliaLabel>
            <h2 className="mt-3 font-aq-display text-3xl font-semibold text-white sm:text-4xl">{t('prosTitle')}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/60">{t('prosDesc')}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                { initials: 'AM', k: 1 },
                { initials: 'SB', k: 2 },
                { initials: 'FP', k: 3 },
              ] as const
            ).map((p) => (
              <ArqweliaProfessionalCard
                key={p.k}
                initials={p.initials}
                name={t(`prosCards.${p.k}.name` as const)}
                specialty={t(`prosCards.${p.k}.specialty` as const)}
                location={t(`prosCards.${p.k}.location` as const)}
              />
            ))}
          </div>
          <div className="mt-6 text-center">
            <ArqweliaFutureFeature kind="future">{t('steps.7.title')}</ArqweliaFutureFeature>
          </div>
        </div>
      </section>

      {/* ── 9. Protection des coordonnées ───────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <ArqweliaGlassCard className="p-8 text-center" border="strong">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-arq-aqua/30 bg-arq-aqua/10">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#00D6C5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <p className="mt-5 text-lg font-medium text-white">{t('privacyPromise')}</p>
          </ArqweliaGlassCard>
        </div>
      </section>

      {/* ── 10. Liste d'attente piscinistes ─────────────────────────────── */}
      <section id="partenaire" className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <ArqweliaGlassCard className="p-8" border="gold">
            <ArqweliaLabel>{t('partnerTitle')}</ArqweliaLabel>
            <h2 className="mt-3 font-aq-display text-2xl font-semibold text-white sm:text-3xl">{t('partnerTitle')}</h2>
            <p className="mt-2 text-sm text-white/65">{t('partnerSubtitle')}</p>
            <div className="mt-6"><ArqweliaPartnerForm /></div>
          </ArqweliaGlassCard>
        </div>
      </section>

      {/* ── 11. FAQ ─────────────────────────────────────────────────────── */}
      <section id="faq" className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-aq-display text-3xl font-semibold text-white">{t('faqTitle')}</h2>
          <div className="mt-8 space-y-4">
            {[1, 2, 3].map((n) => (
              <ArqweliaGlassCard key={n} className="p-5">
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-white">{t(`faq.q${n}` as const)}</summary>
                  <p className="mt-3 text-sm text-white/60">{t(`faq.a${n}` as const)}</p>
                </details>
              </ArqweliaGlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── 12. CTA final ───────────────────────────────────────────────── */}
      <section className="relative px-4 pb-28 pt-12 text-center sm:px-6">
        <div className="absolute inset-0 -z-10" aria-hidden style={{ background: 'radial-gradient(60% 50% at 50% 30%, rgba(0,214,197,0.10), transparent 60%)' }} />
        <h2 className="font-aq-display text-3xl font-semibold text-white sm:text-4xl">{t('finalCtaTitle')}</h2>
        <p className="mx-auto mt-3 max-w-xl text-white/60">{t('finalCtaSubtitle')}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ArqweliaPrimaryButton href={startHref}>{t('ctaPrimary')}</ArqweliaPrimaryButton>
          <ArqweliaSecondaryButton href="/arqwelia/start/analysis?demo=1">{t('ctaSecondary')}</ArqweliaSecondaryButton>
        </div>
      </section>
    </div>
  )
}