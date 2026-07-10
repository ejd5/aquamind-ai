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
  ShoppingBag,
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

// Parameter-name normalization (mirror of API logic for client-side rendering)
const PARAM_SYNONYMS: Record<string, string[]> = {
  ph: ['ph', 'phvalue', 'ph value', 'potential hydrogen'],
  freeChlorine: ['free chlorine', 'free cl', 'cl libre', 'chlore libre', 'cloro libre'],
  totalChlorine: ['total chlorine', 'total cl', 'cl total', 'chlore total', 'cloro total'],
  combinedChlorine: ['combined chlorine', 'chloramines', 'chlore combiné'],
  alkalinity: ['total alkalinity', 'alkalinity', 'tac', 'alcalinité', 'alcalinidad'],
  calciumHardness: ['hardness', 'calcium hardness', 'th', 'dureté', 'dureza', 'härte'],
  cyanuricAcid: ['cyanuric acid', 'cya', 'stabilizer', 'stabilisant'],
  salt: ['salt', 'sel', 'salz', 'sale', 'sal'],
  bromine: ['bromine', 'brome', 'brom', 'bromo'],
  phosphates: ['phosphates', 'phosphate', 'fosfatos', 'phosphat'],
  temperature: ['temperature', 'temp', 'temperatur', 'temperatura'],
}

function normalizeParamName(name: string): string | null {
  const lower = name.trim().toLowerCase()
  for (const [canonical, synonyms] of Object.entries(PARAM_SYNONYMS)) {
    if (synonyms.includes(lower)) return canonical
  }
  for (const [canonical, synonyms] of Object.entries(PARAM_SYNONYMS)) {
    if (synonyms.some((s) => lower.includes(s))) return canonical
  }
  return null
}

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

        {/* Body — scrollable for guide/capture, fixed height for results */}
        <div className={`px-5 py-4 ${
          stage === 'results'
            ? 'h-[calc(95vh-128px)] overflow-hidden'
            : 'custom-scroll max-h-[calc(95vh-128px)] overflow-y-auto'
        }`}>
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

// ── Results stage — full-screen, high-end design ─────────────────────────────
// Color codes matching real test strip pad colors for instant recognition.
// Layout fits on ONE screen height — no scrollbars, everything visible at once.

