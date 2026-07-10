import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Guides piscine - AQWELIA', description: 'Guides d\'entretien piscine experts' }

export default function GuidesPage() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Guides experts</h1>
        <p className="mt-4 text-lg text-muted-foreground">Plus de 20 guides d'entretien piscine et spa, rédigés par des experts.</p>
      </div>
    </section>
  )
}
