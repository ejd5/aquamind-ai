'use client'

/**
 * ARQWELIA Lot 2 — A2 web-mobile AR POC viewer.
 *
 * Wraps <model-viewer> (@google/model-viewer) for the /arqwelia/lab/ar-poc
 * internal lab route. DISABLED by default: when
 * NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED is not exactly "true", this component
 * renders ZERO DOM (returns null).
 *
 * Behaviour:
 *  - Lazy-loads the model-viewer script via dynamic import() after mount so it
 *    never blocks initial paint; until then it shows the poster + a message.
 *  - Enables AR with ar-modes="webxr scene-viewer quick-look", fixed scale,
 *    floor placement, camera controls and a lazy-loaded model.
 *  - Falls back to a visible 2D message + poster + "open interactive 3D view"
 *    link when AR is unavailable (prop override or runtime detection via
 *    model-viewer's `canActivateAR` boolean).
 *  - Respects prefers-reduced-motion: renders poster + text, no auto-rotate.
 */
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { isArqweliaArPocEnabled } from '@/lib/features'
import type { ModelViewerElement } from '@google/model-viewer'

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- JSX intrinsic element augmentation
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string
        alt?: string
        ar?: boolean
        'ar-modes'?: string
        'ar-placement'?: string
        'ar-scale'?: string
        'camera-controls'?: boolean
        'auto-rotate'?: boolean
        loading?: 'auto' | 'lazy' | 'eager'
        poster?: string
        'shadow-intensity'?: string
        'touch-action'?: string
      }
    }
  }
}

export const MODEL_VIEWER_SRC = '/models/arqwelia-pool-poc.glb'
export const MODEL_VIEWER_POSTER = '/models/arqwelia-pool-poc-poster.svg'
export const MODEL_VIEWER_AR_MODES = 'webxr scene-viewer quick-look'

export interface ArqweliaModelViewerProps {
  /** Descriptive alt text (from i18n). */
  alt: string
  /** true → AR entry enabled + auto-rotate; false → plain desktop orbit. */
  interactive?: boolean
  modelRef?: React.Ref<ModelViewerElement>
}

/**
 * Presentational <model-viewer> element (no hooks, SSR-safe). Kept separate so
 * tests can assert the exact AR attributes without a DOM.
 */
export function ArqweliaModelViewer({ alt, interactive = true, modelRef }: ArqweliaModelViewerProps) {
  return (
    <model-viewer
      ref={modelRef}
      src={MODEL_VIEWER_SRC}
      alt={alt}
      ar={interactive}
      ar-modes={MODEL_VIEWER_AR_MODES}
      ar-placement="floor"
      ar-scale="fixed"
      camera-controls
      auto-rotate={interactive}
      loading="lazy"
      poster={MODEL_VIEWER_POSTER}
      shadow-intensity="1"
      style={{ width: '100%', height: 'min(70vh, 520px)' }}
    />
  )
}

export interface ArqweliaArViewerProps {
  /** Force AR availability (default: runtime detection). */
  arSupported?: boolean
  /** Force reduced-motion handling (default: prefers-reduced-motion media query). */
  reducedMotion?: boolean
}

/**
 * Best-effort AR capability detection (used until the model-viewer element is
 * upgraded and can report its own `canActivateAR`). WebXR → Android Chrome /
 * ARCore; AR Quick Look (usdz) covers iOS Safari 12+; Android Chrome covers
 * scene-viewer.
 */
function detectArSupport(): boolean {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { xr?: unknown }
  if (typeof nav.xr !== 'undefined' && nav.xr) return true
  if (typeof navigator.userAgent !== 'string') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || /Android/i.test(navigator.userAgent)
}

