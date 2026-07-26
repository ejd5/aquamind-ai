import type { Metadata } from 'next'
import './globals.css'
import { MobileIntlProvider } from '@/components/mobile/mobile-intl-provider'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'AQWELIA Mobile',
  description: 'AQWELIA Pro',
}

export default function MobileRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <MobileIntlProvider>{children}</MobileIntlProvider>
      </body>
    </html>
  )
}
