'use client'

/**
 * AQWELIA Wave A3 — mobile B2C dashboard (canonical entry for consumer users).
 *
 * Reuses the shared MobileAppShell (bottom tabs: Accueil, Analyses, Assistant,
 * Entretien, Profil) — the same shell the web B2C experience uses. A consumer
 * user is routed here by the mobile entry router, never to the technician shell.
 */

import { MobileAppShell } from '@/components/mobile/mobile-app-shell'

export default function MobileB2CDashboardPage() {
  return (
    <main className="min-h-screen">
      <MobileAppShell />
    </main>
  )
}
