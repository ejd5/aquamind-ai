/**
 * ARQWELIA V2 — Pro preview ("ARQWELIA Studio" identity).
 *
 * URL: /pro/arqwelia/opportunities?demo=1
 * Protected by Pro auth + role. Renders an ANONYMIZED demo opportunity
 * (fixed fixture). Shows: projet, budget, calendrier, style, concept,
 * maturity score (démo), informations manquantes, disponibilité future
 * du matching, intérêt désactivé + explication. No real contact revealed.
 */
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTranslations, getMessages } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'
import { DEMO_PRO_OPPORTUNITY } from '@/lib/arqwelia/fixtures'
import { forceArqLocale } from '@/lib/arqwelia/i18n'
import {
  ArqweliaGlassCard,
  ArqweliaLabel,
  ArqweliaFutureFeature,
  ArqweliaScore,
} from '@/components/arqwelia/ui'
import { ArqweliaBrand } from '@/components/arqwelia/brand'

export const metadata: Metadata = {
  title: 'ARQWELIA Studio — professional preview',
  description: 'Anonymized opportunity preview. No real leads distributed in Lot 1.',
  robots: 'noindex, nofollow',
}

const MISSING_KEYS = ['pro.missing.photos', 'pro.missing.measure', 'pro.missing.consent'] as const
const MISSING_EN = ['Plot photos', 'Precise measurement (m)', 'Contact consent']

export default async function ProPreviewPage({
  searchParams,
}: {
  searchParams: { demo?: string }
}) {
  const t = await getTranslations('arqwelia')
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/pro/arqwelia/opportunities')
  }

  // Force FR/EN for the ARQWELIA pro preview (Option B).
  const forced = await forceArqLocale()
  const messages = await getMessages({ locale: forced })

  const missing = MISSING_KEYS

  return (
    <NextIntlClientProvider locale={forced} messages={messages}>
    <div className="relative min-h-screen px-4 py-10 text-white sm:px-6" style={{ background: 'var(--arqwelia-gradient-hero)' }}>
      <div className="mx-auto max-w-4xl">
        <ArqweliaBrand size="lg" showByAqwelia />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <h1 className="font-aq-display text-3xl font-semibold sm:text-4xl">{t('pro.title')}</h1>
          <ArqweliaFutureFeature kind="demo">{t('demoBadge')}</ArqweliaFutureFeature>
        </div>
        <p className="mt-2 text-sm text-white/65">{t('pro.subtitle')}</p>

        {/* Opportunity card */}
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {/* Project visual + summary */}
          <ArqweliaGlassCard className="p-6 lg:col-span-2" border="strong">
            <ArqweliaLabel>{DEMO_PRO_OPPORTUNITY.projectType ? t(`wizard.questionnaire.projectTypes.${DEMO_PRO_OPPORTUNITY.projectType}` as any) as string : ''}</ArqweliaLabel>
            <h2 className="mt-3 font-aq-display text-xl font-semibold text-white">{t(DEMO_PRO_OPPORTUNITY.zoneApproxKey as any)}</h2>
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Info label={t('pro.column.budget')} value={t(`wizard.questionnaire.budgets.${DEMO_PRO_OPPORTUNITY.budget}` as any) as string} />
              <Info label={t('pro.column.timeline')} value={t(`wizard.questionnaire.timelines.${DEMO_PRO_OPPORTUNITY.timeline}` as any) as string} />
              <Info label={t('pro.column.completeness')} value={`${DEMO_PRO_OPPORTUNITY.completeness}%`} />
              <Info label={t('wizard.concepts.title')} value="Concept A" />
              <Info label={t('pro.column.contact')} value={t('pro.contactHidden')} muted />
            </div>

            {/* Informations manquantes */}
            <div className="mt-6 border-t border-white/[0.06] pt-5">
              <ArqweliaLabel>{t('pro.missingInfo')}</ArqweliaLabel>
              <ul className="mt-3 flex flex-wrap gap-2">
                {missing.map((m) => (
                  <li key={m} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--arqwelia-border-gold)] bg-arq-champagne/5 px-3 py-1 text-[11px] font-semibold text-arq-gold-soft/85">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C6A56B" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                    {t(m as any)}
                  </li>
                ))}
              </ul>
            </div>
          </ArqweliaGlassCard>

          {/* Maturity score */}
          <ArqweliaGlassCard className="flex flex-col items-center justify-center p-6 text-center" border="gold">
            <ArqweliaLabel>{t('pro.column.score')}</ArqweliaLabel>
            <div className="mt-5"><ArqweliaScore value={DEMO_PRO_OPPORTUNITY.maturityScore} demo /></div>
            <p className="mt-4 text-[11px] text-white/35">{t('scoreDesc')}</p>
          </ArqweliaGlassCard>
        </div>

        {/* Match availability + interest (disabled) */}
        <ArqweliaGlassCard className="mt-5 flex flex-col items-center justify-between gap-4 p-5 sm:flex-row" border="strong">
          <div>
            <ArqweliaLabel>{t('pro.matching')}</ArqweliaLabel>
            <p className="mt-1.5 text-sm text-white/65">
              {t('pro.matchingDesc')}
            </p>
          </div>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title={t('pro.interestDisabled')}
            className="inline-flex min-h-[48px] cursor-not-allowed items-center justify-center rounded-full border border-white/[0.08] px-5 py-3 text-sm font-semibold text-white/35"
          >
            {t('pro.interestDisabled')}
          </button>
        </ArqweliaGlassCard>

        {searchParams?.demo === '1' && (
          <p className="mt-6 text-xs text-arq-sand/70">?demo=1 — {t('pro.subtitle')}</p>
        )}
      </div>
    </div>
    </NextIntlClientProvider>
  )
}

function Info({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{label}</p>
      <p className={`mt-1 font-semibold ${muted ? 'text-white/35' : 'text-white/85'}`}>{value}</p>
    </div>
  )
}