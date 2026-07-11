/**
 * Camera & gallery — Capacitor Camera wrapper.
 *
 * SSR-safe: on web/server, falls back to a hidden `<input type="file">`
 * that opens the browser's camera/gallery picker.
 * Graceful degradation: any plugin error returns null (cancellation or failure).
 *
 * Usage:
 *   import { takePhoto, pickFromGallery, requestCameraPermission } from '@/lib/native'
 *   const photo = await takePhoto()
 *   if (photo?.dataUrl) <img src={photo.dataUrl} />
 */

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { isNative } from '@/lib/platform'

export interface PhotoResult {
  /** Base64-encoded image data (without data: prefix). */
  base64?: string
  /** Full data URL (`data:image/jpeg;base64,...`). Use as `<img src>`. */
  dataUrl?: string
  /** Native file path on device filesystem. */
  path?: string
  /** Capacitor web-accessible path (valid inside WebView). */
  webPath?: string
  /** Image format — `'jpeg'` | `'png'` | ... */
  format: string
}

/**
 * Open the device camera and return a single photo.
 * Returns `null` if the user cancels or the capture fails.
 */
export async function takePhoto(): Promise<PhotoResult | null> {
  if (!isNative()) {
    return takePhotoWebFallback()
  }
  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      saveToGallery: false,
      correctOrientation: true,
    })
    return {
      dataUrl: photo.dataUrl,
      webPath: photo.webPath,
      path: photo.path,
      format: photo.format,
    }
  } catch {
    return null
  }
}

/**
 * Open the device gallery and let the user pick a single photo.
 * Returns `null` if the user cancels or selection fails.
 */
export async function pickFromGallery(): Promise<PhotoResult | null> {
  if (!isNative()) {
    return takePhotoWebFallback()
  }
  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      correctOrientation: true,
    })
    return {
      dataUrl: photo.dataUrl,
      webPath: photo.webPath,
      path: photo.path,
      format: photo.format,
    }
  } catch {
    return null
  }
}

/**
 * Request camera + photos permissions.
 * Returns true if at least one permission is granted (or on web/server).
 */
export async function requestCameraPermission(): Promise<boolean> {
  if (!isNative()) return true
  try {
    const status = await Camera.requestPermissions({
      permissions: ['camera', 'photos'],
    })
    return status.camera === 'granted' || status.photos === 'granted'
  } catch {
    return false
  }
}

/**
 * Web fallback: programmatically create a hidden file input, click it,
 * and resolve with a data URL when the user picks a file.
 * SSR-safe: returns null if `document` is unavailable.
 */
async function takePhotoWebFallback(): Promise<PhotoResult | null> {
  if (typeof document === 'undefined') return null
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.style.position = 'fixed'
    input.style.left = '-9999px'
    let settled = false

    const cleanup = () => {
      input.remove()
      document.removeEventListener('focus', checkCancel, true)
    }
    const checkCancel = () => {
      // If focus returns to window without a file selection, treat as cancel.
      setTimeout(() => {
        if (!settled) {
          cleanup()
          resolve(null)
        }
      }, 500)
    }

    input.onchange = (e) => {
      settled = true
      const file = (e.target as HTMLInputElement).files?.[0]
      cleanup()
      if (!file) {
        resolve(null)
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        resolve({
          dataUrl: reader.result as string,
          format: file.type.split('/')[1] || 'jpeg',
        })
      }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    }

    document.body.appendChild(input)
    input.click()
    // Listen for focus return to detect cancel (best-effort on web).
    setTimeout(() => document.addEventListener('focus', checkCancel, true), 100)
  })
}
