/**
 * AQWELIA — Admin-authored marketing runtime (read side only).
 *
 * This module consumes the Admin Control Plane records created in PR #108 and
 * turns them into a minimal, public-safe runtime projection. It never mutates
 * admin content, never changes publication status and never writes audit rows.
 *
 * Security rules:
 * - only PUBLISHED / SCHEDULED rows explicitly approved by a human are eligible;
 * - start/end windows are evaluated against the server clock;
 * - country / plan / user segment are supplied by a server-resolved context;
 * - targeting JSON and URLs are re-validated at read time (fail closed);
 * - user-authored strings are rendered as plain text by the client runtime.
 */
import { db } from '@/lib/db'
import {
  ADMIN_LOCALES,
  targetingSchema,
  translationsJsonSchema,
  type AdminLocale,
  type Targeting,
} from '@/lib/admin-control/schemas'
import {
  isWithinSchedule,
  resolveTargetingMatch,
  type TargetingContext,
} from '@/lib/admin-control/targeting'
import { isValidAdminUrl } from '@/lib/admin-control/url-validation'

export const RUNTIME_ZONES = [
  'APP',
  'LANDING',
  'DASHBOARD',
  'DIAGNOSTIC',
  'WATER_TEST',
  'WEATHER',
] as const

export type RuntimeZone = (typeof RUNTIME_ZONES)[number]
export type RuntimePlatform = 'WEB' | 'IOS' | 'ANDROID'

export interface RuntimeContext {
  locale: string
  country: string
  plan: string | null
  platform: RuntimePlatform
  zone: RuntimeZone
  isNewUser: boolean
}

export interface RuntimeBanner {
  id: string
  version: number
  text: string
  variant: 'LAGOON' | 'CHAMPAGNE' | 'NIGHT'
  ctaLabel: string | null
  ctaUrl: string | null
}

export interface RuntimePopup {
  id: string
  version: number
  title: string
  body: string
  imageUrl: string | null
  ctaLabel: string | null
  ctaUrl: string | null
  trigger: 'ON_LOAD' | 'ON_EXIT' | 'AFTER_DIAGNOSTIC' | 'AFTER_FIRST_TEST' | 'MANUAL'
  frequency: 'ONCE' | 'PER_SESSION' | 'REMIND_DAYS'
  reminderDays: number
}

export interface RuntimeContent {
  banner: RuntimeBanner | null
  popups: RuntimePopup[]
}

type BannerRow = {
  id: string
  status: string
  translations: string
  variant: string
  ctaTranslations: string | null
  ctaUrl: string | null
  targeting: string | null
  startAt: Date | null
  endAt: Date | null
  priority: number
  version: number
  approvedById: string | null
  approvedAt: Date | null
  updatedAt: Date
}

type PopupRow = {
  id: string
  status: string
  translations: string
  imageUrl: string | null
  ctaTranslations: string | null
  ctaUrl: string | null
  trigger: string
  frequency: string
  reminderDays: number
  targeting: string | null
  startAt: Date | null
  endAt: Date | null
  priority: number
  version: number
  approvedById: string | null
  approvedAt: Date | null
  updatedAt: Date
}

function normalizeLocale(locale: string): AdminLocale {
  const candidate = locale.trim().toLowerCase().slice(0, 2)
  return (ADMIN_LOCALES as readonly string[]).includes(candidate)
    ? (candidate as AdminLocale)
    : 'fr'
}

