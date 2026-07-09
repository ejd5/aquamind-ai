'use client'

/**
 * P5-MULTIPOOL-PDF — client hook for the PDF report download button.
 *
 * Fetches the user's subscription once (cached in module state), checks
 * `canAccess(planId, 'pdf_report')`, and exposes a `download()` function
 * that streams the PDF from `/api/pool/report?poolId=…` and saves it via
 * a blob URL.
 *
 * Returns:
 *   - `canDownload: boolean` — true when the plan allows PDF (Oasis/Wellness)
 *   - `preparing: boolean` — true while the PDF is being generated
 *   - `error: string | null` — error message to display
 *   - `download(poolId?: string | null): Promise<void>`
 */

import { useCallback, useEffect, useState } from 'react'
import { canAccess, type PlanId } from '@/lib/pool/freemium'

interface SubscriptionResponse {
  plan?: { id: PlanId }
}

export function usePdfReport() {
  const [planId, setPlanId] = useState<PlanId | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/subscription')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: SubscriptionResponse | null) => {
        if (cancelled) return
        if (d?.plan?.id) setPlanId(d.plan.id)
        else setPlanId('decouverte')
      })
      .catch(() => {
        if (!cancelled) setPlanId('decouverte')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const canDownload = planId ? canAccess(planId, 'pdf_report').allowed : false

  const download = useCallback(async (poolId?: string | null) => {
    setPreparing(true)
    setError(null)
    try {
      const url = poolId
        ? `/api/pool/report?poolId=${encodeURIComponent(poolId)}`
        : '/api/pool/report'
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) {
        // Try to read the JSON error message (localized by the API)
        let msg = `Erreur ${res.status}`
        try {
          const data = await res.json()
          if (data?.error) msg = data.error
        } catch { /* not JSON */ }
        throw new Error(msg)
      }
      const blob = await res.blob()
      // Filename from Content-Disposition, fallback to a generic name
      const cd = res.headers.get('content-disposition') || ''
      const match = cd.match(/filename="?([^";]+)"?/i)
      const filename = match?.[1] || `AQWELIA-rapport-${new Date().toISOString().slice(0, 10)}.pdf`
      // Trigger download via a temporary <a> element
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      // Revoke after a tick to let the download start
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setPreparing(false)
    }
  }, [])

  return { canDownload, preparing, error, download, planId }
}
