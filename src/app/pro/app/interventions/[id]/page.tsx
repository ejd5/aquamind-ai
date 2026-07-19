'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Camera, CheckCircle2, Download, FlaskConical, Loader2, Play, Save, Trash2 } from 'lucide-react'
import { useToolWorkspaceText } from '@/hooks/use-tool-workspace-text'

type Photo = { url: string; capturedAt: string; label?: string }
type Intervention = {
  id: string; type: string; status: string; scheduledAt: string; completedAt?: string | null; duration?: number | null; technicianId?: string | null
  notes?: string | null; photos?: string | null; actions?: string | null; productsUsed?: string | null
  client: { id: string; firstName: string; lastName: string; email?: string | null; phone?: string | null }
  pool?: { id: string; name: string; type: string } | null
}

export default function ProInterventionDetailPage() {
  const tt = useToolWorkspaceText()
  const { id } = useParams<{ id: string }>()
  const [intervention, setIntervention] = useState<Intervention | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [notes, setNotes] = useState('')
  const [duration, setDuration] = useState('')
  const [actions, setActions] = useState('')
  const [products, setProducts] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [test, setTest] = useState({ ph: '', freeChlorine: '', alkalinity: '', temperature: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/pro/interventions/${id}`, { cache: 'no-store' })
    if (res.ok) {
      const iv = (await res.json()).intervention as Intervention
      setIntervention(iv); setNotes(iv.notes ?? ''); setDuration(iv.duration ? String(iv.duration) : '')
      setActions(parseLabels(iv.actions).join('\n')); setProducts(parseLabels(iv.productsUsed).join('\n')); setPhotos(parsePhotos(iv.photos))
    }
    setLoading(false)
  }, [id])
  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(timer) }, [load])

  async function save(extra: Record<string, unknown> = {}) {
    setSaving(true); setMessage('')
    const res = await fetch(`/api/pro/interventions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      notes, duration: duration ? Number(duration) : 0,
      actions: lines(actions), productsUsed: lines(products), photos, ...extra,
    }) })
    setSaving(false)
    if (res.ok) { setMessage(tt('reportSaved')); await load() } else setMessage('Unable to save the report.')
  }

  async function addWaterTest() {
    if (!intervention?.pool?.id) return
    setSaving(true)
    const res = await fetch('/api/pro/water-tests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proPoolId: intervention.pool.id, ...test, notes: `Analyse liée à l’intervention ${id}` }) })
    setSaving(false); setMessage(res.ok ? tt('waterTestSaved') : 'Unable to save the water test.')
    if (res.ok) setTest({ ph: '', freeChlorine: '', alkalinity: '', temperature: '' })
  }

  async function addPhotos(files: FileList | null) {
    if (!files) return
    const additions: Photo[] = []
    for (const file of Array.from(files).slice(0, Math.max(0, 6 - photos.length))) {
      additions.push({ url: await compressPhoto(file), capturedAt: new Date().toISOString(), label: 'Photo terrain' })
    }
    setPhotos((current) => [...current, ...additions])
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
  if (!intervention) return <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4">Intervention introuvable.</div>

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/pro/app/interventions" className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="h-3.5 w-3.5" />Retour aux interventions</Link>
      <a href={`/api/pro/interventions/${id}/report`} className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-4 py-2 text-xs font-semibold text-gold"><Download className="h-4 w-4" />Télécharger le rapport PDF</a>
    </div>

    <section className="rounded-2xl border border-white/40 bg-white/60 p-6 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><span className="section-label">{intervention.type}</span><h1 className="mt-2 font-display text-3xl font-bold">{intervention.client.firstName} {intervention.client.lastName}</h1><p className="text-sm text-muted-foreground">{intervention.pool?.name ?? 'Aucun bassin'} · {new Date(intervention.scheduledAt).toLocaleString('fr-FR')}</p></div>
        <div className="flex gap-2">
          {intervention.status === 'scheduled' && <button onClick={() => save({ status: 'in_progress' })} className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-white"><Play className="h-4 w-4" />Démarrer</button>}
          {intervention.status !== 'completed' && intervention.status !== 'cancelled' && <button onClick={() => save({ status: 'completed' })} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white"><CheckCircle2 className="h-4 w-4" />Terminer</button>}
          <span className="rounded-full bg-secondary px-3 py-2 text-xs font-bold uppercase">{intervention.status}</span>
        </div>
      </div>
    </section>

    {message && <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">{message}</div>}

    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <h2 className="font-display text-lg font-bold">Compte rendu terrain</h2>
        <label className="block text-xs font-semibold text-muted-foreground">Durée en minutes<input type="number" min="0" value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground" /></label>
        <label className="block text-xs font-semibold text-muted-foreground">Observations<textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 min-h-28 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground" /></label>
        <label className="block text-xs font-semibold text-muted-foreground">Actions réalisées, une par ligne<textarea value={actions} onChange={(e) => setActions(e.target.value)} className="mt-1 min-h-28 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground" /></label>
        <label className="block text-xs font-semibold text-muted-foreground">Produits utilisés, un par ligne<textarea value={products} onChange={(e) => setProducts(e.target.value)} className="mt-1 min-h-24 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground" /></label>
        <button onClick={() => save()} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Enregistrer le rapport</button>
      </section>

      <div className="space-y-6">
        <section className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Camera className="h-5 w-5 text-gold" />Photos horodatées</h2>
          <p className="mt-1 text-xs text-muted-foreground">Jusqu’à 6 photos compressées pour le pilote Early Access.</p>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-4 py-2 text-xs font-semibold text-gold"><PlusIcon />Prendre ou ajouter une photo<input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => void addPhotos(e.target.files)} /></label>
          <div className="mt-4 grid grid-cols-2 gap-3">{photos.map((photo, index) => <div key={`${photo.capturedAt}-${index}`} className="relative overflow-hidden rounded-xl border border-border"><img src={photo.url} alt={`Terrain ${index + 1}`} className="aspect-video w-full object-cover" /><div className="flex items-center justify-between gap-2 p-2 text-[10px] text-muted-foreground"><span>{new Date(photo.capturedAt).toLocaleString('fr-FR')}</span><button onClick={() => setPhotos(photos.filter((_, i) => i !== index))} aria-label="Supprimer"><Trash2 className="h-3.5 w-3.5" /></button></div></div>)}</div>
        </section>

        {intervention.pool && <section className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><FlaskConical className="h-5 w-5 text-primary" />Analyse d’eau</h2>
          <div className="mt-4 grid grid-cols-2 gap-3"><TestField label="pH" value={test.ph} onChange={(v) => setTest({ ...test, ph: v })} /><TestField label="Chlore libre" value={test.freeChlorine} onChange={(v) => setTest({ ...test, freeChlorine: v })} /><TestField label="TAC" value={test.alkalinity} onChange={(v) => setTest({ ...test, alkalinity: v })} /><TestField label="Température" value={test.temperature} onChange={(v) => setTest({ ...test, temperature: v })} /></div>
          <button onClick={addWaterTest} disabled={saving} className="mt-3 rounded-full border border-primary/40 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary">Enregistrer l’analyse</button>
        </section>}
      </div>
    </div>
  </div>
}

function lines(value: string) { return value.split('\n').map((v) => v.trim()).filter(Boolean) }
function parseLabels(value?: string | null): string[] { if (!value) return []; try { const a = JSON.parse(value); return Array.isArray(a) ? a.map((v) => typeof v === 'string' ? v : v.label || v.name || JSON.stringify(v)) : [] } catch { return [] } }
function parsePhotos(value?: string | null): Photo[] { if (!value) return []; try { const a = JSON.parse(value); return Array.isArray(a) ? a.map((v) => typeof v === 'string' ? { url: v, capturedAt: new Date().toISOString() } : v).filter((v) => v.url) : [] } catch { return [] } }
function TestField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <label className="text-xs font-semibold text-muted-foreground">{label}<input type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background p-2 text-sm text-foreground" /></label> }
function PlusIcon() { return <Camera className="h-4 w-4" /> }

async function compressPhoto(file: File): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file) })
  const image = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = source })
  const scale = Math.min(1, 1280 / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale)
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.72)
}
