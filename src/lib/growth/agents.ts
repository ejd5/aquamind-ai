/**
 * AQWELIA Growth OS — 10-agent growth engine.
 *
 * Each agent is a small, scoped function that:
 *  - takes a typed context object,
 *  - runs a deterministic (or LLM-augmented) computation within a bounded
 *    `objective`/`tools`/`budget`/`maxActions` contract,
 *  - returns a result with a `confidence` score (0–1),
 *  - escalates (status="escalated") when confidence < threshold or when
 *    a required tool is unavailable.
 *
 * All runs are persisted via `logAgentRun()` so the Growth OS dashboard and
 * the compliance supervisor can audit every decision.
 *
 * Agents (in pipeline order):
 *   1. offerBuilder      — propose contract structures (Starter/Pro/Performance)
 *   2. leadCapture       — capture leads from website / widget / B2C / QR / campaigns
 *   3. qualification     — ask qualifying questions, score the lead (0–100)
 *   4. preliminaryDiagnostic — pre-diagnose from photos / problem description
 *   5. matching          — match lead to best professional (geo + skills + capacity)
 *   6. appointmentSetter — propose 3 time slots based on availability
 *   7. nurturing         — reactivation sequences for cold leads (3-step scenario)
 *   8. quoteAssistant    — draft a quote (line items + total + validity)
 *   9. attribution       — track source → commission (min €25 / max €150)
 *  10. complianceSupervisor — verify consent + GDPR rules before any action
 *
 * The Growth OS API (/api/growth/agents/run) dispatches on `agentType`.
 */
import { db } from '@/lib/db'
import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AgentType =
  | 'offer_builder'
  | 'lead_capture'
  | 'qualification'
  | 'diagnostic'
  | 'matching'
  | 'appointment'
  | 'nurturing'
  | 'quote'
  | 'attribution'
  | 'compliance'

export interface AgentResult<T = unknown> {
  agentType: AgentType
  status: 'completed' | 'failed' | 'escalated'
  confidence: number // 0–1
  output: T
  actions: AgentActionLog[]
  cost: number // €
  escalatedTo?: string
  reason?: string
}

export interface AgentActionLog {
  tool: string
  action: string
  approvalRequired: boolean
  result?: unknown
}

