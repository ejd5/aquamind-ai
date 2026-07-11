'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  Upload,
  X,
  Loader2,
  ScanLine,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Lightbulb,
  ShieldAlert,
  Image as ImageIcon,
  ArrowRight,
  ArrowLeft,
  Info,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from '@/hooks/use-toast'
import { takePhoto, pickFromGallery, requestCameraPermission } from '@/lib/native/camera'
import { isNative } from '@/lib/platform'
import { hapticSuccess, hapticError } from '@/lib/native/haptics'
import { api, ApiError } from '@/lib/api-client'
import { TARGETS, evaluateParam, type ParamStatus } from '@/lib/pool/targets'
import { useOfflineStore } from '@/lib/offline/offline-store'

// ── Types ────────────────────────────────────────────────────────────────────
interface StripParameter {
  name: string
  value: number | null
  unit?: string
  confidence?: number
}

interface StripScanAnalysis {
  parameters: StripParameter[]
  stripBrand: string
  overallConfidence: number
  imageQuality: 'good' | 'fair' | 'poor'
  qualityNotes?: string
}

interface StripScanResponse {
  analysis: StripScanAnalysis
  raw?: string
  saved: boolean
  reason?: string
  waterTest?: { id: string } | null
  actionPlan?: unknown
  quota?: { used: number; limit: number }
  error?: string
  code?: string
  ctaPlan?: string
}

// Parameter-name normalization — imported from the single source of truth.
// The synonyms file contains multilingual keywords (FR/EN/ES/DE/IT) for
// matching AI-detected parameter names. It is NOT user-facing text.
import { normalizeParamName } from '@/lib/pool/strip-scan-synonyms'

interface Props {
  open: boolean
  onClose: () => void
  /**
   * Called when the user clicks "Sauvegarder" with the (possibly edited)
   * values from the scan. The parent decides how to persist:
   *   - ModuleWaterTest: fills the form with these values so the user
   *     can review/adjust before triggering the existing save flow.
   *   - ModuleDiagnostic: persists directly via /api/pool/water-test.
   */
  onSave: (values: Record<string, string>, analysis: StripScanAnalysis) => void | Promise<void>
}

type Stage = 'guide' | 'capture' | 'analyzing' | 'results'

