/**
 * ARQWELIA Lot 1 — shared types for the wizard, fixtures and API.
 *
 * All values here are DEMO/SIMULATED. No real AI, no real analysis.
 * See docs/ARQWELIA_LOT1.md.
 */

export type ArqProjectType = 'buried_pool' | 'mini_pool' | 'spa_swim_spa'
export type ArqTimeline = '<6m' | '6-12m' | '>12m' | 'undecided'
export type ArqBudget = '<25k' | '25-40k' | '40-60k' | '>60k' | 'undefined'
export type ArqStyle = 'mediterranean' | 'contemporary' | 'natural' | 'familial'
export type ArqConcept = 'A' | 'B'

export interface ArqPhotoMeta {
  id: string
  name: string
  size: number
  type: string
  dataUrl: string // client-side only — never persisted server-side in Lot 1
}

export interface ArqQuestionnaireData {
  projectType: ArqProjectType
  timeline: ArqTimeline
  budget: ArqBudget
  style: ArqStyle
  knownMeasureLabel?: string
  knownMeasureValue?: number
  knownMeasureUnit?: string
}

export interface WizardState {
  photos: ArqPhotoMeta[]
  questionnaire: Partial<ArqQuestionnaireData>
  selectedConcept: ArqConcept | null
  contact: {
    firstName: string
    email: string
    phone: string
    postalCode: string
    consent: boolean
  }
  startedAt: string | null
  demoMode: boolean
}

export const EMPTY_WIZARD_STATE: WizardState = {
  photos: [],
  questionnaire: {},
  selectedConcept: null,
  contact: { firstName: '', email: '', phone: '', postalCode: '', consent: false },
  startedAt: null,
  demoMode: false,
}

/** Max 4 photos, 10 Mo each — enforced client-side only. */
export const ARQ_PHOTO_MAX = 4
export const ARQ_PHOTO_MAX_BYTES = 10 * 1024 * 1024
export const ARQ_PHOTO_ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

/** Consent text version — bump when the wording changes. Stored on consent. */
export const ARQ_CONSENT_VERSION = 'arqwelia-lot1-v1'
export const ARQ_PARTNER_CONSENT_VERSION = 'arqwelia-partner-lot1-v1'

/**
 * Rate limiting — server-side, per server fingerprint, per fixed window.
 * The in-process limiter (src/lib/rate-limit.ts) is acceptable for the
 * current standalone deployment. A distributed limiter (e.g. Upstash/Redis
 * at the edge) is required before significant traffic scaling.
 */
export const ARQWELIA_RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour
export const ARQWELIA_PROJECT_RATE_LIMIT = 5 // project creations / hour / fingerprint
export const ARQWELIA_PARTNER_RATE_LIMIT = 3 // waitlist submissions / hour / fingerprint

/** Strict server-side field limits — mirror the client constraints. */
export const ARQ_FIRSTNAME_MAX = 80
export const ARQ_EMAIL_MAX = 200
export const ARQ_PHONE_MAX = 24
export const ARQ_COMPANY_MAX = 120
export const ARQ_CONTACT_NAME_MAX = 120
export const ARQ_PHONE_RE = /^[+0-9][0-9 ().+\-]{2,23}$/
