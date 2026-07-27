'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWizardStore } from '@/lib/arqwelia/wizard-store'
import {
  ARQ_PHOTO_MAX,
  ARQ_PHOTO_MAX_BYTES,
  ARQ_PHOTO_ACCEPTED,
  ARQ_CONSENT_VERSION,
  type ArqPhotoMeta,
} from '@/lib/arqwelia/types'
import { arqTrackClient } from '@/lib/arqwelia/analytics-client'
import {
  ArqweliaGlassCard,
  ArqweliaLabel,
  ArqweliaPrimaryButton,
  ArqweliaSecondaryButton,
  ArqweliaFutureFeature,
} from '@/components/arqwelia/ui'

export default function PhotosStep() {
  const t = useTranslations('arqwelia')
  const router = useRouter()
  const store = useWizardStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [overflowMsg, setOverflowMsg] = useState(false)
  const [demoActive, setDemoActive] = useState(store.demoMode)

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setOverflowMsg(false)
    const incoming = Array.from(files)
    for (const file of incoming) {
      if (store.photos.length >= ARQ_PHOTO_MAX) {
        setError(t('wizard.errors.photoCount'))
        break
      }
      if (file.size > ARQ_PHOTO_MAX_BYTES) { setError(t('wizard.errors.photoTooBig')); continue }
      if (!ARQ_PHOTO_ACCEPTED.includes(file.type)) { setError(t('wizard.errors.photoType')); continue }
      try {
        const dataUrl = await readAsDataUrl(file)
        const meta: ArqPhotoMeta = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
        }
        const res = store.addPhoto(meta)
        if (!res.ok) { setError(t('wizard.errors.photoCount')); break }
        void arqTrackClient('arq_photo_added', { size: file.size, type: file.type })
      } catch {
        // sessionStorage likely exceeded quota — graceful: drop photos, keep the rest.
        setOverflowMsg(true)
        break
      }
    }
  }

  function startDemo() {
    store.startDemo()
    setDemoActive(true)
    void arqTrackClient('arq_demo_start', { step: 'photos' })
    router.push('/arqwelia/start/project')
  }

  const remaining = ARQ_PHOTO_MAX - store.photos.length

  return (
    <div>
      <Link href="/arqwelia" className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-arq-aqua">← {t('wizard.back')}</Link>
      <h1 className="font-aq-display text-3xl font-semibold text-arq-mist sm:text-4xl">{t('wizard.photos.title')}</h1>
      <p className="mt-3 text-arq-mist/60">{t('wizard.photos.desc')}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-arq-aqua/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-arq-aqua">
          {t('wizard.photos.accepted')}
        </span>
        <span className="rounded-full border border-arq-mist/15 px-3 py-1 text-[11px] font-semibold text-arq-mist/60">
          {remaining}/{ARQ_PHOTO_MAX} restantes
        </span>
      </div>

      {/* Tips */}
      <ArqweliaGlassCard className="mt-6 p-5">
        <ArqweliaLabel>{t('wizard.photos.tipsTitle')}</ArqweliaLabel>
        <ul className="mt-3 grid gap-2 text-sm text-arq-mist/60 sm:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <li key={n} className="flex gap-2"><span className="text-arq-aqua">•</span>{t(`wizard.photos.tip${n}` as const)}</li>
          ))}
        </ul>
      </ArqweliaGlassCard>

      {/* Premium upload zone / empty state */}
      <div className="mt-6">
        {store.photos.length === 0 ? (
          <div
            role="button"
            tabIndex={0}
            aria-label={t('wizard.photos.add')}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click() }}
            className="group flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-arq-aqua/30 bg-gradient-to-br from-arq-navy-2/40 to-arq-navy-deep/40 p-8 text-center transition-all hover:border-arq-aqua/60 hover:from-arq-navy-2/60 focus:outline-none focus:ring-2 focus:ring-arq-aqua/40"
            style={{ boxShadow: 'inset 0 0 60px -20px rgba(0,214,197,0.20)' }}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-arq-aqua/35 bg-arq-aqua/10" style={{ boxShadow: 'var(--arqwelia-glow-aqua)' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00D6C5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            </div>
            <p className="mt-4 text-base font-semibold text-arq-mist">{t('wizard.photos.add')}</p>
            <p className="mt-1 text-xs text-arq-mist/45">JPG · PNG · WebP — 10 Mo max par fichier</p>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label={t('wizard.photos.add')}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click() }}
            className="flex min-h-[88px] cursor-pointer items-center justify-center rounded-2xl border border-dashed border-arq-aqua/25 bg-arq-navy-2/30 p-5 text-sm font-semibold text-arq-mist/60 transition-colors hover:border-arq-aqua/50 hover:text-arq-mist"
          >
            + {t('wizard.photos.add')}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>
      )}

      {overflowMsg && (
        <ArqweliaGlassCard className="mt-4 border-l-2 border-l-[var(--arqwelia-border-gold)] p-4">
          <div className="flex items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C6A56B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>
            <p className="text-sm text-arq-mist/70">
              Votre navigateur ne peut pas conserver toutes ces photos en session. Vos réponses sont conservées — ce problème ne vous bloque pas pour continuer.
            </p>
          </div>
        </ArqweliaGlassCard>
      )}

      {/* Demo path */}
      <div className="mt-5">
        <ArqweliaSecondaryButton onClick={startDemo}>{t('wizard.photos.demoBtn')}</ArqweliaSecondaryButton>
      </div>
      {demoActive && <div className="mt-2"><ArqweliaFutureFeature kind="demo">{t('wizard.demo')}</ArqweliaFutureFeature></div>}

      {/* Previews */}
      {store.photos.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {store.photos.map((p) => (
            <div key={p.id} className="relative overflow-hidden rounded-xl border border-arq-border shadow-arq-deep">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.dataUrl} alt={p.name} className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => store.removePhoto(p.id)}
                className="absolute right-1.5 top-1.5 rounded-full bg-arq-navy-deep/85 px-2 py-1 text-[10px] font-semibold text-arq-mist backdrop-blur hover:bg-red-500/40"
                aria-label={t('wizard.photos.remove')}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 flex items-center gap-2 text-xs text-arq-mist/45">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#43CFF5" strokeWidth="1.6" strokeLinecap="round"><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" /></svg>
        {t('wizard.photos.privacy')}
      </p>

      <div className="mt-8 flex justify-end">
        <ArqweliaPrimaryButton
          onClick={() => {
            void arqTrackClient('arq_photo_step_completed', { count: store.photos.length, demo: demoActive })
            router.push('/arqwelia/start/project')
          }}
          disabled={store.photos.length === 0 && !demoActive}
        >
          {t('wizard.next')}
        </ArqweliaPrimaryButton>
      </div>
    </div>
  )
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => { try { sessionStorage.setItem('arq-photo-quota-test', String(Date.now())); resolve(String(r.result)) } catch (e) { reject(e) } }
    r.onerror = reject
    r.readAsDataURL(file)
  })
}