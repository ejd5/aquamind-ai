'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Droplets, Loader2, Check } from 'lucide-react'
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
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<PoolProfileData | null>(null)

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
      const data = await api.get<{ profile: PoolProfileData | null }>(
        `/api/pool/profile?id=${encodeURIComponent(id)}`
      )
      setProfile(data.profile)
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
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    try {
      await api.patch(`/api/pool/profile?id=${encodeURIComponent(profile.id)}`, {
        name: profile.name,
        volume: Number(profile.volume),
        unit: profile.unit,
        shape: profile.shape,
        surfaceType: profile.surfaceType,
        treatmentType: profile.treatmentType,
        saltSystem: profile.treatmentType === 'salt',
        filterType: profile.filterType,
        pumpType: profile.pumpType || '',
        region: profile.region || '',
        sunExposure: profile.sunExposure,
        usageLevel: profile.usageLevel,
        covered: profile.covered,
      })
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
            <div className="space-y-1.5">
              <Label htmlFor="edit-pool-name">
                {isSpa ? t('spaName') : t('poolName')}
              </Label>
              <Input
                id="edit-pool-name"
                value={profile.name}
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
                  value={profile.volume}
                  onChange={(e) => update('volume', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('unit')}</Label>
                <Select value={profile.unit} onValueChange={(v) => update('unit', v)}>
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
                          profile.shape === s.value
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
                        type="button"
                        onClick={() => update('surfaceType', s.value)}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                          profile.surfaceType === s.value
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
                      profile.treatmentType === tr.value
                        ? 'border-gold/60 bg-gold/10 text-gold shadow-sm'
                        : 'border-border bg-background hover:border-gold/30'
                    }`}
                  >
                    {tr.label}
                  </button>
                ))}
              </div>
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
                      profile.filterType === f.value
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
              <Label htmlFor="edit-pool-pump">{t('pumpLabel')}</Label>
              <Input
                id="edit-pool-pump"
                value={profile.pumpType || ''}
                onChange={(e) => update('pumpType', e.target.value)}
                placeholder={t('pumpPlaceholder')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-pool-region">{t('cityLabel')}</Label>
              <Input
                id="edit-pool-region"
                value={profile.region || ''}
                onChange={(e) => update('region', e.target.value)}
                placeholder={t('cityPlaceholder')}
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
                      profile.sunExposure === s.value
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
                    type="button"
                    onClick={() => update('usageLevel', u.value)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                      profile.usageLevel === u.value
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
                checked={profile.covered}
                onChange={(e) => update('covered', e.target.checked)}
                className="h-4 w-4 accent-[oklch(0.45_0.12_195)]"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{t('covered')}</p>
                <p className="text-[11px] text-muted-foreground">{t('coveredDesc')}</p>
              </div>
            </label>

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
