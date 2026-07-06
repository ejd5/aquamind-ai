'use client'

import { useCallback, useEffect, useState } from 'react'
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
  { value: 'pump', label: 'Pompe' },
  { value: 'filter', label: 'Filtre' },
  { value: 'electrolyzer', label: 'Électrolyseur' },
  { value: 'cell', label: 'Cellule' },
  { value: 'phProbe', label: 'Sonde pH' },
  { value: 'robot', label: 'Robot' },
  { value: 'cover', label: 'Bâche / couverture' },
  { value: 'heatpump', label: 'Pompe à chaleur' },
  { value: 'skimmer', label: 'Skimmer' },
]

const PRODUCT_CATEGORIES = [
  { value: 'ph_minus', label: 'pH-' },
  { value: 'ph_plus', label: 'pH+' },
  { value: 'chlorine_slow', label: 'Chlore lent' },
  { value: 'chlorine_shock', label: 'Chlore choc' },
  { value: 'salt', label: 'Sel' },
  { value: 'alkalinity_plus', label: 'TAC+' },
  { value: 'stabilizer', label: 'Stabilisant' },
  { value: 'flocculant', label: 'Floculant' },
  { value: 'anti_algae', label: 'Anti-algues' },
  { value: 'filter_cleaner', label: 'Nettoyant filtre' },
  { value: 'other', label: 'Autre' },
]

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  ok: { label: 'OK', cls: 'border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.45_0.13_155)]' },
  warning: { label: 'À surveiller', cls: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300' },
  issue: { label: 'Problème', cls: 'border-destructive/30 bg-destructive/10 text-destructive' },
}

function labelFor(list: { value: string; label: string }[], v: string) {
  return list.find((x) => x.value === v)?.label || v
}

