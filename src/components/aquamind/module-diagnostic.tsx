'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Camera,
  Upload,
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Image as ImageIcon,
  History,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Pencil,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import { takePhoto, pickFromGallery, requestCameraPermission } from '@/lib/native/camera'
import { isNative } from '@/lib/platform'
import { offlineApi } from '@/lib/offline/api-cache'
import { api } from '@/lib/api-client'
import { useOfflineStore } from '@/lib/offline/offline-store'
import { hapticSuccess, hapticError } from '@/lib/native/haptics'
import { DiagnosticActionPlan } from './diagnostic-action-plan'

interface DiagnosticResult {
  imageType?: string
  detectedIssues?: string[]
  probableIssues?: string[]
  confidence?: number
  missingData?: string[]
  recommendedNextStep?: string
  safetyWarnings?: string[]
  userFriendlySummary?: string
}

interface SavedDiagnostic {
  id: string
  type: string
  imageUrl: string
  detectedIssues: string
  probableIssues: string
  confidence: number
  aiSummary: string
  missingData: string
  recommendedNextStep: string | null
  safetyWarnings: string
  createdAt: string
}

const TYPE_HINTS = [
  { value: 'water', label: 'Eau (surface)', desc: 'Couleur, transparence' },
  { value: 'wall', label: 'Paroi / fond', desc: 'Algues, dépôts' },
  { value: 'filter', label: 'Filtre', desc: 'Pression, état' },
  { value: 'electrolyzer', label: 'Électrolyseur', desc: 'Cellule, voyants' },
  { value: 'pump', label: 'Pompe', desc: 'Fuites, bruit' },
  { value: 'strip', label: 'Bandelette test', desc: 'Couleurs' },
  { value: 'product', label: 'Produit / étiquette', desc: 'Dosage, notice' },
  { value: 'equipment', label: 'Autre équipement', desc: 'Skimmer, robot…' },
]

function safeParse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback
  try {
    return JSON.parse(s) as T
  } catch {
    return fallback
  }
}

