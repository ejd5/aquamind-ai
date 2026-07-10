/**
 * AQWELIA Pro — Team plan detail page.
 *
 * URL: /pro/team
 * Server component. Renders the shared PlanDetailContent with the proTeam
 * namespace. Upgrade hint toward /pro/fleet.
 */
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PlanDetailContent } from '@/app/pro/_plan-detail'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('proTeam')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function ProTeamPage() {
  return <PlanDetailContent planNamespace="proTeam" upgradeHref="/pro/fleet" />
}
