/**
 * AQWELIA Pro — Fleet plan detail page.
 *
 * URL: /pro/fleet
 * Server component. Renders the shared PlanDetailContent with the proFleet
 * namespace. No upgrade hint (top of the standard ladder); Enterprise is
 * reached via /pro/tarifs or contact sales.
 */
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PlanDetailContent } from '@/app/pro/_plan-detail'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('proFleet')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function ProFleetPage() {
  return <PlanDetailContent planNamespace="proFleet" />
}