export function ModuleMaintenance() {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <span className="section-label">Maintenance</span>
          <span className="h-px w-8 bg-gold/40" />
        </div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Matériel & produits
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Suivez vos équipements (entretien, prochaines échéances) et votre stock de produits pour
          ne jamais tomber en panne.
        </p>
      </div>

      <Tabs defaultValue="equipment" className="gap-3">
        <TabsList className="bg-secondary/60">
          <TabsTrigger value="equipment">
            <Wrench className="h-3.5 w-3.5" />
            Équipements
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Package className="h-3.5 w-3.5" />
            Inventaire produits
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <Settings2 className="h-3.5 w-3.5" />
            Rappels
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

  async function add() {
    if (!form.type) {
      toast({ title: 'Type requis', variant: 'destructive' })
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
          title: 'Action enregistrée',
          description: 'Sera synchronisée quand vous serez en ligne.',
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
      toast({ title: 'Équipement ajouté' })
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
        title: 'Erreur',
        description: e instanceof Error ? e.message : 'Échec',
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
          title: 'Action enregistrée',
          description: 'Sera synchronisée quand vous serez en ligne.',
        })
        return
      }
      await api.patch('/api/pool/equipment', body)
      toast({ title: 'Marqué comme entretenu', description: 'Dernière maintenance mise à jour.' })
      load()
    } catch (e) {
      toast({
        title: 'Erreur',
        description: e instanceof Error ? e.message : 'Échec',
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
          title: 'Suppression enregistrée',
          description: 'Sera synchronisée quand vous serez en ligne.',
        })
        return
      }
      await api.delete(`/api/pool/equipment?id=${id}`)
      setItems((it) => it.filter((x) => x.id !== id))
      toast({ title: 'Équipement supprimé' })
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' })
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Wrench className="h-4 w-4 text-primary" />
            Équipements ({items.length})
            {stale && (
              <span className="text-[10px] font-normal italic text-muted-foreground">
                données en cache
              </span>
            )}
          </CardTitle>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Marque</Label>
                <Input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Ex : Pentair" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Modèle</Label>
                <Input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="Ex : VS-100" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Installé le</Label>
                <Input type="date" value={form.installedAt} onChange={(e) => setForm((f) => ({ ...f, installedAt: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dernier entretien</Label>
                <Input type="date" value={form.lastMaintenanceAt} onChange={(e) => setForm((f) => ({ ...f, lastMaintenanceAt: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prochain entretien</Label>
                <Input type="date" value={form.nextMaintenanceAt} onChange={(e) => setForm((f) => ({ ...f, nextMaintenanceAt: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Statut</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ok">OK</SelectItem>
                    <SelectItem value="warning">À surveiller</SelectItem>
                    <SelectItem value="issue">Problème</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1 sm:col-span-3">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  className="min-h-[40px] resize-none"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Ex : changer cellule dans 6 mois"
                />
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={add} className="bg-gradient-to-r from-primary to-gold text-primary-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Enregistrer
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
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
            Aucun équipement enregistré.
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5" />
              Ajouter mon premier équipement
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((eq) => {
              const st = STATUS_CFG[eq.status] || STATUS_CFG.ok
              const dueSoon =
                eq.nextMaintenanceAt &&
                new Date(eq.nextMaintenanceAt).getTime() < Date.now() + 7 * 86400000
              return (
                <div key={eq.id} className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-semibold">
                          {labelFor(EQUIPMENT_TYPES, eq.type)}
                        </span>
                        {eq.brand && <span className="text-xs text-muted-foreground">{eq.brand} {eq.model}</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                        {eq.lastMaintenanceAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Entretenu : {new Date(eq.lastMaintenanceAt).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                        {eq.nextMaintenanceAt && (
                          <span
                            className={`flex items-center gap-1 ${dueSoon ? 'font-semibold text-gold' : ''}`}
                          >
                            <Calendar className="h-3 w-3" />
                            Prochain : {new Date(eq.nextMaintenanceAt).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                      {eq.notes && <p className="mt-1 text-xs italic text-muted-foreground">« {eq.notes} »</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={st.cls}>
                        {st.label}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => markMaintained(eq.id)} className="h-7 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        Entretenu
                      </Button>
                      <button
                        onClick={() => remove(eq.id)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {dueSoon && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-md bg-gold/10 px-2 py-1 text-[11px] text-gold">
                      <AlertTriangle className="h-3 w-3" />
                      Échéance d'entretien proche.
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

  async function add() {
    if (!form.productName.trim()) {
      toast({ title: 'Nom du produit requis', variant: 'destructive' })
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
          title: 'Action enregistrée',
          description: 'Sera synchronisée quand vous serez en ligne.',
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
      toast({ title: 'Produit ajouté', description: 'Stock mis à jour.' })
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
        title: 'Erreur',
        description: e instanceof Error ? e.message : 'Échec',
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
          title: 'Suppression enregistrée',
          description: 'Sera synchronisée quand vous serez en ligne.',
        })
        return
      }
      await api.delete(`/api/pool/inventory?id=${id}`)
      setItems((it) => it.filter((x) => x.id !== id))
      toast({ title: 'Produit supprimé' })
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' })
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Package className="h-4 w-4 text-primary" />
            Inventaire produits ({items.length})
            {stale && (
              <span className="text-[10px] font-normal italic text-muted-foreground">
                données en cache
              </span>
            )}
          </CardTitle>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="col-span-2 space-y-1 sm:col-span-1">
                <Label className="text-xs">Nom du produit</Label>
                <Input
                  value={form.productName}
                  onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
                  placeholder="Ex : pH- liquide"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Catégorie</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Concentration</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.concentration}
                  onChange={(e) => setForm((f) => ({ ...f, concentration: e.target.value }))}
                  placeholder="Ex : 30 (%)"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quantité</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="Ex : 5"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unité</Label>
                <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="tablet">pastilles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prix (€)</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="Ex : 19.90"
                />
              </div>
              <div className="col-span-2 space-y-1 sm:col-span-3">
                <Label className="text-xs">Instructions (optionnel)</Label>
                <Textarea
                  className="min-h-[40px] resize-none"
                  value={form.instructions}
                  onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                  placeholder="Ex : 1 pastille / panier par semaine"
                />
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={add} className="bg-gradient-to-r from-primary to-gold text-primary-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Enregistrer
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
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
            Aucun produit enregistré.
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5" />
              Ajouter mon premier produit
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
                        {labelFor(PRODUCT_CATEGORIES, p.category)}
                      </span>
                    </div>
                    <button
                      onClick={() => remove(p.id)}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Supprimer"
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
                      Stock bas — pensez à racheter.
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
            Avant d'acheter, vérifiez votre inventaire : AQWELIA vous indique les stocks bas pour
            éviter les doublons.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RemindersPanel() {
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

  // Derive simple reminders from equipment types
  const reminders: { title: string; detail: string; urgency: 'soon' | 'normal' }[] = []
  for (const eq of equipment) {
    if (eq.type === 'filter') {
      reminders.push({
        title: `Lavage du filtre (${labelFor(EQUIPMENT_TYPES, eq.type)})`,
        detail: 'Contre-lavage toutes les 2-4 semaines selon pression.',
        urgency: 'normal',
      })
    }
    if (eq.type === 'electrolyzer' || eq.type === 'cell') {
      reminders.push({
        title: 'Nettoyage de la cellule électrolyse',
        detail: 'Détartrer la cellule dans l\'acide dilué tous les 3-6 mois.',
        urgency: 'normal',
      })
    }
    if (eq.type === 'pump') {
      reminders.push({
        title: 'Vérification du préfiltre pompe',
        detail: 'Vider le panier du préfiltre toutes les semaines.',
        urgency: 'soon',
      })
    }
    if (eq.type === 'phProbe') {
      reminders.push({
        title: 'Étalonnage sonde pH',
        detail: 'Étalonner avec solutions tampons tous les 1-2 mois.',
        urgency: 'normal',
      })
    }
    if (eq.type === 'robot') {
      reminders.push({
        title: 'Nettoyage du robot',
        detail: 'Vider sacs/filtres après chaque cycle.',
        urgency: 'normal',
      })
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <Settings2 className="h-4 w-4 text-primary" />
          Rappels d'entretien
          {stale && (
            <span className="text-[10px] font-normal italic text-muted-foreground">
              données en cache
            </span>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          Générés automatiquement à partir de vos équipements enregistrés.
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
            Ajoutez des équipements pour activer les rappels d'entretien automatiques.
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
                  <p className="text-sm font-semibold">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
