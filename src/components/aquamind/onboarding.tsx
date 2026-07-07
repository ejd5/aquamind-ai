'use client'

<<<<<<< HEAD
import { useEffect, useState } from 'react'
=======
import { useState } from 'react'
>>>>>>> main
import { Waves, Sparkles, ChevronLeft, ChevronRight, Check, Clock, Crosshair, MapPin, Loader2, Droplets, Thermometer, Users, Lock } from 'lucide-react'
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
import { SPA_SPECIFICS } from '@/lib/pool/spa-data'
<<<<<<< HEAD
import { getCountryList } from '@/lib/countries'
import { detectCountryConfig } from '@/lib/countries/detect'
=======
>>>>>>> main

interface OnboardingProps {
  onDone: () => void
}

type WaterBodyType = 'pool' | 'spa' | 'both'

const WATER_BODY_OPTIONS: { value: WaterBodyType; label: string; emoji: string }[] = [
  { value: 'pool', label: 'Piscine', emoji: '🏊' },
  { value: 'spa', label: 'Spa', emoji: '♨️' },
  { value: 'both', label: 'Les deux', emoji: '🌊' },
]

const SPA_TREATMENT_OPTIONS = [
  { value: 'bromine', label: 'Brome', desc: 'Recommandé pour spa. Stable en eau chaude, sans odeur.' },
  { value: 'active_oxygen', label: 'Oxygène actif', desc: 'Écologique, sans chlore. Idéal sous 35°C.' },
  { value: 'chlorine', label: 'Chlore (déconseillé)', desc: 'S\'évapore vite en eau chaude, irritant.' },
]

const SPA_USAGE_LEVELS = [
  { value: 'low', label: 'Occasionnel', desc: '1-2x/semaine' },
  { value: 'medium', label: 'Régulier', desc: '3-4x/semaine' },
  { value: 'high', label: 'Intensif', desc: '5+/semaine' },
]

const STEPS = [
  { id: 1, label: 'Bassin', subtitle: 'Type et dimensions' },
  { id: 2, label: 'Traitement', subtitle: 'Méthode de désinfection' },
  { id: 3, label: 'Équipements', subtitle: 'Filtration & pompe' },
  { id: 4, label: 'Environnement', subtitle: 'Climat & usage' },
]

// Helper : le type de bassin sélectionné est-il un spa (ou les deux) ?
function isSpaFlow(type: WaterBodyType): boolean {
  return type === 'spa' || type === 'both'
}

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
    waterBodyType: 'pool' as WaterBodyType,
    volume: '40',
    unit: 'm3',
    shape: 'rectangular',
    surfaceType: 'liner',
    treatmentType: 'chlorine',
    saltSystem: false,
    filterType: 'sand',
    pumpType: '',
    region: '', // ville saisie ou "lat,lon" — vide = géoloc IP à la prochaine requête
<<<<<<< HEAD
    country: 'FR', // code ISO 3166-1 alpha-2 — utilisé pour les normes eau locales
=======
>>>>>>> main
    sunExposure: 'medium',
    covered: false,
    usageLevel: 'medium',
    // Champs spécifiques au spa (Premium+)
    spaSeats: 4,
    spaTemperature: 37,
    spaUsageFrequency: 'medium',
    spaBrand: '',
  })

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // Bascule Piscine ↔ Spa : adapte le volume par défaut, le traitement par défaut,
  // et le nom proposé.
  function selectWaterBodyType(type: WaterBodyType) {
    if (type === 'spa' || type === 'both') {
      setForm((f) => ({
        ...f,
        waterBodyType: type,
        volume: f.volume === '40' || Number(f.volume) > 10 ? '1.5' : f.volume,
        name: f.name === 'Ma piscine' ? 'Mon spa' : f.name,
        treatmentType: f.treatmentType === 'chlorine' ? 'bromine' : f.treatmentType,
      }))
    } else {
      setForm((f) => ({
        ...f,
        waterBodyType: type,
        volume: Number(f.volume) < 5 ? '40' : f.volume,
        name: f.name === 'Mon spa' ? 'Ma piscine' : f.name,
      }))
    }
  }

<<<<<<< HEAD
  // Détection automatique du pays au montage du composant.
  // On lance la cascade (profile → IP → navigateur → défaut FR) en arrière-plan
  // et on pré-remplit le champ `country` si l'utilisateur n'a pas déjà choisi.
  useEffect(() => {
    let cancelled = false
    detectCountryConfig()
      .then((detected) => {
        if (cancelled) return
        setForm((f) => (f.country ? f : { ...f, country: detected.config.code }))
      })
      .catch(() => {
        // Silently ignore — the user can still pick a country manually.
      })
    return () => {
      cancelled = true
    }
  }, [])

