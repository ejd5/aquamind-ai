import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * POST /api/auth/register
 * Body: { email: string, password: string, name?: string }
 *
 * - Validates email format and password length (min 8).
 * - Rejects duplicates (case-insensitive email).
 * - Stores user with scrypt-hashed password.
 * - Does NOT auto-login — the client must call `signIn('credentials', ...)` after.
 */
export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : null

  if (!EMAIL_RE.test(email)) {
    // TODO: i18n — return a translation key for the client to localise.
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }
  if (password.length < 8) {
    // TODO: i18n — return a translation key for the client to localise.
    return NextResponse.json(
      { error: 'Le mot de passe doit contenir au moins 8 caractères' },
      { status: 400 }
    )
  }

  try {
    // Defensive cast: `user` model is added by Task L1-A.
    const existing = await (db as any).user.findUnique({ where: { email } })
    if (existing) {
      // TODO: i18n — return a translation key (common.errors.accountExists)
      // for the client to localise. French fallback kept for now.
      return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 })
    }

    const passwordHash = hashPassword(password)
    const user = await (db as any).user.create({
      data: {
        email,
        passwordHash,
        name,
      },
      select: { id: true, email: true, name: true },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (err) {
    // Log server-side, return generic message.
    console.error('[register] error:', err)
    // TODO: i18n — return a translation key (common.errors.accountCreateError)
    // for the client to localise. French fallback kept for now.
    return NextResponse.json({ error: 'Erreur lors de la création du compte' }, { status: 500 })
  }
}
