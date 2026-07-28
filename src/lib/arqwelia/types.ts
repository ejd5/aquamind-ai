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
