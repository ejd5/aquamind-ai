'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Siren,
  Waves,
  CloudRain,
  Plane,
  Wind,
  Eye,
  Sparkles,
  Droplet,
  Beaker,
  Gauge,
  Snowflake,
  Power,
  X,
  ArrowRight,
  Camera,
  FlaskConical,
  MessageSquare,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { TabId } from './app-shell'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAskAssistant: (q: string) => void
  onNavigate: (tab: TabId) => void
}

type ScenarioId =
  | 'green_water'
  | 'cloudy_water'
  | 'after_storm'
  | 'back_from_vacation'
  | 'chlorine_smell'
  | 'stinging_eyes'
  | 'wall_algae'
  | 'unstable_ph'
  | 'zero_chlorine'
  | 'too_much_chlorine'
  | 'filter_high_pressure'
  | 'electrolyzer_error'
  | 'startup'
  | 'winterizing'

interface Emergency {
  id: ScenarioId
  label: string
  icon: typeof Siren
  color: string
  prompt: string
  checklist: { title: string; steps: string[]; photoHint?: string; measureHint?: string[] }
}

// Non-translatable metadata for each emergency scenario (icon, color, optional measureHint)
const SCENARIO_META: Record<ScenarioId, { icon: typeof Siren; color: string; measureHint?: string[]; hasPhotoHint?: boolean }> = {
  green_water: {
    icon: Waves,
    color: 'from-[oklch(0.55_0.18_155)] to-[oklch(0.4_0.13_155)]',
    measureHint: ['pH', 'freeChlorine', 'alkalinity', 'cyanuricAcid'],
    hasPhotoHint: true,
  },
  cloudy_water: {
    icon: Droplet,
    color: 'from-[oklch(0.7_0.05_195)] to-[oklch(0.55_0.1_195)]',
    measureHint: ['ph', 'freeChlorine', 'combinedChlorine', 'calciumHardness'],
    hasPhotoHint: true,
  },
  after_storm: {
    icon: CloudRain,
    color: 'from-[oklch(0.55_0.1_240)] to-[oklch(0.4_0.12_240)]',
    measureHint: ['ph', 'freeChlorine', 'alkalinity'],
    hasPhotoHint: true,
  },
  back_from_vacation: {
    icon: Plane,
    color: 'from-[oklch(0.65_0.1_60)] to-[oklch(0.5_0.12_60)]',
    measureHint: ['ph', 'freeChlorine', 'alkalinity', 'cyanuricAcid'],
    hasPhotoHint: true,
  },
  chlorine_smell: {
    icon: Wind,
    color: 'from-[oklch(0.55_0.10_195)] to-[oklch(0.45_0.10_200)]',
    measureHint: ['ph', 'freeChlorine', 'totalChlorine', 'combinedChlorine'],
  },
  stinging_eyes: {
    icon: Eye,
    color: 'from-[oklch(0.65_0.15_15)] to-[oklch(0.5_0.16_15)]',
    measureHint: ['ph', 'freeChlorine', 'totalChlorine', 'combinedChlorine'],
  },
  wall_algae: {
    icon: Sparkles,
    color: 'from-[oklch(0.55_0.18_155)] to-[oklch(0.4_0.13_155)]',
    measureHint: ['ph', 'freeChlorine', 'cyanuricAcid', 'phosphates'],
    hasPhotoHint: true,
  },
  unstable_ph: {
    icon: Beaker,
    color: 'from-[oklch(0.55_0.10_195)] to-[oklch(0.55_0.13_195)]',
    measureHint: ['ph', 'alkalinity', 'calciumHardness'],
  },
  zero_chlorine: {
    icon: Power,
    color: 'from-destructive to-[oklch(0.4_0.18_25)]',
    measureHint: ['ph', 'freeChlorine', 'cyanuricAcid'],
  },
  too_much_chlorine: {
    icon: Gauge,
    color: 'from-[oklch(0.7_0.16_60)] to-[oklch(0.55_0.18_40)]',
    measureHint: ['ph', 'freeChlorine', 'cyanuricAcid'],
  },
  filter_high_pressure: {
    icon: Gauge,
    color: 'from-[oklch(0.65_0.16_60)] to-[oklch(0.5_0.16_40)]',
    hasPhotoHint: true,
  },
  electrolyzer_error: {
    icon: Power,
    color: 'from-[oklch(0.65_0.16_30)] to-[oklch(0.5_0.16_25)]',
    measureHint: ['ph', 'salt'],
    hasPhotoHint: true,
  },
  startup: {
    icon: Power,
    color: 'from-[oklch(0.65_0.13_195)] to-[oklch(0.5_0.13_195)]',
    measureHint: ['ph', 'freeChlorine', 'alkalinity', 'cyanuricAcid', 'salt'],
  },
  winterizing: {
    icon: Snowflake,
    color: 'from-[oklch(0.7_0.06_240)] to-[oklch(0.5_0.08_240)]',
    measureHint: ['ph', 'freeChlorine', 'alkalinity', 'temperature'],
  },
}

