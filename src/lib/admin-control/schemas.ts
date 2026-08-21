/**
 * AQWELIA — Admin Control Plane V1 · schémas de validation (Zod).
 *
 * Toute entrée client est validée ici AVANT toute mutation. Aucune valeur
 * fournie par le navigateur (rôle, pays, plan, éligibilité, approbation)
 * n'est considérée comme canonique : ces champs n'existent pas dans les
 * payloads d'écriture.
 */
import { z } from 'zod'

export const ADMIN_LOCALES = ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl'] as const
export type AdminLocale = (typeof ADMIN_LOCALES)[number]

export const BANNER_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'PAUSED', 'ARCHIVED'] as const
export const POPUP_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'PAUSED', 'ARCHIVED'] as const

export const BANNER_VARIANTS = ['LAGOON', 'CHAMPAGNE', 'NIGHT'] as const
export const POPUP_TRIGGERS = ['ON_LOAD', 'ON_EXIT', 'AFTER_DIAGNOSTIC', 'AFTER_FIRST_TEST', 'MANUAL'] as const
export const POPUP_FREQUENCIES = ['ONCE', 'PER_SESSION', 'REMIND_DAYS'] as const

/** Le nom interne doit être non vide, raisonnable et sans injection visuelle. */
const internalName = z
  .string()
  .min(2, 'internalName too short')
  .max(120, 'internalName too long')
  .regex(/^[\p{L}\p{N} _'’.()\-]+$/u, 'internalName has invalid characters')

/** JSON canonique des 7 locales — valeurs non vides si présentes. */
export const translationsSchema = z
  .object({
    fr: z.string().min(1).max(400),
    en: z.string().min(1).max(400),
    es: z.string().min(1).max(400),
    pt: z.string().min(1).max(400),
    de: z.string().min(1).max(400),
    it: z.string().min(1).max(400),
    nl: z.string().min(1).max(400),
  })
  .strict()

/** Le modèle exige la structure 7 locales ; la V1 permet des chaînes vides
    (complétude surveillée dans l'UI), mais jamais de locale manquante. */
export const translationsJsonSchema = z
  .object({
    fr: z.string().max(400).default(''),
    en: z.string().max(400).default(''),
    es: z.string().max(400).default(''),
    pt: z.string().max(400).default(''),
    de: z.string().max(400).default(''),
    it: z.string().max(400).default(''),
    nl: z.string().max(400).default(''),
  })
  .strict()

/**
 * Ciblage — structuré et validé. La RÉSOLUTION canonique (match ou non d'un
 * utilisateur) se fait uniquement côté serveur via resolveTargetingMatch() :
 * le client ne peut jamais forcer ?plan= ou ?country=.
 */
export const targetingSchema = z
  .object({
    locales: z.array(z.enum(ADMIN_LOCALES)).max(7).optional(),
    countries: z.array(z.string().regex(/^[A-Z]{2}$/)).max(60).optional(),
    plans: z.array(z.string().min(1).max(40)).max(10).optional(),
    platforms: z.array(z.enum(['WEB', 'IOS', 'ANDROID'])).max(3).optional(),
    zones: z.array(z.enum(['APP', 'LANDING', 'DASHBOARD', 'DIAGNOSTIC', 'WATER_TEST', 'WEATHER'])).max(8).optional(),
    userSegments: z.array(z.enum(['NEW', 'EXISTING'])).max(2).optional(),
  })
  .strict()

/** Chemin interne : commence par UN SEUL / (jamais //, jamais de schéma). */
const INTERNAL_PATH_RE = /^\/(?!\/)[^\s]*$/
/** URL absolue : uniquement HTTPS. */
const HTTPS_URL_RE = /^https:\/\//i
/** Schémas explicitement interdits (et tout schéma autre que https). */
const BLOCKED_SCHEME_RE = /^(javascript|data|file|vbscript|ftp|mailto|tel|chrome):/i

/**
 * URL de CTA : chemin interne sûr OU https absolu. Refuse javascript:, data:,
 * file:, ftp:, protocol-relative //evil… et tout schéma non autorisé.
 */
export const ctaUrlSchema = z
  .string()
  .max(500)
  .refine((v) => v === '' || INTERNAL_PATH_RE.test(v) || (HTTPS_URL_RE.test(v) && !BLOCKED_SCHEME_RE.test(v)), {
    message: 'ctaUrl must be an internal path or a valid HTTPS URL',
  })

/**
 * URL d'image : asset interne sûr OU https absolu. Mêmes refus de schémas.
 */
export const imageUrlSchema = z
  .string()
  .max(500)
  .refine((v) => v === '' || INTERNAL_PATH_RE.test(v) || (HTTPS_URL_RE.test(v) && !BLOCKED_SCHEME_RE.test(v)), {
    message: 'imageUrl must be an internal asset path or a valid HTTPS URL',
  })

/** Les dates, si présentes toutes les deux, doivent être cohérentes. */
function consistentDates(ctx: { startAt?: Date; endAt?: Date }, issue: (message: string) => void) {
  if (ctx.startAt && ctx.endAt && ctx.endAt.getTime() <= ctx.startAt.getTime()) {
    issue('endAt must be strictly after startAt')
  }
}

const bannerPayloadObject = z
  .object({
    internalName,
    translations: translationsJsonSchema,
    variant: z.enum(BANNER_VARIANTS).default('LAGOON'),
    ctaTranslations: translationsJsonSchema.optional(),
    ctaUrl: ctaUrlSchema.optional(),
    targeting: targetingSchema.optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    priority: z.number().int().min(-10).max(100).default(0),
  })
  .strict()

export const bannerPayloadSchema = bannerPayloadObject.superRefine((data, ctx) => {
  consistentDates(data, (m) => ctx.addIssue({ code: 'custom', message: m, path: ['endAt'] }))
})

const popupPayloadObject = z
  .object({
    internalName,
    translations: z
      .object({
        fr: z.object({ title: z.string().max(120), body: z.string().max(500) }),
        en: z.object({ title: z.string().max(120), body: z.string().max(500) }),
        es: z.object({ title: z.string().max(120), body: z.string().max(500) }),
        pt: z.object({ title: z.string().max(120), body: z.string().max(500) }),
        de: z.object({ title: z.string().max(120), body: z.string().max(500) }),
        it: z.object({ title: z.string().max(120), body: z.string().max(500) }),
        nl: z.object({ title: z.string().max(120), body: z.string().max(500) }),
      })
      .strict(),
    imageUrl: imageUrlSchema.optional(),
    ctaTranslations: translationsJsonSchema.optional(),
    ctaUrl: ctaUrlSchema.optional(),
    trigger: z.enum(POPUP_TRIGGERS).default('ON_LOAD'),
    frequency: z.enum(POPUP_FREQUENCIES).default('ONCE'),
    reminderDays: z.number().int().min(0).max(90).default(0),
    targeting: targetingSchema.optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    priority: z.number().int().min(-10).max(100).default(0),
  })
  .strict()

export const popupPayloadSchema = popupPayloadObject.superRefine((data, ctx) => {
  consistentDates(data, (m) => ctx.addIssue({ code: 'custom', message: m, path: ['endAt'] }))
})

/** Patch partiel (update draft) — mêmes bornes, champs optionnels. */
export const bannerPatchSchema = bannerPayloadObject
  .partial()
  .extend({
    /** Optimistic concurrency : l'ancien client ne peut pas écraser une version récente. */
    expectedVersion: z.number().int().nonnegative(),
  })
  .superRefine((data, ctx) => {
    consistentDates(data, (m) => ctx.addIssue({ code: 'custom', message: m, path: ['endAt'] }))
  })

export const popupPatchSchema = popupPayloadObject
  .partial()
  .extend({
    expectedVersion: z.number().int().nonnegative(),
  })
  .superRefine((data, ctx) => {
    consistentDates(data, (m) => ctx.addIssue({ code: 'custom', message: m, path: ['endAt'] }))
  })

export const bannerPublishSchema = z
  .object({
    /** Action humaine explicite — jamais exécutée par un agent. */
    status: z.enum(['PUBLISHED', 'SCHEDULED', 'PAUSED', 'ARCHIVED']),
    expectedVersion: z.number().int().nonnegative(),
    reason: z.string().min(3).max(300),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.status === 'SCHEDULED' && !data.startAt) {
      ctx.addIssue({ code: 'custom', message: 'SCHEDULED requires startAt', path: ['startAt'] })
    }
    consistentDates(data, (m) => ctx.addIssue({ code: 'custom', message: m, path: ['endAt'] }))
  })

export const popupPublishSchema = bannerPublishSchema

export const agentRunSchema = z
  .object({
    agent: z.enum(['opportunityDetector', 'copyAssistant', 'targetingAdvisor', 'scheduler']),
    input: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

export const agentReviewSchema = z
  .object({
    decision: z.enum(['APPROVE', 'REJECT']),
    reason: z.string().max(300).optional(),
  })
  .strict()

export type BannerPayload = z.infer<typeof bannerPayloadSchema>
export type PopupPayload = z.infer<typeof popupPayloadSchema>
export type Targeting = z.infer<typeof targetingSchema>
