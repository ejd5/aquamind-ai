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
    // Authentifié mais rôle DB ≠ admin → VRAI statut HTTP 403 (page
    // forbidden.tsx). La décision reste canonique côté serveur : User.role
    // relu en base, jamais une valeur client.
    forbidden()
  }

  return <>{children}</>
}
