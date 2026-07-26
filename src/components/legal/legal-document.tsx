const LEGAL_LAST_UPDATED_ISO = '2026-07-26T12:00:00.000Z'

export function LegalHeader({ eyebrow, title, intro, lastUpdatedLabel, locale, translationWarning }: { eyebrow: string; title: string; intro?: string; lastUpdatedLabel: string; locale: string; translationWarning?: string }) {
  const lastUpdated = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(LEGAL_LAST_UPDATED_ISO))
  return (
    <header className="space-y-3">
      <p className="section-label">{eyebrow}</p>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="text-sm text-muted-foreground">{lastUpdatedLabel} {lastUpdated}</p>
      {intro ? <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">{intro}</p> : null}
      {translationWarning ? <p role="note" className="max-w-3xl rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm font-semibold text-amber-800 dark:text-amber-200">{translationWarning}</p> : null}
      <div className="gold-divider" />
    </header>
  )
}

export function LegalSection({ title, paragraphs = [], items = [], children }: { title: string; paragraphs?: readonly string[]; items?: readonly string[]; children?: React.ReactNode }) {
  return (
    <section className="glass-card rounded-2xl p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
        {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {items.length ? <ul className="list-disc space-y-1.5 pl-5">{items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
        {children}
      </div>
    </section>
  )
}
