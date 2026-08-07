import type { Metadata } from 'next'
import './globals.css'
import { MobileIntlProvider } from '@/components/mobile/mobile-intl-provider'
import { MobileRootProviders } from '@/components/mobile/mobile-root-providers'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Aqwelia',
  description: 'AQWELIA — Copilote intelligent pour piscine',
}

export default function MobileRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <MobileRootProviders>
          <MobileIntlProvider>{children}</MobileIntlProvider>
        </MobileRootProviders>
      </body>
    </html>
  )
}
