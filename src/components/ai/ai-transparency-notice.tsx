'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { useLocale } from 'next-intl'
import { getComplianceCopy } from '@/i18n/locales/compliance-copy'

export function AITransparencyNotice({ compact = false }: { compact?: boolean }) {
  const locale = useLocale()
  const copy = getComplianceCopy(locale).aiNotice
  return (
    <div
      className={`rounded-xl border border-gold/25 bg-gold/5 text-muted-foreground ${compact ? 'px-3 py-2 text-[11px]' : 'p-4 text-xs'}`}
      role="note"
    >
      <p className="flex items-start gap-2 leading-relaxed">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
        <span>
          <strong className="text-foreground">{copy.label}</strong> {copy.body}{' '}
          <Link href="/legal/ia" className="font-semibold text-gold underline underline-offset-2">
            {copy.link}
          </Link>
        </span>
      </p>
    </div>
  )
}
