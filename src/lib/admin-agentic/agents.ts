/**
 * AQWELIA — Admin Control Plane V1 · couche AGENTIC AdminOps.
 *
 * RÈGLE ABSOLUE : AGENT PROPOSE → HUMAIN VALIDE → SYSTÈME EXÉCUTE.
 *
 * Les agents sont DÉTERMINISTES et provider-agnostic (aucun appel LLM, aucune
 * clé API requise en V1). Chaque run produit une AdminAgentProposal avec :
 *   - status NEEDS_REVIEW (jamais publié/exécuté automatiquement) ;
 *   - confidence 0..1, riskLevel LOW/MEDIUM/HIGH/BLOCKED ;
 *   - blockedReasons si le guardrailSupervisor bloque ou escalade.
 *
 * Le guardrail empêche notamment : claims dangereux, altération scientifique,
 * promesse commerciale trompeuse, promotion incompatible, modification de
 * prix/billing, action non autorisée, contenu sans validation humaine.
 */
import { db } from '@/lib/db'

export type AdminAgentType = 'opportunityDetector' | 'copyAssistant' | 'targetingAdvisor' | 'scheduler'
export type ProposalType = 'OPPORTUNITY' | 'COPY' | 'TARGETING' | 'SCHEDULE'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKED'

export interface AgentRunInput {
  /** Saison courante serveur (climat commercial) : WINTER | SPRING | SUMMER | AUTUMN. */
  season?: string
  /** Campagnes déjà actives/planifiées (lecture seule). */
  activeCampaigns?: Array<{ code: string; status: string; endsAt: string | null }>
  /** Intent marketing de l'humain (ex. « promouvoir l'hivernage »). */
  intent?: string
  /** Zone cible souhaitée (APP | LANDING | DASHBOARD…). */
  zone?: string
  /** Locale principale de travail (fr par défaut). */
  locale?: string
  /** Données contextuelles additionnelles (bornées). */
  extra?: Record<string, unknown>
}

export interface AgentProposalPayload {
  kind: 'BANNER' | 'POPUP' | 'ANNOUNCEMENT'
  internalName: string
  /** Traductions proposées — toujours incomplètes par défaut (l'humain valide). */
  translations: Record<string, string>
  ctaTranslations?: Record<string, string>
  ctaUrl?: string
  variant?: string
  trigger?: string
  frequency?: string
  targeting?: Record<string, unknown>
  startAt?: string
  endAt?: string
  priority?: number
}

export interface AgentRunResult {
  agent: AdminAgentType
  type: ProposalType
  title: string
  rationale: string
  payload: AgentProposalPayload
  confidence: number
  riskLevel: RiskLevel
  blockedReasons: string[]
  status: 'NEEDS_REVIEW'
}

/* ────────────────────────────────────────────────────────────────────────────
   Guardrails — appliqués à CHAQUE proposition avant persistance.
   ──────────────────────────────────────────────────────────────────────────── */

const FORBIDDEN_CLAIM_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /garanti[s]? (une|un|la|le)?\s*(guérison|cure|zéro|0\s*%|100\s*%)/i, reason: 'claim_resultat_garanti' },
  { pattern: /élimine (toutes|tous|toute)s? (les )?(bactéries|algues|virus)/i, reason: 'claim_elimination_totale' },
  { pattern: /sans (aucun|le moindre) (effort|entretien|produit)/i, reason: 'claim_zero_effort' },
  { pattern: /en 24\s*h\b|résultats? (immédiats?)/i, reason: 'claim_resultat_immediat' },
  { pattern: /\bguérison\b|\bcure\b|médical|thérapeutique|soigne|traite (votre|la)/i, reason: 'claim_medical' },
  { pattern: /prix|tarif|euro|€|\bUSD\b|remise de|billing|paiement/i, reason: 'billing_or_pricing_content' },
]

const FORBIDDEN_PAYLOAD_KEYS = ['price', 'pricing', 'amount', 'discountPercent', 'planId', 'secret', 'apiKey', 'token', 'password']

