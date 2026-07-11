import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Rappels d\'entretien piscine - AQWELIA', description: 'Rappels intelligents d\'entretien' }

export default function RappelsEntretienPage() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Rappels d'entretien</h1>
        <p className="mt-4 text-lg text-muted-foreground">AQWELIA génère des rappels intelligents basés sur vos données réelles : météo, historique, inventaire, équipements.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="glass-card rounded-2xl p-5"><h3 className="font-bold">Rappels contextuels</h3><p className="mt-2 text-sm text-muted-foreground">Test d'eau, nettoyage filtre, cellule électrolyseur, skimmer...</p></div>
          <div className="glass-card rounded-2xl p-5"><h3 className="font-bold">AutoRestock</h3><p className="mt-2 text-sm text-muted-foreground">Réapprovisionnement automatique quand un produit est bas.</p></div>
        </div>
      </div>
    </section>
  )
}
