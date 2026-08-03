/**
 * ARQWELIA Lot 2 — A2 AR POC lab route (INTERNAL, NOT indexed).
 *
 * Non-indexed internal lab route for the web-mobile AR POC (@google/model-viewer).
 * - robots noindex via generateMetadata.
 * - Renders <ArqweliaArViewer /> ONLY when isArqweliaArPocEnabled() is true
 *   (build-time NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED="true").
 * - Otherwise renders a non-functional "Fonction future" disabled state.
 *
 * This page is NOT linked from the production tunnel nav, landing, or the
 * ARQWELIA concepts flow, and it is excluded from sitemap.ts (hand-curated).
 */
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { isArqweliaArPocEnabled } from '@/lib/features'
import { ArqweliaArViewer } from '@/components/arqwelia/ar-viewer'
import { ArqweliaFutureFeature, ArqweliaGlassCard } from '@/components/arqwelia/ui'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('arqwelia')
  return {
    title: t('lab.arPoc.title'),
    description: t('lab.arPoc.description'),
    robots: { index: false, follow: false },
  }
}

export default async function ArqweliaArPocPage() {
  const t = await getTranslations('arqwelia')

  if (!isArqweliaArPocEnabled()) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <ArqweliaFutureFeature kind="future">{t('lab.arPoc.title')}</ArqweliaFutureFeature>
        <h1 className="mt-5 font-aq-display text-3xl font-semibold text-white">{t('lab.arPoc.title')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/65">{t('lab.arPoc.description')}</p>
        <ArqweliaGlassCard className="mt-8 px-6 py-5">
          <p className="text-sm text-white/70">{t('lab.arPoc.disabledNote')}</p>
        </ArqweliaGlassCard>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <ArqweliaFutureFeature kind="future">{t('lab.arPoc.title')}</ArqweliaFutureFeature>
      <h1 className="mt-5 font-aq-display text-3xl font-semibold text-white">{t('lab.arPoc.title')}</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/65">{t('lab.arPoc.description')}</p>
      <div className="mt-8">
        <ArqweliaArViewer />
      </div>
    </div>
  )
}
