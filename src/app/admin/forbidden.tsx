/**
 * AQWELIA — /admin · page 403 (Forbidden).
 *
 * Rendu par Next.js avec un VRAI statut HTTP 403 lorsque le layout /admin
 * détecte un utilisateur authentifié dont le rôle DB ≠ admin
 * (requireAdminFromDb). Aucune logique d'autorisation ici — la décision est
 * toujours côté serveur, jamais dans le navigateur.
 */
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ShieldAlert } from 'lucide-react'

export default async function AdminForbiddenPage() {
  const t = await getTranslations('admin')

  return (
    <div className="app-bg-lagon flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <p className="font-display text-3xl font-bold">403</p>
      <p className="max-w-md text-sm text-muted-foreground">{t('accessDeniedDesc')}</p>
      <Link
        href="/"
        className="mt-1 rounded-full border border-lagoon/30 bg-lagoon/10 px-4 py-2 text-sm font-semibold text-lagoon-ink transition-colors hover:bg-lagoon/20"
      >
        {t('viewSite')}
      </Link>
    </div>
  )
}
