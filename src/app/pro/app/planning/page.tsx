'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  LayoutGrid,
  ListFilter,
  Loader2,
  Plus,
  RefreshCw,
  Rows3,
  Search,
  Settings2,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import { AddInterventionModal } from '@/components/pro/add-intervention-modal'

type PlanningView = 'agenda' | 'team'
type Density = 'compact' | 'comfortable' | 'spacious'

interface InterventionLite {
  id: string
  scheduledAt: string
  duration?: number | null
  type?: string
  status?: string
  priority?: string
  summary?: string | null
  client?: {
    id: string
    firstName?: string
    lastName?: string
    companyName?: string | null
    phone?: string
    city?: string
  }
  pool?: { id: string; name?: string; type?: string } | null
  technicianId?: string | null
}

interface InterventionsResponse {
  interventions: InterventionLite[]
  total: number
  page: number
  pageSize: number
}

interface TeamMember {
  memberId: string | null
  userId: string
  role: string
  name: string | null
  email: string
  dispatchEnabled: boolean
  skills: string[]
  serviceZones: string[]
  workingDays: number[]
  dayStart: string
  dayEnd: string
  timeZone: string
  dailyCapacityMinutes: number
  dispatchColor: string | null
  phone: string | null
  vehicle: string | null
  workload: {
    interventionCount: number
    scheduledMinutes: number
    urgentCount: number
    inProgressCount: number
    weeklyCapacityMinutes: number
    utilizationPercent: number
  }
}

interface TeamResponse {
  members: TeamMember[]
  access: { role: string; canManage: boolean }
}

interface PlanningCopy {
  agenda: string
  team: string
  agendaHelp: string
  teamHelp: string
  filters: string
  technicians: string
  allTechnicians: string
  selectedTechnicians: string
  selectAll: string
  clear: string
  unassigned: string
  search: string
  allTypes: string
  allStatuses: string
  settings: string
  showWeekend: string
  fullDay: string
  workingDay: string
  density: string
  compact: string
  comfortable: string
  spacious: string
  interventions: string
  urgent: string
  plannedHours: string
  visibleTeam: string
  noInterventions: string
  noTechnicians: string
  jumpMorning: string
  now: string
  occupancy: string
  workingHours: string
  reset: string
  close: string
  display: string
  legend: string
}