function isForbiddenPayloadKey(key: string): boolean {
  return FORBIDDEN_PAYLOAD_KEYS.some((k) => key.toLowerCase().includes(k))
}

export interface GuardrailReport {
  riskLevel: RiskLevel
  blockedReasons: string[]
  escalated: boolean
}

export function runGuardrailSupervisor(
  agent: AdminAgentType,
  payload: AgentProposalPayload,
  input: AgentRunInput
): GuardrailReport {
  const blockedReasons: string[] = []
  const texts = [
    payload.internalName,
    ...Object.values(payload.translations),
    ...Object.values(payload.ctaTranslations ?? {}),
    payload.ctaUrl ?? '',
  ]

  for (const t of texts) {
    for (const rule of FORBIDDEN_CLAIM_PATTERNS) {
      if (rule.pattern.test(t) && !blockedReasons.includes(rule.reason)) {
        blockedReasons.push(rule.reason)
      }
    }
  }

  for (const key of Object.keys(payload)) {
    if (isForbiddenPayloadKey(key)) blockedReasons.push('forbidden_payload_key')
  }
  for (const key of Object.keys(payload.targeting ?? {})) {
    if (isForbiddenPayloadKey(key)) blockedReasons.push('forbidden_payload_key')
  }

  // Toujours : un agent ne peut jamais décider d'une publication.
  blockedReasons.push('human_review_required')

  // Interdiction absolue de modifier le billing/prix.
  if (input.intent && /prix|tarif|billing|remise/i.test(input.intent)) {
    blockedReasons.push('billing_change_not_allowed')
  }

  // Altération scientifique : les agents ne touchent jamais aux seuils/statuts.
  if (input.extra && Object.keys(input.extra).some((k) => /threshold|target|scientific/i.test(k))) {
    blockedReasons.push('scientific_alteration_not_allowed')
  }

  const unique = [...new Set(blockedReasons)]
  const hardBlocks = unique.filter((r) => !['human_review_required'].includes(r))

  if (hardBlocks.length > 0) return { riskLevel: 'BLOCKED', blockedReasons: unique, escalated: true }
  if (input.activeCampaigns && input.activeCampaigns.some((c) => c.status === 'ACTIVE' && !c.endsAt)) {
    return { riskLevel: 'MEDIUM', blockedReasons: unique, escalated: false }
  }
  return { riskLevel: 'LOW', blockedReasons: unique, escalated: false }
}

/* ────────────────────────────────────────────────────────────────────────────
   Agents déterministes (provider-agnostic)
   ──────────────────────────────────────────────────────────────────────────── */

const SEASON_INTENTS: Record<string, { title: string; fr: string }> = {
  WINTER: { title: 'Hivernage', fr: 'Préparez votre piscine pour l’hiver en toute sérénité' },
  SPRING: { title: 'Remise en route', fr: 'Le printemps arrive : remettez votre piscine en route' },
  SUMMER: { title: 'Été', fr: 'Profitez d’une eau parfaite tout l’été' },
  AUTUMN: { title: 'Automne', fr: 'Anticipez l’automne : protégez votre bassin' },
}

export function opportunityDetector(input: AgentRunInput): AgentRunResult {
  const season = input.season || 'SUMMER'
  const theme = SEASON_INTENTS[season] || SEASON_INTENTS.SUMMER
  const active = input.activeCampaigns?.filter((c) => c.status === 'ACTIVE' || c.status === 'SCHEDULED') ?? []
  const rationale =
    active.length > 0
      ? `Opportunité saisonnière « ${theme.title} » détectée, mais ${active.length} campagne(s) déjà active(s)/planifiée(s) : risque de chevauchement → confidence réduite.`
      : `Fenêtre saisonnière « ${theme.title} » : aucun contenu actif sur la zone ${input.zone || 'APP'} → opportunité de campagne contextuelle.`
  const confidence = active.length > 0 ? 0.55 : 0.78
  return {
    agent: 'opportunityDetector',
    type: 'OPPORTUNITY',
    title: `Opportunité saisonnière — ${theme.title}`,
    rationale,
    payload: {
      kind: 'BANNER',
      internalName: `SAISON_${season}_${input.zone || 'APP'}`,
      translations: { fr: theme.fr },
      variant: 'LAGOON',
      targeting: input.zone ? { zones: [input.zone] } : undefined,
    },
    confidence,
    riskLevel: 'LOW',
    blockedReasons: [],
    status: 'NEEDS_REVIEW',
  }
}

