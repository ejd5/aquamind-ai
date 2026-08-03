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
 *  - Tracks TWO explicit states:
 *      runtimeStatus: 'idle' | 'loading' | 'ready' | 'failed'
 *        'failed' when the model-viewer module import fails OR the
 *        <model-viewer> custom element is not registered after import — the
 *        viewer is then never marked ready and an uninitialized custom element
 *        is never rendered (poster + FR/EN loadError message instead).
 *      modelStatus: 'idle' | 'loading' | 'ready' | 'failed'
 *        driven by the 'load' / 'error' events dispatched by <model-viewer>.
 *        On 'error' the viewer is hidden and a 2D fallback + a single manual
 *        retry button are shown (never auto-loop).
 *  - Enables AR with ar-modes="webxr scene-viewer quick-look", fixed scale,
 *    floor placement, camera controls and a lazy-loaded model.
 *  - Falls back to a visible 2D message + poster + "open interactive 3D view"
 *    link when AR is unavailable (prop override or runtime detection via
 *    model-viewer's `canActivateAR` boolean).
 *  - Respects prefers-reduced-motion: renders poster + text, no auto-rotate.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
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

export type RuntimeStatus = 'idle' | 'loading' | 'ready' | 'failed'
export type ModelStatus = 'idle' | 'loading' | 'ready' | 'failed'

/** Model-viewer's custom element tag. */
export const MODEL_VIEWER_TAG = 'model-viewer'

/**
 * Pure state machine for the viewer UI (no DOM needed, unit-tested).
 *
 * - 'runtime-failed' → module import failed / custom element not registered:
 *   never mark ready, show poster + loadError, no uninitialized element.
 * - 'model-failed' → <model-viewer> dispatched 'error': hide the viewer, show
 *   2D fallback + message + a single retry button.
 * - 'loading' → poster/loading indicator while the viewer or model loads.
 * - 'ready' → viewer interactive.
 */
export function resolveArqweliaViewerState(
  runtime: RuntimeStatus,
  model: ModelStatus,
): 'runtime-failed' | 'model-failed' | 'loading' | 'ready' {
  if (runtime === 'failed') return 'runtime-failed'
  if (runtime !== 'ready') return 'loading'
  if (model === 'failed') return 'model-failed'
  if (model === 'ready') return 'ready'
  return 'loading'
}

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

/** Count the rendered hooks on a function-component fiber (dev-time utility). */
function hookCount(fiber: { memoizedState?: unknown }): number {
  let count = 0
  let hook = fiber.memoizedState as { next?: unknown } | null | undefined
  while (hook) {
    count++
    hook = hook.next as { next?: unknown } | null
  }
  return count
}

export function ArqweliaArViewer({ arSupported, reducedMotion }: ArqweliaArViewerProps) {
  const t = useTranslations('arqwelia')

  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>('idle')
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle')
  const [arDetected, setArDetected] = useState<boolean | null>(null)
  const [show3d, setShow3d] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const modelRef = useRef<ModelViewerElement | null>(null)
  const retryNonceRef = useRef(0)

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

    // Lazy-load the ~700 kB model-viewer runtime after first paint. Importing
    // the module registers the <model-viewer> custom element as a side effect.
    setRuntimeStatus('loading')
    import('@google/model-viewer')
      .then(() => {
        if (cancelled) return
        const isDefined =
          typeof window !== 'undefined' &&
          typeof window.customElements !== 'undefined' &&
          Boolean(window.customElements.get(MODEL_VIEWER_TAG))
        if (!isDefined) {
          // The custom element was not registered: never mark ready and never
          // render an uninitialized <model-viewer>.
          setRuntimeStatus('failed')
          return
        }
        setRuntimeStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setRuntimeStatus('failed')
      })

    return () => {
      cancelled = true
      mq.removeEventListener('change', onMotionChange)
    }
  }, [])

  const reduced = reducedMotion ?? prefersReducedMotion
  const arUnavailable =
    arSupported === false || (arSupported === undefined && arDetected === false)

  // Single manual retry. Attached to the <button> as a NATIVE click listener
  // (via a callback ref) because after a <model-viewer> load error the dev
  // server's React 19.2 tree can stop delivering delegated onClick events for
  // this subtree. The handler re-resolves the live fiber dispatchers at click
  // time — plain captured useState setters can silently stop driving the
  // committed fiber in that state — then reloads the model in place.
  //
  // The model is NOT remounted through React (key) on retry: after a load error
  // the dev server aborts that commit and reverts the whole update (status stays
  // "failed"). Instead we set modelStatus back to "loading" and force the SAME
  // <model-viewer> element to re-fetch by changing its `src` imperatively —
  // exactly one new GLB request, never an auto-loop.
  const handleRetry = useCallback(() => {
    const startEl = document.querySelector('[data-arqwelia-ar-poc]')
    if (!startEl) return
    const fiberKey = Object.keys(startEl).find((k) => k.startsWith('__reactFiber'))
    if (!fiberKey) return
    let fiber = (startEl as unknown as Record<string, unknown>)[fiberKey] as
      | (Record<string, unknown> & {
          return?: unknown
          type?: unknown
          memoizedState?: unknown
        })
      | null
    let guard = 0
    while (fiber && guard++ < 80) {
      if (typeof fiber.type === 'function' && hookCount(fiber) >= 4) {
        let hook: any = fiber.memoizedState
        let idx = 0
        while (hook) {
          if (idx === 2 && typeof hook.queue?.dispatch === 'function') {
            ;(hook.queue.dispatch as (v: unknown) => void)('loading')
          }
          hook = hook.next
          idx++
        }
        break
      }
      fiber = fiber.return as never
    }
    // Reload the same element after the "loading" commit has made it visible.
    // The src is made distinct (cache-busting query) so model-viewer's
    // updateSource re-fetches — setting the same URL would bail out.
    retryNonceRef.current += 1
    setTimeout(() => {
      const el = document.querySelector(MODEL_VIEWER_TAG) as ModelViewerElement | null
      if (el) {
        el.setAttribute('src', MODEL_VIEWER_SRC + '?retry=' + retryNonceRef.current)
      }
    }, 100)
  }, [])

  const retryButtonRef = useCallback(
    (el: HTMLButtonElement | null) => {
      if (!el) return
      el.addEventListener('click', handleRetry)
      return () => el.removeEventListener('click', handleRetry)
    },
    [handleRetry],
  )

  // Callback ref: attach the 'load'/'error' listeners the moment the
  // <model-viewer> element is mounted (synchronously in the commit phase, so
  // no 'load'/'error' event can be missed), and remove them on unmount.
  const handleViewerMount = useCallback((el: ModelViewerElement | null) => {
    if (!el) return undefined
    modelRef.current = el
    const onLoad = () => setModelStatus('ready')
    const onError = () => setModelStatus('failed')
    el.addEventListener('load', onLoad)
    el.addEventListener('error', onError)
    return () => {
      if (modelRef.current === el) modelRef.current = null
      el.removeEventListener('load', onLoad)
      el.removeEventListener('error', onError)
    }
  }, [])

  // While the viewer is mounted, prefer model-viewer's own signals: its
  // `canActivateAR` and its `loaded` flag (covers the case where the model
  // finished loading before the listeners were attached, e.g. cached response).
  useEffect(() => {
    if (runtimeStatus !== 'ready') return
    const el = modelRef.current
    if (!el) return

    setArDetected(Boolean(el.canActivateAR))
    if (Boolean((el as ModelViewerElement & { loaded?: boolean }).loaded)) {
      setModelStatus('ready')
    }
  }, [runtimeStatus, show3d, arUnavailable])

  if (!isArqweliaArPocEnabled()) {
    return null // ZERO DOM when the client flag is off.
  }

  const wrapper = (body: React.ReactNode) => (
    <div data-arqwelia-ar-poc data-runtime-status={runtimeStatus} data-model-status={modelStatus}>
      {body}
      <h2 className="mt-6 font-aq-display text-xl font-semibold text-white">{t('lab.arPoc.title')}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">{t('lab.arPoc.description')}</p>
      <p className="mt-2 text-xs text-white/45">{t('lab.arPoc.keyboardNote')}</p>
    </div>
  )

  // Reduced motion: static poster + text, no auto-rotate, no 3D canvas.
  if (reduced) {
    return wrapper(
      <>
        <img src={MODEL_VIEWER_POSTER} alt={t('lab.arPoc.posterAlt')} className="aspect-video w-full rounded-2xl object-cover" />
        <p className="mt-4 text-sm text-white/70">{t('lab.arPoc.reducedMotionNotice')}</p>
        <p className="mt-1 text-xs text-white/50">{t('lab.arPoc.fallbackText')}</p>
      </>,
    )
  }

  // Runtime failed: import error or custom element not registered. Show the
  // poster + a FR/EN loadError message, never an uninitialized <model-viewer>.
  if (runtimeStatus === 'failed') {
    return wrapper(
      <>
        <img src={MODEL_VIEWER_POSTER} alt={t('lab.arPoc.posterAlt')} className="aspect-video w-full rounded-2xl object-cover" />
        <p className="mt-4 rounded-lg border border-arq-aqua/30 bg-arq-aqua/5 px-3 py-2 text-sm font-medium text-arq-aqua">
          {t('lab.arPoc.loadError')}
        </p>
        <p className="mt-2 text-sm text-white/70">{t('lab.arPoc.fallbackText')}</p>
      </>,
    )
  }

  // AR unavailable: visible 2D message + poster + link to the interactive 3D view.
  if (arUnavailable && !show3d) {
    return wrapper(
      <>
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
      </>,
    )
  }

  const interactiveView = arUnavailable && show3d
  const modelFailed = modelStatus === 'failed'

  // Once the runtime is ready the <model-viewer> is ALWAYS mounted in a stable
  // position — only its visibility toggles (hidden while the model failed).
  // Keeping the WebGL custom element mounted through the error transition
  // avoids unmounting it mid-error (which corrupted the React fiber in the
  // dev server). Retry reloads it in place via an imperative `src` change.
  const body =
    runtimeStatus === 'ready' ? (
      <div>
        <div
          className={`overflow-hidden rounded-2xl border border-white/[0.08] ${
            modelFailed ? 'hidden' : ''
          }`}
        >
          <ArqweliaModelViewer
            alt={t('lab.arPoc.alt')}
            interactive={!interactiveView}
            modelRef={handleViewerMount}
          />
        </div>
        {modelFailed ? (
          <div>
            <img src={MODEL_VIEWER_POSTER} alt={t('lab.arPoc.posterAlt')} className="mt-4 aspect-video w-full rounded-2xl object-cover" />
            <p className="mt-4 rounded-lg border border-arq-aqua/30 bg-arq-aqua/5 px-3 py-2 text-sm font-medium text-arq-aqua">
              {t('lab.arPoc.modelError')}
            </p>
            <p className="mt-2 text-sm text-white/70">{t('lab.arPoc.fallbackText')}</p>
            <button
              ref={retryButtonRef}
              type="button"
              className="mt-4 rounded-full border border-white/[0.12] px-5 py-2.5 text-[13px] font-semibold text-white/80 transition-colors hover:border-arq-aqua/50 hover:bg-arq-aqua/5 hover:text-white"
            >
              {t('lab.arPoc.retry')}
            </button>
          </div>
        ) : modelStatus === 'ready' ? null : (
          <p className="mt-3 text-sm text-white/70">{t('lab.arPoc.modelLoading')}</p>
        )}
      </div>
    ) : (
      <div>
        <img src={MODEL_VIEWER_POSTER} alt={t('lab.arPoc.posterAlt')} className="aspect-video w-full rounded-2xl object-cover" />
        <p className="mt-4 text-sm text-white/70">{t('lab.arPoc.loading')}</p>
      </div>
    )

  return wrapper(body)
}
