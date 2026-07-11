import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Météo & Alertes piscine - AQWELIA', description: 'Alertes météo pour votre piscine' }

export default function MeteoAlertesPage() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Météo & Alertes</h1>
        <p className="mt-4 text-lg text-muted-foreground">AQWELIA surveille la météo et vous alerte des risques pour votre piscine : orages, canicule, gel, UV, vent, pluie.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="glass-card rounded-2xl p-5"><h3 className="font-bold">Alertes intelligentes</h3><p className="mt-2 text-sm text-muted-foreground">Orage, canicule, gel, fort vent — AQWELIA anticipe.</p></div>
          <div className="glass-card rounded-2xl p-5"><h3 className="font-bold">Prédictions IA</h3><p className="mt-2 text-sm text-muted-foreground">Predict™ anticipe les problèmes avant qu'ils arrivent.</p></div>
        </div>
      </div>
    </section>
  )
}
