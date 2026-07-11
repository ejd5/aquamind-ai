'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Bell,
  Clock,
  Check,
  Trash2,
  Plus,
  ChevronDown,
  AlertTriangle,
  Droplets,
  FlaskConical,
  CloudRain,
  Wrench,
  Sparkles,
  ShieldCheck,
  CalendarClock,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'
import type { TabId } from './app-shell'
import { offlineApi } from '@/lib/offline/api-cache'
import { api } from '@/lib/api-client'
import { useOfflineStore } from '@/lib/offline/offline-store'

type ReminderType =
  | 'test_water'
  | 'retest_after_product'
  | 'after_storm'
  | 'before_vacation'
  | 'filter_clean'
  | 'cell_clean'
  | 'skimmer_clean'
  | 'winterize'
  | 'startup'
  | 'low_product'
  | 'uv_check'

type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent'

interface Reminder {
  id: string
  type: ReminderType
  title: string
  titleKey?: string
  detail: string
  detailKey?: string
  action: string
  actionKey?: string
  params?: Record<string, string | number>
  priority: ReminderPriority
  dueInHours: number
  source: 'weather' | 'test_history' | 'inventory' | 'equipment' | 'schedule' | 'manual'
}

interface ReminderContext {
  lastTestDaysAgo: number | null
  hasSaltSystem: boolean
  filterType: string
  season: string
}

interface Props {
  onNavigate?: (tab: TabId) => void
}

const PRIORITY_STRIPE: Record<ReminderPriority, string> = {
  urgent: 'bg-destructive',
  high: 'bg-orange-500',
  medium: 'bg-primary',
  low: 'bg-muted-foreground',
}
const PRIORITY_BADGE: Record<ReminderPriority, string> = {
  urgent: 'border-destructive/40 bg-destructive/10 text-destructive',
  high: 'border-orange-400/40 bg-orange-400/10 text-orange-700 dark:text-orange-300',
  medium: 'border-primary/40 bg-primary/10 text-primary',
  low: 'border-border bg-secondary/60 text-muted-foreground',
}

const TYPE_ICON: Record<ReminderType, typeof Bell> = {
  test_water: FlaskConical,
  retest_after_product: FlaskConical,
  after_storm: CloudRain,
  before_vacation: CalendarClock,
  filter_clean: Wrench,
  cell_clean: Wrench,
  skimmer_clean: Wrench,
  winterize: CalendarClock,
  startup: Sparkles,
  low_product: Droplets,
  uv_check: Sparkles,
}

// Source labels are translated at runtime via t('source.<key>')
const SOURCE_KEY: Record<string, string> = {
  weather: 'weather',
  test_history: 'testHistory',
  inventory: 'inventory',
  equipment: 'equipment',
  schedule: 'schedule',
  manual: 'manual',
}

