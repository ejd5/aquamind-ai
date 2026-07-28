/**
 * ARQWELIA Lot 1 — Project Passport identifier.
 *
 * Generates a short, non-sequential public id (e.g. "ARQ-7K3-XYZ") so the
 * user can reference their project dossier without leaking the cuid row id.
 * Uses crypto.randomBytes for opacity — not a hash of any PII.
 */
import { randomBytes } from 'crypto'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars (0/O, 1/I)

function chunk(len: number): string {
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return out
}

export function generateArqweliaPublicId(): string {
  return `ARQ-${chunk(3)}-${chunk(3)}`
}
