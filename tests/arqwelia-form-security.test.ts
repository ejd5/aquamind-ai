/**
 * ARQWELIA — form-side Turnstile security state machine tests.
 *
 * The token-rotation and blocking logic is extracted as pure functions
 * (src/lib/arqwelia/turnstile-form.ts) so it can be tested deterministically
 * without a DOM. The two ARQWELIA forms (contact + partner) wire these exact
 * functions into their onSubmit / render paths.
 */
import { describe, it, expect } from 'vitest'
import {
  EMPTY_TURNSTILE_FORM_STATE,
  rotateTurnstileForm,
  canSubmitTurnstileForm,
  isTurnstileFormBlocked,
} from '@/lib/arqwelia/turnstile-form'

const withToken = { ...EMPTY_TURNSTILE_FORM_STATE, token: 'spent-token', error: true }

describe('ARQWELIA form Turnstile state machine', () => {
  it('starts empty: no token, widget key 0, no error', () => {
    expect(EMPTY_TURNSTILE_FORM_STATE.token).toBeNull()
    expect(EMPTY_TURNSTILE_FORM_STATE.widgetKey).toBe(0)
    expect(EMPTY_TURNSTILE_FORM_STATE.error).toBe(false)
  })

  it('after a 400 failure the token is cleared and the widget renewed', () => {
    const next = rotateTurnstileForm(withToken)
    expect(next.token).toBeNull()
    expect(next.widgetKey).toBe(withToken.widgetKey + 1)
    expect(next.error).toBe(false)
  })

  it('after a 403 failure the token is cleared and the widget renewed', () => {
    const next = rotateTurnstileForm(withToken)
    expect(next.token).toBeNull()
    expect(next.widgetKey).toBe(1)
  })

  it('after a 429 failure the token is cleared and the widget renewed', () => {
    const next = rotateTurnstileForm(withToken)
    expect(next.token).toBeNull()
    expect(next.widgetKey).toBe(1)
  })

  it('after a 500 failure the token is cleared and the widget renewed', () => {
    const next = rotateTurnstileForm(withToken)
    expect(next.token).toBeNull()
    expect(next.widgetKey).toBe(1)
  })

  it('after a network error the token is cleared', () => {
    const next = rotateTurnstileForm(withToken)
    expect(next.token).toBeNull()
  })

  it('a fresh token is required before the next submission (no token → blocked)', () => {
    expect(
      canSubmitTurnstileForm({ blocked: false, siteKey: '0x4AAA', hasToken: false })
    ).toBe(false)
    expect(
      canSubmitTurnstileForm({ blocked: false, siteKey: '0x4AAA', hasToken: true })
    ).toBe(true)
  })

  it('with no site key configured (dev/test), submission is allowed without a token', () => {
    expect(
      canSubmitTurnstileForm({ blocked: false, siteKey: '', hasToken: false })
    ).toBe(true)
  })

  it('blocks the form in production when the site key is absent', () => {
    expect(isTurnstileFormBlocked({ isProduction: true, siteKey: '' })).toBe(true)
  })

  it('does not block when a site key is present even in production', () => {
    expect(isTurnstileFormBlocked({ isProduction: true, siteKey: '0x4AAA' })).toBe(false)
  })

  it('does not block in development/test when the site key is absent', () => {
    expect(isTurnstileFormBlocked({ isProduction: false, siteKey: '' })).toBe(false)
  })

  it('a blocked form can never submit even with a token present', () => {
    expect(
      canSubmitTurnstileForm({ blocked: true, siteKey: '', hasToken: true })
    ).toBe(false)
  })
})
