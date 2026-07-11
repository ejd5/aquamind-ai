import type { Metadata } from 'next'
import { useTranslations } from 'next-intl'

export const metadata: Metadata = { title: 'Analyse eau piscine - AQWELIA', description: 'Analysez votre eau de piscine avec AQWELIA' }

export default function AnalyseEauPage() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Analyse de l'eau</h1>
        <p className="mt-4 text-lg text-muted-foreground">AQWELIA analyse votre eau de piscine en temps réel. Saisie manuelle, scan de bandelette IA, ou diagnostic photo.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="glass-card rounded-2xl p-5"><h3 className="font-bold">Saisie manuelle</h3><p className="mt-2 text-sm text-muted-foreground">Entrez vos valeurs pH, chlore, TAC...</p></div>
          <div className="glass-card rounded-2xl p-5"><h3 className="font-bold">StripScan IA</h3><p className="mt-2 text-sm text-muted-foreground">Photographiez votre bandelette, l'IA lit les valeurs.</p></div>
          <div className="glass-card rounded-2xl p-5"><h3 className="font-bold">Diagnostic photo</h3><p className="mt-2 text-sm text-muted-foreground">Photo de la piscine, l'IA détecte les problèmes.</p></div>
        </div>
      </div>
    </section>
  )
}
