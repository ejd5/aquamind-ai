'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Droplets, Loader2, Check, Lock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { api } from '@/lib/api-client'
import { buildPoolProfilePatchBody, parseConfirmedFields } from '@/lib/pool/onboarding-form'
import { SPA_SPECIFICS, SPA_BRANDS } from '@/lib/pool/spa-data'

interface PoolProfileData {
  id: string
  name: string
  volume: number
  unit: string
  shape: string
  surfaceType: string
  treatmentType: string
  saltSystem: boolean
  filterType: string
  pumpType: string | null
  region: string | null
  sunExposure: string
  covered: boolean
  usageLevel: string
  waterBodyType: string
  spaSeats: number | null
  spaTempTarget: number | null
  spaUsageFreq: string | null
  spaBrand: string | null
  confirmedFields?: string | null
}

interface PoolProfileEditorDialogProps {
  open: boolean
  poolId: string | null
  onOpenChange: (open: boolean) => void
  /** Called after a successful PATCH (parent should refetch its profile). */
  onSaved?: () => void
}

/**
 * Reusable "fiche bassin" editor.
 *
 * Loads a PoolProfile by id and lets the user edit every business field
 * (name, volume, unit, shape, surface, treatment, salt system, filtration,
 * pump, region, sun exposure, usage, cover). Persists via PATCH
 * /api/pool/profile?id=… — the server re-validates ownership + enums.
 *
 * Used from:
 *   - desktop header pool pill (single pool → open the pool profile)
 *   - /settings
 *   - mobile Profil screen
 */
