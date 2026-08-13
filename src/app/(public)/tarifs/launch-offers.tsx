import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkEligibility } from '@/lib/launch-offers/service'
import { seedCampaign } from '@/lib/launch-offers/admin'
import {
  launchOffersEnabled,
  launchEligiblePlanIds,
  LAUNCH_OFFER_A_CODE,
  LAUNCH_OFFER_B_CODE,
} from '@/lib/launch-offers/config'
import { LaunchOfferCheckoutButton } from '@/components/launch/launch-offer-checkout-button'

/**
 * Section « Offres de lancement AQWELIA » sur /tarifs (Server Component).
 *
 * - Campagne désactivée → ne rend rien.
 * - Visiteur non connecté → bloc marketing générique (éligibilité serveur
 *   impossible, CTA vers connexion).
 * - Utilisateur connecté → éligibilité + prix + places restantes calculés
 *   exclusivement côté serveur via checkEligibility.
 *
 * Distinction explicite avec « Découverte » : Découverte est le forfait gratuit
 * permanent (0 €) ; ces offres sont des offres de lancement payantes à durée
 * limitée, jamais confondues dans la grille standard.
 */
export async function LaunchOffersSection() {
  const t = await getTranslations('tarifs')
  if (!launchOffersEnabled()) return null
  await seedCampaign()

  const session = await getServerSession(authOptions)
  const planId = launchEligiblePlanIds()[0] || 'oasis'

  // Visiteur non connecté : bloc marketing sans éligibilité calculée.
  if (!session?.user?.id) {
    return (
      <section aria-label={t('launchEyebrow')} className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="glass-card rounded-3xl border border-gold/25 bg-gradient-to-br from-gold/[0.08] via-transparent to-teal-700/[0.06] p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="section-label">{t('launchEyebrow')}</p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {t('launchTitle')}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {t('launchGuestIntro')}
              </p>
            </div>
            <Link
              href={`/auth/signin?callbackUrl=/tarifs`}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-teal-700 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.03]"
            >
              {t('launchGuestCta')}
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const userId = session.user.id
  const [offerA, offerB] = await Promise.all([
    checkEligibility({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId, platform: 'WEB' }),
    checkEligibility({ userId, offerCode: LAUNCH_OFFER_B_CODE, planId, platform: 'WEB' }),
  ])

  const cards = [
    {
      code: LAUNCH_OFFER_A_CODE,
      title: t('launchA50Title'),
      subtitle: t('launchA50Sub'),
      eligible: offerA.eligible,
      reasonCode: offerA.reasonCode,
      pricing: offerA.offer?.pricing ?? null,
      availability: offerA.offer?.availability ?? null,
    },
    {
      code: LAUNCH_OFFER_B_CODE,
      title: t('launchB32Title'),
      subtitle: t('launchB32Sub'),
      eligible: offerB.eligible,
      reasonCode: offerB.reasonCode,
      pricing: offerB.offer?.pricing ?? null,
      availability: offerB.offer?.availability ?? null,
    },
  ]

  return (
    <section aria-label={t('launchEyebrow')} className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <div className="mb-8 text-center">
        <p className="section-label">{t('launchEyebrow')}</p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {t('launchTitle')}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
          {t('launchSubtitle')}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {cards.map((card) => {
          const exhausted = card.availability?.state === 'EXHAUSTED'
          const remaining = card.availability?.remaining ?? null
          const showRemaining = card.availability?.showExactRemaining ?? false
          const price = card.pricing

          return (
            <article
              key={card.code}
              className="glass-card relative flex flex-col overflow-hidden rounded-3xl border border-gold/25 p-6 sm:p-8"
            >
              <span className="absolute right-4 top-4 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gold">
                {t('launchBadge')}
              </span>

              <h3 className="font-display text-2xl font-black tracking-tight">{card.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{card.subtitle}</p>

              {showRemaining && remaining !== null && remaining > 0 && (
                <p className="mt-3 inline-flex w-fit items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-200">
                  {remaining > 1 ? t('launchRemainingPlural', { count: remaining }) : t('launchRemaining', { count: remaining })}
                </p>
              )}

              {price ? (
                <div className="mt-5 border-y border-border/60 py-5">
                  <div className="flex items-end gap-2">
                    <span className="font-display text-4xl font-black leading-none tracking-tight">
                      {(price.dueNowMinor / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </span>
                    <span className="pb-1 text-xs text-muted-foreground">{t('launchPaidNow')}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {price.renewalPeriod === 'P1M'
                      ? t('launchThenMonthly', { price: (price.renewalMinor / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) })
                      : t('launchThenQuarterly', { price: (price.renewalMinor / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) })}
                  </p>
                </div>
              ) : (
                <div className="mt-5 border-y border-border/60 py-5 text-sm text-muted-foreground">
                  {t('launchPriceUnavailable')}
                </div>
              )}

              <div className="mt-auto pt-6">
                {exhausted ? (
                  <span className="inline-flex w-full items-center justify-center rounded-2xl border border-border bg-muted/30 px-5 py-3 text-sm font-bold text-muted-foreground">
                    {t('launchExhausted')}
                  </span>
                ) : card.eligible ? (
                  <LaunchOfferCheckoutButton
                    offerCode={card.code}
                    planId={planId}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-teal-700 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-gold/20 transition-all hover:shadow-xl active:scale-[0.98]"
                  />
                ) : (
                  <span className="inline-flex w-full items-center justify-center rounded-2xl border border-border bg-muted/30 px-5 py-3 text-sm font-bold text-muted-foreground">
                    {reasonLabel(card.reasonCode, t)}
                  </span>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

type T = Awaited<ReturnType<typeof getTranslations>>

function reasonLabel(reason: string | null, t: T): string {
  switch (reason) {
    case 'OFFER_ALREADY_REDEEMED': return t('launchReasonRedeemed')
    case 'ACTIVE_RESERVATION_EXISTS': return t('launchReasonActiveReservation')
    case 'ALREADY_SUBSCRIBED': return t('launchReasonSubscribed')
    case 'COUNTRY_NOT_ELIGIBLE': return t('launchReasonCountry')
    case 'QUOTA_EXHAUSTED': return t('launchReasonQuota')
    case 'ALLOCATION_EXHAUSTED': return t('launchReasonQuota')
    default: return t('launchReasonDefault')
  }
}
