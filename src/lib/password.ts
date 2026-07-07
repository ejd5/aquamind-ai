/**
 * AQWELIA — Password hashing utilities
 *
 * Uses Node's built-in `crypto.scryptSync` (no external dependency).
 * Format: `<saltHex>:<hashHex>` where salt is 16 random bytes and hash is 64 bytes.
 *
 * scrypt is intentionally CPU/memory-hard, making it suitable for password storage
 * and resistant to brute-force attacks. We use `timingSafeEqual` for constant-time
 * comparison to mitigate timing side-channels.
 */
import crypto from 'crypto'

const KEY_LENGTH = 64
const SALT_LENGTH = 16

/**
 * Hash a plaintext password with a random salt using scrypt.
 * Returns `${saltHex}:${hashHex}`.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex')
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `${salt}:${hash}`
}

/**
 * Verify a plaintext password against a stored `${saltHex}:${hashHex}` value.
 * Returns `false` for malformed stored values (defensive).
 */
export function verifyPassword(password: string, stored: string): boolean {
  if (typeof stored !== 'string') return false
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false

  try {
    const testHash = crypto.scryptSync(password, salt, KEY_LENGTH)
    const storedHash = Buffer.from(hash, 'hex')
    // Length check before timingSafeEqual (it throws on length mismatch)
    if (testHash.length !== storedHash.length) return false
    return crypto.timingSafeEqual(testHash, storedHash)
  } catch {
    return false
  }
}
