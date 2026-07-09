/**
 * Filesystem — Capacitor Filesystem wrapper.
 *
 * SSR-safe: on web/server, all operations return safe defaults (no FS
 * access). Used for exporting diagnostic reports, action plans, health
 * logs, and water-test history as PDF/CSV/HTML files on-device so the
 * user can share them via the native share sheet or open them in
 * another app.
 *
 * Files are written under the `Documents` directory on iOS and the
 * external `Documents` directory on Android — both are user-visible
 * and survive app updates.
 *
 * Usage:
 *   import { writeFile, readFile, deleteFile, getExportUri } from '@/lib/native'
 *   const uri = await writeFile('aqwelia-report.pdf', base64Data, 'pdf')
 *   await shareReport(uri)
 */

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { isNative } from '@/lib/platform'

export type FileEncoding = 'utf8' | 'base64'

export interface WriteOptions {
  /** File name (no path). Will be placed in the Documents directory. */
  filename: string
  /** File contents — text for utf8, base64 for binary. */
  data: string
  /** Encoding — default `utf8`. Use `base64` for PDFs/images. */
  encoding?: FileEncoding
  /** Subdirectory under Documents (created if missing). Default `'Aqwelia'`. */
  subdir?: string
  /** Overwrite if the file already exists. Default `true`. */
  overwrite?: boolean
}

export interface WrittenFile {
  /** Native URI (`file://...`) that can be passed to `Share.share`. */
  uri: string
  /** File name (no path). */
  filename: string
  /** Subdirectory the file lives in. */
  subdir: string
}

/**
 * Write a file to the device's Documents directory.
 * Returns the file URI on success, `null` on failure or on web/server.
 *
 * Encoding behaviour:
 *   - `utf8` (default): passes `Encoding.UTF8` → writes the string as text.
 *   - `base64`: omits the `encoding` parameter → the plugin decodes the
 *     base64 string and writes the resulting binary bytes (PDFs, images).
 */
export async function writeFile(opts: WriteOptions): Promise<WrittenFile | null> {
  if (!isNative()) return null
  const subdir = opts.subdir ?? 'Aqwelia'
  const encoding = opts.encoding ?? 'utf8'
  const recursive = true
  try {
    // Ensure the subdirectory exists.
    try {
      await Filesystem.mkdir({
        path: subdir,
        directory: Directory.Documents,
        recursive,
      })
    } catch {
      // Directory may already exist — safe to ignore.
    }

    const fullPath = `${subdir}/${opts.filename}`
    await Filesystem.writeFile({
      path: fullPath,
      data: opts.data,
      directory: Directory.Documents,
      // For base64, we omit the `encoding` key so the plugin treats `data`
      // as base64-encoded binary (see @capacitor/filesystem docs).
      ...(encoding === 'utf8' ? { encoding: Encoding.UTF8 } : {}),
      recursive,
    })

    const uriResult = await Filesystem.getUri({
      path: fullPath,
      directory: Directory.Documents,
    })

    return {
      uri: uriResult.uri,
      filename: opts.filename,
      subdir,
    }
  } catch {
    return null
  }
}

/**
 * Read a file previously written by `writeFile`.
 * Returns the file contents as a string (utf8) or base64 (binary), or
 * `null` if the file doesn't exist or on web/server.
 */
export async function readFile(
  filename: string,
  encoding: FileEncoding = 'utf8',
  subdir: string = 'Aqwelia',
): Promise<string | null> {
  if (!isNative()) return null
  try {
    const result = await Filesystem.readFile({
      path: `${subdir}/${filename}`,
      directory: Directory.Documents,
      // For base64, we omit `encoding` → the plugin returns base64-encoded data.
      ...(encoding === 'utf8' ? { encoding: Encoding.UTF8 } : {}),
    })
    return typeof result.data === 'string' ? result.data : null
  } catch {
    return null
  }
}

/**
 * Delete a file previously written by `writeFile`.
 * No-op if the file doesn't exist or on web/server.
 */
export async function deleteFile(
  filename: string,
  subdir: string = 'Aqwelia',
): Promise<void> {
  if (!isNative()) return
  try {
    await Filesystem.deleteFile({
      path: `${subdir}/${filename}`,
      directory: Directory.Documents,
    })
  } catch {
    /* graceful degradation */
  }
}

/**
 * Get a native URI for a file previously written by `writeFile`.
 * Useful when you need to share the file but already wrote it earlier.
 * Returns `null` if the file doesn't exist or on web/server.
 */
export async function getExportUri(
  filename: string,
  subdir: string = 'Aqwelia',
): Promise<string | null> {
  if (!isNative()) return null
  try {
    const result = await Filesystem.getUri({
      path: `${subdir}/${filename}`,
      directory: Directory.Documents,
    })
    return result.uri
  } catch {
    return null
  }
}

/**
 * List all files in a subdirectory of Documents.
 * Returns an empty array on web/server or on error.
 */
export async function listFiles(subdir: string = 'Aqwelia'): Promise<string[]> {
  if (!isNative()) return []
  try {
    const result = await Filesystem.readdir({
      path: subdir,
      directory: Directory.Documents,
    })
    return result.files.map((f) => f.name)
  } catch {
    return []
  }
}
