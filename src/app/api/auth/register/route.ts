import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { pickLocale, translate } from '@/lib/i18n-api'

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
  const locale = pickLocale(req)
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
    const msg = await translate(locale, 'common.errors.emailInvalid', 'Email invalide')
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  if (password.length < 8) {
    const msg = await translate(
      locale,
      'common.errors.passwordTooShort',
      'Le mot de passe doit contenir au moins 8 caractères'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    // Defensive cast: `user` model is added by Task L1-A.
    const existing = await (db as any).user.findUnique({ where: { email } })
    if (existing) {
      const msg = await translate(
        locale,
        'common.errors.accountExists',
        'Un compte existe déjà avec cet email'
      )
      return NextResponse.json({ error: msg }, { status: 409 })
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
    const msg = await translate(
      locale,
      'common.errors.accountCreateError',
      'Erreur lors de la création du compte'
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