const SCENARIO_IDS = Object.keys(SCENARIO_META) as ScenarioId[]

export function EmergencyMode({ open, onOpenChange, onAskAssistant, onNavigate }: Props) {
  const t = useTranslations('common')
  const [selectedId, setSelectedId] = useState<ScenarioId | null>(null)

  function buildEmergency(id: ScenarioId): Emergency {
    const meta = SCENARIO_META[id]
    const base = `emergency.scenarios.${id}`
    const steps = t.raw(`${base}.steps`) as string[]
    const checklist: Emergency['checklist'] = {
      title: t(`${base}.title`),
      steps,
    }
    if (meta.hasPhotoHint) {
      checklist.photoHint = t(`${base}.photoHint`)
    }
    if (meta.measureHint) {
      checklist.measureHint = meta.measureHint
    }
    return {
      id,
      label: t(`${base}.label`),
      icon: meta.icon,
      color: meta.color,
      prompt: t(`${base}.prompt`),
      checklist,
    }
  }

  function closeAll() {
    setSelectedId(null)
    onOpenChange(false)
  }

  function ask(em: Emergency) {
    onAskAssistant(em.prompt)
    closeAll()
  }

  const selected = selectedId ? buildEmergency(selectedId) : null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) closeAll(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {!selected ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display text-xl">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-destructive to-[oklch(0.4_0.18_25)] shadow-md shadow-destructive/30">
                  <Siren className="h-5 w-5 text-white" />
                </span>
                {t('emergency.title')}
              </DialogTitle>
              <DialogDescription>
                {t('emergency.subtitle')}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SCENARIO_IDS.map((id) => {
                const meta = SCENARIO_META[id]
                const Icon = meta.icon
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedId(id)}
                    className="group flex flex-col items-start gap-2 rounded-xl border border-border/50 bg-background/60 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-md"
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${meta.color} text-white shadow-sm`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-semibold leading-tight">{t(`emergency.scenarios.${id}.label`)}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/5 p-3 text-[11px] text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
              {t('emergency.disclaimer')}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display text-xl">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${selected.color} text-white shadow-md`}>
                  <selected.icon className="h-5 w-5" />
                </span>
                {selected.label}
              </DialogTitle>
              <DialogDescription>{selected.checklist.title}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Steps */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('emergency.protocol')}
                </p>
                <ol className="space-y-1.5">
                  {selected.checklist.steps.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-background/60 p-2.5 text-sm"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-[10px] font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Photo recommendation */}
              {selected.checklist.photoHint && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                    <Camera className="h-3.5 w-3.5" />
                    {t('emergency.photoRecommended')}
                  </p>
                  <p className="mt-1 text-xs text-foreground/80">{selected.checklist.photoHint}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      onNavigate('diagnostic')
                      closeAll()
                    }}
                  >
                    <Camera className="h-3.5 w-3.5" />
                    {t('emergency.goToDiagnostic')}
                  </Button>
                </div>
              )}

              {/* Measurements recommendation */}
              {selected.checklist.measureHint && selected.checklist.measureHint.length > 0 && (
                <div className="rounded-xl border border-gold/30 bg-gold/5 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gold">
                    <FlaskConical className="h-3.5 w-3.5" />
                    {t('emergency.measuresToEnter')}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selected.checklist.measureHint.map((m) => (
                      <span
                        key={m}
                        className="rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      onNavigate('water')
                      closeAll()
                    }}
                  >
                    <FlaskConical className="h-3.5 w-3.5" />
                    {t('emergency.enterMeasures')}
                  </Button>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 border-t border-border/40 pt-3">
                <Button
                  onClick={() => ask(selected)}
                  className="bg-gradient-to-r from-primary to-gold text-primary-foreground shadow-lg shadow-primary/20"
                >
                  <MessageSquare className="h-4 w-4" />
                  {t('emergency.goToAssistant')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => setSelectedId(null)}>
                  <X className="h-4 w-4" />
                  {t('back')}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