const COPY: Record<string, PlanningCopy> = {
  fr: {
    agenda: 'Agenda semaine 24 h',
    team: 'Équipe · semaine',
    agendaHelp: 'Chaque journée complète, avec défilement vertical de 00 h à 24 h.',
    teamHelp: 'Les techniciens à gauche et leur semaine complète sur une seule ligne.',
    filters: 'Filtres',
    technicians: 'Techniciens',
    allTechnicians: 'Tous les techniciens',
    selectedTechnicians: 'technicien(s) sélectionné(s)',
    selectAll: 'Tout sélectionner',
    clear: 'Effacer',
    unassigned: 'Non affectées',
    search: 'Client, bassin, ville…',
    allTypes: 'Tous les types',
    allStatuses: 'Tous les statuts',
    settings: 'Affichage',
    showWeekend: 'Afficher le week-end',
    fullDay: 'Plage 24 h',
    workingDay: 'Plage 06 h–22 h',
    density: 'Densité',
    compact: 'Compacte',
    comfortable: 'Confort',
    spacious: 'Détaillée',
    interventions: 'Interventions',
    urgent: 'Urgences',
    plannedHours: 'Heures planifiées',
    visibleTeam: 'Équipe visible',
    noInterventions: 'Aucune intervention avec ces filtres.',
    noTechnicians: 'Aucun technicien sélectionné.',
    jumpMorning: 'Aller à 7 h',
    now: 'Maintenant',
    occupancy: 'occupation',
    workingHours: 'Horaires',
    reset: 'Réinitialiser',
    close: 'Fermer',
    display: 'Personnaliser la vue',
    legend: 'Légende',
  },
  en: {
    agenda: '24-hour week agenda',
    team: 'Team · week',
    agendaHelp: 'Every full day, vertically scrollable from midnight to midnight.',
    teamHelp: 'Technicians on the left and their complete week on one line.',
    filters: 'Filters',
    technicians: 'Technicians',
    allTechnicians: 'All technicians',
    selectedTechnicians: 'technician(s) selected',
    selectAll: 'Select all',
    clear: 'Clear',
    unassigned: 'Unassigned',
    search: 'Client, pool, city…',
    allTypes: 'All types',
    allStatuses: 'All statuses',
    settings: 'Display',
    showWeekend: 'Show weekend',
    fullDay: '24-hour range',
    workingDay: '06:00–22:00 range',
    density: 'Density',
    compact: 'Compact',
    comfortable: 'Comfortable',
    spacious: 'Detailed',
    interventions: 'Interventions',
    urgent: 'Urgent',
    plannedHours: 'Planned hours',
    visibleTeam: 'Visible team',
    noInterventions: 'No intervention matches these filters.',
    noTechnicians: 'No technician selected.',
    jumpMorning: 'Go to 7:00',
    now: 'Now',
    occupancy: 'utilization',
    workingHours: 'Hours',
    reset: 'Reset',
    close: 'Close',
    display: 'Customize view',
    legend: 'Legend',
  },
  es: {
    agenda: 'Agenda semanal 24 h',
    team: 'Equipo · semana',
    agendaHelp: 'Cada día completo, con desplazamiento vertical de 00 h a 24 h.',
    teamHelp: 'Los técnicos a la izquierda y su semana completa en una sola línea.',
    filters: 'Filtros',
    technicians: 'Técnicos',
    allTechnicians: 'Todos los técnicos',
    selectedTechnicians: 'técnico(s) seleccionado(s)',
    selectAll: 'Seleccionar todo',
    clear: 'Borrar',
    unassigned: 'Sin asignar',
    search: 'Cliente, piscina, ciudad…',
    allTypes: 'Todos los tipos',
    allStatuses: 'Todos los estados',
    settings: 'Vista',
    showWeekend: 'Mostrar fin de semana',
    fullDay: 'Rango 24 h',
    workingDay: 'Rango 06 h–22 h',
    density: 'Densidad',
    compact: 'Compacta',
    comfortable: 'Cómoda',
    spacious: 'Detallada',
    interventions: 'Intervenciones',
    urgent: 'Urgencias',
    plannedHours: 'Horas planificadas',
    visibleTeam: 'Equipo visible',
    noInterventions: 'Ninguna intervención coincide con los filtros.',
    noTechnicians: 'Ningún técnico seleccionado.',
    jumpMorning: 'Ir a las 7 h',
    now: 'Ahora',
    occupancy: 'ocupación',
    workingHours: 'Horarios',
    reset: 'Restablecer',
    close: 'Cerrar',
    display: 'Personalizar vista',
    legend: 'Leyenda',
  },
  pt: {
    agenda: 'Agenda semanal 24 h',
    team: 'Equipa · semana',
    agendaHelp: 'Cada dia completo, com deslocamento vertical das 00 h às 24 h.',
    teamHelp: 'Técnicos à esquerda e a semana completa numa única linha.',
    filters: 'Filtros',
    technicians: 'Técnicos',
    allTechnicians: 'Todos os técnicos',
    selectedTechnicians: 'técnico(s) selecionado(s)',
    selectAll: 'Selecionar tudo',
    clear: 'Limpar',
    unassigned: 'Não atribuídas',
    search: 'Cliente, piscina, cidade…',
    allTypes: 'Todos os tipos',
    allStatuses: 'Todos os estados',
    settings: 'Visualização',
    showWeekend: 'Mostrar fim de semana',
    fullDay: 'Faixa 24 h',
    workingDay: 'Faixa 06 h–22 h',
    density: 'Densidade',
    compact: 'Compacta',
    comfortable: 'Confortável',
    spacious: 'Detalhada',
    interventions: 'Intervenções',
    urgent: 'Urgências',
    plannedHours: 'Horas planeadas',
    visibleTeam: 'Equipa visível',
    noInterventions: 'Nenhuma intervenção corresponde aos filtros.',
    noTechnicians: 'Nenhum técnico selecionado.',
    jumpMorning: 'Ir para as 7 h',
    now: 'Agora',
    occupancy: 'ocupação',
    workingHours: 'Horários',
    reset: 'Repor',
    close: 'Fechar',
    display: 'Personalizar vista',
    legend: 'Legenda',
  },
  de: {
    agenda: '24-Stunden-Wochenkalender',
    team: 'Team · Woche',
    agendaHelp: 'Jeder vollständige Tag, vertikal von 00 bis 24 Uhr scrollbar.',
    teamHelp: 'Techniker links und ihre komplette Woche in einer Zeile.',
    filters: 'Filter',
    technicians: 'Techniker',
    allTechnicians: 'Alle Techniker',
    selectedTechnicians: 'Techniker ausgewählt',
    selectAll: 'Alle auswählen',
    clear: 'Leeren',
    unassigned: 'Nicht zugewiesen',
    search: 'Kunde, Pool, Stadt…',
    allTypes: 'Alle Typen',
    allStatuses: 'Alle Status',
    settings: 'Anzeige',
    showWeekend: 'Wochenende anzeigen',
    fullDay: '24-Stunden-Bereich',
    workingDay: 'Bereich 06–22 Uhr',
    density: 'Dichte',
    compact: 'Kompakt',
    comfortable: 'Komfortabel',
    spacious: 'Detailliert',
    interventions: 'Einsätze',
    urgent: 'Dringend',
    plannedHours: 'Geplante Stunden',
    visibleTeam: 'Sichtbares Team',
    noInterventions: 'Keine Einsätze entsprechen den Filtern.',
    noTechnicians: 'Kein Techniker ausgewählt.',
    jumpMorning: 'Zu 7 Uhr',
    now: 'Jetzt',
    occupancy: 'Auslastung',
    workingHours: 'Arbeitszeiten',
    reset: 'Zurücksetzen',
    close: 'Schließen',
    display: 'Ansicht anpassen',
    legend: 'Legende',
  },
  it: {
    agenda: 'Agenda settimanale 24 h',
    team: 'Squadra · settimana',
    agendaHelp: 'Ogni giornata completa, scorrevole verticalmente dalle 00 alle 24.',
    teamHelp: 'Tecnici a sinistra e settimana completa su una sola riga.',
    filters: 'Filtri',
    technicians: 'Tecnici',
    allTechnicians: 'Tutti i tecnici',
    selectedTechnicians: 'tecnico/i selezionato/i',
    selectAll: 'Seleziona tutti',
    clear: 'Cancella',
    unassigned: 'Non assegnati',
    search: 'Cliente, piscina, città…',
    allTypes: 'Tutti i tipi',
    allStatuses: 'Tutti gli stati',
    settings: 'Vista',
    showWeekend: 'Mostra weekend',
    fullDay: 'Fascia 24 h',
    workingDay: 'Fascia 06–22',
    density: 'Densità',
    compact: 'Compatta',
    comfortable: 'Comoda',
    spacious: 'Dettagliata',
    interventions: 'Interventi',
    urgent: 'Urgenze',
    plannedHours: 'Ore pianificate',
    visibleTeam: 'Squadra visibile',
    noInterventions: 'Nessun intervento corrisponde ai filtri.',
    noTechnicians: 'Nessun tecnico selezionato.',
    jumpMorning: 'Vai alle 7',
    now: 'Ora',
    occupancy: 'occupazione',
    workingHours: 'Orari',
    reset: 'Reimposta',
    close: 'Chiudi',
    display: 'Personalizza vista',
    legend: 'Legenda',
  },
  nl: {
    agenda: '24-uurs weekagenda',
    team: 'Team · week',
    agendaHelp: 'Elke volledige dag, verticaal scrollbaar van 00 tot 24 uur.',
    teamHelp: 'Technici links en hun volledige week op één regel.',
    filters: 'Filters',
    technicians: 'Technici',
    allTechnicians: 'Alle technici',
    selectedTechnicians: 'technicus/technici geselecteerd',
    selectAll: 'Alles selecteren',
    clear: 'Wissen',
    unassigned: 'Niet toegewezen',
    search: 'Klant, zwembad, plaats…',
    allTypes: 'Alle types',
    allStatuses: 'Alle statussen',
    settings: 'Weergave',
    showWeekend: 'Weekend tonen',
    fullDay: '24-uurs bereik',
    workingDay: 'Bereik 06–22 uur',
    density: 'Dichtheid',
    compact: 'Compact',
    comfortable: 'Comfortabel',
    spacious: 'Gedetailleerd',
    interventions: 'Interventies',
    urgent: 'Urgent',
    plannedHours: 'Geplande uren',
    visibleTeam: 'Zichtbaar team',
    noInterventions: 'Geen interventie voldoet aan de filters.',
    noTechnicians: 'Geen technicus geselecteerd.',
    jumpMorning: 'Ga naar 7 uur',
    now: 'Nu',
    occupancy: 'bezetting',
    workingHours: 'Werkuren',
    reset: 'Herstellen',
    close: 'Sluiten',
    display: 'Weergave aanpassen',
    legend: 'Legenda',
  },
}

