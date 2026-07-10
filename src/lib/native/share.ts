/**
 * Share — Capacitor Share wrapper.
 *
 * SSR-safe: on web/server, falls back to the Web Share API
 * (`navigator.share`) or a "copy to clipboard" fallback. Graceful
 * degradation: every call wrapped in try/catch so a share-sheet failure
 * or user cancellation never crashes the caller.
 *
 * Used by:
 *   - Diagnostic action plan (share PDF/HTML report)
 *   - Health log (export & share)
 *   - Marketing referral (share promo code)
 *
 * Usage:
 *   import { shareText, shareReport } from '@/lib/native'
 *   await shareText('Mon rapport Aqwelia', 'https://aqwelia.app/r/abc123')
 */

import { Share } from '@capacitor/share'
import { isNative } from '@/lib/platform'

export interface SharePayload {
  /** Title shown in the share sheet (optional). */
  title?: string
  /** Body text shared alongside any URL. */
  text?: string
  /** URL to share (e.g. a report download link). */
  url?: string
  /** Dialog title (Android only — used as the chooser title). */
  dialogTitle?: string
}

/**
 * Share text/url via the native share sheet or Web Share API.
 * Returns `true` if the share completed, `false` if cancelled or unsupported.
 *
 * Web fallback chain:
 *   1. `navigator.share` (Chrome/Safari mobile, Edge desktop)
 *   2. Clipboard copy + toast (`navigator.clipboard.writeText`)
 *   3. No-op (server / unsupported)
 */
export async function shareText(payload: SharePayload): Promise<boolean> {
  if (!isNative()) {
    if (typeof navigator === 'undefined') return false
    // 1. Try Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
        })
        return true
      } catch {
        // User cancelled or share failed — fall through to clipboard.
      }
    }
    // 2. Clipboard fallback
    if (navigator.clipboard) {
      const composite = [payload.text, payload.url].filter(Boolean).join('\n')
      try {
        await navigator.clipboard.writeText(composite)
        return true
      } catch {
        return false
      }
    }
    return false
  }

  try {
    await Share.share({
      title: payload.title,
      text: payload.text,
      url: payload.url,
      dialogTitle: payload.dialogTitle,
    })
    return true
  } catch {
    return false
  }
}

/**
 * Share a report file (e.g. a generated PDF/HTML export).
 *
 * Native: opens the share sheet with the file URI attached.
 * Web:    falls back to opening the URL in a new tab (browser does not
 *         support arbitrary file sharing without a download link).
 * Server: no-op.
 *
 * @param fileUri Native URI (file://...) on device, or a https:// URL on web.
 */
export async function shareReport(
  fileUri: string,
  meta?: { title?: string; text?: string; mimeType?: string },
): Promise<boolean> {
  if (!isNative()) {
    if (typeof window === 'undefined') return false
    // Web: a real file URL — just open it; the browser's download UI handles the rest.
    try {
      window.open(fileUri, '_blank', 'noopener,noreferrer')
      return true
    } catch {
      return false
    }
  }

  try {
    await Share.share({
      title: meta?.title,
      text: meta?.text,
      url: fileUri,
      dialogTitle: meta?.title ?? 'Partager le rapport',
    })
    return true
  } catch {
    return false
  }
}
