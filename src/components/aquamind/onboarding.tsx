'use client'

import { useState } from 'react'
import { Waves, Sparkles, ChevronLeft, ChevronRight, Check, Clock, Crosshair, MapPin, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'

interface OnboardingProps {
  onDone: () => void
}

const STEPS = [
  { id: 1, label: 'Bassin', subtitle: 'Type et dimensions' },
  { id: 2, label: 'Traitement', subtitle: 'Méthode de désinfection' },
  { id: 3, label: 'Équipements', subtitle: 'Filtration & pompe' },
  { id: 4, label: 'Environnement', subtitle: 'Climat & usage' },
]

const SHAPES = [
  { value: 'rectangular', label: 'Rectangulaire' },
  { value: 'round', label: 'Ronde' },
  { value: 'oval', label: 'Ovale' },
  { value: 'free', label: 'Forme libre' },
]

const SURFACES = [
  { value: 'liner', label: 'Liner' },
  { value: 'shell', label: 'Coque polyester' },
  { value: 'concrete', label: 'Béton peint' },
  { value: 'tile', label: 'Carrelée' },
]

const TREATMENTS = [
  { value: 'chlorine', label: 'Chlore', desc: 'Le plus répandu, simple et économique.' },
  { value: 'salt', label: 'Électrolyse au sel', desc: 'Eau douce, moins d\'entretien chlore.' },
  { value: 'bromine', label: 'Brome', desc: 'Idéal eau chaude et spas.' },
  { value: 'active_oxygen', label: 'Oxygène actif', desc: 'Sans chlore, écologique.' },
  { value: 'uv', label: 'UV', desc: 'Désinfection complémentaire.' },
  { value: 'other', label: 'Autre', desc: 'Spécifique.' },
]

const FILTERS = [
  { value: 'sand', label: 'Sable' },
  { value: 'cartridge', label: 'Cartouche' },
  { value: 'glass', label: 'Verre' },
  { value: 'diatom', label: 'Diatomée' },
]

const SUN_EXPOSURES = [
  { value: 'low', label: 'Ombragée' },
  { value: 'medium', label: 'Ensoleillée' },
  { value: 'high', label: 'Très ensoleillée' },
]

const USAGE_LEVELS = [
  { value: 'low', label: 'Faible (1-2 pers.)' },
  { value: 'medium', label: 'Moyenne (famille)' },
  { value: 'high', label: 'Intensive (voisinage)' },
]

// Régions climatiques supprimées : on utilise désormais la géolocalisation GPS
// ou la saisie manuelle d'une ville (stockée dans profile.region).

export function Onboarding({ onDone }: OnboardingProps) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [form, setForm] = useState({
    name: 'Ma piscine',
    volume: '40',
    unit: 'm3',
    shape: 'rectangular',
    surfaceType: 'liner',
    treatmentType: 'chlorine',
    saltSystem: false,
    filterType: 'sand',
    pumpType: '',
    region: '', // ville saisie ou "lat,lon" — vide = géoloc IP à la prochaine requête
    sunExposure: 'medium',
    covered: false,
    usageLevel: 'medium',
  })

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // Géolocalisation GPS navigateur (ou Capacitor sur mobile)
  function handleGeolocate() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast({
        title: 'Géolocalisation non supportée',
        description: 'Saisissez votre ville manuellement.',
        variant: 'destructive',
      })
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        update('region', `${latitude.toFixed(4)},${longitude.toFixed(4)}`)
        setLocating(false)
        toast({
          title: 'Position détectée',
          description: 'Votre ville sera utilisée pour la météo.',
        })
      },
      (err) => {
        setLocating(false)
        const msg = err.code === err.PERMISSION_DENIED
          ? 'Autorisez la géolocalisation ou saisissez votre ville manuellement.'
          : 'Impossible de récupérer votre position. Saisissez votre ville.'
        toast({
          title: 'Localisation refusée',
          description: msg,
          variant: 'destructive',
        })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  function next() {
    if (step === 1) {
      const v = Number(form.volume)
      if (!form.name.trim()) {
        toast({ title: 'Nom requis', description: 'Donnez un nom à votre piscine.', variant: 'destructive' })
        return
      }
      if (!v || v <= 0) {
        toast({ title: 'Volume invalide', description: 'Entrez un volume positif.', variant: 'destructive' })
        return
      }
    }
    setStep((s) => Math.min(4, s + 1))
  }

  function back() {
    setStep((s) => Math.max(1, s - 1))
  }

  async function save() {
    setSaving(true)
    try {
      const body = {
        ...form,
        volume: Number(form.volume),
        saltSystem: form.treatmentType === 'salt' || form.saltSystem,
      }
      const res = await fetch('/api/pool/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      toast({ title: 'Profil créé !', description: 'Bienvenue dans AQWELIA. 🌊' })
      onDone()
    } catch (e) {
      toast({
        title: 'Erreur',
        description: e instanceof Error ? e.message : 'Impossible de sauvegarder',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function skip() {
    setSaving(true)
    try {
      const res = await fetch('/api/pool/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ma piscine',
          volume: 40,
          unit: 'm3',
          shape: 'rectangular',
          surfaceType: 'liner',
          treatmentType: 'chlorine',
          filterType: 'sand',
          saltSystem: false,
          sunExposure: 'medium',
          usageLevel: 'medium',
          covered: false,
        }),
      })
      if (!res.ok) throw new Error('Erreur')
      toast({ title: 'Profil par défaut créé', description: 'Vous pourrez le modifier plus tard.' })
      onDone()
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de créer le profil par défaut', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const progress = (step / 4) * 100

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Aurora background */}
      <div className="aurora-bg pointer-events-none absolute inset-0" />
      <div
        className="aurora-orb"
        style={{ width: 380, height: 380, top: -100, left: -80, background: 'oklch(0.55 0.13 195)' }}
      />
      <div
        className="aurora-orb"
        style={{ width: 320, height: 320, bottom: -80, right: -60, background: 'oklch(0.75 0.13 85)', animationDelay: '-8s' }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            <Clock className="h-3 w-3" />
            Configuration en 2 minutes
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Bienvenue sur <span className="gradient-text-premium">AQWELIA</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Décrivez votre piscine pour activer le copilote : conseils personnalisés, dosages exacts,
            plans d'action ordonnés et alertes sécurité.
          </p>
        </div>

        {/* Glass card */}
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          {/* Stepper */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Étape {step} / 4
              </span>
              <span className="font-display text-sm font-bold text-gold">{STEPS[step - 1].label}</span>
            </div>
            <Progress value={progress} className="h-1.5 bg-primary/10" />
            <p className="mt-2 text-xs text-muted-foreground">{STEPS[step - 1].subtitle}</p>
          </div>

          {/* Step content */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nom de la piscine</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="Ex : Piscine du jardin"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="volume">Volume</Label>
                  <Input
                    id="volume"
                    type="number"
                    min="1"
                    step="1"
                    value={form.volume}
                    onChange={(e) => update('volume', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Unité</Label>
                  <Select value={form.unit} onValueChange={(v) => update('unit', v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m3">m³ (litres ÷ 1000)</SelectItem>
                      <SelectItem value="gal">gallons</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Forme</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SHAPES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => update('shape', s.value)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        form.shape === s.value
                          ? 'border-gold/60 bg-gold/10 text-gold shadow-sm'
                          : 'border-border bg-background hover:border-gold/30'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Revêtement</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SURFACES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => update('surfaceType', s.value)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        form.surfaceType === s.value
                          ? 'border-gold/60 bg-gold/10 text-gold shadow-sm'
                          : 'border-border bg-background hover:border-gold/30'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <Label>Méthode de traitement</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {TREATMENTS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => {
                      update('treatmentType', t.value)
                      update('saltSystem', t.value === 'salt')
                    }}
                    className={`flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-all ${
                      form.treatmentType === t.value
                        ? 'border-gold/60 bg-gold/10 shadow-sm'
                        : 'border-border bg-background hover:border-gold/30'
                    }`}
                  >
                    <span className={`text-sm font-semibold ${form.treatmentType === t.value ? 'text-gold' : ''}`}>
                      {t.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{t.desc}</span>
                  </button>
                ))}
              </div>

              {form.treatmentType === 'salt' && (
                <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs text-gold-foreground">
                  <Sparkles className="mb-1 inline h-3.5 w-3.5 text-gold" />{' '}
                  <strong className="text-gold">Électrolyse au sel activée.</strong> AQWELIA
                  surveillera le niveau de sel pour votre électrolyseur.
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Type de filtre</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => update('filterType', f.value)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        form.filterType === f.value
                          ? 'border-gold/60 bg-gold/10 text-gold shadow-sm'
                          : 'border-border bg-background hover:border-gold/30'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pump">Pompe (marque / modèle — optionnel)</Label>
                <Input
                  id="pump"
                  value={form.pumpType}
                  onChange={(e) => update('pumpType', e.target.value)}
                  placeholder="Ex : Pentair Superflo 0.75 CV"
                />
              </div>

              <div className="rounded-lg border border-border/60 bg-secondary/40 p-3 text-xs text-muted-foreground">
                Ces informations permettent à AQWELIA de calculer la durée de filtration recommandée
                et de programmer les rappels d'entretien (lavage de filtre, etc.).
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              {/* Localisation pour la météo : GPS + saisie manuelle */}
              <div className="space-y-1.5">
                <Label>Votre ville (pour la météo)</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    onClick={handleGeolocate}
                    variant="outline"
                    size="sm"
                    disabled={locating}
                    className="border-gold/40 text-gold hover:bg-gold/10"
                  >
                    {locating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Crosshair className="h-4 w-4" />
                    )}
                    {locating ? 'Localisation…' : 'Me localiser'}
                  </Button>
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      placeholder="Ex : Marseille, Lyon…"
                      value={form.region}
                      onChange={(e) => update('region', e.target.value)}
                      className="h-9"
                      disabled={locating}
                    />
                    {form.region && (
                      <MapPin className="h-4 w-4 shrink-0 text-gold" />
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Optionnel : si vous laissez vide, AQWELIA utilisera la géolocalisation par IP ou vous demandera plus tard.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Ensoleillement</Label>
                <div className="grid grid-cols-3 gap-2">
                  {SUN_EXPOSURES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => update('sunExposure', s.value)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        form.sunExposure === s.value
                          ? 'border-gold/60 bg-gold/10 text-gold shadow-sm'
                          : 'border-border bg-background hover:border-gold/30'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Usage</Label>
                <div className="grid grid-cols-3 gap-2">
                  {USAGE_LEVELS.map((u) => (
                    <button
                      key={u.value}
                      onClick={() => update('usageLevel', u.value)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        form.usageLevel === u.value
                          ? 'border-gold/60 bg-gold/10 text-gold shadow-sm'
                          : 'border-border bg-background hover:border-gold/30'
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background p-3">
                <input
                  type="checkbox"
                  checked={form.covered}
                  onChange={(e) => update('covered', e.target.checked)}
                  className="h-4 w-4 accent-[oklch(0.45_0.12_195)]"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">Piscine couverte / abritée</p>
                  <p className="text-[11px] text-muted-foreground">Moins de débris, moins d'évaporation.</p>
                </div>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={back}
              disabled={step === 1 || saving}
              className="text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Retour
            </Button>

            <div className="flex items-center gap-2">
              <button
                onClick={skip}
                disabled={saving}
                className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
              >
                Passer
              </button>

              {step < 4 ? (
                <Button
                  onClick={next}
                  className="bg-gradient-to-r from-primary to-gold text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                >
                  Continuer
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={save}
                  disabled={saving}
                  className="bg-gradient-to-r from-primary to-gold text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                >
                  {saving ? (
                    <>
                      <Waves className="h-4 w-4 animate-pulse" />
                      Sauvegarde…
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Activer AQWELIA
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Vos données restent sur votre appareil. Vous pourrez tout modifier plus tard.
        </p>
      </div>
    </div>
  )
}
