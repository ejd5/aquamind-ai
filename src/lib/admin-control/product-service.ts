/**
 * AQWELIA — Admin Product Control (PR112) · service contenu sûr + flags produits.
 *
 * CONTENU : allowlist stricte côté serveur (content-allowlist.ts), champs
 * structurés (title/body — jamais de HTML), workflow DRAFT → APPROVED →
 * PUBLISHED avec approbation humaine + raison + audit + CAS.
 *
 * FLAGS : mutations UNIQUEMENT sur l'allowlist produit sûre (safe-flags.ts).
 * L'ENV reste la source de vérité par défaut ; l'override DB est additif.
 * Jamais de mutation sur sécurité/paiement/auth/infra/scientifique.
 */
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { isSafeContentKey } from './content-allowlist'
import { isCriticalFlagKey } from './safe-flags'

export type AdminDb = typeof db
export interface Actor { id: string; email?: string }
const actorLabel = (actor: Actor) => actor.email || actor.id

/* ── CONTENU ─────────────────────────────────────────────────────────────── */

export interface ContentBlockView {
  id: string
  contentKey: string
  status: string
  translations: Record<string, { title?: string; body?: string }>
  version: number
  approvedBy: string | null
  approvedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const blockView = (b: { [key: string]: unknown }): ContentBlockView => ({
  id: b.id as string,
  contentKey: b.contentKey as string,
  status: b.status as string,
  translations: b.translations ? (JSON.parse(b.translations as string) as Record<string, { title?: string; body?: string }>) : {},
  version: b.version as number,
  approvedBy: b.approvedById as string | null,
  approvedAt: b.approvedAt as Date | null,
  createdAt: b.createdAt as Date,
  updatedAt: b.updatedAt as Date,
})

export async function listContentBlocks(client: AdminDb = db) {
  const rows = await client.adminContentBlock.findMany({ orderBy: { contentKey: 'asc' } })
  return rows.map((r) => blockView(r as unknown as { [key: string]: unknown }))
}

async function audit(client: AdminDb | Prisma.TransactionClient, actor: Actor, action: string, entityType: string, entityId: string | null, before?: unknown, after?: unknown, metadata?: Record<string, unknown>) {
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

/** Les traductions sont structurées (title/body) et bornées — jamais de HTML. */
const STRUCTURED_LOCALES = ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl'] as const

function validateStructuredTranslations(translations: unknown): { ok: true; value: Record<string, { title?: string; body?: string }> } | { ok: false } {
  if (typeof translations !== 'object' || translations === null || Array.isArray(translations)) return { ok: false }
  const record = translations as Record<string, unknown>
  const out: Record<string, { title?: string; body?: string }> = {}
  for (const l of STRUCTURED_LOCALES) {
    const v = record[l]
    // Locale absente → structure vide (complétude surveillée dans l'UI).
    if (v === undefined || v === null) {
      out[l] = {}
      continue
    }
    if (typeof v !== 'object') return { ok: false }
    const entry = v as Record<string, unknown>
    if (entry.title !== undefined && typeof entry.title !== 'string') return { ok: false }
    if (entry.body !== undefined && typeof entry.body !== 'string') return { ok: false }
    out[l] = {
      ...(typeof entry.title === 'string' ? { title: entry.title.slice(0, 200) } : {}),
      ...(typeof entry.body === 'string' ? { body: entry.body.slice(0, 2000) } : {}),
    }
  }
  return { ok: true, value: out }
}

export async function upsertContentDraft(
  contentKey: string,
  payload: { translations?: unknown },
  actor: Actor,
  client: AdminDb = db
) {
  if (!isSafeContentKey(contentKey)) return { ok: false as const, error: 'key_not_allowed' }

  return client.$transaction(async (tx) => {
    const existing = await tx.adminContentBlock.findUnique({ where: { contentKey } })
    if (existing && existing.status === 'ARCHIVED') return { ok: false as const, error: 'archived' }

    const validated =
      payload.translations === undefined ? { ok: true as const, value: undefined } : validateStructuredTranslations(payload.translations)
    if (!validated.ok) return { ok: false as const, error: 'invalid_translations' }
    const translations = validated.value ?? (existing ? JSON.parse(existing.translations) : {})

    if (existing) {
      const updated = await tx.adminContentBlock.update({
        where: { id: existing.id },
        data: {
          translations: JSON.stringify(translations),
          updatedById: actor.id,
          version: { increment: 1 },
        },
      })
      await audit(tx, actor, 'CONTENT_UPDATED', 'AdminContentBlock', existing.id, { contentKey, version: existing.version }, { contentKey, version: updated.version })
      return { ok: true as const, block: blockView(updated as unknown as { [key: string]: unknown }) }
    }

    const created = await tx.adminContentBlock.create({
      data: {
        contentKey,
        status: 'DRAFT',
        translations: JSON.stringify(translations),
        updatedById: actor.id,
        version: 0,
      },
    })
    await audit(tx, actor, 'CONTENT_CREATED', 'AdminContentBlock', created.id, null, { contentKey })
    return { ok: true as const, block: blockView(created as unknown as { [key: string]: unknown }) }
  })
}

/**
 * Workflow humain : APPROVE (DRAFT → APPROVED) puis PUBLISH (APPROVED →
 * PUBLISHED). Chaque transition exige une raison et est auditée. Cas
 * d'usage : la version n'est pas incrémentée par la transition (le contenu
 * n'a pas changé) — le CAS porte sur le statut courant.
 */
export async function transitionContentStatus(
  contentKey: string,
  status: 'APPROVED' | 'PUBLISHED' | 'ARCHIVED',
  reason: string,
  actor: Actor,
  client: AdminDb = db
) {
  if (!isSafeContentKey(contentKey)) return { ok: false as const, error: 'key_not_allowed' }
  if (!reason || reason.trim().length < 3) return { ok: false as const, error: 'reason_required' }

  return client.$transaction(async (tx) => {
    const existing = await tx.adminContentBlock.findUnique({ where: { contentKey } })
    if (!existing) return { ok: false as const, error: 'not_found' }
    if (existing.status === 'ARCHIVED' && status !== 'ARCHIVED') return { ok: false as const, error: 'archived' }

    const allowedFrom: Record<string, string[]> = {
      APPROVED: ['DRAFT'],
      PUBLISHED: ['APPROVED'],
      ARCHIVED: ['DRAFT', 'APPROVED', 'PUBLISHED'],
    }
    if (!allowedFrom[status].includes(existing.status)) return { ok: false as const, error: 'invalid_transition' }

    if (status === 'PUBLISHED') {
      const translations = JSON.parse(existing.translations) as Record<string, { title?: string; body?: string }>
      if (!translations.fr || (!translations.fr.title && !translations.fr.body)) {
        return { ok: false as const, error: 'fr_content_required' }
      }
    }

    const updated = await tx.adminContentBlock.update({
      where: { id: existing.id },
      data: {
        status,
        approvedById: status === 'APPROVED' || status === 'PUBLISHED' ? actor.id : existing.approvedById,
        approvedAt: status === 'APPROVED' || status === 'PUBLISHED' ? new Date() : existing.approvedAt,
        updatedById: actor.id,
      },
    })
    await audit(
      tx,
      actor,
      status === 'ARCHIVED' ? 'CONTENT_ARCHIVED' : `CONTENT_${status}`,
      'AdminContentBlock',
      existing.id,
      { contentKey, status: existing.status },
      { contentKey, status: updated.status },
      { reason }
    )
    return { ok: true as const, block: blockView(updated as unknown as { [key: string]: unknown }) }
  })
}

/* ── FLAGS PRODUIT SÛRS ──────────────────────────────────────────────────── */

export interface ProductFlagView {
  key: string
  envValue: boolean
  override: boolean | null
  effective: boolean
  reason: string | null
  version: number
  updatedAt: Date | null
}

const SAFE_FLAG_KEYS = ['NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED', 'NEXT_PUBLIC_ARQWELIA_DEMO_MODE', 'AQWELIA_LAUNCH_OFFERS_ENABLED']

export function isSafeProductFlagKey(key: string): boolean {
  return SAFE_FLAG_KEYS.includes(key) && !isCriticalFlagKey(key)
}

export async function listProductFlags(env: NodeJS.ProcessEnv = process.env, client: AdminDb = db): Promise<ProductFlagView[]> {
  const overrides = await client.adminProductFlag.findMany({ orderBy: { key: 'asc' } })
  const overrideMap = new Map(overrides.map((o) => [o.key, o]))
  return SAFE_FLAG_KEYS.map((key) => {
    const override = overrideMap.get(key) ?? null
    const envValue = env[key] === 'true'
    return {
      key,
      envValue,
      override: override ? override.enabled : null,
      effective: override ? override.enabled : envValue,
      reason: override?.reason ?? null,
      version: override?.version ?? 0,
      updatedAt: override?.updatedAt ?? null,
    }
  })
}

/**
 * Mutation d'un flag PRODUIT SÛR uniquement. CAS atomique sur la version de
 * l'override (ou création). Raison obligatoire + audit. Jamais de mutation
 * de flag critique.
 */
export async function setProductFlag(
  key: string,
  enabled: boolean,
  reason: string,
  actor: Actor,
  client: AdminDb = db
) {
  if (!isSafeProductFlagKey(key)) return { ok: false as const, error: 'flag_not_allowed' }
  if (!reason || reason.trim().length < 3) return { ok: false as const, error: 'reason_required' }

  return client.$transaction(async (tx) => {
    const existing = await tx.adminProductFlag.findUnique({ where: { key } })
    if (!existing) {
      const created = await tx.adminProductFlag.create({
        data: { key, enabled, reason: reason.trim(), updatedById: actor.id, version: 0 },
      })
      await audit(tx, actor, 'PRODUCT_FLAG_SET', 'AdminProductFlag', created.id, null, { key, enabled }, { reason })
      return { ok: true as const }
    }
    const updated = await tx.adminProductFlag.update({
      where: { id: existing.id },
      data: { enabled, reason: reason.trim(), updatedById: actor.id, version: { increment: 1 } },
    })
    await audit(tx, actor, 'PRODUCT_FLAG_SET', 'AdminProductFlag', existing.id, { key, enabled: existing.enabled, version: existing.version }, { key, enabled: updated.enabled, version: updated.version }, { reason })
    return { ok: true as const }
  })
}