function parseJson(value: string | null): unknown {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

function parseTargeting(value: string | null): { ok: true; value: Targeting | null } | { ok: false } {
  if (!value) return { ok: true, value: null }
  const parsed = parseJson(value)
  if (parsed === undefined) return { ok: false }
  const result = targetingSchema.safeParse(parsed)
  return result.success ? { ok: true, value: result.data } : { ok: false }
}

function safeUrl(value: string | null): string | null {
  if (!value) return null
  return isValidAdminUrl(value) ? value : null
}

function isHumanPublished(row: {
  status: string
  approvedById: string | null
  approvedAt: Date | null
  startAt: Date | null
  endAt: Date | null
}, now: Date): boolean {
  if (row.status !== 'PUBLISHED' && row.status !== 'SCHEDULED') return false
  if (!row.approvedById || !row.approvedAt) return false
  return isWithinSchedule(row.startAt, row.endAt, now)
}

function toTargetingContext(ctx: RuntimeContext): TargetingContext {
  return {
    locale: normalizeLocale(ctx.locale),
    country: ctx.country.toUpperCase(),
    plan: ctx.plan,
    platform: ctx.platform,
    zone: ctx.zone,
    isNewUser: ctx.isNewUser,
  }
}

function chooseLocalizedText(raw: string, locale: AdminLocale): string | null {
  const parsed = parseJson(raw)
  const validated = translationsJsonSchema.safeParse(parsed)
  if (!validated.success) return null
  const direct = validated.data[locale]?.trim()
  if (direct) return direct
  const french = validated.data.fr?.trim()
  return french || null
}

function chooseCtaLabel(raw: string | null, locale: AdminLocale): string | null {
  if (!raw) return null
  const parsed = parseJson(raw)
  const validated = translationsJsonSchema.safeParse(parsed)
  if (!validated.success) return null
  const direct = validated.data[locale]?.trim()
  if (direct) return direct
  const french = validated.data.fr?.trim()
  return french || null
}

function choosePopupCopy(
  raw: string,
  locale: AdminLocale
): { title: string; body: string } | null {
  const parsed = parseJson(raw)
  if (!parsed || typeof parsed !== 'object') return null
  const values = parsed as Record<string, unknown>
  const read = (key: AdminLocale) => {
    const entry = values[key]
    if (!entry || typeof entry !== 'object') return null
    const title = (entry as Record<string, unknown>).title
    const body = (entry as Record<string, unknown>).body
    if (typeof title !== 'string' || typeof body !== 'string') return null
    const cleanTitle = title.trim()
    const cleanBody = body.trim()
    return cleanTitle && cleanBody ? { title: cleanTitle, body: cleanBody } : null
  }
  return read(locale) || read('fr')
}

function mapBanner(row: BannerRow, ctx: RuntimeContext, now: Date): RuntimeBanner | null {
  if (!isHumanPublished(row, now)) return null
  const targeting = parseTargeting(row.targeting)
  if (!targeting.ok) return null
  if (!resolveTargetingMatch(targeting.value, toTargetingContext(ctx))) return null

  const locale = normalizeLocale(ctx.locale)
  const text = chooseLocalizedText(row.translations, locale)
  if (!text) return null

  const ctaUrl = safeUrl(row.ctaUrl)
  const ctaLabel = ctaUrl ? chooseCtaLabel(row.ctaTranslations, locale) : null
  const variant = ['LAGOON', 'CHAMPAGNE', 'NIGHT'].includes(row.variant)
    ? (row.variant as RuntimeBanner['variant'])
    : 'LAGOON'

  return {
    id: row.id,
    version: row.version,
    text,
    variant,
    ctaLabel,
    ctaUrl: ctaLabel ? ctaUrl : null,
  }
}

function mapPopup(row: PopupRow, ctx: RuntimeContext, now: Date): RuntimePopup | null {
  if (!isHumanPublished(row, now)) return null
  const targeting = parseTargeting(row.targeting)
  if (!targeting.ok) return null
  if (!resolveTargetingMatch(targeting.value, toTargetingContext(ctx))) return null

  const locale = normalizeLocale(ctx.locale)
  const copy = choosePopupCopy(row.translations, locale)
  if (!copy) return null

  const triggerValues = ['ON_LOAD', 'ON_EXIT', 'AFTER_DIAGNOSTIC', 'AFTER_FIRST_TEST', 'MANUAL'] as const
  const frequencyValues = ['ONCE', 'PER_SESSION', 'REMIND_DAYS'] as const
  if (!(triggerValues as readonly string[]).includes(row.trigger)) return null
  if (!(frequencyValues as readonly string[]).includes(row.frequency)) return null

  const ctaUrl = safeUrl(row.ctaUrl)
  const ctaLabel = ctaUrl ? chooseCtaLabel(row.ctaTranslations, locale) : null

  return {
    id: row.id,
    version: row.version,
    title: copy.title,
    body: copy.body,
    imageUrl: safeUrl(row.imageUrl),
    ctaLabel,
    ctaUrl: ctaLabel ? ctaUrl : null,
    trigger: row.trigger as RuntimePopup['trigger'],
    frequency: row.frequency as RuntimePopup['frequency'],
    reminderDays: Math.max(0, row.reminderDays),
  }
}

/**
 * Pure selector used by tests and by the DB-backed loader.
 * Highest priority wins for banners; popups remain priority ordered so the
 * client can choose the first eligible trigger/frequency without reordering.
 */
export function selectRuntimeContent(
  banners: BannerRow[],
  popups: PopupRow[],
  ctx: RuntimeContext,
  now: Date = new Date()
): RuntimeContent {
  const sortByPriority = <T extends { priority: number; updatedAt: Date }>(rows: T[]) =>
    [...rows].sort((a, b) => b.priority - a.priority || b.updatedAt.getTime() - a.updatedAt.getTime())

  const banner = sortByPriority(banners)
    .map((row) => mapBanner(row, ctx, now))
    .find((item): item is RuntimeBanner => item !== null) ?? null

  const runtimePopups = sortByPriority(popups)
    .map((row) => mapPopup(row, ctx, now))
    .filter((item): item is RuntimePopup => item !== null)
    .slice(0, 10)

  return { banner, popups: runtimePopups }
}

/** Read-only DB projection. No writes, no implicit status changes. */
export async function loadRuntimeContent(
  ctx: RuntimeContext,
  now: Date = new Date(),
  client: typeof db = db
): Promise<RuntimeContent> {
  const [banners, popups] = await Promise.all([
    client.adminContentBanner.findMany({
      where: { status: { in: ['PUBLISHED', 'SCHEDULED'] } },
      select: {
        id: true,
        status: true,
        translations: true,
        variant: true,
        ctaTranslations: true,
        ctaUrl: true,
        targeting: true,
        startAt: true,
        endAt: true,
        priority: true,
        version: true,
        approvedById: true,
        approvedAt: true,
        updatedAt: true,
      },
    }),
    client.adminContentPopup.findMany({
      where: { status: { in: ['PUBLISHED', 'SCHEDULED'] } },
      select: {
        id: true,
        status: true,
        translations: true,
        imageUrl: true,
        ctaTranslations: true,
        ctaUrl: true,
        trigger: true,
        frequency: true,
        reminderDays: true,
        targeting: true,
        startAt: true,
        endAt: true,
        priority: true,
        version: true,
        approvedById: true,
        approvedAt: true,
        updatedAt: true,
      },
    }),
  ])

  return selectRuntimeContent(banners, popups, ctx, now)
}
