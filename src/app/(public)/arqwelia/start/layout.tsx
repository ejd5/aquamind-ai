/**
 * ARQWELIA Lot 1 — Wizard layout.
 * Renders a slim progress bar + shared ARQWELIA chrome for /arqwelia/start/*.
 * Pages read/update the shared Zustand store.
 */
import { getTranslations } from 'next-intl/server'

export default async function WizardLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('arqwelia')
  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Slim progress strip — purely visual hint */}
      <div className="h-1 w-full bg-arq-aqua/10">
        <div className="h-full bg-gradient-to-r from-arq-aqua to-arq-cyan" />
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">{children}</div>
      <p className="px-4 pb-10 text-center text-[11px] text-arq-mist/30">
        {t('warning')}
      </p>
    </div>
  )
}