// Strip pad colors (matching real pool test strips)
const STRIP_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  ph:           { bg: 'bg-red-500',     text: 'text-white',  label: 'pH' },
  freeChlorine: { bg: 'bg-yellow-400',  text: 'text-black',  label: 'Cl' },
  combinedChlorine: { bg: 'bg-amber-500', text: 'text-white', label: 'CC' },
  totalChlorine: { bg: 'bg-orange-400', text: 'text-white',  label: 'TC' },
  alkalinity:   { bg: 'bg-blue-500',    text: 'text-white',  label: 'TAC' },
  calciumHardness: { bg: 'bg-purple-500', text: 'text-white', label: 'TH' },
  cyanuricAcid: { bg: 'bg-cyan-500',    text: 'text-white',  label: 'CYA' },
  bromine:      { bg: 'bg-pink-500',    text: 'text-white',  label: 'Br' },
  salt:         { bg: 'bg-slate-400',   text: 'text-white',  label: 'NaCl' },
  phosphates:   { bg: 'bg-teal-500',    text: 'text-white',  label: 'PO₄' },
  temperature:  { bg: 'bg-rose-400',    text: 'text-white',  label: '°C' },
}

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
  const [showReorder, setShowReorder] = useState(false)

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

  // Build compact report: what's good, what needs attention, actions
  const report = useMemo(() => {
    const good: string[] = []
    const warnings: string[] = []
    const critical: string[] = []
    const actions: string[] = []

    for (const p of mapped) {
      if (p.status === 'ok') {
        good.push(p.target?.label || p.rawName)
      } else if (p.status === 'low_warning') {
        warnings.push(`${p.target?.label || p.rawName} (bas)`)
        if (p.target?.consequenceLow) actions.push(p.target.consequenceLow)
      } else if (p.status === 'high_warning') {
        warnings.push(`${p.target?.label || p.rawName} (élevé)`)
        if (p.target?.consequenceHigh) actions.push(p.target.consequenceHigh)
      } else if (p.status === 'low_critical') {
        critical.push(`${p.target?.label || p.rawName} (trop bas)`)
        if (p.target?.consequenceLow) actions.push(`⚠ ${p.target.consequenceLow}`)
      } else if (p.status === 'high_critical') {
        critical.push(`${p.target?.label || p.rawName} (trop élevé)`)
        if (p.target?.consequenceHigh) actions.push(`⚠ ${p.target.consequenceHigh}`)
      }
    }

    return { good, warnings, critical, actions: [...new Set(actions)].slice(0, 3) }
  }, [mapped])

  const okCount = report.good.length
  const warnCount = report.warnings.length
  const critCount = report.critical.length
  const totalCount = mapped.length
  const healthScore = totalCount > 0 ? Math.round((okCount / totalCount) * 100) : 0

  // Health score color
  const scoreColor = healthScore >= 80 ? 'text-emerald-500' : healthScore >= 50 ? 'text-yellow-500' : 'text-red-500'
  const scoreBg = healthScore >= 80 ? 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30' : healthScore >= 50 ? 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30' : 'from-red-500/20 to-red-500/5 border-red-500/30'

  return (
    <div className="flex h-full flex-col gap-2.5">
      {/* ── TOP: Health Score Banner + Report (compact, ~25% height) ── */}
      <div className={`rounded-2xl border bg-gradient-to-br ${scoreBg} p-3`}>
        <div className="flex items-center justify-between gap-3">
          {/* Score circle */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-current">
              <span className={`font-display text-xl font-bold ${scoreColor}`}>{healthScore}</span>
              <span className="absolute -bottom-1 text-[8px] font-medium text-muted-foreground">/100</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {analysis.stripBrand && analysis.stripBrand !== 'unknown' ? analysis.stripBrand : t('brandUnknown')}
              </p>
              <p className="font-display text-sm font-bold">
                {critCount > 0 ? '⚠️ Action requise' : warnCount > 0 ? '👀 À surveiller' : '✅ Eau équilibrée'}
              </p>
              <div className="mt-0.5 flex gap-2 text-[10px]">
                <span className="text-emerald-500">✓ {okCount}</span>
                {warnCount > 0 && <span className="text-yellow-500">⚠ {warnCount}</span>}
                {critCount > 0 && <span className="text-red-500">✗ {critCount}</span>}
              </div>
            </div>
          </div>

          {/* Compact report: actions to take */}
          {(report.critical.length > 0 || report.warnings.length > 0) && (
            <div className="hidden max-w-[55%] flex-col gap-0.5 sm:flex">
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Actions</p>
              {report.actions.length > 0 ? (
                report.actions.map((a, i) => (
                  <p key={i} className="text-[10px] leading-tight text-foreground/80">• {a}</p>
                ))
              ) : (
                <p className="text-[10px] text-muted-foreground">Ajustez les paramètres hors plage.</p>
              )}
            </div>
          )}

          {/* Confidence */}
          <div className="text-right">
            <Badge variant="outline" className={`mb-1 text-[9px] ${
              analysis.overallConfidence >= 75 ? 'border-emerald-500/30 text-emerald-600' :
              analysis.overallConfidence >= 50 ? 'border-yellow-500/30 text-yellow-600' :
              'border-red-500/30 text-red-600'
            }`}>
              {Math.round(analysis.overallConfidence)}% {t(`quality.${analysis.imageQuality}`)}
            </Badge>
          </div>
        </div>
      </div>

      {/* ── MIDDLE: Parameter Grid (fills remaining space, no scroll) ── */}
      <div className="flex-1 overflow-hidden">
        {mapped.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="mt-2 font-display text-sm font-bold">{t('noStripDetected')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('noStripDetectedDesc')}</p>
          </div>
        ) : (
          <div className="grid h-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {mapped.map((p) => (
              <ParamCardV2
                key={p.key}
                param={p}
                editedValue={editedValues[p.key] ?? (p.value != null ? String(p.value) : '')}
                onChange={(v) => setEditedValues((s) => ({ ...s, [p.key]: v }))}
                t={t}
                tTargets={tTargets}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── BOTTOM: Actions bar (save, retry, reorder) ── */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => setShowReorder(true)}
          variant="outline"
          className="gap-1.5 border-gold/40 text-gold hover:bg-gold/10"
          size="sm"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Commander bandelettes</span>
          <span className="sm:hidden">Bandelettes</span>
        </Button>
        <Button
          onClick={onSave}
          disabled={saving || mapped.length === 0}
          className="flex-1 gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40"
          size="sm"
        >
          {saving ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />{t('saving')}</>
          ) : (
            <><CheckCircle2 className="h-3.5 w-3.5" />{t('saveTest')}</>
          )}
        </Button>
        <Button variant="outline" onClick={onRetry} disabled={saving} size="sm" className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('retry')}</span>
        </Button>
      </div>

      {/* Reorder strips modal */}
      {showReorder && (
        <ReorderStripsModal onClose={() => setShowReorder(false)} t={t} />
      )}
    </div>
  )
}