export function ModuleDiagnostic() {
  const [typeHint, setTypeHint] = useState<string>('water')
  const [image, setImage] = useState<string | null>(null)
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<SavedDiagnostic[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const queueAction = useOfflineStore((s) => s.queueAction)
  const isOnline = useOfflineStore((s) => s.isOnline)

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const { data } = await offlineApi.photoDiagnostic()
      setHistory((data as any)?.diagnostics || [])
    } catch {
      setHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Fichier invalide', description: 'Choisissez une image.', variant: 'destructive' })
      return
    }
    if (file.size > 6 * 1024 * 1024) {
      toast({
        title: 'Image trop lourde',
        description: 'Maximum 6 Mo.',
        variant: 'destructive',
      })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImage(reader.result as string)
      setResult(null)
    }
    reader.readAsDataURL(file)
  }

  // Native camera capture (iOS/Android via Capacitor)
  async function handleTakePhoto() {
    const granted = await requestCameraPermission()
    if (!granted) {
      toast({ title: 'Permission refusée', description: 'Autorisez la caméra dans les réglages.', variant: 'destructive' })
      hapticError()
      return
    }
    const photo = await takePhoto()
    if (photo?.dataUrl) {
      setImage(photo.dataUrl)
      setResult(null)
      hapticSuccess()
    }
  }

  // Native gallery picker (iOS/Android via Capacitor)
  async function handlePickFromGallery() {
    const photo = await pickFromGallery()
    if (photo?.dataUrl) {
      setImage(photo.dataUrl)
      setResult(null)
    }
  }

  async function analyze() {
    if (!image) return
    setLoading(true)
    setResult(null)
    try {
      if (!isOnline) {
        toast({ title: 'Hors connexion', description: 'L\'analyse IA nécessite Internet.', variant: 'destructive' })
        hapticError()
        return
      }
      const data = await api.post<{ diagnostic: DiagnosticResult }>('/api/pool/photo-diagnostic', { image, typeHint })
      setResult(data.diagnostic || null)
      hapticSuccess()
      toast({
        title: 'Analyse terminée',
        description: 'Diagnostic IA disponible ci-dessous.',
      })
      loadHistory()
    } catch (e) {
      hapticError()
      toast({
        title: 'Erreur',
        description: e instanceof Error ? e.message : 'Analyse impossible',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setImage(null)
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="section-label">Diagnostic visuel</span>
            <span className="h-px w-8 bg-gold/40" />
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Diagnostic par photo
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Photographiez l'eau, une paroi, le filtre ou une bandelette. AQWELIA identifie les
            problèmes probables et propose la prochaine étape.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left: upload + type selector */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Camera className="h-4 w-4 text-primary" />
              1. Photo à analyser
            </CardTitle>
            <CardDescription className="text-xs">
              Type de photo pour guider l'IA (vous pouvez changer).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {TYPE_HINTS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTypeHint(t.value)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                    typeHint === t.value
                      ? 'border-gold/60 bg-gold/10 text-gold shadow-sm'
                      : 'border-border bg-background hover:border-gold/30'
                  }`}
                  title={t.desc}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {!image ? (
              <div className="space-y-3">
                {/* Native camera buttons (iOS/Android only) */}
                {isNative() && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleTakePhoto}
                      className="gap-2 bg-gradient-to-r from-primary to-ocean-light text-primary-foreground"
                    >
                      <Camera className="h-4 w-4" />
                      Prendre une photo
                    </Button>
                    <Button
                      onClick={handlePickFromGallery}
                      variant="outline"
                      className="gap-2 border-border/60"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Galerie
                    </Button>
                  </div>
                )}
                <label
                  htmlFor="diag-upload"
                  className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gold/30 bg-gold/5 px-6 py-10 text-center transition-all hover:border-gold/60 hover:bg-gold/10"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-gold shadow-md shadow-primary/30">
                    <Upload className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-semibold">
                      {isNative() ? 'Ou importez un fichier' : 'Cliquez ou déposez une photo'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      JPG / PNG / WEBP — max 6 Mo
                    </p>
                  </div>
                  <input
                    id="diag-upload"
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFile(f)
                    }}
                  />
                </label>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border border-border/60">
                <img src={image} alt="À analyser" className="max-h-72 w-full object-cover" />
                <button
                  onClick={reset}
                  className="absolute right-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-md backdrop-blur-md hover:bg-background"
                >
                  Changer
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={analyze}
                disabled={!image || loading}
                className="flex-1 bg-gradient-to-r from-primary to-gold text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyse IA en cours…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyser avec l'IA
                  </>
                )}
              </Button>
              {image && !loading && (
                <Button variant="outline" onClick={reset}>
                  Annuler
                </Button>
              )}
            </div>

            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-gold" />
              Valeurs probables, pas exactes. L'IA peut se tromper — confirmez avec un test d'eau
              avant tout traitement.
            </p>
          </CardContent>
        </Card>

        {/* Right: result */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Sparkles className="h-4 w-4 text-gold" />
              2. Résultat du diagnostic
            </CardTitle>
            <CardDescription className="text-xs">
              L'IA identifie les problèmes visibles et suggère des actions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : !result ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Importez une photo et cliquez sur « Analyser ».
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Confidence */}
                {typeof result.confidence === 'number' && (
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium">Confiance de l'analyse</span>
                      <span className="font-bold text-gold">
                        {Math.round(result.confidence * 100)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-all"
                        style={{ width: `${Math.max(5, Math.min(100, result.confidence * 100))}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Summary */}
                {result.userFriendlySummary && (
                  <div className="rounded-xl border border-gold/30 bg-gold/5 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gold">
                      Résumé
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">{result.userFriendlySummary}</p>
                  </div>
                )}

                {/* Detected issues */}
                {result.detectedIssues && result.detectedIssues.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      Problèmes détectés
                    </p>
                    <ul className="space-y-1">
                      {result.detectedIssues.map((d, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2 text-xs"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Probable issues */}
                {result.probableIssues && result.probableIssues.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-300">
                      <Lightbulb className="h-3 w-3" />
                      Causes probables
                    </p>
                    <ul className="space-y-1">
                      {result.probableIssues.map((d, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-2 text-xs"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-500" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended next step */}
                {result.recommendedNextStep && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Prochaine étape
                    </p>
                    <p className="mt-1 text-sm">{result.recommendedNextStep}</p>
                  </div>
                )}

                {/* Safety warnings */}
                {result.safetyWarnings && result.safetyWarnings.length > 0 && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                      <ShieldAlert className="h-3 w-3" />
                      Avertissements sécurité
                    </p>
                    <ul className="mt-1.5 space-y-1 text-xs text-destructive">
                      {result.safetyWarnings.map((w, i) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing data */}
                {result.missingData && result.missingData.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium">Données manquantes pour confirmer :</p>
                    <p className="mt-0.5">{result.missingData.join(', ')}.</p>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-[oklch(0.7_0.15_155)]" />
                  Diagnostic enregistré dans le carnet.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Plan — appears after a diagnostic is produced */}
      {result && (
        <DiagnosticActionPlan
          diagnostic={result}
          onRecheck={async (newImage) => {
            try {
              if (!isOnline) {
                toast({
                  title: 'Hors connexion',
                  description: "L'analyse IA nécessite Internet.",
                  variant: 'destructive',
                })
                return null
              }
              const data = await api.post<{ diagnostic: DiagnosticResult }>(
                '/api/pool/photo-diagnostic',
                { image: newImage, typeHint },
              )
              hapticSuccess()
              // Refresh history so the new re-check diagnostic shows up
              loadHistory()
              return data.diagnostic || null
            } catch (e) {
              hapticError()
              toast({
                title: 'Erreur',
                description:
                  e instanceof Error ? e.message : 'Analyse impossible',
                variant: 'destructive',
              })
              return null
            }
          }}
        />
      )}

      {/* History */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <History className="h-4 w-4 text-primary" />
              Diagnostics récents
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={loadHistory} className="h-7 text-xs">
              <RefreshCw className="h-3 w-3" />
              Rafraîchir
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              Aucun diagnostic pour le moment.
            </div>
          ) : (
            <div className="custom-scroll max-h-96 space-y-2 overflow-y-auto pr-1">
              {history.map((d) => {
                const detected = safeParse<string[]>(d.detectedIssues, [])
                const summaryLower = (d.aiSummary || '').toLowerCase()
                const isResolved =
                  detected.length === 0 ||
                  summaryLower.includes('résolu') ||
                  summaryLower.includes('resolu') ||
                  summaryLower.includes('sain')
                return (
                  <div
                    key={d.id}
                    className="group flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3 transition-all hover:border-primary/30 hover:bg-primary/5"
                  >
                    {/* Clickable area — reopen diagnostic */}
                    <button
                      onClick={() => {
                        // Reopen this diagnostic: set image + result
                        if (d.imageUrl) setImage(d.imageUrl)
                        setResult({
                          imageType: d.type,
                          detectedIssues: detected,
                          probableIssues: safeParse<string[]>(d.probableIssues, []),
                          confidence: d.confidence,
                          missingData: safeParse<string[]>(d.missingData, []),
                          recommendedNextStep: d.recommendedNextStep || undefined,
                          safetyWarnings: safeParse<string[]>(d.safetyWarnings, []),
                          userFriendlySummary: d.aiSummary,
                        })
                        setTypeHint(d.type)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                        toast({ title: 'Diagnostic rouvert', description: 'Vous pouvez compléter les étapes ci-dessous.' })
                      }}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                        {d.imageUrl && d.imageUrl.startsWith('data:') ? (
                          <img src={d.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {d.type}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(d.createdAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isResolved && (
                            <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" />
                              Résolu
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {d.aiSummary}
                        </p>
                        {!isResolved && detected.length > 0 && (
                          <p className="mt-1 text-[11px] text-destructive">
                            ⚠ {detected.slice(0, 2).join(' · ')}
                          </p>
                        )}
                        <span className="mt-1 flex items-center gap-1 text-[10px] text-primary opacity-0 transition-opacity group-hover:opacity-100">
                          <Pencil className="h-3 w-3" />
                          Cliquer pour rouvrir & compléter
                        </span>
                      </div>
                    </button>
                    {/* Delete button — branded AlertDialog */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          title="Supprimer"
                          aria-label="Supprimer ce diagnostic"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="overflow-hidden border-border/60 bg-background/95 backdrop-blur-xl">
                        {/* Branded header with logo */}
                        <div className="flex flex-col items-center border-b border-border/40 bg-gradient-to-br from-primary/5 to-gold/5 px-6 pb-4 pt-6">
                          <div className="relative mb-3">
                            <div className="absolute -inset-[3px] rounded-[14px] bg-gradient-to-br from-gold via-ocean-light to-primary opacity-70 blur-[2px]" />
                            <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl shadow-md">
                              <img src="/icon-aqwelia-48.png" alt="AQWELIA" className="h-12 w-12 object-cover" />
                            </div>
                          </div>
                          <AlertDialogTitle className="text-center font-display text-lg font-bold">
                            <span className="aqua-text-gradient">Supprimer ce diagnostic ?</span>
                          </AlertDialogTitle>
                        </div>
                        <div className="px-6 py-4">
                          <AlertDialogDescription className="text-center text-sm text-muted-foreground">
                            Cette action est définitive. Le diagnostic et sa photo seront supprimés définitivement de votre historique.
                          </AlertDialogDescription>
                          {d.aiSummary && (
                            <div className="mt-3 rounded-lg border border-border/40 bg-secondary/30 p-2.5">
                              <p className="line-clamp-2 text-xs text-muted-foreground">
                                📸 {d.aiSummary}
                              </p>
                            </div>
                          )}
                        </div>
                        <AlertDialogFooter className="gap-2 px-6 pb-6">
                          <AlertDialogCancel className="rounded-full border-border/60 px-6">
                            Annuler
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await api.delete(`/api/pool/photo-diagnostic?id=${d.id}`)
                                toast({ title: 'Diagnostic supprimé', description: 'Le diagnostic a été retiré de votre historique.' })
                                loadHistory()
                              } catch {
                                toast({ title: 'Erreur', description: 'Suppression impossible', variant: 'destructive' })
                              }
                            }}
                            className="rounded-full bg-destructive px-6 text-destructive-foreground hover:bg-destructive/90"
                          >
                            <Trash2 className="mr-1.5 h-4 w-4" />
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
