/**
 * AQWELIA — Admin Control Plane V1 · GARDE SERVEUR CANONIQUE de /admin.
 *
 * Défense en profondeur :
 *   - session absente/invalide → redirection vers la connexion ;
 *   - authentifié mais rôle DB ≠ admin → 403 (jamais un fallback client) ;
 *   - admin valide → rendu.
 *
 * Le rôle est relu EN BASE à chaque requête via requireAdminFromDb :
 * aucune valeur de session falsifiable ni champ client n'accorde l'accès.
 * Chaque route API de mutation refait son propre contrôle (defense in depth).
 */
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireAdminFromDb } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('admin')
  const auth = await requireAdminFromDb()

  if (!auth.authorized) {
    if (auth.reason === 'no-session') {
      redirect('/auth/signin?callbackUrl=/admin')
    }
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="font-display text-2xl font-bold">403</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {t('accessDeniedDesc')}
        </p>
      </div>
    )
  }

  return <>{children}</>
}
