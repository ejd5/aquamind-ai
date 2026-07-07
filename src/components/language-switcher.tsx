'use client'
import { useLocale } from 'next-intl'
import { Globe } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
]

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0]

  function changeLanguage(code: string) {
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `NEXT_LOCALE=${code};path=/;max-age=31536000`
    setOpen(false)
    setTimeout(() => window.location.reload(), 100)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-secondary/60 hover:text-foreground"
      >
        <Globe className="h-3.5 w-3.5" />
        {!compact && <span>{current.flag} {current.code.toUpperCase()}</span>}
        {compact && <span>{current.flag}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-xl backdrop-blur-xl">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-secondary/60 ${
                lang.code === locale ? 'bg-secondary/40 font-semibold' : ''
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
