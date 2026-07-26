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
  type ArqPhotoMeta,
} from '@/lib/arqwelia/types'
import { DEMO_PHOTOS } from '@/lib/arqwelia/fixtures'
import { arqTrackClient as trackEventClient } from '@/lib/arqwelia/analytics-client'

export default function PhotosStep() {
  const t = useTranslations('arqwelia')
  const router = useRouter()
  const store = useWizardStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [demoActive, setDemoActive] = useState(store.demoMode)

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    const incoming = Array.from(files)
    const total = store.photos.length
    for (const file of incoming) {
      if (total >= ARQ_PHOTO_MAX) {
        setError(t('wizard.errors.photoCount'))
        break
      }
      if (file.size > ARQ_PHOTO_MAX_BYTES) {
        setError(t('wizard.errors.photoTooBig'))
        continue
      }
      if (!ARQ_PHOTO_ACCEPTED.includes(file.type)) {
        setError(t('wizard.errors.photoType'))
        continue
      }
      const dataUrl = await readAsDataUrl(file)
      const meta: ArqPhotoMeta = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
      }
      store.addPhoto(meta)
      void trackEventClient('arq_photo_added', { size: file.size, type: file.type })
      total
    }
  }

  function startDemo() {
    store.startDemo()
    setDemoActive(true)
    void trackEventClient('arq_demo_start', { step: 'photos' })
    router.push('/arqwelia/start/project')
  }

  return (
    <div>
      <Link href="/arqwelia" className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-arq-aqua">
        ← {t('wizard.back')}
      </Link>
      <h1 className="font-aq-display text-3xl font-semibold text-arq-mist sm:text-4xl">
        {t('wizard.photos.title')}
      </h1>
      <p className="mt-3 text-arq-mist/60">{t('wizard.photos.desc')}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-arq-aqua/70">
        {t('wizard.photos.accepted')}
      </p>

      {/* Tips */}
      <div className="mt-6 rounded-xl border border-arq-aqua/12 bg-arq-ink/40 p-5">
        <p className="text-sm font-semibold text-arq-mist">{t('wizard.photos.tipsTitle')}</p>
        <ul className="mt-3 space-y-2 text-sm text-arq-mist/55">
          {[1, 2, 3, 4].map((n) => (
            <li key={n} className="flex gap-2">
              <span className="text-arq-aqua">•</span>
              {t(`wizard.photos.tip${n}` as const)}
            </li>
          ))}
        </ul>
      </div>

      {/* Upload zone */}
      <div className="mt-6">
        <div
          role="button"
          tabIndex={0}
          aria-label={t('wizard.photos.add')}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click() }}
          className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-arq-aqua/25 bg-arq-ink/30 p-6 text-center transition-colors hover:border-arq-aqua/50 hover:bg-arq-ink/50"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00D6C5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          <p className="mt-3 text-sm font-semibold text-arq-mist">{t('wizard.photos.add')}</p>
        </div>
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
        <p role="alert" className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Demo path */}
      <button
        type="button"
        onClick={startDemo}
        className="mt-5 w-full rounded-full border border-arq-sand/30 bg-arq-sand/5 px-5 py-3 text-sm font-semibold text-arq-sand transition-colors hover:bg-arq-sand/10"
      >
        {t('wizard.photos.demoBtn')}
      </button>
      {demoActive && (
        <p className="mt-2 text-center text-xs font-semibold uppercase tracking-wider text-arq-sand">
          ✓ {t('wizard.demo')}
        </p>
      )}

      {/* Previews */}
      {store.photos.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {store.photos.map((p) => (
            <div key={p.id} className="relative overflow-hidden rounded-xl border border-arq-aqua/15 bg-arq-ink/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.dataUrl} alt={p.name} className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => store.removePhoto(p.id)}
                className="absolute right-1.5 top-1.5 rounded-full bg-arq-navy/80 px-2 py-1 text-[10px] font-semibold text-arq-mist backdrop-blur hover:bg-red-500/40"
                aria-label={t('wizard.photos.remove')}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Privacy */}
      <p className="mt-6 flex items-center gap-2 text-xs text-arq-mist/45">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#43CFF5" strokeWidth="1.6" strokeLinecap="round"><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" /></svg>
        {t('wizard.photos.privacy')}
      </p>

      {/* Continue */}
      <div className="mt-8 flex justify-end">
        <button
          type="button"
          disabled={store.photos.length === 0 && !demoActive}
          onClick={() => {
            void trackEventClient('arq_photo_step_completed', { count: store.photos.length, demo: demoActive })
            router.push('/arqwelia/start/project')
          }}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-arq-aqua px-7 py-3 text-sm font-bold text-arq-navy transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('wizard.next')}
        </button>
      </div>
    </div>
  )
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = reject
    r.readAsDataURL(file)
  })
}