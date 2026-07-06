import { Waves, Sparkles, ShieldAlert } from 'lucide-react'

export function Footer() {
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-gold/20 bg-gradient-to-br from-[oklch(0.18_0.025_200)] via-[oklch(0.15_0.02_195)] to-[oklch(0.12_0.015_200)] text-white/80">
      {/* Gold divider line at top */}
      <div className="gold-divider" />

      {/* Subtle wave pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='80' height='20' viewBox='0 0 80 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q 20 0 40 10 T 80 10' stroke='%23ffffff' fill='none' stroke-width='1'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'repeat',
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Safety disclaimer — required by spec */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-gold/20 bg-white/5 p-3.5">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <p className="text-[11px] leading-relaxed text-white/70">
            <strong className="text-white/90">Avis de prudence.</strong> AquaMind aide au diagnostic
            et à l'entretien mais ne remplace pas un professionnel. Respectez les notices produits.
            En cas de doute, danger électrique, fuite ou irritation, contactez un professionnel.
          </p>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold shadow-md shadow-primary/30">
              <Waves className="h-4 w-4 text-white" />
              <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-gold" />
            </div>
            <div className="text-sm">
              <span className="font-display font-bold tracking-tight text-white">AquaMind AI</span>
              <span className="ml-2 text-white/45">© {new Date().getFullYear()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-white/65">
            <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 font-semibold text-gold">
              v2.0 Copilote
            </span>
            <span className="hidden sm:inline">Eau toujours cristalline</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
