/**
 * Native layer — Barrel export.
 *
 * Centralised, SSR-safe wrappers around all Capacitor plugins used by Aqwelia.
 * Every module:
 *   - Returns no-op / defaults on web/server (via `isNative()` from `@/lib/platform`)
 *   - Wraps async plugin calls in try/catch for graceful degradation
 *   - Provides web fallbacks using browser APIs (Notification, FileReader,
 *     localStorage, navigator.onLine, document.visibilitychange, etc.)
 *
 * Import pattern:
 *   import {
 *     takePhoto,
 *     hapticSuccess,
 *     setupKeyboard,
 *     onAppStateChange,
 *   } from '@/lib/native'
 */

// Camera & gallery
export {
  takePhoto,
  pickFromGallery,
  requestCameraPermission,
  type PhotoResult,
} from './camera'

// Haptic feedback
export {
  hapticLight,
  hapticMedium,
  hapticHeavy,
  hapticSuccess,
  hapticError,
  hapticWarning,
} from './haptics'

// Keyboard
export { setupKeyboard, hideKeyboard } from './keyboard'

// Android back button
export { setupBackButton, type BackButtonHandler } from './back-button'

// External links & deep links
export {
  openExternalLink,
  setupDeepLinks,
  type DeepLinkHandler,
} from './links'

// Network state
export {
  getNetworkState,
  onNetworkChange,
  type NetworkState,
} from './network'

// App lifecycle
export {
  onAppStateChange,
  getCurrentAppState,
  type AppLifecycleState,
} from './lifecycle'

// Local notifications
export {
  requestNotificationPermission,
  scheduleLocalNotification,
  cancelLocalNotification,
  getPendingNotifications,
  type LocalNotificationPayload,
} from './local-notifications'

// Local preferences (non-sensitive)
export { setPref, getPref, removePref, clearPrefs } from './storage'

// Status bar
export {
  setStatusBarDark,
  setStatusBarLight,
  showStatusBar,
  hideStatusBar,
} from './status-bar'

// Splash screen
export {
  hideSplash,
  showSplash,
  onSplashDismissed,
} from './splash-screen'

// Geolocation (GPS — used by Weather module + Onboarding)
export {
  getCurrentPosition,
  requestGeoPermission,
  type GeoPosition,
} from './geolocation'

// Share sheet (PDF reports, promo codes)
export {
  shareText,
  shareReport,
  type SharePayload,
} from './share'

// Filesystem (export PDF/CSV/HTML to device Documents)
export {
  writeFile,
  readFile,
  deleteFile,
  getExportUri,
  listFiles,
  type WriteOptions,
  type WrittenFile,
  type FileEncoding,
} from './filesystem'

// App exit (Android)
export { exitApp } from './app-exit'
