'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  Wrench,
  Droplets,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Package,
  Settings2,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import { offlineApi } from '@/lib/offline/api-cache'
import { api } from '@/lib/api-client'
import { useOfflineStore } from '@/lib/offline/offline-store'

interface EquipmentRow {
  id: string
  type: string
  brand: string | null
  model: string | null
  installedAt: string | null
  lastMaintenanceAt: string | null
  nextMaintenanceAt: string | null
  status: string
  notes: string | null
}

interface ProductRow {
  id: string
  productName: string
  category: string
  concentration: number | null
  quantity: number
  unit: string
  price: number | null
  instructions: string | null
}

const EQUIPMENT_TYPES = [
  'pump',
  'filter',
  'electrolyzer',
  'cell',
  'phProbe',
  'robot',
  'cover',
  'heatpump',
  'skimmer',
] as const

const PRODUCT_CATEGORIES = [
  'ph_minus',
  'ph_plus',
  'chlorine_slow',
  'chlorine_shock',
  'salt',
  'alkalinity_plus',
  'stabilizer',
  'flocculant',
  'anti_algae',
  'filter_cleaner',
  'other',
] as const

const STATUS_VALUES = ['ok', 'warning', 'issue'] as const

const STATUS_CLS: Record<string, string> = {
  ok: 'border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.45_0.13_155)]',
  warning: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300',
  issue: 'border-destructive/30 bg-destructive/10 text-destructive',
}