// ── Component ────────────────────────────────────────────────────────────────
export function StripScanner({ open, onClose, onSave }: Props) {
  const t = useTranslations('stripScan')
  const tTargets = useTranslations('targets')
  const locale = useLocale()
  const isOnline = useOfflineStore((s) => s.isOnline)

  const [stage, setStage] = useState<Stage>('guide')
  const [guidedStep, setGuidedStep] = useState(0)
  const [image, setImage] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<StripScanAnalysis | null>(null)
  const [rawResponse, setRawResponse] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null)
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      const id = setTimeout(() => {
        setStage('guide')
        setGuidedStep(0)
        setImage(null)
        setAnalysis(null)
        setRawResponse('')
        setError(null)
        setQuota(null)
        setEditedValues({})
        setSaving(false)
      }, 250)
      return () => clearTimeout(id)
    }
  }, [open])

  // ── Photo capture ─────────────────────────────────────────────────────────
  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast({ title: t('invalidFile'), variant: 'destructive' })
      return
    }
    if (file.size > 6 * 1024 * 1024) {
      toast({ title: t('fileTooBig'), variant: 'destructive' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImage(reader.result as string)
      setStage('capture')
    }
    reader.readAsDataURL(file)
  }

  async function handleTakePhoto() {
    const granted = await requestCameraPermission()
    if (!granted) {
      toast({ title: t('permissionDenied'), variant: 'destructive' })
      hapticError()
      return
    }
    const photo = await takePhoto()
    if (photo?.dataUrl) {
      setImage(photo.dataUrl)
      setStage('capture')
      hapticSuccess()
    }
  }

  async function handlePickFromGallery() {
    const photo = await pickFromGallery()
    if (photo?.dataUrl) {
      setImage(photo.dataUrl)
      setStage('capture')
    }
  }

  function resetCapture() {
    setImage(null)
    setAnalysis(null)
    setStage('guide')
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Analyze ───────────────────────────────────────────────────────────────
  const analyze = useCallback(async () => {
    if (!image) return
    if (!isOnline) {
      toast({ title: t('offlineTitle'), description: t('offlineError'), variant: 'destructive' })
      hapticError()
      return
    }
    setStage('analyzing')
    setError(null)
    setAnalysis(null)
    try {
      const data = await api.post<StripScanResponse>('/api/pool/strip-scan', { image, save: false })
      setAnalysis(data.analysis)
      setRawResponse(data.raw || '')
      if (data.quota) setQuota(data.quota)

      // Pre-fill edited values from analysis (normalized)
      const vals: Record<string, string> = {}
      for (const p of data.analysis.parameters) {
        const key = normalizeParamName(p.name)
        if (key && p.value != null) vals[key] = String(p.value)
      }
      setEditedValues(vals)
      setStage('results')
      hapticSuccess()

      if (data.analysis.parameters.length === 0) {
        toast({ title: t('stripScanNoStrip'), description: t('stripScanNoStripDesc'), variant: 'destructive' })
      } else if (data.analysis.overallConfidence < 50) {
        toast({ title: t('stripScanLowConfidence'), description: t('stripScanLowConfidenceDesc'), variant: 'default' })
      } else {
        toast({ title: t('analysisComplete'), description: t('analysisCompleteDesc') })
      }
    } catch (e) {
      hapticError()
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : t('analysisFailed')
      setError(msg)
      // If quota exceeded, the API returns 403 with quota info in body
      if (e instanceof ApiError && e.status === 403 && (e.body as any)?.quota) {
        setQuota((e.body as any).quota)
      }
      setStage('capture')
      toast({ title: t('errorTitle'), description: msg, variant: 'destructive' })
    }
  }, [image, isOnline, t])

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!analysis) return
    setSaving(true)
    try {
      await onSave(editedValues, analysis)
      // Parent handles persistence. Close modal on success.
      hapticSuccess()
      onClose()
    } catch (e) {
      hapticError()
      const msg = e instanceof Error ? e.message : t('saveFailed')
      toast({ title: t('errorTitle'), description: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  const guidedSteps = useMemo(
    () => [
      { icon: Lightbulb, title: t('guideStep1Title'), text: t('guideStep1Text') },
      { icon: Camera, title: t('guideStep2Title'), text: t('guideStep2Text') },
      { icon: ScanLine, title: t('guideStep3Title'), text: t('guideStep3Text') },
    ],
    [t]
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden border-gold/30 bg-background/95 backdrop-blur-2xl p-0 sm:max-w-2xl max-h-[95vh]"
      >
        {/* Top accent line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-[oklch(0.65_0.11_195)] shadow-sm">
              <ScanLine className="h-4 w-4 text-[oklch(0.99_0.01_195)]" />
            </div>
            <div>
              <DialogTitle className="font-display text-base font-bold leading-tight">
                <span className="aqua-text-gradient">{t('title')}</span>
              </DialogTitle>
              <DialogDescription className="text-[11px] leading-tight">
                {t('subtitle')}
              </DialogDescription>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="custom-scroll max-h-[calc(95vh-128px)] overflow-y-auto px-5 py-4">
          {stage === 'guide' && (
            <GuideStage
              steps={guidedSteps}
              guidedStep={guidedStep}
              setGuidedStep={setGuidedStep}
              onStart={() => setStage('capture')}
              t={t}
            />
          )}

          {stage === 'capture' && (
            <CaptureStage
              image={image}
              fileRef={fileRef}
              onFile={handleFile}
              onTakePhoto={handleTakePhoto}
              onPickFromGallery={handlePickFromGallery}
              onAnalyze={analyze}
              onReset={resetCapture}
              onOpenGuide={() => setStage('guide')}
              t={t}
            />
          )}

          {stage === 'analyzing' && <AnalyzingStage image={image} t={t} />}

          {stage === 'results' && analysis && (
            <ResultsStage
              analysis={analysis}
              rawResponse={rawResponse}
              editedValues={editedValues}
              setEditedValues={setEditedValues}
              onSave={handleSave}
              onRetry={resetCapture}
              saving={saving}
              t={t}
              tTargets={tTargets}
              locale={locale}
            />
          )}

          {error && stage !== 'results' && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t('errorTitle')}
              </p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {quota && (
            <div className="mt-3 rounded-lg border border-gold/30 bg-gold/5 p-2.5 text-[11px] text-muted-foreground">
              {t('quotaUsage', { used: quota.used, limit: quota.limit })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Guide stage ──────────────────────────────────────────────────────────────
function GuideStage({
  steps,
  guidedStep,
  setGuidedStep,
  onStart,
  t,
}: {
  steps: { icon: any; title: string; text: string }[]
  guidedStep: number
  setGuidedStep: (n: number) => void
  onStart: () => void
  t: any
}) {
  const Step = steps[guidedStep]
  const Icon = Step.icon
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/5 to-transparent p-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-gold">
          <Info className="h-3 w-3" />
          {t('guidedMode')}
          <span className="text-muted-foreground">
            {guidedStep + 1}/{steps.length}
          </span>
        </div>
        <div className="mt-3 flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold shadow-md shadow-primary/20">
            <Icon className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-bold">{Step.title}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{Step.text}</p>
          </div>
        </div>
        {/* Progress dots */}
        <div className="mt-4 flex items-center gap-1.5">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setGuidedStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === guidedStep ? 'w-8 bg-gold' : 'w-1.5 bg-muted hover:bg-muted-foreground/50'
              }`}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Tips list */}
      <ul className="space-y-1.5 text-xs text-muted-foreground">
        <li className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.7_0.15_155)]" />
          {t('tip1')}
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.7_0.15_155)]" />
          {t('tip2')}
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.7_0.15_155)]" />
          {t('tip3')}
        </li>
      </ul>

      <div className="flex gap-2">
        {guidedStep > 0 && (
          <Button variant="outline" onClick={() => setGuidedStep(guidedStep - 1)} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('previous')}
          </Button>
        )}
        {guidedStep < steps.length - 1 ? (
          <Button
            onClick={() => setGuidedStep(guidedStep + 1)}
            className="flex-1 gap-1.5 bg-gradient-to-r from-gold to-[oklch(0.65_0.11_195)] text-[oklch(0.99_0.01_195)] shadow-md shadow-gold/30 hover:shadow-lg hover:shadow-gold/40"
          >
            {t('next')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            onClick={onStart}
            className="flex-1 gap-1.5 bg-gradient-to-r from-gold to-[oklch(0.65_0.11_195)] text-[oklch(0.99_0.01_195)] shadow-md shadow-gold/30 hover:shadow-lg hover:shadow-gold/40"
          >
            <ScanLine className="h-3.5 w-3.5" />
            {t('startScan')}
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Capture stage ────────────────────────────────────────────────────────────
function CaptureStage({
  image,
  fileRef,
  onFile,
  onTakePhoto,
  onPickFromGallery,
  onAnalyze,
  onReset,
  onOpenGuide,
  t,
}: {
  image: string | null
  fileRef: React.RefObject<HTMLInputElement | null>
  onFile: (f: File) => void
  onTakePhoto: () => void
  onPickFromGallery: () => void
  onAnalyze: () => void
  onReset: () => void
  onOpenGuide: () => void
  t: any
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{t('captureHint')}</p>
        <button
          onClick={onOpenGuide}
          className="flex items-center gap-1 text-[11px] text-gold hover:underline"
        >
          <Lightbulb className="h-3 w-3" />
          {t('guidedMode')}
        </button>
      </div>

      {!image ? (
        <>
          {/* Visual capture frame */}
          <div className="relative mx-auto flex max-w-md items-center justify-center rounded-2xl border-2 border-dashed border-gold/40 bg-gold/5 p-8">
            <div className="absolute inset-4 rounded-xl border-2 border-gold/20" />
            <div className="relative z-10 flex flex-col items-center gap-2 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-gold shadow-lg shadow-primary/30">
                <ScanLine className="h-8 w-8 text-primary-foreground" />
              </div>
              <p className="font-display text-sm font-semibold">{t('captureFrameTitle')}</p>
              <p className="max-w-[200px] text-[11px] text-muted-foreground">{t('captureFrameText')}</p>
            </div>
          </div>

          {/* Native camera buttons */}
          {isNative() && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={onTakePhoto}
                className="gap-2 bg-gradient-to-r from-gold to-[oklch(0.65_0.11_195)] text-[oklch(0.99_0.01_195)] shadow-md shadow-gold/30"
              >
                <Camera className="h-4 w-4" />
                {t('takePhoto')}
              </Button>
              <Button onClick={onPickFromGallery} variant="outline" className="gap-2">
                <ImageIcon className="h-4 w-4" />
                {t('gallery')}
              </Button>
            </div>
          )}

          {/* Web file upload */}
          <label
            htmlFor="strip-upload"
            className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/60 bg-secondary/30 px-6 py-6 text-center transition-all hover:border-gold/40 hover:bg-gold/5"
          >
            <Upload className="h-6 w-6 text-muted-foreground group-hover:text-gold" />
            <p className="text-xs font-medium">
              {isNative() ? t('uploadLabelMobile') : t('uploadLabel')}
            </p>
            <p className="text-[10px] text-muted-foreground">{t('uploadHint')}</p>
            <input
              id="strip-upload"
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onFile(f)
              }}
            />
          </label>
        </>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-2xl border border-border/60">
            <img src={image} alt={t('capturedImageAlt')} className="max-h-80 w-full object-contain bg-secondary/20" />
            <button
              onClick={onReset}
              className="absolute right-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-md backdrop-blur-md hover:bg-background"
            >
              {t('change')}
            </button>
          </div>
          <div className="flex gap-2">
            <Button onClick={onAnalyze} className="flex-1 gap-2 bg-gradient-to-r from-gold to-[oklch(0.65_0.11_195)] text-[oklch(0.99_0.01_195)] shadow-lg shadow-gold/30 hover:shadow-xl hover:shadow-gold/40">
              <Sparkles className="h-4 w-4" />
              {t('analyze')}
            </Button>
            <Button variant="outline" onClick={onReset}>
              {t('cancel')}
            </Button>
          </div>
        </>
      )}

      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-gold" />
        {t('disclaimer')}
      </p>
    </div>
  )
}

// ── Analyzing stage (scan animation) ─────────────────────────────────────────
function AnalyzingStage({ image, t }: { image: string | null; t: any }) {
  return (
    <div className="space-y-4">
      <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl border border-gold/30">
        {image && (
          <img src={image} alt="" className="max-h-72 w-full object-contain bg-secondary/20" />
        )}
        {/* Golden scan bar sweeping top-to-bottom */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_20px_4px_rgba(255,215,0,0.5)] scan-bar-anim" />
        </div>
        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,215,0,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,0.15) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur-md">
          <Loader2 className="mr-1.5 inline h-3 w-3 animate-spin" />
          {t('analyzing')}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t('analyzingStep1')}</span>
          <CheckCircle2 className="h-3.5 w-3.5 text-[oklch(0.7_0.15_155)]" />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t('analyzingStep2')}</span>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
        </div>
        <div className="flex items-center justify-between text-xs opacity-50">
          <span className="text-muted-foreground">{t('analyzingStep3')}</span>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        </div>
      </div>

      <style jsx>{`
        @keyframes scan-bar {
          0% { transform: translateY(-2px); }
          50% { transform: translateY(280px); }
          100% { transform: translateY(-2px); }
        }
        .scan-bar-anim {
          animation: scan-bar 1.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

// ── Results stage ────────────────────────────────────────────────────────────
function ResultsStage({
  analysis,
  rawResponse,
  editedValues,
  setEditedValues,
  onSave,
  onRetry,
  saving,
  t,
  tTargets,
  locale,
}: {
  analysis: StripScanAnalysis
  rawResponse: string
  editedValues: Record<string, string>
  setEditedValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onSave: () => void
  onRetry: () => void
  saving: boolean
  t: any
  tTargets: any
  locale: string
}) {
  // Map parameters to canonical keys + lookup target ranges
  const mapped = useMemo(() => {
    return analysis.parameters
      .map((p) => {
        const key = normalizeParamName(p.name)
        if (!key) return null
        const target = TARGETS[key]
        const editedVal = editedValues[key] != null ? Number(editedValues[key]) : NaN
        const value = !isNaN(editedVal) ? editedVal : p.value
        const status: ParamStatus | 'unknown' = value != null && !isNaN(value as number)
          ? evaluateParam(key, value as number)
          : 'unknown'
        return {
          key,
          rawName: p.name,
          value,
          unit: p.unit || target?.unit || '',
          confidence: p.confidence ?? 0,
          target,
          status,
        }
      })
      .filter(Boolean) as {
      key: string
      rawName: string
      value: number | null
      unit: string
      confidence: number
      target: any
      status: ParamStatus | 'unknown'
    }[]
  }, [analysis, editedValues])

  const qualityColor =
    analysis.imageQuality === 'good'
      ? 'border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.45_0.13_155)]'
      : analysis.imageQuality === 'fair'
      ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300'
      : 'border-destructive/30 bg-destructive/10 text-destructive'

  const overallConfidenceColor =
    analysis.overallConfidence >= 75
      ? 'text-[oklch(0.45_0.13_155)]'
      : analysis.overallConfidence >= 50
      ? 'text-yellow-600 dark:text-yellow-300'
      : 'text-destructive'

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/5 to-transparent p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gold">
              {t('resultsTitle')}
            </p>
            <p className="font-display text-sm font-bold">
              {analysis.stripBrand && analysis.stripBrand !== 'unknown'
                ? t('brandDetected', { brand: analysis.stripBrand })
                : t('brandUnknown')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={qualityColor}>
              {t(`quality.${analysis.imageQuality}`)}
            </Badge>
            <span className={`font-display text-lg font-bold ${overallConfidenceColor}`}>
              {Math.round(analysis.overallConfidence)}%
            </span>
          </div>
        </div>
        {/* Overall confidence bar */}
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${
              analysis.overallConfidence >= 75
                ? 'bg-[oklch(0.7_0.15_155)]'
                : analysis.overallConfidence >= 50
                ? 'bg-yellow-500'
                : 'bg-destructive'
            }`}
            style={{ width: `${Math.max(3, Math.min(100, analysis.overallConfidence))}%` }}
          />
        </div>
        {analysis.qualityNotes && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">{analysis.qualityNotes}</p>
        )}
      </div>

      {/* No strip detected */}
      {analysis.parameters.length === 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-2 font-display text-sm font-bold">{t('noStripDetected')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('noStripDetectedDesc')}</p>
        </div>
      )}

      {/* Parameter cards */}
      {mapped.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
            <ScanLine className="h-3 w-3" />
            {t('detectedParameters')}
            <span className="ml-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
              {mapped.length}
            </span>
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {mapped.map((p) => (
              <ParamCard
                key={p.key}
                param={p}
                editedValue={editedValues[p.key] ?? (p.value != null ? String(p.value) : '')}
                onChange={(v) => setEditedValues((s) => ({ ...s, [p.key]: v }))}
                t={t}
                tTargets={tTargets}
              />
            ))}
          </div>
        </div>
      )}

      {/* Editable values notice */}
      {mapped.length > 0 && (
        <p className="flex items-start gap-1.5 rounded-lg border border-primary/20 bg-primary/5 p-2 text-[11px] text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
          {t('editHint')}
        </p>
      )}

      {/* Low confidence warning */}
      {analysis.overallConfidence < 50 && analysis.parameters.length > 0 && (
        <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/5 p-2.5 text-[11px] text-yellow-700 dark:text-yellow-300">
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t('lowConfidenceWarning')}
          </p>
          <p className="mt-0.5 opacity-80">{t('lowConfidenceWarningDesc')}</p>
        </div>
      )}

      {/* Raw VLM response (collapsed) — for power users / debug */}
      {rawResponse && (
        <details className="rounded-lg border border-border/40 bg-secondary/20 p-2 text-[10px] text-muted-foreground">
          <summary className="cursor-pointer font-medium">
            {t('rawResponse')}
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[10px]">
            {rawResponse}
          </pre>
        </details>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={onSave}
          disabled={saving || mapped.length === 0}
          className="flex-1 gap-2 bg-gradient-to-r from-gold to-[oklch(0.65_0.11_195)] text-[oklch(0.99_0.01_195)] shadow-lg shadow-gold/30 hover:shadow-xl hover:shadow-gold/40"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('saving')}
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              {t('saveTest')}
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onRetry} disabled={saving} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('retry')}
        </Button>
      </div>
    </div>
  )
}

// ── Parameter card ───────────────────────────────────────────────────────────
function ParamCard({
  param,
  editedValue,
  onChange,
  t,
  tTargets,
}: {
  param: {
    key: string
    rawName: string
    value: number | null
    unit: string
    confidence: number
    target: any
    status: ParamStatus | 'unknown'
  }
  editedValue: string
  onChange: (v: string) => void
  t: any
  tTargets: any
}) {
  const label = param.target?.labelKey
    ? (() => {
        try {
          return tTargets(param.target.labelKey as any)
        } catch {
          return param.target?.label || param.rawName
        }
      })()
    : param.rawName

  const statusColor =
    param.status === 'ok'
      ? 'border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/5'
      : param.status === 'low_warning' || param.status === 'high_warning'
      ? 'border-yellow-400/30 bg-yellow-400/5'
      : param.status === 'low_critical' || param.status === 'high_critical'
      ? 'border-destructive/30 bg-destructive/5'
      : 'border-border/40 bg-background/40'

  const dotColor =
    param.status === 'ok'
      ? 'bg-[oklch(0.7_0.15_155)]'
      : param.status === 'low_warning' || param.status === 'high_warning'
      ? 'bg-yellow-500'
      : param.status === 'low_critical' || param.status === 'high_critical'
      ? 'bg-destructive'
      : 'bg-muted-foreground'

  const confColor =
    param.confidence >= 75
      ? 'text-[oklch(0.45_0.13_155)] bg-[oklch(0.7_0.15_155)]/10'
      : param.confidence >= 50
      ? 'text-yellow-700 dark:text-yellow-300 bg-yellow-400/10'
      : 'text-destructive bg-destructive/10'

  return (
    <div className={`rounded-xl border p-2.5 backdrop-blur-md ${statusColor}`}>
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
          <span className="truncate text-xs font-semibold">{label}</span>
        </div>
        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${confColor}`}>
          {Math.round(param.confidence)}%
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <Input
          type="number"
          step="any"
          inputMode="decimal"
          value={editedValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-sm"
          placeholder="—"
        />
        {param.unit && (
          <span className="shrink-0 text-[10px] text-muted-foreground">{param.unit}</span>
        )}
      </div>

      {param.target && (
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {t('ideal')}: {param.target.idealLow}–{param.target.idealHigh}
            {param.unit && ` ${param.unit}`}
          </span>
          {param.status !== 'unknown' && (
            <span className={
              param.status === 'ok'
                ? 'text-[oklch(0.45_0.13_155)]'
                : param.status === 'low_warning' || param.status === 'high_warning'
                ? 'text-yellow-700 dark:text-yellow-300'
                : 'text-destructive'
            }>
              {t(`status.${param.status}`)}
            </span>
          )}
        </div>
      )}

      {/* Confidence bar */}
      <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${
            param.confidence >= 75
              ? 'bg-[oklch(0.7_0.15_155)]'
              : param.confidence >= 50
              ? 'bg-yellow-500'
              : 'bg-destructive'
          }`}
          style={{ width: `${Math.max(3, Math.min(100, param.confidence))}%` }}
        />
      </div>
    </div>
  )
}

export default StripScanner
