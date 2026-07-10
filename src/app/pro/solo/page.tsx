/**
 * AQWELIA Pro — Solo plan detail page.
 *
 * URL: /pro/solo
 * Server component. Renders the shared PlanDetailContent with the proSolo
 * namespace. Adds a 14-day-trial hero and an upgrade hint toward /pro/team.
 */
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PlanDetailContent } from '@/app/pro/_plan-detail'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('proSolo')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function ProSoloPage() {
  return <PlanDetailContent planNamespace="proSolo" upgradeHref="/pro/team" />
}
