/**
 * AQWELIA — Apple Sign-In client-secret JWT generator.
 *
 * Apple requires the OAuth `client_secret` to be a JWT signed with the
 * developer's .p8 private key (ES256 algorithm). The JWT is short-lived
 * but NextAuth accepts it as a stable secret — we regenerate it each call
 * so it never expires mid-session (token endpoint calls happen at sign-in
 * time only).
 *
 * Spec:
 *   Header:  {"alg":"ES256","kid":"<KEY_ID>","typ":"JWT"}
 *   Payload: {
 *     iss: "<TEAM_ID>",
 *     iat: <now>,
 *     exp: <now + 180 days>,
 *     aud: "https://appleid.apple.com",
 *     sub: "<CLIENT_ID (Service ID)>"
 *   }
 *
 * No external deps — uses node's built-in `crypto` module (Web Crypto API
 * for ECDSA P-256 signing via `crypto.createSign`).
 *
 * Returns null on any error (missing env var, malformed key, sign failure).
 * The caller (auth.ts) treats null as "Apple disabled" — graceful fallback.
 */

import crypto from 'crypto'

interface AppleSecretInput {
  teamId: string
  keyId: string
  privateKey: string
  clientId: string
}

/**
 * Generate the Apple OAuth client_secret JWT. Returns null if the inputs
 * are missing or the signing fails (never throws).
 */
export function generateAppleClientSecret(input: AppleSecretInput): string | null {
  const { teamId, keyId, privateKey, clientId } = input
  if (!teamId || !keyId || !privateKey || !clientId) return null

  try {
    // Normalise the PEM: Apple's .p8 files include header/footer lines.
    // Accept either the raw multi-line PEM or a single-line \n-escaped form.
    let pem = privateKey.trim()
    if (!pem.includes('\n')) {
      pem = pem.replace(/\\n/g, '\n')
    }
    // Defensive: ensure proper PEM envelope if the user pasted only the body.
    if (!pem.startsWith('-----BEGIN')) {
      pem = [
        '-----BEGIN PRIVATE KEY-----',
        ...pem.match(/.{1,64}/g) || [],
        '-----END PRIVATE KEY-----',
      ].join('\n')
    }

    const now = Math.floor(Date.now() / 1000)
    const exp = now + 60 * 60 * 24 * 180 // 180 days

    const header = { alg: 'ES256', kid: keyId, typ: 'JWT' }
    const payload = {
      iss: teamId,
      iat: now,
      exp,
      aud: 'https://appleid.apple.com',
      sub: clientId,
    }

    const encodedHeader = base64Url(JSON.stringify(header))
    const encodedPayload = base64Url(JSON.stringify(payload))
    const signingInput = `${encodedHeader}.${encodedPayload}`

    const signer = crypto.createSign('SHA256')
    signer.update(signingInput)
    // ECDSA with P-256 (prime256v1) → DER signature
    const derSig = signer.sign(pem)
    // Convert DER signature to raw r||s (64 bytes) per JWT ES256 spec
    const rawSig = derToRaw(derSig)
    const encodedSig = rawSig
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    return `${signingInput}.${encodedSig}`
  } catch (err) {
    console.warn('[apple-secret] Failed to generate client secret:', err)
    return null
  }
}

/** Base64url-encode a string (UTF-8 → base64 → URL-safe). */
function base64Url(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Convert a DER-encoded ECDSA signature (sequence of two integers) to the
 * raw r||s concatenation (64 bytes for P-256). Required by JWT ES256.
 */
function derToRaw(der: Buffer): Buffer {
  // DER format: 0x30 <len> 0x02 <rlen> <r> 0x02 <slen> <s>
  if (der[0] !== 0x30) return der
  const rs: Buffer[] = []
  let offset = 2 // skip 0x30 + total length
  for (let i = 0; i < 2; i++) {
    if (der[offset] !== 0x02) return der
    offset++
    const len = der[offset]
    offset++
    let buf = der.subarray(offset, offset + len)
    // Strip leading zero padding (DER adds it when MSB is set)
    if (buf.length > 32 && buf[0] === 0x00) buf = buf.subarray(1)
    // Left-pad to 32 bytes
    if (buf.length < 32) {
      buf = Buffer.concat([Buffer.alloc(32 - buf.length), buf])
    }
    rs.push(buf)
    offset += len
  }
  return Buffer.concat(rs)
}
