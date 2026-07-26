/**
 * ARQWELIA Lot 1 — Wizard state store (Zustand).
 *
 * Holds photos (client-side only — never persisted server-side), questionnaire,
 * selected concept and contact. Persists to sessionStorage so navigating between
 * wizard steps and refreshing keeps the state, but photos are dropped on session
 * end (they live in memory / sessionStorage which is cleared on tab close).
 *
 * NOTE: the stored photos are base64 data URLs kept small in Lot 1 (max 4 × 10 Mo
 * but stored as object URLs / data URLs in sessionStorage up to the browser limit).
 * If sessionStorage overflows we gracefully drop photos and keep the rest.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  EMPTY_WIZARD_STATE,
  ARQ_PHOTO_MAX,
  type WizardState,
  type ArqPhotoMeta,
  type ArqConcept,
  type ArqQuestionnaireData,
} from '@/lib/arqwelia/types'

interface WizardStore extends WizardState {
  setPhotos: (photos: ArqPhotoMeta[]) => void
  addPhoto: (p: ArqPhotoMeta) => { ok: boolean; reason?: string }
  removePhoto: (id: string) => void
  setQuestionnaire: (q: Partial<ArqQuestionnaireData>) => void
  selectConcept: (c: ArqConcept | null) => void
  setContact: (c: Partial<WizardState['contact']>) => void
  startDemo: () => void
  reset: () => void
}

export const useWizardStore = create<WizardStore>()(
  persist(
    (set, get) => ({
      ...EMPTY_WIZARD_STATE,

      setPhotos: (photos) => set({ photos }),
      addPhoto: (p) => {
        const photos = get().photos
        if (photos.length >= ARQ_PHOTO_MAX) {
          return { ok: false, reason: 'photoCount' }
        }
        set({ photos: [...photos, p], startedAt: get().startedAt ?? new Date().toISOString() })
        return { ok: true }
      },
      removePhoto: (id) => set({ photos: get().photos.filter((x) => x.id !== id) }),

      setQuestionnaire: (q) =>
        set({ questionnaire: { ...get().questionnaire, ...q }, startedAt: get().startedAt ?? new Date().toISOString() }),

      selectConcept: (c) => set({ selectedConcept: c }),

      setContact: (c) => set({ contact: { ...get().contact, ...c } }),

      startDemo: () =>
        set({
          demoMode: true,
          questionnaire: {
            projectType: 'piscine_enterrée',
            timeline: '6-12m',
            budget: '25-40k',
            style: 'contemporary',
            knownMeasureLabel: 'Largeur de terrain',
            knownMeasureValue: 8,
            knownMeasureUnit: 'm',
          },
        }),

      reset: () => set({ ...EMPTY_WIZARD_STATE }),
    }),
    {
      name: 'arqwelia-wizard',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? sessionStorage : (undefined as any))),
      // Don't persist photos across sessions — they may blow past sessionStorage limits.
      // We persist the rest (questionnaire, concept, contact) for refresh resilience.
      partialize: (s) => ({
        questionnaire: s.questionnaire,
        selectedConcept: s.selectedConcept,
        contact: s.contact,
        demoMode: s.demoMode,
        startedAt: s.startedAt,
      }) as WizardState,
    }
  )
)