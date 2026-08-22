/**
 * AQWELIA — Admin Control Plane · garde serveur canonique de /admin.
 *
 * Défense en profondeur :
 *   - session absente/invalide → redirection vers la connexion ;
 *   - authentifié mais rôle DB ≠ admin → 403 ;
 *   - admin valide → rendu ;
 *   - chaque route API de mutation refait son propre contrôle.
 */
import Link from 'next/link'
import { redirect, forbidden } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireAdminFromDb } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAdminFromDb()

  if (!auth.authorized) {
    if (auth.reason === 'no-session') {
      redirect('/auth/signin?callbackUrl=/admin')
    }
    forbidden()
  }

  const t = await getTranslations('admin')

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-[90] border-b border-lagoon/15 bg-background/90 px-4 py-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl justify-end gap-2">
          <Link
            href="/admin"
            className="rounded-full border border-border/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-lagoon/40 hover:text-foreground"
          >
            {t('navOverview')}
          </Link>
          <Link
            href="/admin/promotions"
            className="rounded-full border border-lagoon/30 bg-lagoon/10 px-3 py-1.5 text-xs font-semibold text-deep-teal transition hover:bg-lagoon/15"
          >
            {t('navPromotions')}
          </Link>
        </div>
      </nav>
      {children}
    </div>
  )
}
