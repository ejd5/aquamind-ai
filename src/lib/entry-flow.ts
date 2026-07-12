export type SavedWebView = 'landing' | 'app' | null

/**
 * A remembered app view must never bypass authentication on the web.
 * Once the user signs in, the remembered value takes them back to onboarding.
 */
export function resolveInitialWebView(
  savedView: SavedWebView,
  authenticated: boolean
): 'landing' | 'app' {
  return authenticated && savedView === 'app' ? 'app' : 'landing'
}

export function getAppEntryTarget(authenticated: boolean): 'app' | 'signup' {
  return authenticated ? 'app' : 'signup'
}
