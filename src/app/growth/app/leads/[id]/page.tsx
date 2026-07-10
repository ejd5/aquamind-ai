'use client'

/**
 * AQWELIA Growth OS — Lead detail page.
 *
 * Fetches /api/growth/leads/[id] and renders:
 *  - Lead identity + contact info
 *  - Status + score badges (with a status-change dropdown that PATCHes)
 *  - Timeline (events)
 *  - Agent runs (recent, with confidence + cost)
 *  - Action buttons: Run qualification, Run matching, Schedule appointment, Draft quote
 */
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  StickyNote,
  Loader2,
  RefreshCw,
  Bot,
  Calendar,
  FileText,
  AlertCircle,
  Activity,
  Coins,
  Shield,
  Check,
  Target,
  Zap,
  Users,
  TrendingUp,
} from 'lucide-react'

interface LeadEvent {
  id: string
  type: string
  actor?: string | null
  payload?: string | null
  createdAt: string
}

interface AppointmentRow {
  id: string
  startTime: string
  endTime: string
  status: string
  notes?: string | null
}

interface QuoteRow {
  id: string
  items: string
  total: number
  currency: string
  status: string
  createdAt: string
}

interface AgentRunRow {
  id: string
  agentType: string
  objective: string
  confidence: number
  status: string
  cost: number
  startedAt: string
  completedAt?: string | null
  _count?: { actions?: number }
}

interface LeadDetail {
  id: string
  organizationId?: string | null
  source: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  zipCode?: string | null
  country: string
  serviceType?: string | null
  poolType?: string | null
  poolVolume?: number | null
  problem?: string | null
  urgency: string
  budget?: string | null
  status: string
  score: number
  assignedTo?: string | null
  consent: boolean
  consentSource?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  events?: LeadEvent[]
  appointments?: AppointmentRow[]
  quotes?: QuoteRow[]
  agentRuns?: AgentRunRow[]
  _count?: { events?: number; appointments?: number; quotes?: number }
}

const STATUS_OPTIONS = [
  'NEW',
  'QUALIFIED',
  'SCORED',
  'ASSIGNED',
  'CONTACTED',
  'APPOINTMENT',
  'QUOTED',
  'WON',
  'LOST',
]

const AGENT_ICONS: Record<string, typeof Bot> = {
  offer_builder: Target,
  lead_capture: Zap,
  qualification: Bot,
  diagnostic: Activity,
  matching: Users,
  appointment: Calendar,
  nurturing: TrendingUp,
  quote: FileText,
  attribution: Coins,
  compliance: Shield,
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-secondary text-muted-foreground',
  QUALIFIED: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  SCORED: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  ASSIGNED: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  CONTACTED: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  APPOINTMENT: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  QUOTED: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  WON: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  LOST: 'bg-red-500/15 text-red-700 dark:text-red-300',
}

