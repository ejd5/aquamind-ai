/**
 * ARQWELIA bot protection — wraps the shared Turnstile verifier.
 *
 * The shared `verifyTurnstileToken` silently passes when the Turnstile secret
 * is absent and TURNSTILE_REQUIRED is false. ARQWELIA endpoints accept
 * personal data, so in production a missing secret MUST block submissions —
 * no silent bypass. In every other environment the shared verifier's rules
 * apply (pass when unconfigured, verify when configured, always pass under
 * NODE_ENV=test for deterministic local tests).
 */
import { verifyTurnstileToken } from '@/lib/security/turnstile'

export interface ArqweliaBotCheck {
  success: boolean
  reason?: string
}

export async function verifyArqweliaTurnstile(params: {
  token: string
  remoteIp?: string | null
  expectedAction: string
}): Promise<ArqweliaBotCheck> {
  if (process.env.NODE_ENV === 'production' && !process.env.TURNSTILE_SECRET_KEY) {
    return { success: false, reason: 'turnstile_not_configured' }
  }
  return verifyTurnstileToken(params)
}