// ── Parameter card V2 — color-coded, visual gauge ───────────────────────────
function ParamCardV2({
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
  const stripColor = STRIP_COLORS[param.key] || { bg: 'bg-slate-400', text: 'text-white', label: '?' }
  const label = param.target?.label || param.rawName

  const statusConfig = {
    ok: { ring: 'ring-emerald-500/40', bg: 'bg-emerald-500/5', dot: 'bg-emerald-500', icon: '✓' },
    low_warning: { ring: 'ring-yellow-500/40', bg: 'bg-yellow-500/5', dot: 'bg-yellow-500', icon: '↓' },
    high_warning: { ring: 'ring-yellow-500/40', bg: 'bg-yellow-500/5', dot: 'bg-yellow-500', icon: '↑' },
    low_critical: { ring: 'ring-red-500/40', bg: 'bg-red-500/5', dot: 'bg-red-500', icon: '↓' },
    high_critical: { ring: 'ring-red-500/40', bg: 'bg-red-500/5', dot: 'bg-red-500', icon: '↑' },
    unknown: { ring: 'ring-border/40', bg: 'bg-background/40', dot: 'bg-muted-foreground', icon: '?' },
  }
  const sc = statusConfig[param.status] || statusConfig.unknown

  // Calculate gauge position (0-100%)
  const gaugePct = useMemo(() => {
    if (!param.target || param.value == null || isNaN(param.value as number)) return null
    const range = param.target.max - param.target.min
    if (range <= 0) return null
    return Math.max(0, Math.min(100, ((param.value as number - param.target.min) / range) * 100))
  }, [param.value, param.target])

  // Ideal zone position on gauge
  const idealStartPct = param.target
    ? Math.max(0, Math.min(100, ((param.target.idealLow - param.target.min) / (param.target.max - param.target.min)) * 100))
    : 0
  const idealEndPct = param.target
    ? Math.max(0, Math.min(100, ((param.target.idealHigh - param.target.min) / (param.target.max - param.target.min)) * 100))
    : 100

  return (
    <div className={`flex flex-col rounded-xl border p-2 ring-1 ${sc.ring} ${sc.bg} backdrop-blur-md transition-all hover:scale-[1.02]`}>
      {/* Header: strip color badge + label + status icon */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[8px] font-bold ${stripColor.bg} ${stripColor.text}`}>
            {stripColor.label}
          </span>
          <span className="truncate text-[11px] font-semibold">{label}</span>
        </div>
        <span className={`text-sm font-bold ${sc.dot.replace('bg-', 'text-')}`}>{sc.icon}</span>
      </div>

      {/* Value + unit */}
      <div className="mt-1 flex items-baseline gap-1">
        <Input
          type="number"
          step="any"
          inputMode="decimal"
          value={editedValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 border-none bg-transparent p-0 text-lg font-bold shadow-none focus-visible:ring-0"
          placeholder="—"
        />
        {param.unit && (
          <span className="shrink-0 text-[9px] text-muted-foreground">{param.unit}</span>
        )}
      </div>

      {/* Visual gauge: shows where value falls in range */}
      {gaugePct != null && (
        <div className="relative mt-1.5 h-1.5 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-red-500">
          {/* Ideal zone overlay */}
          <div
            className="absolute h-full rounded-full bg-emerald-500/60"
            style={{ left: `${idealStartPct}%`, width: `${idealEndPct - idealStartPct}%` }}
          />
          {/* Value marker */}
          <div
            className="absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded-full bg-white shadow-md ring-1 ring-gray-400"
            style={{ left: `calc(${gaugePct}% - 2px)` }}
          />
        </div>
      )}

      {/* Ideal range + status */}
      {param.target && (
        <div className="mt-1 flex items-center justify-between text-[8px] text-muted-foreground">
          <span>
            {param.target.idealLow}–{param.target.idealHigh}{param.unit && ` ${param.unit}`}
          </span>
          {param.status !== 'unknown' && (
            <span className={
              param.status === 'ok' ? 'text-emerald-500 font-semibold' :
              (param.status === 'low_warning' || param.status === 'high_warning') ? 'text-yellow-500 font-semibold' :
              'text-red-500 font-semibold'
            }>
              {t(`status.${param.status}`)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Reorder strips modal ─────────────────────────────────────────────────────
function ReorderStripsModal({ onClose, t }: { onClose: () => void; t: any }) {
  const [stock, setStock] = useState(5)
  const [ordered, setOrdered] = useState(false)

  const partners = [
    { name: 'Aqualux', logo: '💧', delivery: '24-48h', price: '9,90€', stock: 50 },
    { name: 'HTH', logo: '🔵', delivery: '2-3j', price: '8,50€', stock: 120 },
    { name: 'Bayrol', logo: '🌿', delivery: '3-5j', price: '12,90€', stock: 8 },
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gold/20 bg-background p-5 shadow-2xl">
        {ordered ? (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <h3 className="font-display text-lg font-bold">Commande envoyée !</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Votre commande de bandelettes a été transmise à notre partenaire.
            </p>
            <Button onClick={onClose} className="mt-4 w-full">Fermer</Button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold">Commander des bandelettes</h3>
                <p className="text-xs text-muted-foreground">Via nos partenaires Care</p>
              </div>
              <button onClick={onClose} className="rounded-full p-1 hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Current stock */}
            <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <label className="text-xs font-semibold">Votre stock restant</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="w-12 text-right text-sm font-bold">{stock} unités</span>
              </div>
              {stock <= 5 && (
                <p className="mt-1 text-[11px] font-medium text-red-500">
                  ⚠ Stock faible — commande recommandée
                </p>
              )}
            </div>

            {/* Partner list */}
            <div className="space-y-2">
              {partners.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setOrdered(true)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-secondary/30 p-2.5 text-left transition-all hover:border-gold/40 hover:bg-secondary/50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-background text-lg">{p.logo}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Livraison {p.delivery} · {p.stock} en stock
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gold">{p.price}</p>
                    <p className="text-[9px] text-muted-foreground">50 bandelettes</p>
                  </div>
                </button>
              ))}
            </div>

            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              🔗 Intégration Care · Paiement sécurisé · Livraison France
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default StripScanner
