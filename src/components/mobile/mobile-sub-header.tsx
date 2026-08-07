'use client'

/**
 * AQWELIA Wave A3 — mobile settings sub-header.
 *
 * Compact back header (h-14 + safe-area-top) with a back link and a title.
 * Used by B2C secondary pages (settings, subscription) that are not tied to a
 * pool profile. Touch target ≥ 44px, no hover effects.
 */

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface MobileSubHeaderProps {
  title: string
  backHref?: string
}

export function MobileSubHeader({ title, backHref = '/dashboard' }: MobileSubHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border/40 bg-background/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
      <Link
        href={backHref}
        aria-label="Back"
        className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <span className="text-base font-semibold">{title}</span>
    </header>
  )
}