export default function GrowthLeadDetailPage() {
  const t = useTranslations('growthApp')
  const params = useParams<{ id: string }>()
  const leadId = params?.id ?? ''

  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!leadId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/growth/leads/${leadId}`, {
        cache: 'no-store',
      })
      if (res.status === 404) {
        setError(t('leadNotFound'))
        setLead(null)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as { lead: LeadDetail }
      setLead(json.lead)
    } catch {
      setError(t('errorGeneric'))
      setLead(null)
    } finally {
      setLoading(false)
    }
  }, [leadId, t])

  useEffect(() => {
    void load()
  }, [load])

  async function updateStatus(newStatus: string) {
    if (!lead) return
    setStatusUpdating(true)
    setActionMessage(null)
    try {
      const res = await fetch(`/api/growth/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as { lead: LeadDetail }
      setLead(json.lead)
      setActionMessage(t('statusUpdated'))
    } catch {
      setActionMessage(t('errorGeneric'))
    } finally {
      setStatusUpdating(false)
    }
  }

  async function runAgent(agentType: string) {
    if (!lead) return
    setActionLoading(agentType)
    setActionMessage(null)
    try {
      const res = await fetch('/api/growth/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType,
          leadId: lead.id,
          input:
            agentType === 'qualification'
              ? {
                  leadId: lead.id,
                  answers: [
                    { question: 'urgency', answer: lead.urgency, weight: 20 },
                    { question: 'service_type', answer: lead.serviceType ?? 'maintenance', weight: 15 },
                    { question: 'pool_type', answer: lead.poolType ?? 'unknown', weight: 10 },
                    { question: 'budget', answer: lead.budget ?? 'unknown', weight: 10 },
                  ],
                }
              : agentType === 'matching'
                ? { leadId: lead.id, organizations: [] }
                : agentType === 'quote'
                  ? {
                      leadId: lead.id,
                      organizationId: lead.organizationId ?? undefined,
                      serviceType: lead.serviceType ?? 'maintenance',
                      poolVolume: lead.poolVolume ?? undefined,
                    }
                  : { leadId: lead.id },
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as { result: { status: string; confidence: number; reason?: string } }
      if (json.result.status === 'escalated') {
        setActionMessage(t('agentEscalated', { reason: json.result.reason ?? '' }))
      } else {
        setActionMessage(
          t('agentCompleted', { confidence: Math.round(json.result.confidence * 100) })
        )
      }
      void load()
    } catch {
      setActionMessage(t('errorGeneric'))
    } finally {
      setActionLoading(null)
    }
  }

  if (loading && !lead) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !lead) {
    return (
      <div className="space-y-4">
        <Link
          href="/growth/app/leads"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('backToLeads')}
        </Link>
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      </div>
    )
  }

  if (!lead) return null

  const events = lead.events ?? []
  const agentRuns = lead.agentRuns ?? []
  const appointments = lead.appointments ?? []
  const quotes = lead.quotes ?? []

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/growth/app/leads"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('backToLeads')}
        </Link>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/60 px-3 py-1.5 text-xs font-semibold text-foreground backdrop-blur transition-colors hover:border-gold/60 hover:text-gold disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04]"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {t('retry')}
        </button>
      </div>

      {/* Header card */}
      <div className="rounded-2xl border border-white/40 bg-white/60 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              {lead.firstName} {lead.lastName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('leadSource')}: <strong>{lead.source}</strong>
              {lead.serviceType && (
                <>
                  {' · '}
                  {t('leadService')}: <strong>{lead.serviceType}</strong>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                  STATUS_COLORS[lead.status] ?? STATUS_COLORS.NEW
                }`}
              >
                {lead.status}
              </span>
              <span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                {lead.score}/100
              </span>
            </div>
            <select
              value={lead.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={statusUpdating}
              className="input-glass max-w-[160px] text-xs"
              aria-label={t('leadChangeStatus')}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-wrap gap-2">
          <ActionButton
            label={t('actionQualify')}
            icon={<Bot className="h-3.5 w-3.5" />}
            onClick={() => runAgent('qualification')}
            loading={actionLoading === 'qualification'}
          />
          <ActionButton
            label={t('actionMatch')}
            icon={<Users className="h-3.5 w-3.5" />}
            onClick={() => runAgent('matching')}
            loading={actionLoading === 'matching'}
          />
          <ActionButton
            label={t('actionQuote')}
            icon={<FileText className="h-3.5 w-3.5" />}
            onClick={() => runAgent('quote')}
            loading={actionLoading === 'quote'}
          />
          <ActionButton
            label={t('actionDiagnostic')}
            icon={<Activity className="h-3.5 w-3.5" />}
            onClick={() => runAgent('diagnostic')}
            loading={actionLoading === 'diagnostic'}
          />
          <ActionButton
            label={t('actionNurturing')}
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            onClick={() => runAgent('nurturing')}
            loading={actionLoading === 'nurturing'}
          />
          <ActionButton
            label={t('actionAttribution')}
            icon={<Coins className="h-3.5 w-3.5" />}
            onClick={() => runAgent('attribution')}
            loading={actionLoading === 'attribution'}
          />
        </div>

        {actionMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/[0.05] px-3 py-2 text-xs text-foreground">
            <Check className="h-3.5 w-3.5 text-gold" />
            {actionMessage}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Contact info */}
        <section className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
          <h2 className="font-display text-lg font-bold">{t('contactTitle')}</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-foreground">{lead.email}</span>
            </li>
            {lead.phone && (
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-foreground">{lead.phone}</span>
              </li>
            )}
            {(lead.address || lead.city || lead.zipCode) && (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-foreground">
                  {[lead.address, lead.zipCode, lead.city, lead.country]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </li>
            )}
            {lead.poolType && (
              <li className="flex items-start gap-2">
                <Activity className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-foreground">
                  {t('leadPoolType')}: <strong>{lead.poolType}</strong>
                  {lead.poolVolume ? ` (${lead.poolVolume} m³)` : ''}
                </span>
              </li>
            )}
            {lead.budget && (
              <li className="flex items-start gap-2">
                <Coins className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-foreground">
                  {t('leadBudget')}: <strong>{lead.budget}</strong>
                </span>
              </li>
            )}
            {lead.notes && (
              <li className="flex items-start gap-2">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-foreground/85">{lead.notes}</span>
              </li>
            )}
            {lead.problem && (
              <li className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span className="text-foreground/85">{lead.problem}</span>
              </li>
            )}
            {!lead.consent && (
              <li className="flex items-start gap-2 rounded-lg border border-red-400/40 bg-red-500/5 p-2 text-xs text-red-700 dark:text-red-300">
                <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t('leadNoConsent')}
              </li>
            )}
          </ul>
        </section>

        {/* Timeline */}
        <section className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] lg:col-span-2">
          <h2 className="font-display text-lg font-bold">{t('timelineTitle')}</h2>
          {events.length === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">{t('timelineEmpty')}</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {events.map((ev) => (
                <li
                  key={ev.id}
                  className="relative flex items-start gap-3 border-l-2 border-gold/40 pl-4"
                >
                  <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-gold" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {ev.type}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(ev.createdAt).toLocaleString()}
                      {ev.actor ? ` · ${ev.actor}` : ''}
                    </p>
                    {ev.payload && (
                      <p className="mt-1 font-mono text-[10px] text-foreground/60">
                        {ev.payload.slice(0, 200)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Agent runs */}
        <section className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mb-4 flex items-center gap-2">
            <Bot className="h-4 w-4 text-gold" />
            <h2 className="font-display text-lg font-bold">{t('agentRunsTitle')}</h2>
          </div>
          {agentRuns.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('agentRunsEmpty')}</p>
          ) : (
            <ul className="space-y-2">
              {agentRuns.map((run) => {
                const Icon = AGENT_ICONS[run.agentType] ?? Bot
                const statusCls =
                  run.status === 'completed'
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : run.status === 'escalated'
                      ? 'text-amber-600 dark:text-amber-300'
                      : run.status === 'failed'
                        ? 'text-red-600 dark:text-red-300'
                        : 'text-muted-foreground'
                return (
                  <li
                    key={run.id}
                    className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/30 p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-gold text-white">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-[11px] font-bold text-foreground">
                          {run.agentType}
                        </p>
                        <span className={`text-[10px] font-bold uppercase ${statusCls}`}>
                          {run.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {run.objective}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>conf: {Math.round(run.confidence * 100)}%</span>
                        <span>cost: {run.cost.toFixed(2)} €</span>
                        {run._count?.actions !== undefined && (
                          <span>actions: {run._count.actions}</span>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Appointments + Quotes */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gold" />
              <h2 className="font-display text-lg font-bold">{t('appointmentsTitle')}</h2>
            </div>
            {appointments.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('appointmentsEmpty')}</p>
            ) : (
              <ul className="space-y-2">
                {appointments.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-border/40 bg-card/30 p-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        {new Date(a.startTime).toLocaleString()}
                      </span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase">
                        {a.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      → {new Date(a.endTime).toLocaleTimeString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gold" />
              <h2 className="font-display text-lg font-bold">{t('quotesTitle')}</h2>
            </div>
            {quotes.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('quotesEmpty')}</p>
            ) : (
              <ul className="space-y-2">
                {quotes.map((q) => {
                  let itemCount = 0
                  try {
                    itemCount = (JSON.parse(q.items) as unknown[]).length
                  } catch {
                    // ignore
                  }
                  return (
                    <li
                      key={q.id}
                      className="rounded-lg border border-border/40 bg-card/30 p-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          {q.total.toLocaleString()} {q.currency}
                        </span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase">
                          {q.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {itemCount} {t('itemsUnit')}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function ActionButton({
  label,
  icon,
  onClick,
  loading,
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/5 px-3 py-1.5 text-xs font-semibold text-gold transition-colors hover:bg-gold/15 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </button>
  )
}