export function ArqweliaArViewer({ arSupported, reducedMotion }: ArqweliaArViewerProps) {
  const t = useTranslations('arqwelia')

  const [scriptReady, setScriptReady] = useState(false)
  const [arDetected, setArDetected] = useState<boolean | null>(null)
  const [show3d, setShow3d] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const modelRef = useRef<ModelViewerElement | null>(null)

  useEffect(() => {
    if (!isArqweliaArPocEnabled()) return
    let cancelled = false

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const onMotionChange = () => setPrefersReducedMotion(mq.matches)
    mq.addEventListener('change', onMotionChange)

    // Initial best-effort heuristic so the fallback is meaningful even if the
    // model-viewer script is slow to load.
    setArDetected(detectArSupport())

    // Lazy-load the ~700 kB model-viewer runtime after first paint.
    import('@google/model-viewer')
      .then(() => {
        if (!cancelled) setScriptReady(true)
      })
      .catch(() => {
        // Script failed to load — keep the poster fallback.
        if (!cancelled) setScriptReady(true)
      })

    return () => {
      cancelled = true
      mq.removeEventListener('change', onMotionChange)
    }
  }, [])

  // Once the element is mounted + upgraded, prefer model-viewer's own signal:
  // canActivateAR is true when one of the configured ar-modes is active.
  useEffect(() => {
    if (!scriptReady) return
    const el = modelRef.current
    setArDetected(Boolean(el && el.canActivateAR))
  }, [scriptReady])

  if (!isArqweliaArPocEnabled()) {
    return null // ZERO DOM when the client flag is off.
  }

  const reduced = reducedMotion ?? prefersReducedMotion
  const arUnavailable =
    arSupported === false || (arSupported === undefined && arDetected === false)

  // Reduced motion: static poster + text, no auto-rotate, no 3D canvas.
  if (reduced) {
    return (
      <div>
        <h2 className="sr-only">{t('lab.arPoc.title')}</h2>
        <img src={MODEL_VIEWER_POSTER} alt={t('lab.arPoc.posterAlt')} className="aspect-video w-full rounded-2xl object-cover" />
        <p className="mt-4 text-sm text-white/70">{t('lab.arPoc.reducedMotionNotice')}</p>
        <p className="mt-1 text-xs text-white/50">{t('lab.arPoc.fallbackText')}</p>
      </div>
    )
  }

  // AR unavailable: visible 2D message + poster + link to the interactive 3D view.
  if (arUnavailable && !show3d) {
    return (
      <div>
        <img src={MODEL_VIEWER_POSTER} alt={t('lab.arPoc.posterAlt')} className="aspect-video w-full rounded-2xl object-cover" />
        <p className="mt-4 rounded-lg border border-arq-aqua/30 bg-arq-aqua/5 px-3 py-2 text-sm font-medium text-arq-aqua">
          {t('lab.arPoc.arUnavailable')}
        </p>
        <p className="mt-2 text-sm text-white/70">{t('lab.arPoc.fallbackText')}</p>
        <button
          type="button"
          onClick={() => setShow3d(true)}
          className="mt-4 rounded-full border border-white/[0.12] px-5 py-2.5 text-[13px] font-semibold text-white/80 transition-colors hover:border-arq-aqua/50 hover:bg-arq-aqua/5 hover:text-white"
        >
          {t('lab.arPoc.open3dView')}
        </button>
      </div>
    )
  }

  const interactiveView = arUnavailable && show3d

  return (
    <div>
      {!scriptReady ? (
        <div>
          <img src={MODEL_VIEWER_POSTER} alt={t('lab.arPoc.posterAlt')} className="aspect-video w-full rounded-2xl object-cover" />
          <p className="mt-4 text-sm text-white/70">{t('lab.arPoc.loading')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
          <ArqweliaModelViewer
            alt={t('lab.arPoc.alt')}
            interactive={!interactiveView}
            modelRef={modelRef}
          />
        </div>
      )}

      <h2 className="mt-6 font-aq-display text-xl font-semibold text-white">{t('lab.arPoc.title')}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">{t('lab.arPoc.description')}</p>
      <p className="mt-2 text-xs text-white/45">{t('lab.arPoc.keyboardNote')}</p>
    </div>
  )
}