const TYPE_COLORS: Record<string, { card: string; solid: string }> = {
  maintenance: {
    card: 'border-teal-500/60 bg-teal-500/12 text-teal-950 dark:text-teal-100',
    solid: '#0f8b8d',
  },
  repair: {
    card: 'border-amber-500/70 bg-amber-500/15 text-amber-950 dark:text-amber-100',
    solid: '#d97706',
  },
  opening: {
    card: 'border-emerald-500/70 bg-emerald-500/15 text-emerald-950 dark:text-emerald-100',
    solid: '#059669',
  },
  closing: {
    card: 'border-orange-500/70 bg-orange-500/15 text-orange-950 dark:text-orange-100',
    solid: '#ea580c',
  },
  emergency: {
    card: 'border-red-500/75 bg-red-500/15 text-red-950 dark:text-red-100',
    solid: '#dc2626',
  },
}

const TYPES = ['maintenance', 'repair', 'opening', 'closing', 'emergency'] as const
const STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const

function startOfWeek(date: Date): Date {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  const diffToMonday = (value.getDay() + 6) % 7
  value.setDate(value.getDate() - diffToMonday)
  return value
}

function addDays(date: Date, amount: number): Date {
  const value = new Date(date)
  value.setDate(value.getDate() + amount)
  return value
}

function endOfWeek(date: Date): Date {
  const end = addDays(date, 7)
  end.setMilliseconds(end.getMilliseconds() - 1)
  return end
}

function isSameDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

function isDateInWeek(date: Date, weekStart: Date): boolean {
  return date >= weekStart && date < addDays(weekStart, 7)
}

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

function clientName(intervention: InterventionLite): string {
  const company = intervention.client?.companyName?.trim()
  if (company) return company
  const fullName = `${intervention.client?.firstName ?? ''} ${intervention.client?.lastName ?? ''}`.trim()
  return fullName || '—'
}