export function ModuleMaintenance() {
  const t = useTranslations('modules.maintenance')
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <span className="section-label">{t('sectionLabel')}</span>
          <span className="h-px w-8 bg-gold/40" />
        </div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {t('headline')}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <Tabs defaultValue="equipment" className="gap-3">
        <TabsList className="bg-secondary/60">
          <TabsTrigger value="equipment">
            <Wrench className="h-3.5 w-3.5" />
            {t('tabs.equipment')}
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Package className="h-3.5 w-3.5" />
            {t('tabs.inventory')}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <Settings2 className="h-3.5 w-3.5" />
            {t('tabs.reminders')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="equipment">
          <EquipmentPanel />
        </TabsContent>
        <TabsContent value="inventory">
          <InventoryPanel />
        </TabsContent>
        <TabsContent value="tasks">
          <RemindersPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EquipmentPanel() {
  const t = useTranslations('modules.maintenance')
  const locale = useLocale()
  const [items, setItems] = useState<EquipmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [stale, setStale] = useState(false)
  const [form, setForm] = useState({
    type: 'pump',
    brand: '',
    model: '',
    installedAt: '',
    lastMaintenanceAt: '',
    nextMaintenanceAt: '',
    status: 'ok',
    notes: '',
  })

  const isOnline = useOfflineStore((s) => s.isOnline)
  const queueAction = useOfflineStore((s) => s.queueAction)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, stale } = await offlineApi.equipment()
      const d = data as { equipment?: EquipmentRow[] } | null
      setItems(d?.equipment || [])
      setStale(stale)
    } catch {
      setItems([])
      setStale(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function equipmentLabel(v: string) {
    return (EQUIPMENT_TYPES as readonly string[]).includes(v) ? t(`equipmentTypes.${v}`) : v
  }

  async function add() {
    if (!form.type) {
      toast({ title: t('typeRequired'), variant: 'destructive' })
      return
    }
    const body = {
      ...form,
      installedAt: form.installedAt || undefined,
      lastMaintenanceAt: form.lastMaintenanceAt || undefined,
      nextMaintenanceAt: form.nextMaintenanceAt || undefined,
      notes: form.notes || undefined,
    }
    try {
      if (!isOnline) {
        queueAction({ method: 'POST', path: '/api/pool/equipment', body })
        toast({
          title: t('actionQueued'),
          description: t('syncLater'),
        })
        setForm({
          type: 'pump',
          brand: '',
          model: '',
          installedAt: '',
          lastMaintenanceAt: '',
          nextMaintenanceAt: '',
          status: 'ok',
          notes: '',
        })
        setShowForm(false)
        return
      }
      await api.post('/api/pool/equipment', body)
      toast({ title: t('equipmentAdded') })
      setForm({
        type: 'pump',
        brand: '',
        model: '',
        installedAt: '',
        lastMaintenanceAt: '',
        nextMaintenanceAt: '',
        status: 'ok',
        notes: '',
      })
      setShowForm(false)
      load()
    } catch (e) {
      toast({
        title: t('error'),
        description: e instanceof Error ? e.message : t('failed'),
        variant: 'destructive',
      })
    }
  }

  async function markMaintained(id: string) {
    const body = {
      id,
      lastMaintenanceAt: new Date().toISOString(),
      status: 'ok',
    }
    try {
      if (!isOnline) {
        queueAction({ method: 'PATCH', path: '/api/pool/equipment', body })
        toast({
          title: t('actionQueued'),
          description: t('syncLater'),
        })
        return
      }
      await api.patch('/api/pool/equipment', body)
      toast({ title: t('markedMaintained'), description: t('markedMaintainedDesc') })
      load()
    } catch (e) {
      toast({
        title: t('error'),
        description: e instanceof Error ? e.message : t('failed'),
        variant: 'destructive',
      })
    }
  }

  async function remove(id: string) {
    try {
      if (!isOnline) {
        queueAction({ method: 'DELETE', path: `/api/pool/equipment?id=${id}` })
        setItems((it) => it.filter((x) => x.id !== id))
        toast({
          title: t('deleteQueued'),
          description: t('syncLater'),
        })
        return
      }
      await api.delete(`/api/pool/equipment?id=${id}`)
      setItems((it) => it.filter((x) => x.id !== id))
      toast({ title: t('equipmentDeleted') })
    } catch {
      toast({ title: t('error'), variant: 'destructive' })
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Wrench className="h-4 w-4 text-primary" />
            {t('equipmentCount', { count: items.length })}
            {stale && (
              <span className="text-[10px] font-normal italic text-muted-foreground">
                {t('cached')}
              </span>
            )}
          </CardTitle>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-3.5 w-3.5" />
            {t('add')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">{t('labels.type')}</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_TYPES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {t(`equipmentTypes.${v}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('labels.brand')}</Label>
                <Input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} placeholder={t('placeholders.brand')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('labels.model')}</Label>
                <Input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder={t('placeholders.model')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('labels.installedAt')}</Label>
                <Input type="date" value={form.installedAt} onChange={(e) => setForm((f) => ({ ...f, installedAt: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('labels.lastMaintenance')}</Label>
                <Input type="date" value={form.lastMaintenanceAt} onChange={(e) => setForm((f) => ({ ...f, lastMaintenanceAt: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('labels.nextMaintenance')}</Label>
                <Input type="date" value={form.nextMaintenanceAt} onChange={(e) => setForm((f) => ({ ...f, nextMaintenanceAt: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('labels.status')}</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {t(`status.${v}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1 sm:col-span-3">
                <Label className="text-xs">{t('labels.notes')}</Label>
                <Textarea
                  className="min-h-[40px] resize-none"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder={t('placeholders.notes')}
                />
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={add} className="bg-gradient-to-r from-primary to-gold text-primary-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('save')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <Wrench className="h-8 w-8 text-muted-foreground/40" />
            {t('noEquipment')}
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5" />
              {t('addFirstEquipment')}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((eq) => {
              const statusCls = STATUS_CLS[eq.status] || STATUS_CLS.ok
              const dueSoon =
                eq.nextMaintenanceAt &&
                new Date(eq.nextMaintenanceAt).getTime() < Date.now() + 7 * 86400000
              return (
                <div key={eq.id} className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-semibold">
                          {equipmentLabel(eq.type)}
                        </span>
                        {eq.brand && <span className="text-xs text-muted-foreground">{eq.brand} {eq.model}</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                        {eq.lastMaintenanceAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {t('maintainedDate')} {new Date(eq.lastMaintenanceAt).toLocaleDateString(locale)}
                          </span>
                        )}
                        {eq.nextMaintenanceAt && (
                          <span
                            className={`flex items-center gap-1 ${dueSoon ? 'font-semibold text-gold' : ''}`}
                          >
                            <Calendar className="h-3 w-3" />
                            {t('nextDate')} {new Date(eq.nextMaintenanceAt).toLocaleDateString(locale)}
                          </span>
                        )}
                      </div>
                      {eq.notes && <p className="mt-1 text-xs italic text-muted-foreground">« {eq.notes} »</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={statusCls}>
                        {t(`status.${eq.status}`)}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => markMaintained(eq.id)} className="h-7 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        {t('maintained')}
                      </Button>
                      <button
                        onClick={() => remove(eq.id)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={t('delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {dueSoon && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-md bg-gold/10 px-2 py-1 text-[11px] text-gold">
                      <AlertTriangle className="h-3 w-3" />
                      {t('dueSoon')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function InventoryPanel() {
  const t = useTranslations('modules.maintenance')
  const [items, setItems] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [stale, setStale] = useState(false)
  const [form, setForm] = useState({
    productName: '',
    category: 'ph_minus',
    concentration: '',
    quantity: '',
    unit: 'kg',
    price: '',
    instructions: '',
  })

  const isOnline = useOfflineStore((s) => s.isOnline)
  const queueAction = useOfflineStore((s) => s.queueAction)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, stale } = await offlineApi.inventory()
      const d = data as { products?: ProductRow[] } | null
      setItems(d?.products || [])
      setStale(stale)
    } catch {
      setItems([])
      setStale(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function categoryLabel(v: string) {
    return (PRODUCT_CATEGORIES as readonly string[]).includes(v) ? t(`productCategories.${v}`) : v
  }

  async function add() {
    if (!form.productName.trim()) {
      toast({ title: t('productNameRequired'), variant: 'destructive' })
      return
    }
    const body = {
      ...form,
      concentration: form.concentration || undefined,
      quantity: Number(form.quantity) || 0,
      price: form.price || undefined,
      instructions: form.instructions || undefined,
    }
    try {
      if (!isOnline) {
        queueAction({ method: 'POST', path: '/api/pool/inventory', body })
        toast({
          title: t('actionQueued'),
          description: t('syncLater'),
        })
        setForm({
          productName: '',
          category: 'ph_minus',
          concentration: '',
          quantity: '',
          unit: 'kg',
          price: '',
          instructions: '',
        })
        setShowForm(false)
        return
      }
      await api.post('/api/pool/inventory', body)
      toast({ title: t('productAdded'), description: t('stockUpdated') })
      setForm({
        productName: '',
        category: 'ph_minus',
        concentration: '',
        quantity: '',
        unit: 'kg',
        price: '',
        instructions: '',
      })
      setShowForm(false)
      load()
    } catch (e) {
      toast({
        title: t('error'),
        description: e instanceof Error ? e.message : t('failed'),
        variant: 'destructive',
      })
    }
  }

  async function remove(id: string) {
    try {
      if (!isOnline) {
        queueAction({ method: 'DELETE', path: `/api/pool/inventory?id=${id}` })
        setItems((it) => it.filter((x) => x.id !== id))
        toast({
          title: t('deleteQueued'),
          description: t('syncLater'),
        })
        return
      }
      await api.delete(`/api/pool/inventory?id=${id}`)
      setItems((it) => it.filter((x) => x.id !== id))
      toast({ title: t('productDeleted') })
    } catch {
      toast({ title: t('error'), variant: 'destructive' })
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Package className="h-4 w-4 text-primary" />
            {t('inventoryCount', { count: items.length })}
            {stale && (
              <span className="text-[10px] font-normal italic text-muted-foreground">
                {t('cached')}
              </span>
            )}
          </CardTitle>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-3.5 w-3.5" />
            {t('add')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="col-span-2 space-y-1 sm:col-span-1">
                <Label className="text-xs">{t('labels.productName')}</Label>
                <Input
                  value={form.productName}
                  onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
                  placeholder={t('placeholders.productName')}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('labels.category')}</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {t(`productCategories.${v}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('labels.concentration')}</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.concentration}
                  onChange={(e) => setForm((f) => ({ ...f, concentration: e.target.value }))}
                  placeholder={t('placeholders.concentration')}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('labels.quantity')}</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder={t('placeholders.quantity')}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('labels.unit')}</Label>
                <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="tablet">{t('unitTablet')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('labels.price')}</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder={t('placeholders.price')}
                />
              </div>
              <div className="col-span-2 space-y-1 sm:col-span-3">
                <Label className="text-xs">{t('labels.instructions')}</Label>
                <Textarea
                  className="min-h-[40px] resize-none"
                  value={form.instructions}
                  onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                  placeholder={t('placeholders.instructions')}
                />
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={add} className="bg-gradient-to-r from-primary to-gold text-primary-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('save')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <Package className="h-8 w-8 text-muted-foreground/40" />
            {t('noProducts')}
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5" />
              {t('addFirstProduct')}
            </Button>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((p) => {
              const low = p.quantity <= 1
              return (
                <div
                  key={p.id}
                  className={`rounded-xl border bg-background/60 p-3 ${low ? 'border-gold/40' : 'border-border/50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-sm font-semibold">{p.productName}</p>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {categoryLabel(p.category)}
                      </span>
                    </div>
                    <button
                      onClick={() => remove(p.id)}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={t('delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className={`flex items-center gap-1 ${low ? 'font-semibold text-gold' : 'text-muted-foreground'}`}>
                      <Droplets className="h-3 w-3" />
                      {p.quantity} {p.unit}
                    </span>
                    {p.price != null && (
                      <span className="text-muted-foreground">
                        ≈ <span className="font-semibold text-gold">{p.price} €</span>
                      </span>
                    )}
                  </div>
                  {p.instructions && (
                    <p className="mt-1 text-[11px] italic text-muted-foreground">{p.instructions}</p>
                  )}
                  {low && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-md bg-gold/10 px-2 py-1 text-[11px] text-gold">
                      <AlertTriangle className="h-3 w-3" />
                      {t('lowStock')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {items.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-border/40 bg-secondary/30 p-3 text-[11px] text-muted-foreground">
            <RefreshCw className="mt-0.5 h-3 w-3 shrink-0 text-gold" />
            {t('inventoryHint')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RemindersPanel() {
  const t = useTranslations('modules.maintenance')
  const [equipment, setEquipment] = useState<EquipmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [stale, setStale] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, stale } = await offlineApi.equipment()
      const d = data as { equipment?: EquipmentRow[] } | null
      setEquipment(d?.equipment || [])
      setStale(stale)
    } catch {
      setEquipment([])
      setStale(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function equipmentLabel(v: string) {
    return (EQUIPMENT_TYPES as readonly string[]).includes(v) ? t(`equipmentTypes.${v}`) : v
  }

  // Derive simple reminders from equipment types
  // P0-FIX Bug 1: TS2345 — next-intl's `t()` expects params shaped as
  // `Record<string, string | number | Date>`, not the loose
  // `Record<string, unknown>`. Tightening the type here aligns the local
  // reminder shape with the i18n helper signature (the only value we ever
  // store is the string returned by `equipmentLabel`).
  const reminders: { titleKey: 'filterWash' | 'cellClean' | 'pumpPrefilter' | 'phCalibration' | 'robotClean'; titleParams?: Record<string, string | number>; detailKey: string; urgency: 'soon' | 'normal' }[] = []
  for (const eq of equipment) {
    if (eq.type === 'filter') {
      reminders.push({
        titleKey: 'filterWash',
        titleParams: { type: equipmentLabel(eq.type) },
        detailKey: 'reminders.filterWash.detail',
        urgency: 'normal',
      })
    }
    if (eq.type === 'electrolyzer' || eq.type === 'cell') {
      reminders.push({
        titleKey: 'cellClean',
        detailKey: 'reminders.cellClean.detail',
        urgency: 'normal',
      })
    }
    if (eq.type === 'pump') {
      reminders.push({
        titleKey: 'pumpPrefilter',
        detailKey: 'reminders.pumpPrefilter.detail',
        urgency: 'soon',
      })
    }
    if (eq.type === 'phProbe') {
      reminders.push({
        titleKey: 'phCalibration',
        detailKey: 'reminders.phCalibration.detail',
        urgency: 'normal',
      })
    }
    if (eq.type === 'robot') {
      reminders.push({
        titleKey: 'robotClean',
        detailKey: 'reminders.robotClean.detail',
        urgency: 'normal',
      })
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <Settings2 className="h-4 w-4 text-primary" />
          {t('remindersTitle')}
          {stale && (
            <span className="text-[10px] font-normal italic text-muted-foreground">
              {t('cached')}
            </span>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          {t('remindersDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : reminders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <Settings2 className="h-8 w-8 text-muted-foreground/40" />
            {t('noReminders')}
          </div>
        ) : (
          <div className="space-y-2">
            {reminders.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-xl border p-3 ${
                  r.urgency === 'soon'
                    ? 'border-gold/30 bg-gold/5'
                    : 'border-border/50 bg-background/60'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    r.urgency === 'soon'
                      ? 'bg-gold/15 text-gold'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  <Settings2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    {t(`reminders.${r.titleKey}.title`, r.titleParams)}
                  </p>
                  <p className="text-xs text-muted-foreground">{t(r.detailKey)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
