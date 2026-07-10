/**
 * AQWELIA — NextAuth.js v4 configuration
 *
 * Strategy: JWT (stateless, works well for Capacitor mobile clients).
 * Session lifetime: 30 days.
 * Provider: Credentials (email + password) backed by the Prisma `User` model.
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
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/password'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 jours
  jwt: { maxAge: 30 * 24 * 60 * 60 },
  // CRITICAL for sandbox/preview: trust the X-Forwarded-Host / X-Forwarded-Proto
  // headers set by the Caddy gateway so NextAuth computes the correct base URL
  // (cookies, CSRF origin, OAuth callbacks) when accessed through the proxy on
  // port 81 instead of the direct Next.js port 3000.
  trustHost: true,
  providers: [
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
          return { id: user.id, email: user.email, name: user.name ?? null }
        } catch {
          // Schema not migrated yet, DB error, etc. → never leak details.
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
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
