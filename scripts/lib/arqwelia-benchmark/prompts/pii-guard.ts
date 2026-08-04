/**
 * ARQWELIA Lot 2 Phase 0A — PII guard.
 *
 * Blocks any personal data from ever reaching a provider prompt or a report:
 *   - emails, phone numbers, street addresses, GPS coordinates, postal codes;
 *   - free-form text that does not match the controlled prompt vocabulary
 *     (the two static concept templates + the closed `vocabulary.ts` lists);
 *   - personal-data object keys (firstName/email/phone/address/postalCode/
 *     publicId/projectToken/imagePath/sourceFileName/…) in reports.
 *
 * `assertPromptPiiFree` is applied inside `buildArqweliaPrompt` and again by
 * the adapters before any request is built. `assertNoPersonalData` is used by
 * the report writer as a final defense-in-depth gate.
 *
 * Messages never echo the offending raw value — only a redacted category — so
 * a secret that slips into an input can never be reflected back to stdout or a
 * report.
 */

import { CONCEPT_A_V1_TEMPLATE } from './concept-a-v1'
import { CONCEPT_B_V1_TEMPLATE } from './concept-b-v1'
import {
  BUDGET_RANGE_OPTIONS,
  CONSTRAINT_OPTIONS,
  CONSTRAINTS_FALLBACK,
  SHAPE_OPTIONS,
  STYLE_OPTIONS,
  TERRACE_CLAUSE_ABSENT,
  TERRACE_CLAUSE_PRESENT,
} from './vocabulary'

export type PiiIssueType =
  | 'email'
  | 'phone'
  | 'address'
  | 'gps'
  | 'postalCode'
  | 'uncontrolled-text'
  | 'path'
  | 'secret'
  | 'personal-data-key'

export interface PiiIssue {
  type: PiiIssueType
  /** Redacted category description — never the raw offending value. */
  hint: string
}

export interface PiiScanResult {
  clean: boolean
  issues: PiiIssue[]
}

export class PiiGuardError extends Error {
  constructor(issues: PiiIssue[]) {
    const categories = [...new Set(issues.map((issue) => issue.type))].join(', ')
    super(`PII guard blocked input (detected: ${categories || 'unknown'})`)
    this.name = 'PiiGuardError'
    this.issues = issues
  }
  issues: PiiIssue[]
}

// ---------------------------------------------------------------------------
// Pattern scanners (boundary-guarded so hash-like tokens are never matched).
// ---------------------------------------------------------------------------

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const PHONE_RE =
  /(?<![A-Za-z0-9])(?:\+?[0-9]{1,3}[\s.-]?)?\(?[0-9]{3}\)?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}(?![A-Za-z0-9])/g
