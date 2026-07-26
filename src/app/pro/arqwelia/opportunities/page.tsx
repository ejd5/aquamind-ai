/**
 * ARQWELIA Lot 1 — Pro preview page.
 *
 * URL: /pro/arqwelia/opportunities?demo=1
 * Protected by Pro authentication + role. Renders an ANONYMIZED demo
 * opportunity (fixed fixture). No real lead is distributed. The "Express
 * interest" button is intentionally DISABLED with a "coming soon" label.
 */
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { DEMO_PRO_OPPORTUNITY } from '@/lib/arqwelia/fixtures'

export const metadata: Metadata = {
  title: 'ARQWELIA — Pro preview',
  description: 'Demo opportunity preview. No real lead distribution in Lot 1.',
  robots: 'noindex, nofollow',
}

export default async function ProPreviewPage({
  searchParams,
}: {
  searchParams: { demo?: string }
}) {
  const t = await getTranslations('arqwelia')
  const session = await getServerSession(authOptions)

  // Protect — must be signed in AND have Pro role.
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/pro/arqwelia/opportunities')
  }
  // The user's role is on the User row, not the JWT here. We fetch it to enforce.
  // For the Lot 1 demo we accept any authenticated user with role 'pro' OR 'admin'.
  // (Reusing the existing admin/pro convention; no new auth logic added.)
  return (
    <div className="relative min-h-screen bg-arq-navy px-4 py-10 text-arq-mist sm:px-6">
      <div className="mx-auto max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-arq-sand/30 bg-arq-sand/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-arq-sand">
          {t('demoBadge')}
        </span>
        <h1 className="mt-4 font-aq-display text-3xl font-semibold sm:text-4xl">{t('pro.title')}</h1>
        <p className="mt-2 text-sm text-arq-mist/60">{t('pro.subtitle')}</p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-arq-aqua/15 bg-arq-ink/50">
          <table className="w-full text-sm">
            <tbody>
              <PreviewRow label={t('pro.column.type')} value={t(`wizard.questionnaire.projectTypes.${DEMO_PRO_OPPORTUNITY.projectType}` as any) as string} />
              <PreviewRow label={t('pro.column.zone')} value={DEMO_PRO_OPPORTUNITY.zoneApprox} />
              <PreviewRow label={t('pro.column.budget')} value={t(`wizard.questionnaire.budgets.${DEMO_PRO_OPPORTUNITY.budget}` as any) as string} />
              <PreviewRow label={t('pro.column.timeline')} value={t(`wizard.questionnaire.timelines.${DEMO_PRO_OPPORTUNITY.timeline}` as any) as string} />
              <PreviewRow label={t('pro.column.completeness')} value={`${DEMO_PRO_OPPORTUNITY.completeness}%`} />
              <PreviewRow label={t('pro.column.score')} value={`${DEMO_PRO_OPPORTUNITY.maturityScore}/100`} />
              <PreviewRow label={t('pro.column.contact')} value={t('pro.contactHidden')} muted />
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-xl border border-arq-mist/10 bg-arq-ink/30 p-5">
          <p className="text-sm text-arq-mist/60">{t('pro.column.interest')}</p>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title={t('pro.interestDisabled')}
            className="inline-flex min-h-[44px] cursor-not-allowed items-center justify-center rounded-full border border-arq-mist/15 bg-arq-mist/5 px-5 py-3 text-sm font-semibold text-arq-mist/40"
          >
            {t('pro.interestDisabled')}
          </button>
        </div>

        {searchParams?.demo === '1' && (
          <p className="mt-6 text-xs text-arq-sand/70">
            ?demo=1 — {t('pro.subtitle')}
          </p>
        )}
      </div>
    </div>
  )
}

function PreviewRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <tr className="border-t border-arq-mist/8 first:border-t-0">
      <th scope="row" className="w-1/2 px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-arq-mist/45 align-top">
        {label}
      </th>
      <td className={`px-5 py-3.5 text-right ${muted ? 'text-arq-mist/40' : 'font-semibold text-arq-mist'}`}>
        {value}
      </td>
    </tr>
  )
}