export function copyAssistant(input: AgentRunInput): AgentRunResult {
  const locale = input.locale || 'fr'
  const intent = input.intent || 'Mettre en avant les bienfaits d’une eau saine'
  const body = `Découvrez comment ${intent.charAt(0).toLowerCase() + intent.slice(1)} avec AQWELIA.`
  return {
    agent: 'copyAssistant',
    type: 'COPY',
    title: `Rédaction — ${intent}`,
    rationale: `Proposition rédactionnelle pour la locale ${locale} à partir de l’intention fournie. Les 7 locales restent à compléter par l’humain avant publication.`,
    payload: {
      kind: 'ANNOUNCEMENT',
      internalName: `COPY_${locale.toUpperCase()}_${Date.now().toString(36)}`,
      translations: { [locale]: body },
      ctaTranslations: { [locale]: 'En savoir plus' },
      variant: 'LAGOON',
    },
    confidence: 0.7,
    riskLevel: 'LOW',
    blockedReasons: [],
    status: 'NEEDS_REVIEW',
  }
}

export function targetingAdvisor(input: AgentRunInput): AgentRunResult {
  const season = input.season || 'SUMMER'
  return {
    agent: 'targetingAdvisor',
    type: 'TARGETING',
    title: `Ciblage recommandé — ${season}`,
    rationale: 'Audience large par défaut (aucune exclusion) : le ciblage par plan/pays reste à valider humainement à partir des données serveur d’usage.',
    payload: {
      kind: 'BANNER',
      internalName: `TARGETING_${season}_DEFAULT`,
      translations: { fr: '' },
      targeting: { locales: ['fr'], zones: [input.zone || 'APP'] },
    },
    confidence: 0.62,
    riskLevel: 'LOW',
    blockedReasons: [],
    status: 'NEEDS_REVIEW',
  }
}

