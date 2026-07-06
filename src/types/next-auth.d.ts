/**
 * AQWELIA — NextAuth type augmentations
 *
 * Adds `id` to the Session user and JWT types so that `session.user.id` and
 * `token.id` are typed throughout the codebase.
 */
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
  }
}
