import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * Autorisation admin chargée depuis la base de données au moment du contrôle.
 *
 * Le rôle n'est JAMAIS lu depuis le navigateur, le corps de requête, ni une
 * valeur de session que le client pourrait falsifier : le JWT ne transporte
 * que l'identifiant utilisateur (signé serveur), et le rôle réel est relu dans
 * la base à chaque appel. Une modification locale de session ou un champ
 * « role » fourni par le client n'accorde donc aucune élévation de privilège.
 *
 * Ce module est serveur uniquement (Node runtime) : il importe Prisma et ne
 * doit jamais être importé par le middleware (edge) — utiliser `isAdminEmail`
 * (src/lib/admin.ts) pour les contrôles edge sans base de données.
 *
 * Retourne :
 *   - { authorized: true, userId } pour un utilisateur authentifié dont le rôle
 *     en base est `admin` ;
 *   - { authorized: false, reason: 'no-session' } session absente/invalide ;
 *   - { authorized: false, reason: 'not-admin' } utilisateur ordinaire.
 */
export type AdminAuthResult =
  | { authorized: true; userId: string; email?: string }
  | { authorized: false; reason: 'no-session' | 'not-admin' }

/**
 * Vérifie si un utilisateur est administrateur, en lisant le rôle depuis la
 * base de données (source serveur fiable) — jamais depuis une valeur fournie
 * par le client ou le corps de requête.
 */
export async function isUserAdmin(userId: string, client: typeof db = db): Promise<boolean> {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return user?.role === 'admin'
}

export async function requireAdminFromDb(client: typeof db = db): Promise<AdminAuthResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { authorized: false, reason: 'no-session' }

  // Le rôle est relu dans la base au moment du contrôle. Un champ « role »
  // ajouté côté client à la session est ignoré : seule la valeur en base
  // compte, ce qui empêche toute élévation de privilège par manipulation de
  // session ou de corps de requête.
  const user = await client.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, email: true },
  })
  if (!user || user.role !== 'admin') return { authorized: false, reason: 'not-admin' }

  return { authorized: true, userId: user.id, email: user.email ?? undefined }
}
