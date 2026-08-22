/**
 * AQWELIA — Admin Control Plane V1 · service canonique bannières/popups.
 *
 * RÈGLE ABSOLUE : AGENT PROPOSE → HUMAIN VALIDE → SYSTÈME EXÉCUTE.
 * Ce service n'est appelé que par des routes qui ont déjà vérifié
 * requireAdminFromDb. Chaque mutation :
 *   1. valide le payload (Zod, schémas admin-control/schemas.ts) ;
 *   2. vérifie l'optimistic concurrency (expectedVersion) ;
 *   3. est transactionnelle quand pertinent ;
 *   4. écrit une entrée AdminAuditLog (avant/après JSON, jamais de secrets).
 *
 * Le publish est une ACTION explicite (status + reason obligatoires) et ne
 * peut jamais être déclenchée par un agent.
 */
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import type { z } from 'zod'
import {
  bannerPayloadSchema,
  bannerPatchSchema,
  bannerPublishSchema,
  popupPayloadSchema,
  popupPatchSchema,
  popupPublishSchema,
  announcementPayloadSchema,
  announcementPatchSchema,
  announcementPublishSchema,
  type BannerPayload,
  type PopupPayload,
} from './schemas'

export type AdminDb = typeof db

export interface Actor {
  id: string
  email?: string
}

const actorLabel = (actor: Actor) => actor.email || actor.id

/* ────────────────────────────────────────────────────────────────────────────
   Audit — tout changement persistant est traçable. Jamais de secrets.
   ──────────────────────────────────────────────────────────────────────────── */
async function audit(
  client: AdminDb | Prisma.TransactionClient,
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string | null,
  before?: unknown,
  after?: unknown,
  metadata?: Record<string, unknown>
): Promise<void> {
  await client.adminAuditLog.create({
    data: {
      actor: actorLabel(actor),
      action,
      entityType,
      entityId,
      before: before === undefined ? null : JSON.stringify(before),
      after: after === undefined ? null : JSON.stringify(after),
      metadata: metadata === undefined ? null : JSON.stringify(metadata),
    },
  })
}

