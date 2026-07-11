/**
 * Platform detection — centralized, reusable.
 *
 * Usage:
 *   import { platform, isMobile, isNative, isWeb } from '@/lib/platform'
 *
 * - `platform` returns 'web' | 'ios' | 'android'
 * - `isMobile` = true on native iOS/Android OR mobile browser
 * - `isNative` = true only inside Capacitor native shell (iOS/Android app)
 * - `isWeb` = true on desktop/mobile browser (not native app)
 *
 * Server-side rendering safe: returns 'web' / false on server.
 */

export type Platform = 'web' | 'ios' | 'android'

/**
 * Detect native platform (Capacitor).
 * On server or web browser, returns null.
 */
function detectNativePlatform(): Platform | null {
  if (typeof window === 'undefined') return null

  // Capacitor injects the Capacitor object on the global scope
  const cap = (window as any).Capacitor
  if (cap?.isNativePlatform?.()) {
    const platform = cap.getPlatform?.() // 'ios' | 'android' | 'web'
    if (platform === 'ios' || platform === 'android') return platform
  }

  // Fallback: user-agent sniffing for native webview
  const ua = navigator.userAgent || ''
  if (/AQWELIA-iOS|Aqwelia\/iOS/i.test(ua)) return 'ios'
  if (/AQWELIA-Android|Aqwelia\/Android/i.test(ua)) return 'android'

  return null
}

/**
 * Detect mobile browser (non-native).
 */
function detectMobileBrowser(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /Mobile|Android|iPhone|iPad|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(ua)
}

/**
 * Get current platform.
 */
export function getPlatform(): Platform {
  const native = detectNativePlatform()
  if (native) return native
  return 'web'
}

/**
 * True if inside Capacitor native app (iOS or Android).
 */
export function isNative(): boolean {
  return detectNativePlatform() !== null
}

/**
 * True if on web (desktop OR mobile browser, but not native app).
 */
export function isWeb(): boolean {
  return !isNative()
}

/**
 * True if mobile experience should be shown:
 * - Native iOS/Android app → always mobile
 * - Mobile browser (iPhone, Android phone) → mobile
 * - Tablet browser → depends (we treat as mobile for now, can refine)
 * - Desktop browser → not mobile
 */
export function isMobile(): boolean {
  if (isNative()) return true
  return detectMobileBrowser()
}

/**
 * True if specifically iOS (native or browser).
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/**
 * True if specifically Android (native or browser).
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /Android/i.test(ua)
}

// Cached singleton for client-side use
let _platform: Platform | null = null
let _isMobile: boolean | null = null

/**
 * Cached platform (computed once per client session).
 */
export const platform: Platform = typeof window !== 'undefined'
  ? (_platform ??= getPlatform())
  : 'web'

/**
 * Cached isMobile (computed once per client session).
 */
export const mobile: boolean = typeof window !== 'undefined'
  ? (_isMobile ??= isMobile())
  : false