=======
>>>>>>> main
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
        toast({ title: 'Nom requis', description: 'Donnez un nom à votre bassin.', variant: 'destructive' })
        return
      }
      if (!v || v <= 0) {
        toast({ title: 'Volume invalide', description: 'Entrez un volume positif.', variant: 'destructive' })
        return
      }
      if (isSpaFlow(form.waterBodyType) && v > 10) {
        toast({ title: 'Volume spa ?', description: 'Volume élevé pour un spa (généralement 0,8 à 3 m³). Vérifiez l\'unité.', variant: 'destructive' })
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
        country: form.country,
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
          country: 'FR',
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
        style={{ width: 320, height: 320, bottom: -80, right: -60, background: 'oklch(0.65 0.11 195)', animationDelay: '-8s' }}
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
            Décrivez votre piscine ou spa pour activer le copilote : conseils personnalisés, dosages
            exacts, plans d&apos;action ordonnés et alertes sécurité.
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
              {/* Toggle Piscine / Spa / Les deux — tout en haut de l'étape 1 */}
              <div className="space-y-1.5">
                <Label>Je gère une :</Label>
                <div className="grid grid-cols-3 gap-2">
                  {WATER_BODY_OPTIONS.map((opt) => {
                    const active = form.waterBodyType === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => selectWaterBodyType(opt.value)}
                        className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-xs font-semibold transition-all ${
                          active
                            ? 'border-gold/60 bg-gold/10 text-gold shadow-sm'
                            : 'border-border bg-background hover:border-gold/30'
                        }`}
                      >
                        <span className="text-xl" aria-hidden="true">
                          {opt.emoji}
                        </span>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
                {isSpaFlow(form.waterBodyType) && (
                  <div className="mt-1 flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/5 p-2.5 text-[11px] text-gold-foreground">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                    <span>
                      <strong className="text-gold">Support Spa Premium.</strong> La configuration
                      du spa est enregistrée mais les recommandations spa avancées (brome, vidange,
                      programmes pompe) nécessitent le plan <span className="text-gold">Premium</span>.
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">
                  {isSpaFlow(form.waterBodyType) ? 'Nom du spa' : 'Nom de la piscine'}
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder={isSpaFlow(form.waterBodyType) ? 'Ex : Spa de la terrasse' : 'Ex : Piscine du jardin'}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="volume">
                    Volume {isSpaFlow(form.waterBodyType) && (
                      <span className="text-[10px] font-normal text-muted-foreground">
                        ({SPA_SPECIFICS.volumeRange.min}-{SPA_SPECIFICS.volumeRange.max} {SPA_SPECIFICS.volumeRange.unit})
                      </span>
                    )}
                  </Label>
                  <Input
                    id="volume"
                    type="number"
                    min={isSpaFlow(form.waterBodyType) ? '0.1' : '1'}
                    step={isSpaFlow(form.waterBodyType) ? '0.1' : '1'}
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

              {/* Champs spécifiques au spa : places, température, fréquence d'usage */}
              {isSpaFlow(form.waterBodyType) && (
                <div className="space-y-3 rounded-xl border border-gold/20 bg-gold/[0.04] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">
                    ♨️ Détails du spa
                  </p>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <Users className="h-3.5 w-3.5 text-gold" />
                      {SPA_SPECIFICS.seatsRange.label} : <strong className="text-gold">{form.spaSeats}</strong>
                    </Label>
                    <input
                      type="range"
                      min={SPA_SPECIFICS.seatsRange.min}
                      max={SPA_SPECIFICS.seatsRange.max}
                      step={1}
                      value={form.spaSeats}
                      onChange={(e) => update('spaSeats', Number(e.target.value))}
                      className="w-full accent-[oklch(0.45_0.12_195)]"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{SPA_SPECIFICS.seatsRange.min} places</span>
                      <span>{SPA_SPECIFICS.seatsRange.max} places</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <Thermometer className="h-3.5 w-3.5 text-gold" />
                      Température cible : <strong className="text-gold">{form.spaTemperature}°C</strong>
                    </Label>
                    <input
                      type="range"
                      min={SPA_SPECIFICS.temperatureRange.min}
                      max={SPA_SPECIFICS.temperatureRange.max}
                      step={1}
                      value={form.spaTemperature}
                      onChange={(e) => update('spaTemperature', Number(e.target.value))}
                      className="w-full accent-[oklch(0.45_0.12_195)]"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{SPA_SPECIFICS.temperatureRange.min}°C</span>
                      <span>Idéal : {SPA_SPECIFICS.temperatureRange.ideal}°C</span>
                      <span>{SPA_SPECIFICS.temperatureRange.max}°C</span>
                    </div>
                    {form.spaTemperature > 38 && (
                      <p className="text-[11px] text-red-500">
                        ⚠️ Au-delà de 38°C, limitez les sessions à 15-20 min (risque cardiovasculaire).
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <Droplets className="h-3.5 w-3.5 text-gold" />
                      Fréquence d&apos;usage
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {SPA_USAGE_LEVELS.map((u) => (
                        <button
                          key={u.value}
                          type="button"
                          onClick={() => update('spaUsageFrequency', u.value)}
                          className={`flex flex-col items-center rounded-lg border px-2 py-2 text-center transition-all ${
                            form.spaUsageFrequency === u.value
                              ? 'border-gold/60 bg-gold/10 shadow-sm'
                              : 'border-border bg-background hover:border-gold/30'
                          }`}
                        >
                          <span className={`text-xs font-semibold ${form.spaUsageFrequency === u.value ? 'text-gold' : ''}`}>
                            {u.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{u.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!isSpaFlow(form.waterBodyType) && (
                <>
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
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <Label>
                Méthode de traitement
                {isSpaFlow(form.waterBodyType) && (
                  <span className="ml-2 text-[10px] font-normal text-gold">♨️ Mode spa</span>
                )}
              </Label>

              {isSpaFlow(form.waterBodyType) ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {SPA_TREATMENT_OPTIONS.map((t) => {
                      const isChlorine = t.value === 'chlorine'
                      return (
                        <button
                          key={t.value}
                          onClick={() => update('treatmentType', t.value)}
                          className={`flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-all ${
                            form.treatmentType === t.value
                              ? 'border-gold/60 bg-gold/10 shadow-sm'
                              : isChlorine
                                ? 'border-red-300/50 bg-red-500/5 hover:border-red-400/60'
                                : 'border-border bg-background hover:border-gold/30'
                          }`}
                        >
                          <span className={`text-sm font-semibold ${
                            form.treatmentType === t.value
                              ? 'text-gold'
                              : isChlorine
                                ? 'text-red-500'
                                : ''
                          }`}>
                            {t.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{t.desc}</span>
                        </button>
                      )
                    })}
                  </div>

                  {form.treatmentType === 'chlorine' && (
                    <div className="rounded-lg border border-red-400/40 bg-red-500/5 p-3 text-xs text-red-700 dark:text-red-300">
                      <strong className="text-red-600 dark:text-red-400">⚠️ Chlore déconseillé en spa.</strong>{' '}
                      À haute température, le chlore s'évapore rapidement, forme des chloramines
                      irritantes et sent fort. AQWELIA recommande vivement le brome pour les spas.
                    </div>
                  )}

                  {form.treatmentType === 'bromine' && (
                    <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs text-gold-foreground">
                      <Sparkles className="mb-1 inline h-3.5 w-3.5 text-gold" />{' '}
                      <strong className="text-gold">Brome activé.</strong> AQWELIA adaptera ses
                      recommandations pour l'eau chaude et surveillera le taux de brome (3-5 mg/L).
                    </div>
                  )}

                  {form.treatmentType === 'active_oxygen' && (
                    <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs text-gold-foreground">
                      <Sparkles className="mb-1 inline h-3.5 w-3.5 text-gold" />{' '}
                      <strong className="text-gold">Oxygène actif activé.</strong> Écologique et
                      sans odeur. Surveillez la température : moins efficace au-delà de 35°C.
                    </div>
                  )}
                </>
              ) : (
                <>
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
                </>
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
<<<<<<< HEAD
              {/* Pays — détermine les normes eau locales (pH, chlore, brome…) */}
              <div className="space-y-1.5">
                <Label htmlFor="country">📍 Pays</Label>
                <select
                  id="country"
                  value={form.country}
                  onChange={(e) => update('country', e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {getCountryList().map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Détecté automatiquement. Détermine les normes qualité d'eau et les boutiques partenaires.
                </p>
              </div>

              {/* Localisation pour la météo : GPS + saisie manuelle */}
              <div className="space-y-1.5">
=======
              {/* Localisation pour la météo : GPS + saisie manuelle */}
              <div className="space-y-1.5">
>>>>>>> main
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