function formatTime(value: string, locale?: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function durationMinutes(intervention: InterventionLite): number {
  return Math.max(15, intervention.duration || 60)
}

function cap(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function technicianLabel(member: TeamMember): string {
  return member.name?.trim() || member.email
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('')
}

type LaidOutEvent = {
  intervention: InterventionLite
  lane: number
  laneCount: number
  startMinute: number
  duration: number
}

function layoutEvents(interventions: InterventionLite[]): LaidOutEvent[] {
  const sorted = [...interventions].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  const active: Array<{ endMinute: number; lane: number }> = []
  const provisional: Omit<LaidOutEvent, 'laneCount'>[] = []
  let maxLaneCount = 1

  for (const intervention of sorted) {
    const date = new Date(intervention.scheduledAt)
    const startMinute = minutesOfDay(date)
    const duration = durationMinutes(intervention)
    const endMinute = startMinute + duration

    for (let index = active.length - 1; index >= 0; index -= 1) {
      if (active[index].endMinute <= startMinute) active.splice(index, 1)
    }

    const used = new Set(active.map((item) => item.lane))
    let lane = 0
    while (used.has(lane)) lane += 1
    active.push({ endMinute, lane })
    maxLaneCount = Math.max(maxLaneCount, lane + 1)
    provisional.push({ intervention, lane, startMinute, duration })
  }

  return provisional.map((item) => ({ ...item, laneCount: maxLaneCount }))
}

export default function ProPlanningPage() {
  const t = useTranslations('proApp')
  const locale = useLocale()
  const copy = COPY[locale] ?? COPY.en
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [interventions, setInterventions] = useState<InterventionLite[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [view, setView] = useState<PlanningView>('agenda')
  const [density, setDensity] = useState<Density>('comfortable')
  const [showWeekend, setShowWeekend] = useState(true)
  const [teamFullDay, setTeamFullDay] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[] | null>(null)
  const [showUnassigned, setShowUnassigned] = useState(true)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const calendarScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('aqwelia-pro-planning-preferences-v2')
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<{
          view: PlanningView
          density: Density
          showWeekend: boolean
          teamFullDay: boolean
        }>
        if (parsed.view === 'agenda' || parsed.view === 'team') setView(parsed.view)
        if (['compact', 'comfortable', 'spacious'].includes(parsed.density ?? '')) {
          setDensity(parsed.density as Density)
        }
        if (typeof parsed.showWeekend === 'boolean') setShowWeekend(parsed.showWeekend)
        if (typeof parsed.teamFullDay === 'boolean') setTeamFullDay(parsed.teamFullDay)
      }
    } catch {
      // Keep defaults when the stored preference is invalid.
    } finally {
      setPreferencesLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!preferencesLoaded) return
    window.localStorage.setItem(
      'aqwelia-pro-planning-preferences-v2',
      JSON.stringify({ view, density, showWeekend, teamFullDay }),
    )
  }, [density, preferencesLoaded, showWeekend, teamFullDay, view])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const from = weekStart.toISOString()
      const to = endOfWeek(weekStart).toISOString()
      const collected: InterventionLite[] = []
      let page = 1
      let total = 0

      do {
        const params = new URLSearchParams({
          from,
          to,
          page: String(page),
          pageSize: '100',
        })
        const response = await fetch(`/api/pro/interventions?${params.toString()}`, {
          cache: 'no-store',
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const payload = await response.json() as InterventionsResponse
        collected.push(...(payload.interventions ?? []))
        total = payload.total ?? collected.length
        page += 1
      } while (collected.length < total && page <= 10)

      const teamResponse = await fetch('/api/pro/team', { cache: 'no-store' })
      if (!teamResponse.ok) throw new Error(`HTTP ${teamResponse.status}`)
      const teamPayload = await teamResponse.json() as TeamResponse

      setInterventions(collected)
      setTeam(
        (teamPayload.members ?? [])
          .filter((member) => member.dispatchEnabled)
          .sort((left, right) => technicianLabel(left).localeCompare(technicianLabel(right))),
      )
    } catch {
      setError(t('errorGeneric'))
      setInterventions([])
      setTeam([])
    } finally {
      setLoading(false)
    }
  }, [t, weekStart])

  useEffect(() => {
    void load()
  }, [load])

  const hourHeight = density === 'compact' ? 48 : density === 'spacious' ? 80 : 64
  const teamDayWidth = density === 'compact' ? 190 : density === 'spacious' ? 285 : 235
  const teamRowHeight = density === 'compact' ? 104 : density === 'spacious' ? 148 : 126
  const visibleDays = useMemo(
    () => Array.from({ length: showWeekend ? 7 : 5 }, (_, index) => addDays(weekStart, index)),
    [showWeekend, weekStart],
  )

  useEffect(() => {
    if (view !== 'agenda' || !calendarScrollRef.current) return
    const now = new Date()
    const targetHour = isDateInWeek(now, weekStart) ? Math.max(0, now.getHours() - 1) : 7
    const timer = window.setTimeout(() => {
      calendarScrollRef.current?.scrollTo({
        top: targetHour * hourHeight,
        behavior: 'smooth',
      })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [hourHeight, view, weekStart])

  const visibleTechnicianIds = useMemo(() => {
    if (selectedTechnicians === null) return new Set(team.map((member) => member.userId))
    return new Set(selectedTechnicians)
  }, [selectedTechnicians, team])

  const filteredInterventions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(locale)
    return interventions.filter((intervention) => {
      if (intervention.technicianId) {
        if (!visibleTechnicianIds.has(intervention.technicianId)) return false
      } else if (!showUnassigned) {
        return false
      }

      if (typeFilter && intervention.type !== typeFilter) return false
      if (statusFilter && intervention.status !== statusFilter) return false
      if (!query) return true

      const haystack = [
        clientName(intervention),
        intervention.pool?.name,
        intervention.client?.city,
        intervention.summary,
      ].filter(Boolean).join(' ').toLocaleLowerCase(locale)
      return haystack.includes(query)
    })
  }, [
    interventions,
    locale,
    search,
    showUnassigned,
    statusFilter,
    typeFilter,
    visibleTechnicianIds,
  ])

  const stats = useMemo(() => {
    const urgent = filteredInterventions.filter(
      (intervention) => intervention.priority === 'urgent' || intervention.type === 'emergency',
    ).length
    const minutes = filteredInterventions.reduce(
      (sum, intervention) => sum + durationMinutes(intervention),
      0,
    )
    return {
      interventions: filteredInterventions.length,
      urgent,
      plannedHours: Math.round((minutes / 60) * 10) / 10,
      visibleTeam: visibleTechnicianIds.size,
    }
  }, [filteredInterventions, visibleTechnicianIds])

  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, showWeekend ? 6 : 4)
    const formatter = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
    })
    return `${formatter.format(weekStart)} – ${formatter.format(end)} ${end.getFullYear()}`
  }, [locale, showWeekend, weekStart])

  function resetFilters() {
    setSearch('')
    setTypeFilter('')
    setStatusFilter('')
    setSelectedTechnicians(null)
    setShowUnassigned(true)
  }

  function toggleTechnician(userId: string) {
    const current = selectedTechnicians ?? team.map((member) => member.userId)
    setSelectedTechnicians(
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    )
  }

  const selectedCount = selectedTechnicians === null ? team.length : selectedTechnicians.length

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="section-label inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            AQWELIA Pro
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('planningTitle')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {view === 'agenda' ? copy.agendaHelp : copy.teamHelp}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="glow-gold inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          {t('planningNew')}
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlanningMetric
          icon={<Clock3 className="h-4 w-4" />}
          label={copy.interventions}
          value={String(stats.interventions)}
        />
        <PlanningMetric
          icon={<AlertTriangle className="h-4 w-4" />}
          label={copy.urgent}
          value={String(stats.urgent)}
          emphasis={stats.urgent > 0}
        />
        <PlanningMetric
          icon={<Sparkles className="h-4 w-4" />}
          label={copy.plannedHours}
          value={`${stats.plannedHours} h`}
        />
        <PlanningMetric
          icon={<UsersRound className="h-4 w-4" />}
          label={copy.visibleTeam}
          value={String(stats.visibleTeam)}
        />
      </section>

      <section className="overflow-visible rounded-3xl border border-white/50 bg-white/70 shadow-[0_20px_60px_-40px_rgba(2,52,60,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 p-3">
          <div className="inline-flex rounded-xl border border-border/60 bg-background/70 p-1">
            <button
              onClick={() => setView('agenda')}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${
                view === 'agenda'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              {copy.agenda}
            </button>
            <button
              onClick={() => setView('team')}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${
                view === 'team'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Rows3 className="h-4 w-4" />
              {copy.team}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setWeekStart((date) => addDays(date, -7))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/70 hover:border-primary/50 hover:text-primary"
              aria-label={t('planningPrev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10"
            >
              {t('planningToday')}
            </button>
            <button
              onClick={() => setWeekStart((date) => addDays(date, 7))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/70 hover:border-primary/50 hover:text-primary"
              aria-label={t('planningNext')}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="min-w-[170px] px-2 text-center text-xs font-bold text-foreground">
              {weekLabel}
            </span>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/70 hover:border-primary/50 hover:text-primary disabled:opacity-50"
              aria-label={t('retry')}
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <RefreshCw className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border/50 p-3">
          <div className="relative min-w-[210px] flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.search}
              className="h-10 w-full rounded-xl border border-border/60 bg-background/70 pl-9 pr-9 text-xs outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
            />
            {search ? (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                aria-label={copy.clear}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="h-10 rounded-xl border border-border/60 bg-background/70 px-3 text-xs font-semibold outline-none focus:border-primary/60"
          >
            <option value="">{copy.allTypes}</option>
            {TYPES.map((type) => (
              <option key={type} value={type}>{typeLabel(t, type)}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-xl border border-border/60 bg-background/70 px-3 text-xs font-semibold outline-none focus:border-primary/60"
          >
            <option value="">{copy.allStatuses}</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>{statusLabel(t, status)}</option>
            ))}
          </select>

          <details className="group relative">
            <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 text-xs font-bold hover:border-primary/50">
              <UsersRound className="h-4 w-4 text-primary" />
              {copy.technicians}
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                {selectedCount}
              </span>
              <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 z-40 mt-2 w-[320px] rounded-2xl border border-border/70 bg-background/98 p-3 shadow-2xl backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold">{copy.allTechnicians}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedCount} {copy.selectedTechnicians}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSelectedTechnicians(null)}
                    className="rounded-lg px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/10"
                  >
                    {copy.selectAll}
                  </button>
                  <button
                    onClick={() => setSelectedTechnicians([])}
                    className="rounded-lg px-2 py-1 text-[10px] font-bold text-muted-foreground hover:bg-secondary"
                  >
                    {copy.clear}
                  </button>
                </div>
              </div>
              <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                {team.map((member) => {
                  const checked = selectedTechnicians === null
                    || selectedTechnicians.includes(member.userId)
                  return (
                    <button
                      key={member.userId}
                      onClick={() => toggleTechnician(member.userId)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${
                        checked
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-transparent hover:bg-secondary/60'
                      }`}
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-white"
                        style={{ background: member.dispatchColor || '#0f8b8d' }}
                      >
                        {initials(technicianLabel(member))}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold">
                          {technicianLabel(member)}
                        </span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {member.role} · {member.dayStart}–{member.dayEnd}
                        </span>
                      </span>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        checked
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border'
                      }`}>
                        {checked ? <Check className="h-3 w-3" /> : null}
                      </span>
                    </button>
                  )
                })}
                {!team.length ? (
                  <p className="py-5 text-center text-xs text-muted-foreground">
                    {copy.noTechnicians}
                  </p>
                ) : null}
              </div>
              <label className="mt-3 flex cursor-pointer items-center justify-between rounded-xl border border-border/50 bg-secondary/30 p-2.5">
                <span className="text-xs font-semibold">{copy.unassigned}</span>
                <input
                  type="checkbox"
                  checked={showUnassigned}
                  onChange={(event) => setShowUnassigned(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
              </label>
            </div>
          </details>

          <details className="group relative">
            <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 text-xs font-bold hover:border-primary/50">
              <Settings2 className="h-4 w-4 text-primary" />
              {copy.settings}
              <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 z-40 mt-2 w-[300px] rounded-2xl border border-border/70 bg-background/98 p-4 shadow-2xl backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                <p className="text-xs font-bold">{copy.display}</p>
              </div>
              <label className="flex cursor-pointer items-center justify-between py-2 text-xs font-semibold">
                {copy.showWeekend}
                <input
                  type="checkbox"
                  checked={showWeekend}
                  onChange={(event) => setShowWeekend(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
              </label>
              {view === 'team' ? (
                <label className="flex cursor-pointer items-center justify-between py-2 text-xs font-semibold">
                  {teamFullDay ? copy.fullDay : copy.workingDay}
                  <input
                    type="checkbox"
                    checked={teamFullDay}
                    onChange={(event) => setTeamFullDay(event.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                </label>
              ) : null}
              <div className="mt-3 border-t border-border/50 pt-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {copy.density}
                </p>
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary/60 p-1">
                  {([
                    ['compact', copy.compact],
                    ['comfortable', copy.comfortable],
                    ['spacious', copy.spacious],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setDensity(value)}
                      className={`rounded-lg px-2 py-2 text-[10px] font-bold ${
                        density === value
                          ? 'bg-background text-primary shadow-sm'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </details>

          {(search || typeFilter || statusFilter || selectedTechnicians !== null || !showUnassigned) ? (
            <button
              onClick={resetFilters}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Filter className="h-3.5 w-3.5" />
              {copy.reset}
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="m-4 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {!error && view === 'agenda' ? (
          <AgendaWeekView
            interventions={filteredInterventions}
            visibleDays={visibleDays}
            locale={locale}
            t={t}
            copy={copy}
            hourHeight={hourHeight}
            loading={loading}
            scrollRef={calendarScrollRef}
          />
        ) : null}

        {!error && view === 'team' ? (
          <TeamWeekView
            interventions={filteredInterventions}
            team={team}
            visibleTechnicianIds={visibleTechnicianIds}
            showUnassigned={showUnassigned}
            visibleDays={visibleDays}
            locale={locale}
            t={t}
            copy={copy}
            dayWidth={teamDayWidth}
            rowHeight={teamRowHeight}
            fullDay={teamFullDay}
            loading={loading}
          />
        ) : null}
      </section>

      <section className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-border/50 bg-card/40 px-4 py-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
          <ListFilter className="h-3.5 w-3.5" />
          {copy.legend}
        </span>
        {TYPES.map((type) => (
          <span key={type} className="inline-flex items-center gap-1.5 text-[10px] font-semibold">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: TYPE_COLORS[type].solid }}
            />
            {typeLabel(t, type)}
          </span>
        ))}
      </section>

      <AddInterventionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => { void load() }}
      />
    </div>
  )
}

function PlanningMetric({
  icon,
  label,
  value,
  emphasis = false,
}: {
  icon: ReactNode
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <article className={`rounded-2xl border p-4 backdrop-blur-xl ${
      emphasis
        ? 'border-red-400/40 bg-red-500/8'
        : 'border-white/40 bg-white/60 dark:border-white/10 dark:bg-white/[0.04]'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          emphasis ? 'bg-red-500/12 text-red-600' : 'bg-primary/10 text-primary'
        }`}>
          {icon}
        </span>
        <span className="font-display text-2xl font-black">{value}</span>
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
    </article>
  )
}

function AgendaWeekView({
  interventions,
  visibleDays,
  locale,
  t,
  copy,
  hourHeight,
  loading,
  scrollRef,
}: {
  interventions: InterventionLite[]
  visibleDays: Date[]
  locale: string
  t: ReturnType<typeof useTranslations>
  copy: PlanningCopy
  hourHeight: number
  loading: boolean
  scrollRef: RefObject<HTMLDivElement | null>
}) {
  const today = new Date()
  const columnCount = visibleDays.length
  const minWidth = 76 + columnCount * 165

  const byDay = useMemo(
    () => visibleDays.map((day) => layoutEvents(
      interventions.filter((intervention) => isSameDay(new Date(intervention.scheduledAt), day)),
    )),
    [interventions, visibleDays],
  )

  return (
    <div className="relative">
      <div className="flex items-center justify-between border-b border-border/50 bg-secondary/20 px-4 py-2">
        <p className="text-[10px] font-semibold text-muted-foreground">
          {copy.agendaHelp}
        </p>
        <button
          onClick={() => scrollRef.current?.scrollTo({ top: 7 * hourHeight, behavior: 'smooth' })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/80 px-2.5 py-1.5 text-[10px] font-bold hover:border-primary/50 hover:text-primary"
        >
          <Clock3 className="h-3.5 w-3.5" />
          {copy.jumpMorning}
        </button>
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid border-b border-border/50 bg-background/95"
          style={{
            gridTemplateColumns: `76px repeat(${columnCount}, minmax(165px, 1fr))`,
            minWidth,
          }}
        >
          <div className="sticky left-0 z-30 border-r border-border/50 bg-background/95 p-3 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            24 h
          </div>
          {visibleDays.map((day) => {
            const isToday = isSameDay(day, today)
            return (
              <div
                key={day.toISOString()}
                className={`border-r border-border/50 px-3 py-2.5 text-center last:border-r-0 ${
                  isToday ? 'bg-primary/[0.07]' : ''
                }`}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                  {new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day)}
                </p>
                <div className="mt-0.5 flex items-center justify-center gap-2">
                  <span className={`font-display text-lg font-black ${isToday ? 'text-primary' : ''}`}>
                    {day.getDate()}
                  </span>
                  {isToday ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-primary-foreground">
                      {t('planningTodayBadge')}
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[720px] overflow-auto overscroll-contain"
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `76px repeat(${columnCount}, minmax(165px, 1fr))`,
            minWidth,
            height: hourHeight * 24,
          }}
        >
          <div className="sticky left-0 z-20 border-r border-border/60 bg-background/95">
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 pr-3 text-right text-[9px] font-semibold text-muted-foreground"
                style={{ top: hour * hourHeight - 6 }}
              >
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {visibleDays.map((day, dayIndex) => {
            const isToday = isSameDay(day, today)
            return (
              <div
                key={day.toISOString()}
                className={`relative overflow-hidden border-r border-border/50 last:border-r-0 ${
                  isToday ? 'bg-primary/[0.035]' : 'bg-background/35'
                }`}
                style={{
                  backgroundImage: 'linear-gradient(to bottom, color-mix(in oklch, var(--border) 58%, transparent) 1px, transparent 1px), linear-gradient(to bottom, transparent 50%, color-mix(in oklch, var(--border) 28%, transparent) 50%, transparent calc(50% + 1px))',
                  backgroundSize: `100% ${hourHeight}px, 100% ${hourHeight}px`,
                }}
              >
                {isToday ? (
                  <CurrentTimeLine hourHeight={hourHeight} copy={copy} />
                ) : null}
                {byDay[dayIndex].map((item) => (
                  <AgendaEvent
                    key={item.intervention.id}
                    item={item}
                    hourHeight={hourHeight}
                    locale={locale}
                    t={t}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {!loading && interventions.length === 0 ? (
        <EmptyState message={copy.noInterventions} />
      ) : null}
      {loading ? <LoadingOverlay /> : null}
    </div>
  )
}

function CurrentTimeLine({ hourHeight, copy }: { hourHeight: number; copy: PlanningCopy }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const top = (minutesOfDay(now) / 60) * hourHeight
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-red-500"
      style={{ top }}
    >
      <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-red-500" />
      <span className="absolute right-1 -top-3 rounded bg-red-500 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">
        {copy.now}
      </span>
    </div>
  )
}

function AgendaEvent({
  item,
  hourHeight,
  locale,
  t,
}: {
  item: LaidOutEvent
  hourHeight: number
  locale: string
  t: ReturnType<typeof useTranslations>
}) {
  const { intervention, lane, laneCount, startMinute, duration } = item
  const type = intervention.type ?? 'maintenance'
  const color = TYPE_COLORS[type] ?? TYPE_COLORS.maintenance
  const laneWidth = 100 / laneCount
  const top = (startMinute / 60) * hourHeight + 2
  const height = Math.max(28, (duration / 60) * hourHeight - 4)
  const left = lane * laneWidth

  return (
    <Link
      href={`/pro/app/interventions/${intervention.id}`}
      className={`absolute z-10 overflow-hidden rounded-lg border-l-4 p-1.5 shadow-sm transition hover:z-30 hover:scale-[1.015] hover:shadow-lg ${color.card}`}
      style={{
        top,
        height,
        left: `calc(${left}% + 3px)`,
        width: `calc(${laneWidth}% - 6px)`,
      }}
      title={`${formatTime(intervention.scheduledAt, locale)} · ${clientName(intervention)} · ${intervention.pool?.name ?? t('noPool')}`}
    >
      <div className="flex items-center justify-between gap-1 text-[9px] font-black">
        <span>{formatTime(intervention.scheduledAt, locale)}</span>
        {height >= 44 ? <span>{duration} min</span> : null}
      </div>
      {height >= 42 ? (
        <p className="truncate text-[10px] font-bold">{clientName(intervention)}</p>
      ) : null}
      {height >= 60 ? (
        <p className="truncate text-[9px] opacity-75">
          {intervention.pool?.name ?? t('noPool')}
        </p>
      ) : null}
    </Link>
  )
}

function TeamWeekView({
  interventions,
  team,
  visibleTechnicianIds,
  showUnassigned,
  visibleDays,
  locale,
  t,
  copy,
  dayWidth,
  rowHeight,
  fullDay,
  loading,
}: {
  interventions: InterventionLite[]
  team: TeamMember[]
  visibleTechnicianIds: Set<string>
  showUnassigned: boolean
  visibleDays: Date[]
  locale: string
  t: ReturnType<typeof useTranslations>
  copy: PlanningCopy
  dayWidth: number
  rowHeight: number
  fullDay: boolean
  loading: boolean
}) {
  const rangeStartHour = fullDay ? 0 : 6
  const rangeEndHour = fullDay ? 24 : 22
  const rangeMinutes = (rangeEndHour - rangeStartHour) * 60
  const visibleMembers = team.filter((member) => visibleTechnicianIds.has(member.userId))
  const rows: Array<{ id: string; member: TeamMember | null }> = [
    ...visibleMembers.map((member) => ({ id: member.userId, member })),
    ...(showUnassigned ? [{ id: '__unassigned__', member: null }] : []),
  ]
  const leftWidth = 250
  const timelineWidth = dayWidth * visibleDays.length
  const minWidth = leftWidth + timelineWidth

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-secondary/20 px-4 py-2">
        <p className="text-[10px] font-semibold text-muted-foreground">
          {copy.teamHelp}
        </p>
        <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-primary">
          {fullDay ? copy.fullDay : copy.workingDay}
        </span>
      </div>

      <div className="max-h-[720px] overflow-auto overscroll-contain">
        <div style={{ minWidth }}>
          <div
            className="sticky top-0 z-30 grid border-b border-border/60 bg-background/97 shadow-sm"
            style={{ gridTemplateColumns: `${leftWidth}px ${timelineWidth}px` }}
          >
            <div className="sticky left-0 z-40 flex items-center gap-2 border-r border-border/60 bg-background/97 px-4 py-3">
              <UsersRound className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em]">
                  {copy.technicians}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  {copy.workingHours}
                </p>
              </div>
            </div>
            <div
              className="grid"
              style={{ gridTemplateColumns: `repeat(${visibleDays.length}, ${dayWidth}px)` }}
            >
              {visibleDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`border-r border-border/60 px-3 py-2 last:border-r-0 ${
                    isSameDay(day, new Date()) ? 'bg-primary/[0.07]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                      {new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day)}
                    </span>
                    <span className="font-display text-base font-black">{day.getDate()}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-[8px] font-semibold text-muted-foreground">
                    {timeTicks(rangeStartHour, rangeEndHour).map((hour) => (
                      <span key={hour}>{String(hour).padStart(2, '0')}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {rows.map(({ id, member }) => {
            const rowInterventions = interventions.filter((intervention) => (
              member
                ? intervention.technicianId === member.userId
                : !intervention.technicianId
            ))
            const plannedMinutes = rowInterventions.reduce(
              (sum, intervention) => sum + durationMinutes(intervention),
              0,
            )
            const weeklyCapacity = member
              ? Math.max(1, member.dailyCapacityMinutes * Math.max(1, member.workingDays.length))
              : 0
            const utilization = member
              ? Math.round((plannedMinutes / weeklyCapacity) * 100)
              : 0

            return (
              <div
                key={id}
                className="grid border-b border-border/50 last:border-b-0"
                style={{
                  gridTemplateColumns: `${leftWidth}px ${timelineWidth}px`,
                  minHeight: rowHeight,
                }}
              >
                <div className="sticky left-0 z-20 border-r border-border/60 bg-background/97 px-4 py-3">
                  {member ? (
                    <div className="flex h-full flex-col justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[10px] font-black text-white shadow-sm"
                          style={{ background: member.dispatchColor || '#0f8b8d' }}
                        >
                          {initials(technicianLabel(member))}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black">
                            {technicianLabel(member)}
                          </p>
                          <p className="truncate text-[9px] uppercase tracking-wide text-muted-foreground">
                            {member.role} · {member.dayStart}–{member.dayEnd}
                          </p>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[9px] font-semibold text-muted-foreground">
                          <span>{rowInterventions.length} {copy.interventions.toLowerCase()}</span>
                          <span>{utilization}% {copy.occupancy}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full ${
                              utilization > 100
                                ? 'bg-red-500'
                                : utilization > 85
                                  ? 'bg-amber-500'
                                  : 'bg-primary'
                            }`}
                            style={{ width: `${Math.min(100, utilization)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-amber-500/50 bg-amber-500/10 text-amber-700">
                        <UserRound className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-xs font-black">{copy.unassigned}</p>
                        <p className="text-[9px] text-muted-foreground">
                          {rowInterventions.length} {copy.interventions.toLowerCase()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className="grid"
                  style={{ gridTemplateColumns: `repeat(${visibleDays.length}, ${dayWidth}px)` }}
                >
                  {visibleDays.map((day) => {
                    const dayInterventions = rowInterventions.filter(
                      (intervention) => isSameDay(new Date(intervention.scheduledAt), day),
                    )
                    const laidOut = layoutEvents(dayInterventions)
                    return (
                      <div
                        key={day.toISOString()}
                        className={`relative overflow-hidden border-r border-border/50 last:border-r-0 ${
                          isSameDay(day, new Date()) ? 'bg-primary/[0.035]' : 'bg-background/25'
                        }`}
                        style={{
                          height: rowHeight,
                          backgroundImage: 'linear-gradient(to right, color-mix(in oklch, var(--border) 40%, transparent) 1px, transparent 1px)',
                          backgroundSize: `${100 / (rangeEndHour - rangeStartHour)}% 100%`,
                        }}
                      >
                        {laidOut.map((item) => (
                          <TeamEvent
                            key={item.intervention.id}
                            item={item}
                            rangeStartHour={rangeStartHour}
                            rangeMinutes={rangeMinutes}
                            rowHeight={rowHeight}
                            locale={locale}
                            t={t}
                          />
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {!rows.length && !loading ? (
            <EmptyState message={copy.noTechnicians} />
          ) : null}
        </div>
      </div>

      {rows.length > 0 && !loading && interventions.length === 0 ? (
        <EmptyState message={copy.noInterventions} />
      ) : null}
      {loading ? <LoadingOverlay /> : null}
    </div>
  )
}

function TeamEvent({
  item,
  rangeStartHour,
  rangeMinutes,
  rowHeight,
  locale,
  t,
}: {
  item: LaidOutEvent
  rangeStartHour: number
  rangeMinutes: number
  rowHeight: number
  locale: string
  t: ReturnType<typeof useTranslations>
}) {
  const { intervention, lane, startMinute, duration } = item
  const type = intervention.type ?? 'maintenance'
  const color = TYPE_COLORS[type] ?? TYPE_COLORS.maintenance
  const visibleStart = Math.max(rangeStartHour * 60, startMinute)
  const visibleEnd = Math.min(rangeStartHour * 60 + rangeMinutes, startMinute + duration)
  if (visibleEnd <= visibleStart) return null

  const left = ((visibleStart - rangeStartHour * 60) / rangeMinutes) * 100
  const width = Math.max(3.5, ((visibleEnd - visibleStart) / rangeMinutes) * 100)
  const laneHeight = rowHeight >= 140 ? 34 : 29
  const top = 8 + Math.min(lane, 3) * (laneHeight + 5)

  return (
    <Link
      href={`/pro/app/interventions/${intervention.id}`}
      className={`absolute z-10 overflow-hidden rounded-lg border-l-4 px-2 py-1 shadow-sm transition hover:z-30 hover:scale-[1.02] hover:shadow-lg ${color.card}`}
      style={{
        left: `${left}%`,
        width: `max(${width}%, 58px)`,
        top,
        height: laneHeight,
      }}
      title={`${formatTime(intervention.scheduledAt, locale)} · ${clientName(intervention)} · ${intervention.pool?.name ?? t('noPool')}`}
    >
      <div className="truncate text-[9px] font-black">
        {formatTime(intervention.scheduledAt, locale)} · {clientName(intervention)}
      </div>
      {laneHeight >= 34 ? (
        <div className="truncate text-[8px] opacity-75">
          {intervention.pool?.name ?? t('noPool')}
        </div>
      ) : null}
    </Link>
  )
}

function timeTicks(start: number, end: number): number[] {
  if (end - start <= 16) return [start, start + 4, start + 8, start + 12, end]
  return [0, 6, 12, 18, 24]
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border-t border-dashed border-border/60 bg-secondary/15 px-6 py-12 text-center">
      <Sparkles className="mx-auto h-5 w-5 text-gold" />
      <p className="mt-3 text-sm font-semibold text-muted-foreground">{message}</p>
    </div>
  )
}

function LoadingOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-background/35 backdrop-blur-[1px]">
      <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/95 px-4 py-2 text-xs font-bold shadow-lg">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        AQWELIA
      </div>
    </div>
  )
}

function typeLabel(t: ReturnType<typeof useTranslations>, type: string): string {
  try {
    return t(`type${cap(type)}` as never)
  } catch {
    return type
  }
}

function statusLabel(t: ReturnType<typeof useTranslations>, status: string): string {
  try {
    return t(`status${cap(status)}` as never)
  } catch {
    return status
  }
}
