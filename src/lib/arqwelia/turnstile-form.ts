/**
 * ARQWELIA — form-side Turnstile security state machine (pure, testable).
 *
 * Turnstile tokens are single-use. Whenever a submission that already consumed
 * a token does NOT succeed (400 / 403 / 429 / 500 / network error), the form
 * must drop the spent token and force a fresh one before the next submit. This
 * module holds that logic as pure functions so it can be unit-tested without a
 * DOM, and is wired into the two ARQWELIA forms.
 */

export interface TurnstileFormState {
  /** The current (unused) widget token. */
  token: string | null
  /** Remount key — increment to force the widget to mint a fresh token. */
  widgetKey: number
  /** Whether the widget previously signalled an error (cleared on rotation). */
  error: boolean
}

export const EMPTY_TURNSTILE_FORM_STATE: TurnstileFormState = {
  token: null,
  widgetKey: 0,
  error: false,
}

/**
 * After a failed submission that used a token, clear the spent token, clear the
 * stale widget error and bump the remount key so a NEW token is required before
 * the next submission.
 */
export function rotateTurnstileForm(state: TurnstileFormState): TurnstileFormState {
  return { token: null, widgetKey: state.widgetKey + 1, error: false }
}

/**
 * In a production build with no NEXT_PUBLIC_TURNSTILE_SITE_KEY the widget cannot
 * load and the server would reject the submission (fail-closed). Block the form
 * up front: generic message, disabled button, no doomed request.
 * Development / test keep their deterministic pass-through behaviour.
 */
export function isTurnstileFormBlocked(opts: { isProduction: boolean; siteKey: string }): boolean {
  return opts.isProduction && !opts.siteKey
}

/**
 * Whether a submission is allowed. Never allow a submission that would fail
 * server-side: when a site key is configured, a token MUST be present.
 */
export function canSubmitTurnstileForm(opts: {
  blocked: boolean
  siteKey: string
  hasToken: boolean
}): boolean {
  if (opts.blocked) return false
  if (opts.siteKey && !opts.hasToken) return false
  return true
}