export function scheduler(input: AgentRunInput): AgentRunResult {
  const now = new Date()
  const start = new Date(now.getTime() + 3 * 24 * 3600 * 1000)
  const end = new Date(start.getTime() + 21 * 24 * 3600 * 1000)
  const windowMs = 21 * 24 * 3600 * 1000
  return {
    agent: 'scheduler',
    type: 'SCHEDULE',
    title: 'Fenêtre de diffusion recommandée',
    rationale: `Proposition de fenêtre (${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}) : 3 jours de préparation humaine avant publication, durée ${Math.round(windowMs / (24 * 3600 * 1000))} jours.`,
    payload: {
      kind: 'BANNER',
      internalName: `SCHEDULE_${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
      translations: { fr: '' },
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      priority: 0,
    },
    confidence: 0.85,
    riskLevel: 'LOW',
    blockedReasons: [],
    status: 'NEEDS_REVIEW',
  }
}

export const ADMIN_AGENTS: Record<AdminAgentType, (input: AgentRunInput) => AgentRunResult> = {
  opportunityDetector,
  copyAssistant,
  targetingAdvisor,
  scheduler,
}

/* ────────────────────────────────────────────────────────────────────────────
   Exécution + persistance
   ──────────────────────────────────────────────────────────────────────────── */

export interface ProposalView {
  id: string
  agent: string
  type: string
  status: string
  title: string
  rationale: string
  payload: unknown
  confidence: number
  riskLevel: string
  blockedReasons: string[] | null
  linkedEntityType: string | null
  linkedEntityId: string | null
  createdAt: Date
  reviewedAt: Date | null
  reviewedBy: string | null
  executedAt: Date | null
}

const toView = (p: { [key: string]: unknown }): ProposalView => ({
  id: p.id as string,
  agent: p.agent as string,
  type: p.type as string,
  status: p.status as string,
  title: p.title as string,
  rationale: p.rationale as string,
  payload: p.payload ? JSON.parse(p.payload as string) : null,
  confidence: p.confidence as number,
  riskLevel: p.riskLevel as string,
  blockedReasons: p.blockedReasons ? (JSON.parse(p.blockedReasons as string) as string[]) : null,
  linkedEntityType: p.linkedEntityType as string | null,
  linkedEntityId: p.linkedEntityId as string | null,
  createdAt: p.createdAt as Date,
  reviewedAt: p.reviewedAt as Date | null,
  reviewedBy: p.reviewedBy as string | null,
  executedAt: p.executedAt as Date | null,
})

/**
 * Exécute un agent déterministe, applique le guardrail et persiste une
 * proposition NEEDS_REVIEW. AUCUNE publication, AUCUN effet de bord produit.
 * Client injectable (tests DB isolée).
 */
export async function runAdminAgent(agent: AdminAgentType, input: AgentRunInput, actorId: string, client: typeof db = db) {
  const runner = ADMIN_AGENTS[agent]
  const raw = runner(input)
  const guard = runGuardrailSupervisor(agent, raw.payload, input)

  const row = await client.$transaction(async (tx) => {
    const created = await tx.adminAgentProposal.create({
      data: {
        agent: raw.agent,
        type: raw.type,
        status: 'NEEDS_REVIEW',
        title: raw.title,
        rationale: raw.rationale,
        payload: JSON.stringify(raw.payload),
        confidence: raw.confidence,
        riskLevel: guard.riskLevel,
        blockedReasons: guard.blockedReasons.length ? JSON.stringify(guard.blockedReasons) : null,
        linkedEntityType: null,
        linkedEntityId: null,
      },
    })
    await tx.adminAuditLog.create({
      data: {
        actor: actorId,
        action: 'AGENT_PROPOSAL_CREATED',
        entityType: 'AdminAgentProposal',
        entityId: created.id,
        before: null,
        after: JSON.stringify({ agent: created.agent, type: created.type, riskLevel: created.riskLevel, title: created.title }),
        metadata: null,
      },
    })
    return created
  })

  return toView(row as unknown as { [key: string]: unknown })
}

export async function listProposals(params: { status?: string; limit?: number } = {}, client: typeof db = db) {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100)
  const rows = await client.adminAgentProposal.findMany({
    where: params.status ? { status: params.status } : {},
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return rows.map((r) => toView(r as unknown as { [key: string]: unknown }))
}

/**
 * Revue HUMAINE : APPROVE ou REJECT.
 * V1 : APPROVE change UNIQUEMENT le statut en APPROVED (reviewedBy/At).
 * AUCUNE exécution/publication dans le même geste — la publication sera une
 * PR séparée (APPROVE puis PUBLISH).
 */
export async function reviewProposal(
  id: string,
  decision: 'APPROVE' | 'REJECT',
  reviewerId: string,
  reason?: string,
  client: typeof db = db
) {
  return client.$transaction(async (tx) => {
    const existing = await tx.adminAgentProposal.findUnique({ where: { id } })
    if (!existing) return { ok: false as const, error: 'not_found' }
    if (existing.status !== 'NEEDS_REVIEW') return { ok: false as const, error: 'invalid_status' }
    if (existing.riskLevel === 'BLOCKED' && decision === 'APPROVE') {
      return { ok: false as const, error: 'blocked_proposal' }
    }

    const updated = await tx.adminAgentProposal.update({
      where: { id },
      data: {
        status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
      },
    })
    await tx.adminAuditLog.create({
      data: {
        actor: reviewerId,
        action: decision === 'APPROVE' ? 'AGENT_PROPOSAL_APPROVED' : 'AGENT_PROPOSAL_REJECTED',
        entityType: 'AdminAgentProposal',
        entityId: id,
        before: JSON.stringify({ status: existing.status }),
        after: JSON.stringify({ status: updated.status }),
        metadata: reason ? JSON.stringify({ reason }) : null,
      },
    })
    return { ok: true as const, proposal: toView(updated as unknown as { [key: string]: unknown }) }
  })
}