export interface BannerView {
  id: string
  internalName: string
  status: string
  translations: Record<string, string>
  variant: string
  ctaTranslations: Record<string, string> | null
  ctaUrl: string | null
  targeting: Record<string, unknown> | null
  startAt: Date | null
  endAt: Date | null
  priority: number
  version: number
  approvedBy: string | null
  approvedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface PopupView {
  id: string
  internalName: string
  status: string
  translations: Record<string, { title: string; body: string }>
  imageUrl: string | null
  ctaTranslations: Record<string, string> | null
  ctaUrl: string | null
  trigger: string
  frequency: string
  reminderDays: number
  targeting: Record<string, unknown> | null
  startAt: Date | null
  endAt: Date | null
  priority: number
  version: number
  approvedBy: string | null
  approvedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const bannerView = (b: { [key: string]: unknown }): BannerView => ({
  id: b.id as string,
  internalName: b.internalName as string,
  status: b.status as string,
  translations: b.translations ? (JSON.parse(b.translations as string) as Record<string, string>) : {},
  variant: b.variant as string,
  ctaTranslations: b.ctaTranslations ? (JSON.parse(b.ctaTranslations as string) as Record<string, string>) : null,
  ctaUrl: b.ctaUrl as string | null,
  targeting: b.targeting ? (JSON.parse(b.targeting as string) as Record<string, unknown>) : null,
  startAt: b.startAt as Date | null,
  endAt: b.endAt as Date | null,
  priority: b.priority as number,
  version: b.version as number,
  approvedBy: b.approvedById as string | null,
  approvedAt: b.approvedAt as Date | null,
  createdAt: b.createdAt as Date,
  updatedAt: b.updatedAt as Date,
})

const popupView = (p: { [key: string]: unknown }): PopupView => ({
  id: p.id as string,
  internalName: p.internalName as string,
  status: p.status as string,
  translations: p.translations ? (JSON.parse(p.translations as string) as Record<string, { title: string; body: string }>) : {},
  imageUrl: p.imageUrl as string | null,
  ctaTranslations: p.ctaTranslations ? (JSON.parse(p.ctaTranslations as string) as Record<string, string>) : null,
  ctaUrl: p.ctaUrl as string | null,
  trigger: p.trigger as string,
  frequency: p.frequency as string,
  reminderDays: p.reminderDays as number,
  targeting: p.targeting ? (JSON.parse(p.targeting as string) as Record<string, unknown>) : null,
  startAt: p.startAt as Date | null,
  endAt: p.endAt as Date | null,
  priority: p.priority as number,
  version: p.version as number,
  approvedBy: p.approvedById as string | null,
  approvedAt: p.approvedAt as Date | null,
  createdAt: p.createdAt as Date,
  updatedAt: p.updatedAt as Date,
})

/* ────────────────────────────────────────────────────────────────────────────
   BANNIÈRES
   ──────────────────────────────────────────────────────────────────────────── */
export async function listBanners(client: AdminDb = db) {
  const rows = await client.adminContentBanner.findMany({ orderBy: { updatedAt: 'desc' } })
  return rows.map((r) => bannerView(r as unknown as { [key: string]: unknown }))
}

export async function createBannerDraft(payload: z.input<typeof bannerPayloadSchema>, actor: Actor, client: AdminDb = db) {
  const data = bannerPayloadSchema.parse(payload)
  const row = await client.$transaction(async (tx) => {
    const created = await tx.adminContentBanner.create({
      data: {
        internalName: data.internalName,
        status: 'DRAFT',
        translations: JSON.stringify(data.translations),
        variant: data.variant,
        ctaTranslations: data.ctaTranslations ? JSON.stringify(data.ctaTranslations) : null,
        ctaUrl: data.ctaUrl ?? null,
        targeting: data.targeting ? JSON.stringify(data.targeting) : null,
        startAt: data.startAt ?? null,
        endAt: data.endAt ?? null,
        priority: data.priority,
        createdById: actor.id,
        updatedById: actor.id,
        version: 0,
      },
    })
    await audit(tx, actor, 'BANNER_CREATED', 'AdminContentBanner', created.id, null, {
      internalName: created.internalName,
      variant: created.variant,
      status: created.status,
    })
    return created
  })
  return bannerView(row as unknown as { [key: string]: unknown })
}

export async function updateBannerDraft(
  id: string,
  payload: z.infer<typeof bannerPatchSchema>,
  actor: Actor,
  client: AdminDb = db
) {
  const data = bannerPatchSchema.parse(payload)
  return client.$transaction(async (tx) => {
    // Lecture de l'état existant pour la validation des dates EFFECTIVES.
    // Cette lecture n'est PAS l'autorité de concurrence : le CAS updateMany
    // ci-dessous (version DANS le WHERE) reste la seule écriture gagnante.
    const existing = await tx.adminContentBanner.findUnique({ where: { id } })
    if (!existing) return { ok: false as const, error: 'not_found' }
    if (!effectiveDatesValid(data, existing)) return { ok: false as const, error: 'invalid_dates' }

    // CAS ATOMIQUE : la condition de version fait partie du WHERE de
    // l'écriture (updateMany). Deux clients concurrents lisent la même
    // version : UN SEUL updateMany renvoie count=1, l'autre count=0.
    // Pas de lost update possible, pas d'audit fantôme.
    const result = await tx.adminContentBanner.updateMany({
      where: {
        id,
        version: data.expectedVersion,
        status: { not: 'ARCHIVED' },
      },
      data: {
        internalName: data.internalName ?? undefined,
        translations: data.translations !== undefined ? JSON.stringify(data.translations) : undefined,
        variant: data.variant ?? undefined,
        ctaTranslations: data.ctaTranslations !== undefined ? JSON.stringify(data.ctaTranslations) : undefined,
        ctaUrl: data.ctaUrl !== undefined ? data.ctaUrl : undefined,
        targeting: data.targeting !== undefined ? JSON.stringify(data.targeting) : undefined,
        startAt: data.startAt !== undefined ? data.startAt : undefined,
        endAt: data.endAt !== undefined ? data.endAt : undefined,
        priority: data.priority ?? undefined,
        updatedById: actor.id,
        version: { increment: 1 },
      },
    })

    if (result.count === 0) {
      const existing = await tx.adminContentBanner.findUnique({ where: { id } })
      if (!existing) return { ok: false as const, error: 'not_found' }
      if (existing.status === 'ARCHIVED') return { ok: false as const, error: 'archived' }
      return { ok: false as const, error: 'stale_version' }
    }

    // Relecture du gagnant (l'écriture a réussi) puis audit DU GAGNANT SEUL.
    const updated = await tx.adminContentBanner.findUniqueOrThrow({ where: { id } })
    await audit(
      tx,
      actor,
      'BANNER_UPDATED',
      'AdminContentBanner',
      id,
      { version: data.expectedVersion },
      { version: updated.version, internalName: updated.internalName },
      { fields: Object.keys(data).filter((k) => k !== 'expectedVersion') }
    )
    return { ok: true as const, banner: bannerView(updated as unknown as { [key: string]: unknown }) }
  })
}

/**
 * Validation de readiness AVANT toute mutation de statut vers
 * PUBLISHED/SCHEDULED. Aucune mutation, aucun incrément de version,
 * aucun audit si refusée.
 */
function bannerPublishReadiness(banner: { translations: string; startAt: Date | null }): string | null {
  const translations = JSON.parse(banner.translations) as Record<string, string>
  if (!translations.fr || !translations.fr.trim()) return 'fr_translation_required'
  for (const l of ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl']) {
    if (typeof translations[l] !== 'string') return 'locales_structure_required'
  }
  return null
}

function popupPublishReadiness(popup: { translations: string; startAt: Date | null }): string | null {
  const translations = JSON.parse(popup.translations) as Record<string, { title?: string; body?: string }>
  for (const l of ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl']) {
    const v = translations[l]
    if (typeof v !== 'object' || v === null || typeof v.title !== 'string' || typeof v.body !== 'string') {
      return 'locales_structure_required'
    }
  }
  if (!translations.fr.title || !translations.fr.title.trim()) return 'fr_title_required'
  if (!translations.fr.body || !translations.fr.body.trim()) return 'fr_body_required'
  return null
}

/**
 * Validation des dates sur l'ÉTAT EFFECTIF (payload ∪ état existant).
 * Un payload qui ne contient qu'une des deux dates ne peut pas produire un
 * état final endAt <= startAt. Retourne false → refus 400 SANS mutation,
 * SANS version++, SANS audit.
 */
function effectiveDatesValid(
  payload: { startAt?: Date; endAt?: Date },
  existing: { startAt: Date | null; endAt: Date | null }
): boolean {
  const effectiveStartAt = payload.startAt !== undefined ? payload.startAt : existing.startAt
  const effectiveEndAt = payload.endAt !== undefined ? payload.endAt : existing.endAt
  if (effectiveStartAt && effectiveEndAt) {
    return effectiveEndAt.getTime() > effectiveStartAt.getTime()
  }
  return true
}

/**
 * Action humaine EXPLICITE : publier / planifier / mettre en pause / archiver.
 * CAS atomique : la version fait partie du WHERE de l'écriture.
 */
export async function setBannerStatus(
  id: string,
  payload: z.infer<typeof bannerPublishSchema>,
  actor: Actor,
  client: AdminDb = db
) {
  const data = bannerPublishSchema.parse(payload)
  return client.$transaction(async (tx) => {
    const existing = await tx.adminContentBanner.findUnique({ where: { id } })
    if (!existing) return { ok: false as const, error: 'not_found' }

    // Readiness AVANT mutation (aucun effet de bord si refusée).
    if (data.status === 'PUBLISHED' || data.status === 'SCHEDULED') {
      const readiness = bannerPublishReadiness(existing)
      if (readiness) return { ok: false as const, error: readiness }
    }
    // Dates EFFECTIVES : le payload combiné à l'état existant doit rester
    // cohérent (endAt > startAt) quelle que soit la transition.
    if (!effectiveDatesValid(data, existing)) return { ok: false as const, error: 'invalid_dates' }

    const result = await tx.adminContentBanner.updateMany({
      where: {
        id,
        version: data.expectedVersion,
        ...(data.status === 'ARCHIVED' ? {} : { status: { not: 'ARCHIVED' } }),
      },
      data: {
        status: data.status,
        ...(data.status === 'PUBLISHED' || data.status === 'SCHEDULED'
          ? { approvedById: actor.id, approvedAt: new Date() }
          : {}),
        ...(data.startAt !== undefined ? { startAt: data.startAt } : {}),
        ...(data.endAt !== undefined ? { endAt: data.endAt } : {}),
        updatedById: actor.id,
        version: { increment: 1 },
      },
    })

    if (result.count === 0) {
      const fresh = await tx.adminContentBanner.findUnique({ where: { id } })
      if (!fresh) return { ok: false as const, error: 'not_found' }
      if (fresh.status === 'ARCHIVED' && data.status !== 'ARCHIVED') return { ok: false as const, error: 'archived' }
      return { ok: false as const, error: 'stale_version' }
    }

    const updated = await tx.adminContentBanner.findUniqueOrThrow({ where: { id } })
    await audit(
      tx,
      actor,
      data.status === 'ARCHIVED' ? 'BANNER_ARCHIVED' : 'BANNER_STATUS_CHANGED',
      'AdminContentBanner',
      id,
      { status: existing.status, version: data.expectedVersion },
      { status: updated.status, version: updated.version },
      { reason: data.reason }
    )
    return { ok: true as const, banner: bannerView(updated as unknown as { [key: string]: unknown }) }
  })
}

/* ────────────────────────────────────────────────────────────────────────────
   POPUPS
   ──────────────────────────────────────────────────────────────────────────── */
export async function listPopups(client: AdminDb = db) {
  const rows = await client.adminContentPopup.findMany({ orderBy: { updatedAt: 'desc' } })
  return rows.map((r) => popupView(r as unknown as { [key: string]: unknown }))
}

export async function createPopupDraft(payload: z.input<typeof popupPayloadSchema>, actor: Actor, client: AdminDb = db) {
  const data = popupPayloadSchema.parse(payload)
  const row = await client.$transaction(async (tx) => {
    const created = await tx.adminContentPopup.create({
      data: {
        internalName: data.internalName,
        status: 'DRAFT',
        translations: JSON.stringify(data.translations),
        imageUrl: data.imageUrl ?? null,
        ctaTranslations: data.ctaTranslations ? JSON.stringify(data.ctaTranslations) : null,
        ctaUrl: data.ctaUrl ?? null,
        trigger: data.trigger,
        frequency: data.frequency,
        reminderDays: data.reminderDays,
        targeting: data.targeting ? JSON.stringify(data.targeting) : null,
        startAt: data.startAt ?? null,
        endAt: data.endAt ?? null,
        priority: data.priority,
        createdById: actor.id,
        updatedById: actor.id,
        version: 0,
      },
    })
    await audit(tx, actor, 'POPUP_CREATED', 'AdminContentPopup', created.id, null, {
      internalName: created.internalName,
      trigger: created.trigger,
      status: created.status,
    })
    return created
  })
  return popupView(row as unknown as { [key: string]: unknown })
}

export async function updatePopupDraft(
  id: string,
  payload: z.infer<typeof popupPatchSchema>,
  actor: Actor,
  client: AdminDb = db
) {
  const data = popupPatchSchema.parse(payload)
  return client.$transaction(async (tx) => {
    const existing = await tx.adminContentPopup.findUnique({ where: { id } })
    if (!existing) return { ok: false as const, error: 'not_found' }
    if (!effectiveDatesValid(data, existing)) return { ok: false as const, error: 'invalid_dates' }

    // CAS ATOMIQUE : la version fait partie du WHERE de l'écriture.
    const result = await tx.adminContentPopup.updateMany({
      where: {
        id,
        version: data.expectedVersion,
        status: { not: 'ARCHIVED' },
      },
      data: {
        internalName: data.internalName ?? undefined,
        translations: data.translations !== undefined ? JSON.stringify(data.translations) : undefined,
        imageUrl: data.imageUrl !== undefined ? data.imageUrl : undefined,
        ctaTranslations: data.ctaTranslations !== undefined ? JSON.stringify(data.ctaTranslations) : undefined,
        ctaUrl: data.ctaUrl !== undefined ? data.ctaUrl : undefined,
        trigger: data.trigger ?? undefined,
        frequency: data.frequency ?? undefined,
        reminderDays: data.reminderDays ?? undefined,
        targeting: data.targeting !== undefined ? JSON.stringify(data.targeting) : undefined,
        startAt: data.startAt !== undefined ? data.startAt : undefined,
        endAt: data.endAt !== undefined ? data.endAt : undefined,
        priority: data.priority ?? undefined,
        updatedById: actor.id,
        version: { increment: 1 },
      },
    })

    if (result.count === 0) {
      const existing = await tx.adminContentPopup.findUnique({ where: { id } })
      if (!existing) return { ok: false as const, error: 'not_found' }
      if (existing.status === 'ARCHIVED') return { ok: false as const, error: 'archived' }
      return { ok: false as const, error: 'stale_version' }
    }

    const updated = await tx.adminContentPopup.findUniqueOrThrow({ where: { id } })
    await audit(
      tx,
      actor,
      'POPUP_UPDATED',
      'AdminContentPopup',
      id,
      { version: data.expectedVersion },
      { version: updated.version, internalName: updated.internalName },
      { fields: Object.keys(data).filter((k) => k !== 'expectedVersion') }
    )
    return { ok: true as const, popup: popupView(updated as unknown as { [key: string]: unknown }) }
  })
}

export async function setPopupStatus(
  id: string,
  payload: z.infer<typeof popupPublishSchema>,
  actor: Actor,
  client: AdminDb = db
) {
  const data = popupPublishSchema.parse(payload)
  return client.$transaction(async (tx) => {
    const existing = await tx.adminContentPopup.findUnique({ where: { id } })
    if (!existing) return { ok: false as const, error: 'not_found' }

    // Readiness AVANT mutation (aucun effet de bord si refusée).
    if (data.status === 'PUBLISHED' || data.status === 'SCHEDULED') {
      const readiness = popupPublishReadiness(existing)
      if (readiness) return { ok: false as const, error: readiness }
    }
    // Dates EFFECTIVES : cohérence endAt > startAt sur l'état final.
    if (!effectiveDatesValid(data, existing)) return { ok: false as const, error: 'invalid_dates' }

    const result = await tx.adminContentPopup.updateMany({
      where: {
        id,
        version: data.expectedVersion,
        ...(data.status === 'ARCHIVED' ? {} : { status: { not: 'ARCHIVED' } }),
      },
      data: {
        status: data.status,
        ...(data.status === 'PUBLISHED' || data.status === 'SCHEDULED'
          ? { approvedById: actor.id, approvedAt: new Date() }
          : {}),
        ...(data.startAt !== undefined ? { startAt: data.startAt } : {}),
        ...(data.endAt !== undefined ? { endAt: data.endAt } : {}),
        updatedById: actor.id,
        version: { increment: 1 },
      },
    })

    if (result.count === 0) {
      const fresh = await tx.adminContentPopup.findUnique({ where: { id } })
      if (!fresh) return { ok: false as const, error: 'not_found' }
      if (fresh.status === 'ARCHIVED' && data.status !== 'ARCHIVED') return { ok: false as const, error: 'archived' }
      return { ok: false as const, error: 'stale_version' }
    }

    const updated = await tx.adminContentPopup.findUniqueOrThrow({ where: { id } })
    await audit(
      tx,
      actor,
      data.status === 'ARCHIVED' ? 'POPUP_ARCHIVED' : 'POPUP_STATUS_CHANGED',
      'AdminContentPopup',
      id,
      { status: existing.status, version: data.expectedVersion },
      { status: updated.status, version: updated.version },
      { reason: data.reason }
    )
    return { ok: true as const, popup: popupView(updated as unknown as { [key: string]: unknown }) }
  })
}

/* ────────────────────────────────────────────────────────────────────────────
   AUDIT — lecture seule
   ──────────────────────────────────────────────────────────────────────────── */
export async function listAuditLogs(
  params: { entityType?: string; entityId?: string; limit?: number },
  client: AdminDb = db
) {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200)
  const rows = await client.adminAuditLog.findMany({
    where: {
      entityType: params.entityType,
      entityId: params.entityId,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return rows.map((r) => ({
    id: r.id,
    actor: r.actor,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    before: r.before ? JSON.parse(r.before) : null,
    after: r.after ? JSON.parse(r.after) : null,
    metadata: r.metadata ? JSON.parse(r.metadata) : null,
    createdAt: r.createdAt,
  }))
}

/* ────────────────────────────────────────────────────────────────────────────
   ANNOUNCEMENTS (PR111) — mêmes garanties que bannières/popups
   ──────────────────────────────────────────────────────────────────────────── */
export interface AnnouncementView {
  id: string
  internalName: string
  status: string
  translations: Record<string, { title: string; body: string }>
  ctaTranslations: Record<string, string> | null
  ctaUrl: string | null
  targeting: Record<string, unknown> | null
  startAt: Date | null
  endAt: Date | null
  priority: number
  version: number
  approvedBy: string | null
  approvedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const announcementView = (a: { [key: string]: unknown }): AnnouncementView => ({
  id: a.id as string,
  internalName: a.internalName as string,
  status: a.status as string,
  translations: a.translations ? (JSON.parse(a.translations as string) as Record<string, { title: string; body: string }>) : {},
  ctaTranslations: a.ctaTranslations ? (JSON.parse(a.ctaTranslations as string) as Record<string, string>) : null,
  ctaUrl: a.ctaUrl as string | null,
  targeting: a.targeting ? (JSON.parse(a.targeting as string) as Record<string, unknown>) : null,
  startAt: a.startAt as Date | null,
  endAt: a.endAt as Date | null,
  priority: a.priority as number,
  version: a.version as number,
  approvedBy: a.approvedById as string | null,
  approvedAt: a.approvedAt as Date | null,
  createdAt: a.createdAt as Date,
  updatedAt: a.updatedAt as Date,
})

export async function listAnnouncements(client: AdminDb = db) {
  const rows = await client.adminContentAnnouncement.findMany({ orderBy: { updatedAt: 'desc' } })
  return rows.map((r) => announcementView(r as unknown as { [key: string]: unknown }))
}

export async function createAnnouncementDraft(payload: z.input<typeof announcementPayloadSchema>, actor: Actor, client: AdminDb = db) {
  const data = announcementPayloadSchema.parse(payload)
  const row = await client.$transaction(async (tx) => {
    const created = await tx.adminContentAnnouncement.create({
      data: {
        internalName: data.internalName,
        status: 'DRAFT',
        translations: JSON.stringify(data.translations),
        ctaTranslations: data.ctaTranslations ? JSON.stringify(data.ctaTranslations) : null,
        ctaUrl: data.ctaUrl ?? null,
        targeting: data.targeting ? JSON.stringify(data.targeting) : null,
        startAt: data.startAt ?? null,
        endAt: data.endAt ?? null,
        priority: data.priority,
        createdById: actor.id,
        updatedById: actor.id,
        version: 0,
      },
    })
    await audit(tx, actor, 'ANNOUNCEMENT_CREATED', 'AdminContentAnnouncement', created.id, null, {
      internalName: created.internalName,
      status: created.status,
    })
    return created
  })
  return announcementView(row as unknown as { [key: string]: unknown })
}

export async function updateAnnouncementDraft(
  id: string,
  payload: z.infer<typeof announcementPatchSchema>,
  actor: Actor,
  client: AdminDb = db
) {
  const data = announcementPatchSchema.parse(payload)
  return client.$transaction(async (tx) => {
    const existing = await tx.adminContentAnnouncement.findUnique({ where: { id } })
    if (!existing) return { ok: false as const, error: 'not_found' }
    if (!effectiveDatesValid(data, existing)) return { ok: false as const, error: 'invalid_dates' }

    const result = await tx.adminContentAnnouncement.updateMany({
      where: { id, version: data.expectedVersion, status: { not: 'ARCHIVED' } },
      data: {
        internalName: data.internalName ?? undefined,
        translations: data.translations !== undefined ? JSON.stringify(data.translations) : undefined,
        ctaTranslations: data.ctaTranslations !== undefined ? JSON.stringify(data.ctaTranslations) : undefined,
        ctaUrl: data.ctaUrl !== undefined ? data.ctaUrl : undefined,
        targeting: data.targeting !== undefined ? JSON.stringify(data.targeting) : undefined,
        startAt: data.startAt !== undefined ? data.startAt : undefined,
        endAt: data.endAt !== undefined ? data.endAt : undefined,
        priority: data.priority ?? undefined,
        updatedById: actor.id,
        version: { increment: 1 },
      },
    })

    if (result.count === 0) {
      const fresh = await tx.adminContentAnnouncement.findUnique({ where: { id } })
      if (!fresh) return { ok: false as const, error: 'not_found' }
      if (fresh.status === 'ARCHIVED') return { ok: false as const, error: 'archived' }
      return { ok: false as const, error: 'stale_version' }
    }

    const updated = await tx.adminContentAnnouncement.findUniqueOrThrow({ where: { id } })
    await audit(tx, actor, 'ANNOUNCEMENT_UPDATED', 'AdminContentAnnouncement', id, { version: data.expectedVersion }, { version: updated.version, internalName: updated.internalName }, { fields: Object.keys(data).filter((k) => k !== 'expectedVersion') })
    return { ok: true as const, announcement: announcementView(updated as unknown as { [key: string]: unknown }) }
  })
}

function announcementPublishReadiness(a: { translations: string }): string | null {
  const translations = JSON.parse(a.translations) as Record<string, { title?: string; body?: string }>
  for (const l of ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl']) {
    const v = translations[l]
    if (typeof v !== 'object' || v === null || typeof v.title !== 'string' || typeof v.body !== 'string') {
      return 'locales_structure_required'
    }
  }
  if (!translations.fr.title || !translations.fr.title.trim()) return 'fr_title_required'
  if (!translations.fr.body || !translations.fr.body.trim()) return 'fr_body_required'
  return null
}

export async function setAnnouncementStatus(
  id: string,
  payload: z.infer<typeof announcementPublishSchema>,
  actor: Actor,
  client: AdminDb = db
) {
  const data = announcementPublishSchema.parse(payload)
  return client.$transaction(async (tx) => {
    const existing = await tx.adminContentAnnouncement.findUnique({ where: { id } })
    if (!existing) return { ok: false as const, error: 'not_found' }

    if (data.status === 'PUBLISHED' || data.status === 'SCHEDULED') {
      const readiness = announcementPublishReadiness(existing)
      if (readiness) return { ok: false as const, error: readiness }
    }
    if (!effectiveDatesValid(data, existing)) return { ok: false as const, error: 'invalid_dates' }

    const result = await tx.adminContentAnnouncement.updateMany({
      where: {
        id,
        version: data.expectedVersion,
        ...(data.status === 'ARCHIVED' ? {} : { status: { not: 'ARCHIVED' } }),
      },
      data: {
        status: data.status,
        ...(data.status === 'PUBLISHED' || data.status === 'SCHEDULED' ? { approvedById: actor.id, approvedAt: new Date() } : {}),
        ...(data.startAt !== undefined ? { startAt: data.startAt } : {}),
        ...(data.endAt !== undefined ? { endAt: data.endAt } : {}),
        updatedById: actor.id,
        version: { increment: 1 },
      },
    })

    if (result.count === 0) {
      const fresh = await tx.adminContentAnnouncement.findUnique({ where: { id } })
      if (!fresh) return { ok: false as const, error: 'not_found' }
      if (fresh.status === 'ARCHIVED' && data.status !== 'ARCHIVED') return { ok: false as const, error: 'archived' }
      return { ok: false as const, error: 'stale_version' }
    }

    const updated = await tx.adminContentAnnouncement.findUniqueOrThrow({ where: { id } })
    await audit(tx, actor, data.status === 'ARCHIVED' ? 'ANNOUNCEMENT_ARCHIVED' : 'ANNOUNCEMENT_STATUS_CHANGED', 'AdminContentAnnouncement', id, { status: existing.status, version: data.expectedVersion }, { status: updated.status, version: updated.version }, { reason: data.reason })
    return { ok: true as const, announcement: announcementView(updated as unknown as { [key: string]: unknown }) }
  })
}