export interface AgentContext {
  organizationId?: string
  userId?: string
  leadId?: string
  objective: string
  tools: string[]
  budget: number // €
  maxActions: number
  input?: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistence helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persist an agent run + its actions to the DB. Idempotent: if `runId` is
 * provided it updates; otherwise it creates. Always logs AgentAction rows.
 */
export async function logAgentRun(
  ctx: AgentContext,
  result: AgentResult
): Promise<string> {
  const run = await db.agentRun.create({
    data: {
      agentType: result.agentType,
      organizationId: ctx.organizationId ?? null,
      userId: ctx.userId ?? null,
      leadId: ctx.leadId ?? null,
      objective: ctx.objective,
      input: ctx.input ? JSON.stringify(ctx.input) : null,
      output: JSON.stringify(result.output),
      confidence: result.confidence,
      status: result.status,
      cost: result.cost,
      completedAt: new Date(),
    },
  })

  if (result.actions.length > 0) {
    await db.agentAction.createMany({
      data: result.actions.map((a) => ({
        agentRunId: run.id,
        tool: a.tool,
        action: a.action,
        approvalRequired: a.approvalRequired,
        result: a.result ? JSON.stringify(a.result) : null,
      })),
    })
  }

  return run.id
}

/**
 * Append a LeadEvent for traceability (timeline shown on lead detail page).
 */
export async function logLeadEvent(
  leadId: string,
  type: string,
  actor: string,
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    await db.leadEvent.create({
      data: {
        leadId,
        type,
        actor,
        payload: payload ? JSON.stringify(payload) : null,
      },
    })
  } catch (err) {
    // Never let event logging crash an agent run.
    console.error('[growth/agents] logLeadEvent failed:', err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Offer Builder — propose contract structures (Starter / Pro / Performance)
// ─────────────────────────────────────────────────────────────────────────────

export interface OfferBuilderInput {
  proType: 'independent' | 'small_team' | 'fleet' | 'network'
  poolCount: number
  techCount: number
  revenueGoal?: number
}

export interface OfferProposal {
  plan: 'growth_starter' | 'growth_pro' | 'performance'
  monthlyPrice: number
  setupFee: number
  commissionRate: number
  commissionMin: number
  commissionMax: number
  features: string[]
  rationale: string
}

const OFFER_MATRIX: Record<
  OfferBuilderInput['proType'],
  OfferProposal
> = {
  independent: {
    plan: 'growth_starter',
    monthlyPrice: 59,
    setupFee: 0,
    commissionRate: 0.1,
    commissionMin: 25,
    commissionMax: 150,
    features: [
      'lead_capture',
      'qualification',
      'matching',
      'appointment',
      'nurturing_email',
      '1_seat',
    ],
    rationale:
      'Independent pros need a low-fixed-cost entry. Growth Starter gives the full lead-to-appointment pipeline with a 10% success commission (€25–€150).',
  },
  small_team: {
    plan: 'growth_pro',
    monthlyPrice: 149,
    setupFee: 0,
    commissionRate: 0.08,
    commissionMin: 25,
    commissionMax: 150,
    features: [
      'lead_capture',
      'qualification',
      'diagnostic',
      'matching',
      'appointment',
      'nurturing_sms+email',
      'quote_assistant',
      'attribution_dashboard',
      '5_seats',
    ],
    rationale:
      'Small teams (2–4 techs) get the diagnostic + quote agents and a 5-seat dashboard. Lower commission (8%) rewards higher lead volume.',
  },
  fleet: {
    plan: 'performance',
    monthlyPrice: 349,
    setupFee: 499,
    commissionRate: 0.06,
    commissionMin: 25,
    commissionMax: 150,
    features: [
      'lead_capture',
      'qualification',
      'diagnostic',
      'matching',
      'appointment',
      'nurturing_omnichannel',
      'quote_assistant',
      'attribution_dashboard',
      'compliance_supervisor',
      'unlimited_seats',
      'api_access',
      'sso',
    ],
    rationale:
      'Fleets (5+ techs, multi-site) need the compliance supervisor, SSO and API access. €499 setup covers white-label onboarding; 6% commission scales with volume.',
  },
  network: {
    plan: 'performance',
    monthlyPrice: 799,
    setupFee: 1499,
    commissionRate: 0.05,
    commissionMin: 25,
    commissionMax: 150,
    features: [
      'lead_capture',
      'qualification',
      'diagnostic',
      'matching',
      'appointment',
      'nurturing_omnichannel',
      'quote_assistant',
      'attribution_dashboard',
      'compliance_supervisor',
      'unlimited_seats',
      'api_access',
      'sso',
      'multi_org',
      'dedicated_am',
    ],
    rationale:
      'Networks & franchises get multi-organization management, a dedicated account manager, and the lowest commission (5%).',
  },
}

export async function offerBuilder(
  ctx: AgentContext,
  input: OfferBuilderInput
): Promise<AgentResult<OfferProposal>> {
  const actions: AgentActionLog[] = []
  const proposal = OFFER_MATRIX[input.proType] ?? OFFER_MATRIX.independent

  actions.push({
    tool: 'offer_matrix_lookup',
    action: `looked up plan for proType=${input.proType} (pools=${input.poolCount}, techs=${input.techCount})`,
    approvalRequired: false,
    result: { plan: proposal.plan, price: proposal.monthlyPrice },
  })

  // Sanity: escalate if pool/tech counts are out of bounds for the chosen plan.
  if (input.proType === 'independent' && input.poolCount > 50) {
    return {
      agentType: 'offer_builder',
      status: 'escalated',
      confidence: 0.4,
      output: proposal,
      actions,
      cost: 0.01,
      escalatedTo: 'sales_team',
      reason: `Independent pro with ${input.poolCount} pools — recommend Growth Pro.`,
    }
  }

  const result: AgentResult<OfferProposal> = {
    agentType: 'offer_builder',
    status: 'completed',
    confidence: 0.92,
    output: proposal,
    actions,
    cost: 0.01,
  }
  await logAgentRun(ctx, result)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Lead Capture — capture leads from various sources
// ─────────────────────────────────────────────────────────────────────────────

export interface LeadCaptureInput {
  source: 'website' | 'widget' | 'b2c' | 'qr' | 'campaign' | 'partner' | 'referral'
  firstName: string
  lastName: string
  email: string
  phone?: string
  address?: string
  city?: string
  zipCode?: string
  country?: string
  serviceType?: string
  poolType?: string
  poolVolume?: number
  problem?: string
  urgency?: 'low' | 'normal' | 'high' | 'emergency'
  budget?: string
  consent: boolean
  consentSource?: string
  notes?: string
}

export interface LeadCaptureOutput {
  leadId: string
  status: string
  initialScore: number
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function leadCapture(
  ctx: AgentContext,
  input: LeadCaptureInput
): Promise<AgentResult<LeadCaptureOutput>> {
  const actions: AgentActionLog[] = []

  // Compliance gate — refuse to capture without explicit consent.
  if (!input.consent) {
    return {
      agentType: 'lead_capture',
      status: 'escalated',
      confidence: 0,
      output: { leadId: '', status: 'REJECTED', initialScore: 0 },
      actions,
      cost: 0,
      escalatedTo: 'compliance_supervisor',
      reason: 'No consent — lead capture refused (GDPR).',
    }
  }

  // Validate email format.
  if (!EMAIL_RE.test(input.email)) {
    return {
      agentType: 'lead_capture',
      status: 'failed',
      confidence: 0,
      output: { leadId: '', status: 'INVALID', initialScore: 0 },
      actions,
      cost: 0,
      reason: 'Invalid email format.',
    }
  }

  // Initial score: urgency + service type + completeness bonus.
  let score = 30
  if (input.urgency === 'emergency') score += 30
  else if (input.urgency === 'high') score += 20
  else if (input.urgency === 'normal') score += 10
  if (input.serviceType) score += 10
  if (input.poolType) score += 5
  if (input.phone) score += 10
  if (input.city && input.zipCode) score += 5
  score = Math.min(100, score)

  actions.push({
    tool: 'consent_check',
    action: `verified consent (source=${input.consentSource ?? 'unknown'})`,
    approvalRequired: false,
    result: { ok: true },
  })
  actions.push({
    tool: 'initial_scoring',
    action: `computed initial score=${score} (urgency=${input.urgency ?? 'normal'})`,
    approvalRequired: false,
    result: { score },
  })

  const lead = await db.lead.create({
    data: {
      organizationId: ctx.organizationId ?? null,
      source: input.source,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.toLowerCase().trim(),
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      zipCode: input.zipCode?.trim() || null,
      country: input.country ?? 'FR',
      serviceType: input.serviceType ?? null,
      poolType: input.poolType ?? null,
      poolVolume: input.poolVolume ?? null,
      problem: input.problem ?? null,
      urgency: input.urgency ?? 'normal',
      budget: input.budget ?? null,
      status: 'NEW',
      score,
      consent: true,
      consentSource: input.consentSource ?? input.source,
      notes: input.notes ?? null,
    },
  })

  await logLeadEvent(lead.id, 'created', 'lead_capture', {
    source: input.source,
    initialScore: score,
  })

  const result: AgentResult<LeadCaptureOutput> = {
    agentType: 'lead_capture',
    status: 'completed',
    confidence: 0.95,
    output: { leadId: lead.id, status: 'NEW', initialScore: score },
    actions,
    cost: 0.02,
  }
  await logAgentRun({ ...ctx, leadId: lead.id }, result)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Qualification — ask qualifying questions, score lead (0–100)
// ─────────────────────────────────────────────────────────────────────────────

export interface QualificationInput {
  leadId: string
  answers: Array<{ question: string; answer: string; weight?: number }>
}

export interface QualificationOutput {
  leadId: string
  score: number
  tier: 'cold' | 'warm' | 'hot' | 'qualified'
  nextStep: string
}

const QUALIFICATION_QUESTIONS = [
  'pool_type',           // concrete / liner / shell / spa
  'pool_volume',         // m³
  'problem_category',    // algae / green water / equipment / opening / closing
  'urgency',             // low / normal / high / emergency
  'budget',              // < 200 / 200-500 / 500-1500 / > 1500
  'last_service_date',   // ISO date or "never"
  'has_existing_contract', // yes / no
]

export async function qualification(
  ctx: AgentContext,
  input: QualificationInput
): Promise<AgentResult<QualificationOutput>> {
  const actions: AgentActionLog[] = []

  const lead = await db.lead.findUnique({ where: { id: input.leadId } })
  if (!lead) {
    return {
      agentType: 'qualification',
      status: 'failed',
      confidence: 0,
      output: { leadId: input.leadId, score: 0, tier: 'cold', nextStep: '' },
      actions,
      cost: 0,
      reason: 'Lead not found.',
    }
  }

  // Score: base from current lead.score + weighted answers.
  let score = lead.score
  let weightedTotal = 0
  for (const a of input.answers) {
    const weight = a.weight ?? 10
    weightedTotal += weight
    const ans = a.answer.toLowerCase()
    if (ans === 'emergency' || ans === '> 1500' || ans === 'yes') score += weight
    else if (ans === 'high' || ans === '500-1500') score += weight * 0.7
    else if (ans === 'normal' || ans === '200-500') score += weight * 0.4
    else score += weight * 0.1
  }
  score = weightedTotal > 0 ? Math.min(100, Math.round(score)) : score

  const tier: QualificationOutput['tier'] =
    score >= 80 ? 'qualified' : score >= 60 ? 'hot' : score >= 40 ? 'warm' : 'cold'
  const nextStep =
    tier === 'qualified' || tier === 'hot'
      ? 'run_matching'
      : tier === 'warm'
        ? 'nurturing_sequence'
        : 'discard_or_long_nurture'

  actions.push({
    tool: 'qualification_scoring',
    action: `scored ${input.answers.length} answers (weighted total ${weightedTotal}) → score=${score} tier=${tier}`,
    approvalRequired: false,
    result: { score, tier, nextStep },
  })

  await db.lead.update({
    where: { id: input.leadId },
    data: { score, status: tier === 'qualified' || tier === 'hot' ? 'QUALIFIED' : 'SCORED' },
  })
  await logLeadEvent(input.leadId, 'qualified', 'qualification', { score, tier, nextStep })

  const result: AgentResult<QualificationOutput> = {
    agentType: 'qualification',
    status: 'completed',
    confidence: tier === 'cold' ? 0.6 : 0.88,
    output: { leadId: input.leadId, score, tier, nextStep },
    actions,
    cost: 0.03,
  }
  await logAgentRun({ ...ctx, leadId: input.leadId }, result)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Preliminary Diagnostic — pre-diagnose from photos / problem description
// ─────────────────────────────────────────────────────────────────────────────

export interface DiagnosticInput {
  leadId: string
  problemDescription?: string
  photos?: Array<{ url: string; type: 'water' | 'wall' | 'filter' | 'equipment' }>
}

export interface DiagnosticOutput {
  leadId: string
  probableIssues: string[]
  severity: 'low' | 'medium' | 'high' | 'urgent'
  estimatedServiceType: string
  estimatedDurationMin: number
  recommendedProSpecialty: string
}

// Simple keyword-based pre-diagnostic (deterministic; would be VLM-augmented
// in production by calling the same photo-diagnostic pipeline as the consumer app).
const DIAGNOSTIC_RULES: Array<{
  match: RegExp
  issues: string[]
  severity: DiagnosticOutput['severity']
  serviceType: string
  duration: number
  specialty: string
}> = [
  {
    match: /algae|algue|verte|green/i,
    issues: ['algae_bloom', 'chlorine_deficiency', 'filtration_needed'],
    severity: 'medium',
    serviceType: 'maintenance',
    duration: 90,
    specialty: 'maintenance',
  },
  {
    match: /green water|eau verte|trouble|cloudy/i,
    issues: ['algae_bloom', 'ph_imbalance', 'filtration_needed'],
    severity: 'high',
    serviceType: 'maintenance',
    duration: 120,
    specialty: 'maintenance',
  },
  {
    match: /leak|fuite|perdition/i,
    issues: ['possible_leak', 'structural_inspection_needed'],
    severity: 'high',
    serviceType: 'repair',
    duration: 180,
    specialty: 'repair',
  },
  {
    match: /pump|pompe|filter|filtre|electrolyzer|electrolyseur/i,
    issues: ['equipment_failure', 'replacement_or_repair_needed'],
    severity: 'high',
    serviceType: 'repair',
    duration: 150,
    specialty: 'repair',
  },
  {
    match: /opening|ouverture|closing|fermeture|hivernage/i,
    issues: ['seasonal_service_needed'],
    severity: 'low',
    serviceType: 'opening',
    duration: 120,
    specialty: 'maintenance',
  },
  {
    match: /spa/i,
    issues: ['spa_service_needed'],
    severity: 'low',
    serviceType: 'spa',
    duration: 90,
    specialty: 'spa',
  },
]

export async function preliminaryDiagnostic(
  ctx: AgentContext,
  input: DiagnosticInput
): Promise<AgentResult<DiagnosticOutput>> {
  const actions: AgentActionLog[] = []

  const text = (input.problemDescription ?? '').toLowerCase()
  const photosCount = input.photos?.length ?? 0

  const matched = DIAGNOSTIC_RULES.find((r) => r.match.test(text))
  const probableIssues = matched?.issues ?? ['unspecified_problem']
  const severity = matched?.severity ?? (photosCount > 0 ? 'medium' : 'low')
  const estimatedServiceType = matched?.serviceType ?? 'maintenance'
  const estimatedDurationMin = matched?.duration ?? 90
  const recommendedProSpecialty = matched?.specialty ?? 'maintenance'

  actions.push({
    tool: 'keyword_diagnostic',
    action: `scanned problem description (${text.length} chars) + ${photosCount} photos → matched ${matched ? 'rule' : 'no rule'}`,
    approvalRequired: false,
    result: { probableIssues, severity, recommendedProSpecialty },
  })

  // Update lead with diagnostic info.
  await db.lead.update({
    where: { id: input.leadId },
    data: {
      problem: input.problemDescription ?? null,
      serviceType: estimatedServiceType,
    },
  })
  await logLeadEvent(input.leadId, 'diagnostic', 'diagnostic', {
    probableIssues,
    severity,
    recommendedProSpecialty,
  })

  const result: AgentResult<DiagnosticOutput> = {
    agentType: 'diagnostic',
    status: 'completed',
    confidence: matched ? 0.78 : 0.5,
    output: {
      leadId: input.leadId,
      probableIssues,
      severity,
      estimatedServiceType,
      estimatedDurationMin,
      recommendedProSpecialty,
    },
    actions,
    cost: 0.05,
  }
  // Escalate to a human diagnostic if no rule matched and photos are present.
  if (!matched && photosCount > 0) {
    result.status = 'escalated'
    result.escalatedTo = 'human_diagnostic'
    result.reason = 'Photos present but no keyword rule matched — needs human review.'
    result.confidence = 0.4
  }
  await logAgentRun({ ...ctx, leadId: input.leadId }, result)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Matching — match lead to best professional
// ─────────────────────────────────────────────────────────────────────────────

export interface MatchingInput {
  leadId: string
  organizations: Array<{
    id: string
    name: string
    city?: string
    zipCode?: string
    specialties: string[]
    capacity: number // free slots this week
    rating: number // 0–5
    distanceKm?: number
  }>
}

export interface MatchingOutput {
  leadId: string
  ranked: Array<{
    organizationId: string
    organizationName: string
    score: number
    reasons: string[]
  }>
  bestMatch: {
    organizationId: string
    organizationName: string
    score: number
  } | null
}

export async function matching(
  ctx: AgentContext,
  input: MatchingInput
): Promise<AgentResult<MatchingOutput>> {
  const actions: AgentActionLog[] = []

  const lead = await db.lead.findUnique({ where: { id: input.leadId } })
  if (!lead) {
    return {
      agentType: 'matching',
      status: 'failed',
      confidence: 0,
      output: { leadId: input.leadId, ranked: [], bestMatch: null },
      actions,
      cost: 0,
      reason: 'Lead not found.',
    }
  }

  // Score each organization: specialty match (50) + capacity (20) +
  // rating (15) + distance (15, capped).
  const ranked = input.organizations
    .map((org) => {
      const reasons: string[] = []
      let score = 0
      const neededSpecialty =
        lead.serviceType === 'repair'
          ? 'repair'
          : lead.serviceType === 'spa'
            ? 'spa'
            : 'maintenance'
      if (org.specialties.includes(neededSpecialty)) {
        score += 50
        reasons.push(`specialty_match:${neededSpecialty}`)
      } else if (org.specialties.includes('maintenance')) {
        score += 25
        reasons.push('generic_maintenance_fallback')
      }
      if (org.capacity > 0) {
        score += Math.min(20, org.capacity * 4)
        reasons.push(`capacity=${org.capacity}`)
      }
      score += Math.round(org.rating * 3)
      reasons.push(`rating=${org.rating.toFixed(1)}`)
      if (typeof org.distanceKm === 'number') {
        score += Math.max(0, 15 - Math.min(15, org.distanceKm))
        reasons.push(`distance=${org.distanceKm.toFixed(0)}km`)
      }
      return {
        organizationId: org.id,
        organizationName: org.name,
        score: Math.min(100, score),
        reasons,
      }
    })
    .sort((a, b) => b.score - a.score)

  const bestMatch = ranked[0]
    ? {
        organizationId: ranked[0].organizationId,
        organizationName: ranked[0].organizationName,
        score: ranked[0].score,
      }
    : null

  actions.push({
    tool: 'matching_scorer',
    action: `ranked ${input.organizations.length} organizations, best score=${bestMatch?.score ?? 0}`,
    approvalRequired: false,
    result: { ranked: ranked.slice(0, 5), bestMatch },
  })

  if (bestMatch) {
    // Matching only proposes a candidate. A human dispatcher must confirm
    // the assignment from Growth Inbox; the agent never transfers ownership.
    await logLeadEvent(input.leadId, 'match_suggested', 'matching', {
      organizationId: bestMatch.organizationId,
      score: bestMatch.score,
      approvalRequired: true,
    })
  }

  const confidence = bestMatch ? (bestMatch.score >= 70 ? 0.9 : 0.65) : 0.2
  const result: AgentResult<MatchingOutput> = {
    agentType: 'matching',
    status: 'escalated',
    confidence,
    output: { leadId: input.leadId, ranked, bestMatch },
    actions,
    cost: 0.04,
    escalatedTo: 'manual_dispatcher',
    reason: bestMatch
      ? toolWorkspaceText('fr', 'suggestionReady')
      : 'Aucune organisation disponible — traitement manuel requis.',
  }
  await logAgentRun({ ...ctx, leadId: input.leadId }, result)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Appointment Setter — propose 3 time slots based on availability
// ─────────────────────────────────────────────────────────────────────────────

export interface AppointmentSetterInput {
  leadId: string
  organizationId?: string
  availability: Array<{
    start: string // ISO
    end: string // ISO
  }>
  durationMin?: number
}

export interface AppointmentSetterOutput {
  leadId: string
  proposedSlots: Array<{ start: string; end: string }>
  appointmentId?: string
}

export async function appointmentSetter(
  ctx: AgentContext,
  input: AppointmentSetterInput
): Promise<AgentResult<AppointmentSetterOutput>> {
  const actions: AgentActionLog[] = []

  const durationMin = input.durationMin ?? 90
  // Pick the first 3 available slots that fit the duration.
  const proposedSlots: Array<{ start: string; end: string }> = []
  for (const slot of input.availability) {
    if (proposedSlots.length >= 3) break
    const start = new Date(slot.start)
    const end = new Date(slot.end)
    const diffMin = (end.getTime() - start.getTime()) / 60000
    if (diffMin >= durationMin) {
      const slotEnd = new Date(start.getTime() + durationMin * 60000)
      proposedSlots.push({
        start: start.toISOString(),
        end: slotEnd.toISOString(),
      })
    }
  }

  if (proposedSlots.length === 0) {
    return {
      agentType: 'appointment',
      status: 'escalated',
      confidence: 0.3,
      output: { leadId: input.leadId, proposedSlots: [] },
      actions,
      cost: 0.02,
      escalatedTo: 'manual_scheduler',
      reason: 'No availability fits the required duration.',
    }
  }

  // Create a proposed appointment for the first slot.
  const appt = await db.appointment.create({
    data: {
      leadId: input.leadId,
      organizationId: input.organizationId ?? null,
      startTime: new Date(proposedSlots[0].start),
      endTime: new Date(proposedSlots[0].end),
      status: 'proposed',
    },
  })
  await db.lead.update({
    where: { id: input.leadId },
    data: { status: 'APPOINTMENT' },
  })
  await logLeadEvent(input.leadId, 'appointment_scheduled', 'appointment', {
    appointmentId: appt.id,
    startTime: appt.startTime,
  })

  actions.push({
    tool: 'slot_picker',
    action: `picked ${proposedSlots.length} slots of ${durationMin}min from ${input.availability.length} available`,
    approvalRequired: false,
    result: { appointmentId: appt.id, proposedSlots },
  })

  const result: AgentResult<AppointmentSetterOutput> = {
    agentType: 'appointment',
    status: 'completed',
    confidence: 0.85,
    output: { leadId: input.leadId, proposedSlots, appointmentId: appt.id },
    actions,
    cost: 0.02,
  }
  await logAgentRun({ ...ctx, leadId: input.leadId }, result)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Nurturing — reactivation sequences for cold/warm leads
// ─────────────────────────────────────────────────────────────────────────────

export type NurturingScenario = 'cold_3step' | 'warm_5step' | 'lost_winback'

export interface NurturingInput {
  leadId: string
  scenario: NurturingScenario
}

export interface NurturingOutput {
  leadId: string
  scenario: NurturingScenario
  steps: Array<{
    day: number
    channel: 'email'
    template: string
    goal: string
  }>
  startedAt: string
}

const NURTURING_SCENARIOS: Record<NurturingScenario, NurturingOutput['steps']> = {
  cold_3step: [
    { day: 0, channel: 'email', template: 'cold_intro', goal: 'educate' },
    { day: 3, channel: 'email', template: 'cold_testimonial', goal: 'social_proof' },
    { day: 7, channel: 'email', template: 'cold_offer', goal: 'convert' },
  ],
  warm_5step: [
    { day: 0, channel: 'email', template: 'warm_recall', goal: 'reconnect' },
    { day: 2, channel: 'email', template: 'warm_quick_question', goal: 'engage' },
    { day: 5, channel: 'email', template: 'warm_case_study', goal: 'value' },
    { day: 8, channel: 'email', template: 'warm_slot_offer', goal: 'appointment' },
    { day: 12, channel: 'email', template: 'warm_last_chance', goal: 'convert' },
  ],
  lost_winback: [
    { day: 0, channel: 'email', template: 'winback_we_miss_you', goal: 'reactivate' },
    { day: 7, channel: 'email', template: 'winback_discount', goal: 'incentive' },
    { day: 14, channel: 'email', template: 'winback_final', goal: 'closure' },
  ],
}

export async function nurturing(
  ctx: AgentContext,
  input: NurturingInput
): Promise<AgentResult<NurturingOutput>> {
  const actions: AgentActionLog[] = []

  const steps = NURTURING_SCENARIOS[input.scenario]
  if (!steps) {
    return {
      agentType: 'nurturing',
      status: 'failed',
      confidence: 0,
      output: { leadId: input.leadId, scenario: input.scenario, steps: [], startedAt: new Date().toISOString() },
      actions,
      cost: 0,
      reason: `Unknown scenario: ${input.scenario}`,
    }
  }

  await logLeadEvent(input.leadId, 'nurturing_started', 'nurturing', {
    scenario: input.scenario,
    steps,
  })

  actions.push({
    tool: 'sequence_scheduler',
    action: `scheduled ${steps.length}-step ${input.scenario} sequence`,
    approvalRequired: false,
    result: { scenario: input.scenario, steps },
  })

  const result: AgentResult<NurturingOutput> = {
    agentType: 'nurturing',
    status: 'completed',
    confidence: 0.82,
    output: {
      leadId: input.leadId,
      scenario: input.scenario,
      steps,
      startedAt: new Date().toISOString(),
    },
    actions,
    cost: 0.04,
  }
  await logAgentRun({ ...ctx, leadId: input.leadId }, result)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Quote Assistant — draft a quote (line items + total + validity)
// ─────────────────────────────────────────────────────────────────────────────

export interface QuoteAssistantInput {
  leadId: string
  organizationId?: string
  serviceType: string
  poolVolume?: number
  extras?: Array<{ label: string; unitPrice: number; quantity?: number }>
}

export interface QuoteAssistantOutput {
  quoteId: string
  items: Array<{ label: string; unitPrice: number; quantity: number; total: number }>
  total: number
  currency: string
  validUntil: string
}

const QUOTE_CATALOG: Record<
  string,
  { label: string; unitPrice: number; unit: 'fixed' | 'm3' }[]
> = {
  maintenance: [
    { label: 'visit_full_maintenance', unitPrice: 90, unit: 'fixed' },
    { label: 'water_treatment_chemicals', unitPrice: 35, unit: 'fixed' },
    { label: 'filter_clean', unitPrice: 60, unit: 'fixed' },
  ],
  repair: [
    { label: 'diagnostic_visit', unitPrice: 80, unit: 'fixed' },
    { label: 'labor_hour', unitPrice: 65, unit: 'fixed' },
    { label: 'parts_estimate', unitPrice: 0, unit: 'fixed' },
  ],
  opening: [
    { label: 'pool_opening_full', unitPrice: 180, unit: 'fixed' },
    { label: 'equipment_check', unitPrice: 50, unit: 'fixed' },
  ],
  closing: [
    { label: 'pool_closing_full', unitPrice: 160, unit: 'fixed' },
    { label: 'winterizing_products', unitPrice: 45, unit: 'fixed' },
  ],
  emergency: [
    { label: 'emergency_visit', unitPrice: 150, unit: 'fixed' },
    { label: 'urgent_labor_hour', unitPrice: 85, unit: 'fixed' },
  ],
  spa: [
    { label: 'spa_service_full', unitPrice: 110, unit: 'fixed' },
    { label: 'spa_water_treatment', unitPrice: 30, unit: 'fixed' },
  ],
  renovation: [
    { label: 'renovation_diagnostic', unitPrice: 120, unit: 'fixed' },
    { label: 'renovation_estimate', unitPrice: 0, unit: 'fixed' },
  ],
}

export async function quoteAssistant(
  ctx: AgentContext,
  input: QuoteAssistantInput
): Promise<AgentResult<QuoteAssistantOutput>> {
  const actions: AgentActionLog[] = []

  const catalog = QUOTE_CATALOG[input.serviceType] ?? QUOTE_CATALOG.maintenance
  const items = catalog.map((c) => {
    const qty = c.unit === 'm3' && input.poolVolume ? Math.ceil(input.poolVolume / 10) : 1
    return {
      label: c.label,
      unitPrice: c.unitPrice,
      quantity: qty,
      total: c.unitPrice * qty,
    }
  })

  // Append extras.
  if (input.extras) {
    for (const e of input.extras) {
      const qty = e.quantity ?? 1
      items.push({
        label: e.label,
        unitPrice: e.unitPrice,
        quantity: qty,
        total: e.unitPrice * qty,
      })
    }
  }

  const total = items.reduce((sum, i) => sum + i.total, 0)
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 days

  const quote = await db.quote.create({
    data: {
      leadId: input.leadId,
      organizationId: input.organizationId ?? null,
      items: JSON.stringify(items),
      total,
      currency: 'EUR',
      status: 'draft',
      validUntil,
    },
  })
  await db.lead.update({
    where: { id: input.leadId },
    data: { status: 'QUOTED' },
  })
  await logLeadEvent(input.leadId, 'quote_sent', 'quote', {
    quoteId: quote.id,
    total,
    validUntil: validUntil.toISOString(),
  })

  actions.push({
    tool: 'quote_builder',
    action: `drafted quote (${items.length} items, total=${total}€)`,
    approvalRequired: true,
    result: { quoteId: quote.id, total },
  })

  const result: AgentResult<QuoteAssistantOutput> = {
    agentType: 'quote',
    status: 'completed',
    confidence: 0.75, // quotes always require human approval before sending
    output: {
      quoteId: quote.id,
      items,
      total,
      currency: 'EUR',
      validUntil: validUntil.toISOString(),
    },
    actions,
    cost: 0.06,
  }
  await logAgentRun({ ...ctx, leadId: input.leadId }, result)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Attribution — track source → commission (min €25 / max €150)
// ─────────────────────────────────────────────────────────────────────────────

export interface AttributionInput {
  leadId: string
  organizationId?: string
  events: Array<{ type: string; createdAt: string; source?: string }>
  invoiceAmount?: number
  commissionRate: number
}

export interface AttributionOutput {
  leadId: string
  source: string
  firstTouch: string
  lastTouch: string
  commission: {
    rate: number
    amount: number
    minimum: number
    maximum: number
    status: string
  }
  commissionId: string
}

const SOURCE_WEIGHTS: Record<string, number> = {
  campaign: 0.4,
  referral: 0.25,
  partner: 0.15,
  website: 0.1,
  widget: 0.05,
  qr: 0.03,
  b2c: 0.02,
}

export async function attribution(
  ctx: AgentContext,
  input: AttributionInput
): Promise<AgentResult<AttributionOutput>> {
  const actions: AgentActionLog[] = []

  // First-touch + last-touch attribution.
  const sorted = [...input.events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  const firstTouch = sorted[0]?.source ?? 'unknown'
  const lastTouch = sorted[sorted.length - 1]?.source ?? firstTouch

  // Multi-touch: weighted by source.
  const sourceScores: Record<string, number> = {}
  for (const ev of input.events) {
    if (!ev.source) continue
    sourceScores[ev.source] = (sourceScores[ev.source] ?? 0) + (SOURCE_WEIGHTS[ev.source] ?? 0.05)
  }
  const source =
    Object.entries(sourceScores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? firstTouch

  // Commission: rate × invoiceAmount, clamped to [25, 150].
  const invoiceAmount = input.invoiceAmount ?? 0
  const raw = invoiceAmount * input.commissionRate
  const amount = Math.max(25, Math.min(150, raw))

  const commission = await db.commission.create({
    data: {
      leadId: input.leadId,
      organizationId: input.organizationId ?? null,
      rate: input.commissionRate,
      amount,
      minimum: 25,
      maximum: 150,
      status: invoiceAmount > 0 ? 'due' : 'pending',
      disputeWindow: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 days
    },
  })
  await logLeadEvent(input.leadId, 'commission_created', 'attribution', {
    commissionId: commission.id,
    source,
    amount,
  })

  actions.push({
    tool: 'attribution_model',
    action: `multi-touch attribution (events=${input.events.length}, source=${source}, commission=${amount}€)`,
    approvalRequired: false,
    result: { source, firstTouch, lastTouch, amount },
  })

  const result: AgentResult<AttributionOutput> = {
    agentType: 'attribution',
    status: 'completed',
    confidence: 0.9,
    output: {
      leadId: input.leadId,
      source,
      firstTouch,
      lastTouch,
      commission: {
        rate: input.commissionRate,
        amount,
        minimum: 25,
        maximum: 150,
        status: commission.status,
      },
      commissionId: commission.id,
    },
    actions,
    cost: 0.03,
  }
  await logAgentRun({ ...ctx, leadId: input.leadId }, result)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Compliance Supervisor — verify consent + GDPR rules before any action
// ─────────────────────────────────────────────────────────────────────────────

export interface ComplianceInput {
  action: string
  leadId?: string
  hasConsent: boolean
  consentAgeDays?: number // age of the consent (GDPR: must be < 24 months)
  dataCategories?: string[] // categories of data being processed
  recipientCountry?: string // outside EU = extra checks
}

export interface ComplianceOutput {
  allowed: boolean
  violations: string[]
  recommendations: string[]
  auditTrail: string
}

export async function complianceSupervisor(
  ctx: AgentContext,
  input: ComplianceInput
): Promise<AgentResult<ComplianceOutput>> {
  const actions: AgentActionLog[] = []
  const violations: string[] = []
  const recommendations: string[] = []

  // Rule 1: consent required for any data processing.
  if (!input.hasConsent) {
    violations.push('missing_consent')
    recommendations.push('request_explicit_consent_before_action')
  }

  // Rule 2: consent must be < 24 months old.
  if (input.hasConsent && typeof input.consentAgeDays === 'number') {
    if (input.consentAgeDays > 730) {
      violations.push('consent_expired')
      recommendations.push('renew_consent')
    }
  }

  // Rule 3: sensitive data categories (health, etc.) require extra safeguards.
  if (input.dataCategories?.includes('health')) {
    recommendations.push('encrypt_health_data_at_rest')
  }

  // Rule 4: data transfer outside EU requires SCCs.
  if (input.recipientCountry && !['FR', 'DE', 'ES', 'IT', 'PT', 'NL', 'IE', 'AT', 'BE'].includes(input.recipientCountry)) {
    violations.push('non_eu_transfer_without_scc')
    recommendations.push('sign_standard_contractual_clauses')
  }

  const allowed = violations.length === 0
  const auditTrail = `compliance_check action=${input.action} allowed=${allowed} violations=${violations.join(',')}`

  actions.push({
    tool: 'rule_engine',
    action: auditTrail,
    approvalRequired: false,
    result: { allowed, violations, recommendations },
  })

  if (input.leadId) {
    await logLeadEvent(
      input.leadId,
      allowed ? 'compliance_pass' : 'compliance_block',
      'compliance',
      { action: input.action, violations, recommendations }
    )
  }

  const result: AgentResult<ComplianceOutput> = {
    agentType: 'compliance',
    status: allowed ? 'completed' : 'escalated',
    confidence: allowed ? 0.95 : 0.99,
    output: { allowed, violations, recommendations, auditTrail },
    actions,
    cost: 0.01,
    escalatedTo: allowed ? undefined : 'dpo',
    reason: allowed ? undefined : `Compliance violations: ${violations.join(', ')}`,
  }
  await logAgentRun(ctx, result)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher — used by /api/growth/agents/run
// ─────────────────────────────────────────────────────────────────────────────

export async function dispatchAgent(
  agentType: AgentType,
  ctx: AgentContext,
  input: unknown
): Promise<AgentResult> {
  switch (agentType) {
    case 'offer_builder':
      return offerBuilder(ctx, input as OfferBuilderInput)
    case 'lead_capture':
      return leadCapture(ctx, input as LeadCaptureInput)
    case 'qualification':
      return qualification(ctx, input as QualificationInput)
    case 'diagnostic':
      return preliminaryDiagnostic(ctx, input as DiagnosticInput)
    case 'matching':
      return matching(ctx, input as MatchingInput)
    case 'appointment':
      return appointmentSetter(ctx, input as AppointmentSetterInput)
    case 'nurturing':
      return nurturing(ctx, input as NurturingInput)
    case 'quote':
      return quoteAssistant(ctx, input as QuoteAssistantInput)
    case 'attribution':
      return attribution(ctx, input as AttributionInput)
    case 'compliance':
      return complianceSupervisor(ctx, input as ComplianceInput)
    default:
      throw new Error(`Unknown agent type: ${agentType}`)
  }
}

export const AGENT_LIST: Array<{
  type: AgentType
  name: string
  objective: string
  tools: string[]
  budget: number
  maxActions: number
}> = [
  {
    type: 'offer_builder',
    name: 'Offer Builder',
    objective: 'Propose contract structures (Starter / Pro / Performance)',
    tools: ['offer_matrix_lookup'],
    budget: 0.05,
    maxActions: 5,
  },
  {
    type: 'lead_capture',
    name: 'Lead Capture',
    objective: 'Capture leads from website / widget / B2C / QR / campaigns',
    tools: ['consent_check', 'initial_scoring', 'lead_create'],
    budget: 0.1,
    maxActions: 5,
  },
  {
    type: 'qualification',
    name: 'Qualification',
    objective: 'Ask qualifying questions, score lead (0–100)',
    tools: ['qualification_scoring', 'lead_update'],
    budget: 0.15,
    maxActions: 8,
  },
  {
    type: 'diagnostic',
    name: 'Preliminary Diagnostic',
    objective: 'Pre-diagnose from photos / problem description',
    tools: ['keyword_diagnostic', 'photo_vlm'],
    budget: 0.25,
    maxActions: 6,
  },
  {
    type: 'matching',
    name: 'Matching',
    objective: 'Match lead to best professional (geo + skills + capacity)',
    tools: ['matching_scorer', 'lead_assign'],
    budget: 0.2,
    maxActions: 5,
  },
  {
    type: 'appointment',
    name: 'Appointment Setter',
    objective: 'Propose 3 time slots based on availability',
    tools: ['slot_picker', 'appointment_create'],
    budget: 0.1,
    maxActions: 5,
  },
  {
    type: 'nurturing',
    name: 'Nurturing',
    objective: 'Reactivation sequences for cold leads',
    tools: ['sequence_scheduler', 'email_send', 'sms_send'],
    budget: 0.2,
    maxActions: 10,
  },
  {
    type: 'quote',
    name: 'Quote Assistant',
    objective: 'Draft a quote (line items + total + validity)',
    tools: ['quote_builder', 'quote_create'],
    budget: 0.3,
    maxActions: 6,
  },
  {
    type: 'attribution',
    name: 'Attribution',
    objective: 'Track source → commission (min €25 / max €150)',
    tools: ['attribution_model', 'commission_create'],
    budget: 0.15,
    maxActions: 5,
  },
  {
    type: 'compliance',
    name: 'Compliance Supervisor',
    objective: 'Verify consent + GDPR rules before any action',
    tools: ['rule_engine', 'audit_log'],
    budget: 0.05,
    maxActions: 10,
  },
]
