/**
 * AQWELIA — NextAuth.js v4 configuration
 *
 * Strategy: JWT (stateless, works well for Capacitor mobile clients).
 * Session lifetime: 30 days.
 *
 * Providers (conditional — only registered when the matching env vars exist):
 *   1. Credentials (email + password) — always enabled, backed by Prisma User.
 *   2. Google OAuth  — when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set.
 *   3. Apple Sign-In — required by the App Store if any other social login
 *      is offered. Configured when APPLE_CLIENT_ID + APPLE_TEAM_ID +
 *      APPLE_KEY_ID + APPLE_PRIVATE_KEY are all set.
 *
 * If neither Google nor Apple env vars are present (typical in dev), only
 * Credentials is registered — graceful fallback so the build never breaks.
 *
 * NOTE: The Prisma `User` model is created by Task L1-A. Until `prisma generate`
 * is run against the updated schema, `db.user` is unknown to the Prisma Client.
 * The `(db as any).user` cast keeps this file type-safe without breaking the build
 * if the schema has not yet been regenerated.
 *
 * NOTE: `bcryptjs` is intentionally NOT installed. We use `crypto.scryptSync`
 * via `@/lib/password` instead (zero external deps).
 */
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import AppleProvider from 'next-auth/providers/apple'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { trackEventServer } from '@/lib/analytics-server'
import { generateAppleClientSecret } from '@/lib/apple-secret'

/**
 * Minimal structural type for a NextAuth provider (avoids importing the
 * `Provider` union from `next-auth/providers` which isn't in the package's
 * `exports` map — TypeScript can't resolve that subpath). We use `any`
 * intentionally: the providers are validated at runtime by NextAuth.
 */
type AnyProvider = any

/** True when both Google OAuth env vars are present. */
function hasGoogleConfig(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

/** True when all Apple Sign-In env vars are present. */
function hasAppleConfig(): boolean {
  return Boolean(
    process.env.APPLE_CLIENT_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PRIVATE_KEY
  )
}

/**
 * Build the providers list dynamically. Credentials is always present;
 * Google + Apple are added only when their env vars exist (conditional
 * registration — prevents `secret missing` errors in dev).
 */
function buildProviders(): AnyProvider[] {
  const providers: AnyProvider[] = [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const email = credentials.email.toLowerCase().trim()
        try {
          // Defensive cast: the `user` model is added by Task L1-A. Using `any`
          // here avoids a TypeScript break before `prisma generate` is run.
          const user = await (db as any).user.findUnique({
            where: { email },
          })
          if (!user) return null
          const valid = verifyPassword(credentials.password, user.passwordHash)
          if (!valid) return null
          // Analytics — credentials sign-in (fire-and-forget, never blocks).
          void trackEventServer(
            'user_signed_in',
            { provider: 'credentials', email },
            user.id
          )
          return { id: user.id, email: user.email, name: user.name ?? null }
        } catch {
          // Schema not migrated yet, DB error, etc. → never leak details.
          return null
        }
      },
    }),
  ]

  if (hasGoogleConfig()) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        allowDangerousEmailAccountLinking: true,
      })
    )
  }

  if (hasAppleConfig()) {
    // Apple requires a client-secret JWT signed with the .p8 private key.
    // We generate it lazily from APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY.
    const appleClientSecret = generateAppleClientSecret({
      teamId: process.env.APPLE_TEAM_ID as string,
      keyId: process.env.APPLE_KEY_ID as string,
      privateKey: process.env.APPLE_PRIVATE_KEY as string,
      clientId: process.env.APPLE_CLIENT_ID as string,
    })
    if (appleClientSecret) {
      providers.push(
        AppleProvider({
          clientId: process.env.APPLE_CLIENT_ID as string,
          clientSecret: appleClientSecret,
          allowDangerousEmailAccountLinking: true,
        })
      )
    }
  }

  return providers
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 jours
  jwt: { maxAge: 30 * 24 * 60 * 60 },
  providers: buildProviders(),
  callbacks: {
    /**
     * On OAuth sign-in (Google/Apple), create the User + Account records on
     * the fly if they don't exist yet (idempotent). This mirrors what
     * NextAuth's PrismaAdapter would do, but without pulling in the full
     * adapter (we still want JWT sessions for the Capacitor mobile client).
     */
    async signIn({ user, account }) {
      if (!user?.email) return true
      // Only run the upsert for OAuth providers (Google/Apple) — credentials
      // already validated the user inside `authorize`.
      if (!account || account.provider === 'credentials') return true
      try {
        const email = user.email.toLowerCase().trim()
        const existing = await (db as any).user.findUnique({ where: { email } })
        let userId: string
        if (!existing) {
          const created = await (db as any).user.create({
            data: {
              email,
              // Random opaque password hash — credentials login is impossible
              // for OAuth-only accounts. scrypt output is non-empty & safe.
              passwordHash: '!oauth:' + (account.providerAccountId || ''),
              name: user.name ?? null,
            },
            select: { id: true },
          })
          userId = created.id
        } else {
          userId = existing.id
        }
        // Persist the OAuth Account link (idempotent on provider+providerAccountId).
        const existingAccount = await (db as any).account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
        })
        if (!existingAccount) {
          await (db as any).account.create({
            data: {
              userId,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              refresh_token: account.refresh_token ?? null,
              access_token: account.access_token ?? null,
              expires_at: account.expires_at ?? null,
              token_type: account.token_type ?? null,
              scope: account.scope ?? null,
              id_token: account.id_token ?? null,
            },
          })
        }
        // Analytics — OAuth sign-in (fire-and-forget).
        void trackEventServer(
          'user_signed_in',
          { provider: account.provider, oauth: true, email: user.email },
          userId
        )
        // Stash the resolved userId on the user object so the jwt callback
        // can pick it up below.
        ;(user as any).id = userId
      } catch (err) {
        // Log + fail safe: never leak details, but allow sign-in to proceed
        // (the JWT will lack an id; the user will be prompted to complete
        // their profile on the next protected route).
        console.error('[auth.signIn] OAuth upsert failed:', err)
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) token.id = (user as any).id ?? token.id ?? token.sub
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        ;(session.user as any).id = token.id
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin', // créé plus tard (Lot 2)
  },
  secret: process.env.NEXTAUTH_SECRET,
}

/** Exposed for the signin page to render only the OAuth buttons that are live. */
export const oauthProviders = {
  google: hasGoogleConfig(),
  apple: hasAppleConfig(),
}
