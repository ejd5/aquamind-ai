import { describe, expect, it } from 'vitest'
import { getAppEntryTarget, resolveInitialWebView } from '@/lib/entry-flow'

describe('web entry authentication guard', () => {
  it('does not restore the app view for an anonymous visitor', () => {
    expect(resolveInitialWebView('app', false)).toBe('landing')
  })

  it('restores the app view after authentication', () => {
    expect(resolveInitialWebView('app', true)).toBe('app')
  })

  it('sends an anonymous CTA click to sign-up', () => {
    expect(getAppEntryTarget(false)).toBe('signup')
  })

  it('opens the app for an authenticated user', () => {
    expect(getAppEntryTarget(true)).toBe('app')
  })
})