const ADDRESS_RE =
  /\b[0-9]{1,5}\s+(?:[A-Za-z0-9.'-]+\s+){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Way|Place|Pl|Court|Ct|Square|Sq|Crescent|Cres)\b/g
const GPS_DECIMAL_RE =
  /(?<![A-Za-z0-9])(?:[-+]?[0-9]{1,3}(?:\.[0-9]+)?)\s*[,/]\s*(?:[-+]?[0-9]{1,3}(?:\.[0-9]+)?)(?![A-Za-z0-9])/g
const GPS_DMS_RE =
  /[0-9]{1,3}°\s*[0-9]{1,2}'\s*(?:[0-9]{1,2}(?:\.[0-9]+)?"?\s*)?[NSEWnsew]/g
const US_POSTAL_RE = /\b[0-9]{5}(?:-[0-9]{4})?\b/g
const UK_POSTAL_RE = /\b[A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2}\b/g

/** Resets `lastIndex` before each test — `g`-flagged `.test()` is stateful. */
function hasPattern(re: RegExp, text: string): boolean {
  re.lastIndex = 0
  return re.test(text)
}

/** Pure hex of length >= 32 — looks like a SHA-256/truncated hash, never PII. */
const HASH_LIKE_RE = /^[0-9a-fA-F]{32,}$/

/** Shapes that indicate a credential value (value, not name). */
const SECRET_VALUE_RE = /(nvapi-[A-Za-z0-9_\-]+|sk(-live)?-[A-Za-z0-9_\-]+|whsec_[A-Za-z0-9_\-]+|rc_wh_[A-Za-z0-9_\-]+)/g

/** Report keys that must never carry personal data. */
const PERSONAL_DATA_KEY_RE =
  /^(firstName|lastName|fullName|email|emailAddress|phone|phoneNumber|mobile|address|streetAddress|street|city|postalCode|zip|zipCode|gps|latitude|longitude|lat|lng|coordinates|location|geo|publicId|projectToken|imagePath|sourcePath|sourceFileName|rawPrompt|promptA|apiKey|secret)$/i

// ---------------------------------------------------------------------------
// Controlled-vocabulary build (template words + closed-list token words).
// ---------------------------------------------------------------------------

const ALLOWED_WORDS = new Set<string>()

function addWords(...texts: string[]): void {
  for (const text of texts) {
    for (const match of text.toLowerCase().matchAll(/[a-z0-9]+/g)) {
      ALLOWED_WORDS.add(match[0])
    }
  }
}

addWords(
  CONCEPT_A_V1_TEMPLATE,
  CONCEPT_B_V1_TEMPLATE,
  ...STYLE_OPTIONS,
  ...SHAPE_OPTIONS,
  ...BUDGET_RANGE_OPTIONS,
  ...CONSTRAINT_OPTIONS,
  TERRACE_CLAUSE_PRESENT,
  TERRACE_CLAUSE_ABSENT,
  CONSTRAINTS_FALLBACK,
)

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scans an input string for personal data.
 *
 * `vocabulary: true` (default, prompt context) also flags any token that is not
 * part of the controlled prompt vocabulary — i.e. free-form user text.
 * `vocabulary: false` (report context) only applies the fixed PII patterns.
 */
export function scanForPii(input: string, { vocabulary = true }: { vocabulary?: boolean } = {}): PiiScanResult {
  const issues: PiiIssue[] = []
  const text = String(input ?? '')
  if (text === '') return { clean: true, issues }

  const push = (type: PiiIssueType, hint: string): void => {
    issues.push({ type, hint })
  }

  if (hasPattern(EMAIL_RE, text)) push('email', 'email-like pattern detected')
  if (hasPattern(PHONE_RE, text)) push('phone', 'phone-like pattern detected')
  if (hasPattern(ADDRESS_RE, text)) push('address', 'street-address-like pattern detected')
  if (hasPattern(GPS_DECIMAL_RE, text) || hasPattern(GPS_DMS_RE, text)) push('gps', 'GPS coordinate pattern detected')
  if (hasPattern(US_POSTAL_RE, text) || hasPattern(UK_POSTAL_RE, text)) push('postalCode', 'postal-code pattern detected')

  if (vocabulary) {
    for (const token of text.toLowerCase().split(/[^a-z0-9]+/)) {
      if (token === '') continue
      if (token.length >= 32 && HASH_LIKE_RE.test(token)) continue
      if (!ALLOWED_WORDS.has(token)) {
        push('uncontrolled-text', `non-controlled token: ${token.slice(0, 12)}…`)
      }
    }
  }

  return { clean: issues.length === 0, issues }
}

/**
 * Throws `PiiGuardError` when a prompt contains personal data or any
 * free-form text that does not match the controlled prompt vocabulary.
 * Called by the prompt builder and by every real-provider adapter.
 */
export function assertPromptPiiFree(prompt: string): void {
  const result = scanForPii(prompt, { vocabulary: true })
  if (!result.clean) {
    throw new PiiGuardError(result.issues)
  }
}

/**
 * Recursive report guard: throws `PiiGuardError` if the object (or any nested
 * value) carries a personal-data key, a PII pattern, an absolute/local path,
 * a credential-shaped value, or a secret-shaped value. Used by the report
 * writer as a final gate.
 */
export function assertNoPersonalData(input: unknown): void {
  const issues: PiiIssue[] = []
  const seen = new WeakSet<object>()

  const walk = (value: unknown, keyPath: string): void => {
    if (value == null) return
    if (typeof value === 'string') {
      const text = value as string
      const hashLike = text.length >= 32 && HASH_LIKE_RE.test(text)
      if (!hashLike) {
        const scan = scanForPii(text, { vocabulary: false })
        for (const issue of scan.issues) {
          if (!issues.some((existing) => existing.type === issue.type)) issues.push(issue)
        }
      }
      if (hasPattern(SECRET_VALUE_RE, text)) {
        issues.push({ type: 'secret', hint: 'credential-shaped value detected' })
      }
      const home = process.env.HOME
      if ((text.startsWith('/') || text.startsWith('~/') || /^[A-Za-z]:[\\/]/.test(text)) && !text.startsWith('/etc/')) {
        issues.push({ type: 'path', hint: 'absolute local path detected' })
      }
      if (home && home.length > 0 && text.includes(home)) {
        issues.push({ type: 'path', hint: 'local home path detected' })
      }
      return
    }
    if (typeof value !== 'object') return
    if (value instanceof Buffer || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return
    if (seen.has(value)) return
    seen.add(value)

    if (Array.isArray(value)) {
      for (const item of value) walk(item, keyPath)
      return
    }
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (PERSONAL_DATA_KEY_RE.test(key)) {
        issues.push({ type: 'personal-data-key', hint: `personal-data key: ${key}` })
      }
      walk(entry, keyPath ? `${keyPath}.${key}` : key)
    }
  }

  walk(input, '')
  if (issues.length > 0) {
    throw new PiiGuardError(issues)
  }
}
