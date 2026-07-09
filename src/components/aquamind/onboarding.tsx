'use client'

import { useState } from 'react'
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
import { useTranslations } from 'next-intl'

interface OnboardingProps {
  onDone: () => void
  /** When true, the onboarding is used to ADD a new pool (not the first one).
   *  Copy adapts: header reads "Ajouter une piscine", cancel button visible. */
  addMode?: boolean
  /** Shown only in addMode — aborts the flow. */
  onCancel?: () => void
}

type WaterBodyType = 'pool' | 'spa' | 'both'

// Helper : le type de bassin sélectionné est-il un spa (ou les deux) ?
function isSpaFlow(type: WaterBodyType): boolean {
  return type === 'spa' || type === 'both'
}

// Régions climatiques supprimées : on utilise désormais la géolocalisation GPS
// ou la saisie manuelle d'une ville (stockée dans profile.region).

export function Onboarding({ onDone, addMode, onCancel }: OnboardingProps) {
  const t = useTranslations('onboarding')
  const tc = useTranslations('common')
  const tp = useTranslations('pool')
  const tspa = useTranslations('spa')
  const tspaData = useTranslations('spaData')
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [form, setForm] = useState({
    name: t('defaultPoolName'),
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
    sunExposure: 'medium',
    covered: false,
    usageLevel: 'medium',
    // Champs spécifiques au spa (Premium+)
    spaSeats: 4,
    spaTemperature: 37,
    spaUsageFrequency: 'medium',
    spaBrand: '',
  })

  // Listes d'options localisées (dépendent de t() donc déclarées dans le composant)
  const WATER_BODY_OPTIONS: { value: WaterBodyType; label: string; emoji: string }[] = [
    { value: 'pool', label: t('pool'), emoji: '🏊' },
    { value: 'spa', label: t('spa'), emoji: '♨️' },
    { value: 'both', label: t('both'), emoji: '🌊' },
  ]

  const SPA_TREATMENT_OPTIONS = [
    { value: 'bromine', label: t('spaTreatmentBromine'), desc: t('spaTreatmentBromineDesc') },
    { value: 'active_oxygen', label: t('spaTreatmentOxygen'), desc: t('spaTreatmentOxygenDesc') },
    { value: 'chlorine', label: t('spaTreatmentChlorine'), desc: t('spaTreatmentChlorineDesc') },
  ]

  const SPA_USAGE_LEVELS = [
    { value: 'low', label: t('spaUsageLow'), desc: t('spaUsageLowDesc') },
    { value: 'medium', label: t('spaUsageMedium'), desc: t('spaUsageMediumDesc') },
    { value: 'high', label: t('spaUsageHigh'), desc: t('spaUsageHighDesc') },
  ]

  const STEPS = [
    { id: 1, label: t('step1Label'), subtitle: t('step1Subtitle') },
    { id: 2, label: t('step2Label'), subtitle: t('step2Subtitle') },
    { id: 3, label: t('step3Label'), subtitle: t('step3Subtitle') },
    { id: 4, label: t('step4Label'), subtitle: t('step4Subtitle') },
  ]

  const SHAPES = [
    { value: 'rectangular', label: t('shapeRectangular') },
    { value: 'round', label: t('shapeRound') },
    { value: 'oval', label: t('shapeOval') },
    { value: 'free', label: t('shapeFree') },
  ]

  const SURFACES = [
    { value: 'liner', label: t('surfaceLiner') },
    { value: 'shell', label: t('surfaceShell') },
    { value: 'concrete', label: t('surfaceConcrete') },
    { value: 'tile', label: t('surfaceTile') },
  ]

  const TREATMENTS = [
    { value: 'chlorine', label: t('treatmentChlorine'), desc: t('treatmentChlorineDesc') },
    { value: 'salt', label: t('treatmentSalt'), desc: t('treatmentSaltDesc') },
    { value: 'bromine', label: t('treatmentBromine'), desc: t('treatmentBromineDesc') },
    { value: 'active_oxygen', label: t('treatmentOxygen'), desc: t('treatmentOxygenDesc') },
    { value: 'uv', label: t('treatmentUV'), desc: t('treatmentUVDesc') },
    { value: 'other', label: t('treatmentOther'), desc: t('treatmentOtherDesc') },
  ]

  const FILTERS = [
    { value: 'sand', label: t('filterSand') },
    { value: 'cartridge', label: t('filterCartridge') },
    { value: 'glass', label: t('filterGlass') },
    { value: 'diatom', label: t('filterDiatom') },
  ]

  const SUN_EXPOSURES = [
    { value: 'low', label: t('sunLow') },
    { value: 'medium', label: t('sunMedium') },
    { value: 'high', label: t('sunHigh') },
  ]

  const USAGE_LEVELS = [
    { value: 'low', label: t('usageLow') },
    { value: 'medium', label: t('usageMedium') },
    { value: 'high', label: t('usageHigh') },
  ]

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // Bascule Piscine ↔ Spa : adapte le volume par défaut, le traitement par défaut,
  // et le nom proposé.
  function selectWaterBodyType(type: WaterBodyType) {
    const defaultPoolName = t('defaultPoolName')
    const defaultSpaName = t('defaultSpaName')
    if (type === 'spa' || type === 'both') {
      setForm((f) => ({
        ...f,
        waterBodyType: type,
        volume: f.volume === '40' || Number(f.volume) > 10 ? '1.5' : f.volume,
        name: f.name === defaultPoolName ? defaultSpaName : f.name,
        treatmentType: f.treatmentType === 'chlorine' ? 'bromine' : f.treatmentType,
      }))
    } else {
      setForm((f) => ({
        ...f,
        waterBodyType: type,
        volume: Number(f.volume) < 5 ? '40' : f.volume,
        name: f.name === defaultSpaName ? defaultPoolName : f.name,
      }))
    }
  }

  // Géolocalisation GPS navigateur (ou Capacitor sur mobile)
  function handleGeolocate() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast({
        title: t('geolocUnsupportedTitle'),
        description: t('geolocUnsupportedDesc'),
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
          title: t('locationDetectedTitle'),
          description: t('locationDetectedDesc'),
        })
      },
      (err) => {
        setLocating(false)
        const msg = err.code === err.PERMISSION_DENIED
          ? t('locationDeniedDesc1')
          : t('locationDeniedDesc2')
        toast({
          title: t('locationDeniedTitle'),
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
        toast({ title: t('nameRequiredTitle'), description: t('nameRequiredDesc'), variant: 'destructive' })
        return
      }
      if (!v || v <= 0) {
        toast({ title: t('volumeInvalidTitle'), description: t('volumeInvalidDesc'), variant: 'destructive' })
        return
      }
      if (isSpaFlow(form.waterBodyType) && v > 10) {
        toast({ title: t('volumeSpaTitle'), description: t('volumeSpaDesc'), variant: 'destructive' })
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
      if (!res.ok) throw new Error(data.error || t('errorTitle'))
      toast({ title: t('profileCreatedTitle'), description: t('profileCreatedDesc') })
      onDone()
    } catch (e) {
      toast({
        title: t('errorTitle'),
        description: e instanceof Error ? e.message : t('cannotSave'),
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
          name: t('defaultPoolName'),
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
      if (!res.ok) throw new Error(t('errorTitle'))
      toast({ title: t('defaultProfileCreatedTitle'), description: t('defaultProfileCreatedDesc') })
      onDone()
    } catch {
      toast({ title: t('errorTitle'), description: t('cannotCreateDefault'), variant: 'destructive' })
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
            {t('configurationTime')}
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {t('welcomePrefix')} <span className="gradient-text-premium">AQWELIA</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>

        {/* Glass card */}
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          {/* Stepper */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {t('stepOf', { step })}
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
                <Label>{t('poolType')}</Label>
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
                      <strong className="text-gold">{t('spaPremiumLead')}</strong>{' '}
                      {t('spaPremiumBody')} <span className="text-gold">Premium</span>.
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">
                  {isSpaFlow(form.waterBodyType) ? t('spaName') : t('poolName')}
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder={isSpaFlow(form.waterBodyType) ? t('spaNamePlaceholder') : t('poolNamePlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="volume">
                    {t('volume')} {isSpaFlow(form.waterBodyType) && (
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
                  <Label>{t('unit')}</Label>
                  <Select value={form.unit} onValueChange={(v) => update('unit', v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m3">{t('unitM3')}</SelectItem>
                      <SelectItem value="gal">{t('unitGal')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Champs spécifiques au spa : places, température, fréquence d'usage */}
              {isSpaFlow(form.waterBodyType) && (
                <div className="space-y-3 rounded-xl border border-gold/20 bg-gold/[0.04] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">
                    {t('spaDetailsTitle')}
                  </p>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <Users className="h-3.5 w-3.5 text-gold" />
                      {tspaData(SPA_SPECIFICS.seatsRange.labelKey)} : <strong className="text-gold">{form.spaSeats}</strong>
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
                      <span>{SPA_SPECIFICS.seatsRange.min} {t('placesSuffix')}</span>
                      <span>{SPA_SPECIFICS.seatsRange.max} {t('placesSuffix')}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <Thermometer className="h-3.5 w-3.5 text-gold" />
                      {tspa('temperature')} : <strong className="text-gold">{form.spaTemperature}°C</strong>
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
                      <span>{t('idealTemp')} {SPA_SPECIFICS.temperatureRange.ideal}°C</span>
                      <span>{SPA_SPECIFICS.temperatureRange.max}°C</span>
                    </div>
                    {form.spaTemperature > 38 && (
                      <p className="text-[11px] text-red-500">
                        {t('spaTempWarning')}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <Droplets className="h-3.5 w-3.5 text-gold" />
                      {tspa('usageFreq')}
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
                    <Label>{t('shape')}</Label>
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
                    <Label>{t('surface')}</Label>
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
                {t('methodTreatment')}
                {isSpaFlow(form.waterBodyType) && (
                  <span className="ml-2 text-[10px] font-normal text-gold">{t('spaMode')}</span>
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
                      {t('chlorineSpaWarning')}
                    </div>
                  )}

                  {form.treatmentType === 'bromine' && (
                    <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs text-gold-foreground">
                      <Sparkles className="mb-1 inline h-3.5 w-3.5 text-gold" />{' '}
                      <strong className="text-gold">{t('bromineSpaActivated')}</strong> {t('bromineSpaActivatedDesc')}
                    </div>
                  )}

                  {form.treatmentType === 'active_oxygen' && (
                    <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs text-gold-foreground">
                      <Sparkles className="mb-1 inline h-3.5 w-3.5 text-gold" />{' '}
                      <strong className="text-gold">{t('oxygenSpaActivated')}</strong> {t('oxygenSpaActivatedDesc')}
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
                      <strong className="text-gold">{t('saltActivated')}</strong> {t('saltActivatedDesc')}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t('filterType')}</Label>
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
                <Label htmlFor="pump">{t('pumpLabel')}</Label>
                <Input
                  id="pump"
                  value={form.pumpType}
                  onChange={(e) => update('pumpType', e.target.value)}
                  placeholder={t('pumpPlaceholder')}
                />
              </div>

              <div className="rounded-lg border border-border/60 bg-secondary/40 p-3 text-xs text-muted-foreground">
                {t('filterNote')}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              {/* Localisation pour la météo : GPS + saisie manuelle */}
              <div className="space-y-1.5">
                <Label>{t('cityLabel')}</Label>
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
                    {locating ? t('locating') : t('locateMeBtn')}
                  </Button>
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      placeholder={t('cityPlaceholder')}
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
                  {t('cityNote')}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>{t('sunExposure')}</Label>
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
                <Label>{t('usageLabel')}</Label>
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
                  <p className="text-sm font-medium">{t('covered')}</p>
                  <p className="text-[11px] text-muted-foreground">{t('coveredDesc')}</p>
                </div>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between gap-2">
            {addMode && step === 1 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={saving}
                className="text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                {tc('cancel')}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={back}
                disabled={step === 1 || saving}
                className="text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                {tc('back')}
              </Button>
            )}

            <div className="flex items-center gap-2">
              {!addMode && (
                <button
                  onClick={skip}
                  disabled={saving}
                  className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
                >
                  {tc('skip')}
                </button>
              )}

              {step < 4 ? (
                <Button
                  onClick={next}
                  className="bg-gradient-to-r from-primary to-gold text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                >
                  {tc('next')}
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
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {addMode ? tp('addPoolActivate') : t('activate')}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          {t('bottomNote')}
        </p>
      </div>
    </div>
  )
}