export function PoolProfileEditorDialog({
  open,
  poolId,
  onOpenChange,
  onSaved,
}: PoolProfileEditorDialogProps) {
  const t = useTranslations('onboarding')
  const tp = useTranslations('pool')
  const tc = useTranslations('common')
  const tspa = useTranslations('spa')
  const tspaData = useTranslations('spaData')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<PoolProfileData | null>(null)
  // P0-1 (Round 3): the editor must NEVER turn old technical DB defaults into
  // confirmed user choices. `confirmed` = fields the user explicitly validated
  // in the past; `dirty` = fields actually touched in THIS session. Only dirty
  // fields are PATCHed, so untouched/unconfirmed values stay unconfirmed.
  const [confirmed, setConfirmed] = useState<ReadonlySet<string>>(new Set())
  const [dirty, setDirty] = useState<ReadonlySet<string>>(new Set())
  // spa entitlement — the editor must not offer spa/both to users without it.
  const [spaAllowed, setSpaAllowed] = useState(false)

  const SPA_USAGE_LEVELS = [
    { value: 'low', label: t('spaUsageLow'), desc: t('spaUsageLowDesc') },
    { value: 'medium', label: t('spaUsageMedium'), desc: t('spaUsageMediumDesc') },
    { value: 'high', label: t('spaUsageHigh'), desc: t('spaUsageHighDesc') },
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
    { value: 'chlorine', label: t('treatmentChlorine') },
    { value: 'salt', label: t('treatmentSalt') },
    { value: 'bromine', label: t('treatmentBromine') },
    { value: 'active_oxygen', label: t('treatmentOxygen') },
    { value: 'uv', label: t('treatmentUV') },
    { value: 'other', label: t('treatmentOther') },
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

  const load = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const [profileData, subData] = await Promise.all([
        api.get<{ profile: PoolProfileData | null }>(
          `/api/pool/profile?id=${encodeURIComponent(id)}`
        ),
        api.get<{ access?: { effectiveLimits?: { spaSupport?: boolean } } }>(
          '/api/subscription'
        ).catch(() => null),
      ])
      setProfile(profileData.profile)
      setConfirmed(new Set(parseConfirmedFields(profileData.profile ?? {})))
      setDirty(new Set())
      setSpaAllowed(!!subData?.access?.effectiveLimits?.spaSupport)
    } catch (e) {
      toast({
        title: t('errorTitle'),
        description: e instanceof Error ? e.message : t('cannotSave'),
        variant: 'destructive',
      })
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (open && poolId) void load(poolId)
  }, [open, poolId, load])

  const update = <K extends keyof PoolProfileData>(key: K, value: PoolProfileData[K]) => {
    setProfile((p) => (p ? { ...p, [key]: value } : p))
    setDirty((d) => new Set(d).add(key))
  }

  // A field is "actively set" when it was confirmed in the past OR the user
  // touched it during THIS session (dirty). Used ONLY for interactive display:
  // it keeps the locally typed/selected value visible without persisting
  // anything. Only `dirty` fields are ever PATCHed (buildPoolProfilePatchBody).
  const isActive = useCallback(
    (field: string) => confirmed.has(field) || dirty.has(field),
    [confirmed, dirty],
  )

  const handleSave = async () => {
    if (!profile) return
    // P0-1 (Round 3): PATCH ONLY the fields the user actually touched in this
    // session. An untouched unconfirmed technical default must never become a
    // confirmed user choice just because the user clicked Enregistrer.
    const body = buildPoolProfilePatchBody(profile as unknown as Record<string, unknown>, dirty)
    if (Object.keys(body).length === 0) {
      onOpenChange(false)
      return
    }
    setSaving(true)
    try {
      await api.patch(`/api/pool/profile?id=${encodeURIComponent(profile.id)}`, body)
      toast({ title: tp('poolUpdated') })
      onOpenChange(false)
      onSaved?.()
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

  const isSpa = profile?.waterBodyType === 'spa' || profile?.waterBodyType === 'both'
  const WATER_BODY_OPTIONS = [
    { value: 'pool', label: t('pool'), emoji: '🏊' },
    // spa/both are gated by entitlement — never offer to users without it.
    ...(spaAllowed
      ? [
          { value: 'spa' as const, label: t('spa'), emoji: '♨️' },
          { value: 'both' as const, label: t('both'), emoji: '🌊' },
        ]
      : []),
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-primary" />
            {tp('editPoolTitle')}
          </DialogTitle>
          <DialogDescription>{tp('editPoolDesc')}</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{tc('loading')}</p>
          </div>
        )}

        {!loading && !profile && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {t('errorTitle')}
          </div>
        )}

        {!loading && profile && (
          <div className="grid gap-4">
            {/* Water body type — spa/both only with entitlement (P1). */}
            <div className="space-y-1.5">
              <Label>{t('poolType')}</Label>
              <div className="grid grid-cols-3 gap-2">
                {WATER_BODY_OPTIONS.map((opt) => {
                  const active = isActive('waterBodyType') && profile.waterBodyType === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update('waterBodyType', opt.value)}
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
              {!isActive('waterBodyType') && (
                <p className="mt-1 text-[11px] text-muted-foreground">{t('notProvided')}</p>
              )}
              {!spaAllowed && (profile.waterBodyType === 'spa' || profile.waterBodyType === 'both') && (
                <div className="mt-1 flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/5 p-2.5 text-[11px] text-gold-foreground">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                  <span>
                    <strong className="text-gold">{t('spaPremiumLead')}</strong>{' '}
                    {t('spaPremiumBody')}
                  </span>
                </div>
              )}
              {!spaAllowed && !isSpa && (
                <p className="mt-1 text-[11px] text-muted-foreground">{t('editorSpaLocked')}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-pool-name">
                {isSpa ? t('spaName') : t('poolName')}
              </Label>
              <Input
                id="edit-pool-name"
                value={profile.name}
                placeholder={isActive('name') ? undefined : t('notProvided')}
                onChange={(e) => update('name', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-pool-volume">{t('volume')}</Label>
                <Input
                  id="edit-pool-volume"
                  type="number"
                  min="0.1"
                  step={isSpa ? '0.1' : '1'}
                  value={isActive('volume') ? profile.volume : ''}
                  placeholder={isActive('volume') ? undefined : t('notProvided')}
                  onChange={(e) => update('volume', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('unit')}</Label>
                <Select
                  value={isActive('unit') ? profile.unit : undefined}
                  onValueChange={(v) => update('unit', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('notProvided')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m3">{t('unitM3')}</SelectItem>
                    <SelectItem value="gal">{t('unitGal')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!isSpa && (
              <>
                <div className="space-y-1.5">
                  <Label>{t('shape')}</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {SHAPES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => update('shape', s.value)}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                          isActive('shape') && profile.shape === s.value
                            ? 'border-gold/60 bg-gold/10 text-gold shadow-sm'
                            : 'border-border bg-background hover:border-gold/30'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {!isActive('shape') && (
                    <p className="mt-1 text-[11px] text-muted-foreground">{t('notProvided')}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>{t('surface')}</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {SURFACES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => update('surfaceType', s.value)}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                          isActive('surfaceType') && profile.surfaceType === s.value
                            ? 'border-gold/60 bg-gold/10 text-gold shadow-sm'
                            : 'border-border bg-background hover:border-gold/30'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {!isActive('surfaceType') && (
                    <p className="mt-1 text-[11px] text-muted-foreground">{t('notProvided')}</p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label>{t('methodTreatment')}</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TREATMENTS.map((tr) => (
                  <button
                    key={tr.value}
                    type="button"
                    onClick={() => {
                      update('treatmentType', tr.value)
                      update('saltSystem', tr.value === 'salt')
                    }}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                      isActive('treatmentType') && profile.treatmentType === tr.value
                        ? 'border-gold/60 bg-gold/10 text-gold shadow-sm'
                        : 'border-border bg-background hover:border-gold/30'
                    }`}
                  >
                    {tr.label}
                  </button>
                ))}
              </div>
              {!isActive('treatmentType') && (
                <p className="mt-1 text-[11px] text-muted-foreground">{t('notProvided')}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>{t('filterType')}</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => update('filterType', f.value)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                      isActive('filterType') && profile.filterType === f.value
                        ? 'border-gold/60 bg-gold/10 text-gold shadow-sm'
                        : 'border-border bg-background hover:border-gold/30'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {!isActive('filterType') && (
                <p className="mt-1 text-[11px] text-muted-foreground">{t('notProvided')}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-pool-pump">{t('pumpLabel')}</Label>
              <Input
                id="edit-pool-pump"
                value={profile.pumpType || ''}
                placeholder={isActive('pumpType') ? t('pumpPlaceholder') : t('notProvided')}
                onChange={(e) => update('pumpType', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-pool-region">{t('cityLabel')}</Label>
              <Input
                id="edit-pool-region"
                value={isActive('region') ? profile.region || '' : ''}
                placeholder={isActive('region') ? t('cityPlaceholder') : t('notProvided')}
                onChange={(e) => update('region', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t('sunExposure')}</Label>
              <div className="grid grid-cols-3 gap-2">
                {SUN_EXPOSURES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => update('sunExposure', s.value)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                      isActive('sunExposure') && profile.sunExposure === s.value
                        ? 'border-gold/60 bg-gold/10 text-gold shadow-sm'
                        : 'border-border bg-background hover:border-gold/30'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {!isActive('sunExposure') && (
                <p className="mt-1 text-[11px] text-muted-foreground">{t('notProvided')}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>{t('usageLabel')}</Label>
              <div className="grid grid-cols-3 gap-2">
                {USAGE_LEVELS.map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => update('usageLevel', u.value)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                      isActive('usageLevel') && profile.usageLevel === u.value
                        ? 'border-gold/60 bg-gold/10 text-gold shadow-sm'
                        : 'border-border bg-background hover:border-gold/30'
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
              {!isActive('usageLevel') && (
                <p className="mt-1 text-[11px] text-muted-foreground">{t('notProvided')}</p>
              )}
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background p-3">
              <input
                type="checkbox"
                checked={profile.covered}
                onChange={(e) => update('covered', e.target.checked)}
                className="h-4 w-4 accent-[oklch(0.45_0.12_195)]"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{t('covered')}</p>
                <p className="text-[11px] text-muted-foreground">{t('coveredDesc')}</p>
              </div>
            </label>
            {!isActive('covered') && (
              <p className="-mt-2 text-[11px] text-muted-foreground">{t('notProvided')}</p>
            )}

            {isSpa && (
              <div className="space-y-3 rounded-xl border border-gold/20 bg-gold/[0.04] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">
                  {t('spaDetailsTitle')}
                </p>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs">
                    <Droplets className="h-3.5 w-3.5 text-gold" />
                    {tspaData(SPA_SPECIFICS.seatsRange.labelKey)} : <strong className="text-gold">{profile.spaSeats ?? SPA_SPECIFICS.seatsRange.min}</strong>
                  </Label>
                  <input
                    type="range"
                    min={SPA_SPECIFICS.seatsRange.min}
                    max={SPA_SPECIFICS.seatsRange.max}
                    step={1}
                    value={profile.spaSeats ?? SPA_SPECIFICS.seatsRange.min}
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
                    <Sparkles className="h-3.5 w-3.5 text-gold" />
                    {tspa('temperature')} : <strong className="text-gold">{profile.spaTempTarget ?? SPA_SPECIFICS.temperatureRange.ideal}°C</strong>
                  </Label>
                  <input
                    type="range"
                    min={SPA_SPECIFICS.temperatureRange.min}
                    max={SPA_SPECIFICS.temperatureRange.max}
                    step={1}
                    value={profile.spaTempTarget ?? SPA_SPECIFICS.temperatureRange.ideal}
                    onChange={(e) => update('spaTempTarget', Number(e.target.value))}
                    className="w-full accent-[oklch(0.45_0.12_195)]"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{SPA_SPECIFICS.temperatureRange.min}°C</span>
                    <span>{t('idealTemp')} {SPA_SPECIFICS.temperatureRange.ideal}°C</span>
                    <span>{SPA_SPECIFICS.temperatureRange.max}°C</span>
                  </div>
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
                        onClick={() => update('spaUsageFreq', u.value)}
                        className={`flex flex-col items-center rounded-lg border px-2 py-2 text-center transition-all ${
                          profile.spaUsageFreq === u.value
                            ? 'border-gold/60 bg-gold/10 shadow-sm'
                            : 'border-border bg-background hover:border-gold/30'
                        }`}
                      >
                        <span className={`text-xs font-semibold ${profile.spaUsageFreq === u.value ? 'text-gold' : ''}`}>
                          {u.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{u.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{tspa('brand')}</Label>
                  <Select
                    value={profile.spaBrand || ''}
                    onValueChange={(v) => update('spaBrand', v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('spaBrandPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {SPA_BRANDS.map((b) => (
                        <SelectItem key={b.id} value={b.name}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
                {tc('cancel')}
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSave()}
                disabled={saving}
                className="bg-gradient-to-r from-primary to-gold text-primary-foreground shadow-lg shadow-primary/20"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {tc('save')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
