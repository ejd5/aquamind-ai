import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'FAQ - AQWELIA', description: 'AQWELIA FAQ — answers to common questions about pool and spa maintenance' }

export default function FaqPage() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">FAQ</h1>
        <p className="mt-4 text-lg text-muted-foreground">Questions fréquentes sur AQWELIA.</p>
      </div>
    </section>
  )
}