export function ModuleReminders({ onNavigate }: Props) {
  const t = useTranslations('modules.reminders')
  const td = useTranslations('guidesData')
  const tr = useTranslations('reminders')
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [manualReminders, setManualReminders] = useState<Reminder[]>([])
  const [context, setContext] = useState<ReminderContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [planId, setPlanId] = useState<string>('decouverte')
  const [stale, setStale] = useState(false)

  // Add form
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    detail: '',
    action: '',
    type: 'test_water' as ReminderType,
    priority: 'medium' as ReminderPriority,
    dueAt: '',
  })
  const [saving, setSaving] = useState(false)

  const isOnline = useOfflineStore((s) => s.isOnline)
  const queueAction = useOfflineStore((s) => s.queueAction)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [remRes, subRes] = await Promise.all([
        offlineApi.reminders(),
        offlineApi.subscription(),
      ])
      const remData = remRes.data as
        | {
            reminders?: Reminder[]
            manualReminders?: Reminder[]
            context?: ReminderContext
            error?: string
          }
        | null
      if (remRes.error && !remData) throw new Error(remRes.error)
      setReminders(remData?.reminders || [])
      setManualReminders(remData?.manualReminders || [])
      setContext(remData?.context || null)
      const subData = subRes.data as { plan?: { id?: string } } | null
      if (subData?.plan?.id) setPlanId(subData.plan.id)
      setStale(remRes.stale || subRes.stale)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('error'))
      setStale(false)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const allReminders = [...reminders, ...manualReminders]
  const urgentCount = allReminders.filter((r) => r.priority === 'urgent').length
  const highCount = allReminders.filter((r) => r.priority === 'high').length

  // Group reminders by priority bucket
  const groups: { key: ReminderPriority; items: Reminder[] }[] = [
    { key: 'urgent', items: allReminders.filter((r) => r.priority === 'urgent') },
    { key: 'high', items: allReminders.filter((r) => r.priority === 'high') },
    { key: 'medium', items: allReminders.filter((r) => r.priority === 'medium') },
    { key: 'low', items: allReminders.filter((r) => r.priority === 'low') },
  ]

  async function patchReminder(id: string, patch: { done?: boolean; snoozed?: boolean }) {
    const body = { id, ...patch }
    try {
      if (!isOnline) {
        queueAction({ method: 'PATCH', path: '/api/pool/reminders', body })
        // Remove from local state (snoozed also hides it for now)
        setReminders((r) => r.filter((x) => x.id !== id))
        setManualReminders((r) => r.filter((x) => x.id !== id))
        toast({
          title: patch.done ? t('doneToast') : t('snoozedToast'),
          description: t('syncLater'),
        })
        return
      }
      await api.patch('/api/pool/reminders', body)
      // Remove from local state (snoozed also hides it for now)
      setReminders((r) => r.filter((x) => x.id !== id))
      setManualReminders((r) => r.filter((x) => x.id !== id))
      toast({
        title: patch.done ? t('doneToast') : t('snoozedToast'),
        description: patch.done ? t('doneDesc') : t('snoozedDesc'),
      })
    } catch {
      toast({ title: t('error'), description: t('updateError'), variant: 'destructive' })
    }
  }

  async function deleteReminder(id: string) {
    try {
      if (!isOnline) {
        queueAction({ method: 'DELETE', path: `/api/pool/reminders?id=${id}` })
        setManualReminders((r) => r.filter((x) => x.id !== id))
        toast({
          title: t('deleteQueued'),
          description: t('syncLater'),
        })
        return
      }
      await api.delete(`/api/pool/reminders?id=${id}`)
      setManualReminders((r) => r.filter((x) => x.id !== id))
      toast({ title: t('deletedToast') })
    } catch {
      toast({ title: t('error'), description: t('deleteError'), variant: 'destructive' })
    }
  }

  async function addManual() {
    if (!form.title.trim()) {
      toast({ title: t('titleRequired'), variant: 'destructive' })
      return
    }
    setSaving(true)
    const body = {
      title: form.title.trim(),
      detail: form.detail.trim(),
      action: form.action.trim(),
      type: form.type,
      priority: form.priority,
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
    }
    try {
      if (!isOnline) {
        queueAction({ method: 'POST', path: '/api/pool/reminders', body })
        setManualReminders((r) => [
          {
            id: `local-${Date.now()}`,
            type: form.type,
            title: form.title.trim(),
            detail: form.detail.trim(),
            action: form.action.trim(),
            priority: form.priority,
            dueInHours: form.dueAt ? Math.max(0, Math.round((new Date(form.dueAt).getTime() - Date.now()) / 3600000)) : 24,
            source: 'manual',
          },
          ...r,
        ])
        setForm({ title: '', detail: '', action: '', type: 'test_water', priority: 'medium', dueAt: '' })
        setAddOpen(false)
        toast({
          title: t('addedToast'),
          description: t('syncLater'),
        })
        return
      }
      const data = await api.post<{ reminder?: { id: string } }>('/api/pool/reminders', body)
      setManualReminders((r) => [
        {
          id: data.reminder?.id || `local-${Date.now()}`,
          type: form.type,
          title: form.title.trim(),
          detail: form.detail.trim(),
          action: form.action.trim(),
          priority: form.priority,
          dueInHours: form.dueAt ? Math.max(0, Math.round((new Date(form.dueAt).getTime() - Date.now()) / 3600000)) : 24,
          source: 'manual',
        },
        ...r,
      ])
      setForm({ title: '', detail: '', action: '', type: 'test_water', priority: 'medium', dueAt: '' })
      setAddOpen(false)
      toast({ title: t('addedToast'), description: t('addedDesc') })
    } catch (e) {
      toast({
        title: t('error'),
        description: e instanceof Error ? e.message : t('failed'),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-16" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-5">
        <Header t={t} urgentCount={0} highCount={0} onRefresh={load} stale={stale} />
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={load} variant="outline" size="sm">
              {t('retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Header t={t} urgentCount={urgentCount} highCount={highCount} onRefresh={load} stale={stale} />

      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-secondary/30 p-3 text-xs text-foreground/80">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
        <p>
          {t('infoBanner')}{' '}
          {planId === 'decouverte' && (
            <span className="font-semibold text-gold">
              {t('freePlanInfo')}{' '}
              {onNavigate && (
                <button onClick={() => onNavigate('paywall')} className="underline underline-offset-2">
                  {t('unlockLink')}
                </button>
              )}
            </span>
          )}
        </p>
      </div>

      {/* Context summary */}
      {context && (
        <div className="flex flex-wrap gap-2 text-[11px]">
          {context.lastTestDaysAgo != null && (
            <span className="rounded-full bg-secondary/60 px-2 py-1 text-muted-foreground">
              {t('lastTest')} {context.lastTestDaysAgo >= 999 ? t('never') : t('daysAgo', { n: context.lastTestDaysAgo })}
            </span>
          )}
          <span className="rounded-full bg-secondary/60 px-2 py-1 text-muted-foreground">
            {t('filterLabel')} {context.filterType}
          </span>
          {context.hasSaltSystem && (
            <span className="rounded-full bg-gold/15 px-2 py-1 text-gold">
              {t('saltSystem')}
            </span>
          )}
          <span className="rounded-full bg-secondary/60 px-2 py-1 capitalize text-muted-foreground">
            {t('seasonLabel')} {t(`season.${context.season}`)}
          </span>
        </div>
      )}

      {/* Add manual reminder */}
      <Collapsible open={addOpen} onOpenChange={setAddOpen}>
        <Card className="glass-card">
          <CollapsibleTrigger asChild>
            <button
              className="flex w-full items-center gap-2 p-4 text-left"
              aria-expanded={addOpen}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-gold text-primary-foreground">
                <Plus className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="font-display text-sm font-semibold">{t('addManual')}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t('addManualDesc')}
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${addOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 border-t border-border/40 pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="r-title" className="text-xs">{t('titleLabel')}</Label>
                  <Input
                    id="r-title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder={t('titlePlaceholder')}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="r-due" className="text-xs">{t('dueAtLabel')}</Label>
                  <Input
                    id="r-due"
                    type="datetime-local"
                    value={form.dueAt}
                    onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t('typeLabel')}</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm((f) => ({ ...f, type: v as ReminderType }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test_water">{t('type.testWater')}</SelectItem>
                      <SelectItem value="filter_clean">{t('type.filterClean')}</SelectItem>
                      <SelectItem value="cell_clean">{t('type.cellClean')}</SelectItem>
                      <SelectItem value="skimmer_clean">{t('type.skimmerClean')}</SelectItem>
                      <SelectItem value="low_product">{t('type.lowProduct')}</SelectItem>
                      <SelectItem value="before_vacation">{t('type.beforeVacation')}</SelectItem>
                      <SelectItem value="startup">{t('type.startup')}</SelectItem>
                      <SelectItem value="winterize">{t('type.winterize')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('priorityLabel')}</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm((f) => ({ ...f, priority: v as ReminderPriority }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('priority.low')}</SelectItem>
                      <SelectItem value="medium">{t('priority.medium')}</SelectItem>
                      <SelectItem value="high">{t('priority.high')}</SelectItem>
                      <SelectItem value="urgent">{t('priority.urgent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="r-detail" className="text-xs">{t('detailLabel')}</Label>
                <Textarea
                  id="r-detail"
                  value={form.detail}
                  onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))}
                  placeholder={t('detailPlaceholder')}
                  className="min-h-[50px] resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={addManual}
                  disabled={saving}
                  className="bg-gradient-to-r from-primary to-gold text-primary-foreground"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {t('save')}
                </Button>
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  {t('cancel')}
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Reminder groups */}
      {allReminders.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Check className="h-8 w-8 text-[oklch(0.7_0.15_155)]" />
            <p className="font-display text-base">{t('nonePending')}</p>
            <p className="text-sm text-muted-foreground">
              {t('nonePendingDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) =>
            group.items.length === 0 ? null : (
              <div key={group.key}>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="font-display text-sm font-semibold">{t(`priority.${group.key}`)}</h3>
                  <Badge variant="outline" className="text-[10px]">
                    {group.items.length}
                  </Badge>
                  <span className="h-px flex-1 bg-border/40" />
                </div>
                <div className="space-y-2">
                  {group.items.map((r) => {
                    const stripe = PRIORITY_STRIPE[r.priority]
                    const badgeCls = PRIORITY_BADGE[r.priority]
                    const Icon = TYPE_ICON[r.type] || Bell
                    return (
                      <div
                        key={r.id}
                        className={`relative overflow-hidden rounded-xl border border-border/50 bg-card/60 p-3 pl-4 backdrop-blur-sm`}
                      >
                        <span className={`absolute left-0 top-0 h-full w-1 ${stripe}`} />
                        <div className="flex items-start gap-3 pl-1">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/70">
                            <Icon className="h-4 w-4 text-primary" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-display text-sm font-bold">{tr(r.titleKey as any, r.params)}</p>
                              <Badge variant="outline" className={`text-[9px] ${badgeCls}`}>
                                {t(`priority.${r.priority}`)}
                              </Badge>
                              <span className="rounded-full bg-secondary/60 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                                {SOURCE_KEY[r.source] ? t(`source.${SOURCE_KEY[r.source]}`) : r.source}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">{tr(r.detailKey as any, r.params)}</p>
                            <div className="mt-2 flex items-start gap-1.5 rounded-md bg-gold/5 p-2 text-xs text-foreground/90">
                              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-gold" />
                              <span><strong className="text-gold">{t('actionLabel')} :</strong> {tr(r.actionKey as any, r.params)}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {r.dueInHours <= 0 ? t('now') : r.dueInHours < 24 ? t('inHours', { n: r.dueInHours }) : t('inDays', { n: Math.round(r.dueInHours / 24) })}
                              </span>
                              <div className="ml-auto flex flex-wrap gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => patchReminder(r.id, { done: true })}
                                  className="h-7 border-[oklch(0.7_0.15_155)]/40 text-[oklch(0.45_0.13_155)] hover:bg-[oklch(0.7_0.15_155)]/10"
                                >
                                  <Check className="h-3 w-3" />
                                  {t('done')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => patchReminder(r.id, { snoozed: true })}
                                  className="h-7"
                                >
                                  {t('snooze')}
                                </Button>
                                {r.source === 'manual' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => deleteReminder(r.id)}
                                    className="h-7 border-destructive/30 text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Free plan upsell */}
      {planId === 'decouverte' && (
        <Card className="border-gold/30 bg-gradient-to-br from-gold/5 to-primary/5">
          <CardContent className="flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15">
              <ShieldCheck className="h-5 w-5 text-gold" />
            </div>
            <div className="flex-1">
              <p className="font-display text-sm font-bold text-gold">{t('unlockTitle')}</p>
              <p className="text-xs text-foreground/80">
                {t('unlockDesc')}
              </p>
            </div>
            {onNavigate && (
              <Button
                size="sm"
                onClick={() => onNavigate('paywall')}
                className="border-gold/40 bg-gold/10 text-gold hover:bg-gold/20"
                variant="outline"
              >
                {t('seePlans')}
                <Sparkles className="h-3.5 w-3.5" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Header({
  t,
  urgentCount,
  highCount,
  onRefresh,
  stale,
}: {
  t: ReturnType<typeof useTranslations>
  urgentCount: number
  highCount: number
  onRefresh: () => void
  stale?: boolean
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="section-label">{t('title')}</span>
          <span className="h-px w-8 bg-gold/40" />
        </div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {t('headline')}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {urgentCount > 0 ? (
            <span className="flex items-center gap-1.5 font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {t('urgentCount', { count: urgentCount })}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-[oklch(0.7_0.15_155)]" />
              {t('noUrgent')}
            </span>
          )}
          {highCount > 0 && (
            <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-300">
              · {t('todayCount', { count: highCount })}
            </span>
          )}
          {stale && (
            <span className="text-[10px] italic text-muted-foreground">· {t('cached')}</span>
          )}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} className="border-border/60">
        {t('refresh')}
      </Button>
    </div>
  )
}
