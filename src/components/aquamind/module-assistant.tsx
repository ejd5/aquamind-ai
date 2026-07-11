'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Send,
  Trash2,
  Sparkles,
  User,
  Loader2,
  Droplets,
  FlaskConical,
  Mic,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { offlineApi } from '@/lib/offline/api-cache'
import { api } from '@/lib/api-client'
import { useOfflineStore } from '@/lib/offline/offline-store'
import { isMobile } from '@/lib/platform'
import { evaluateParam } from '@/lib/pool/targets'

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  presetQuestion?: string
  onConsumePreset?: () => void
}

interface ContextData {
  profile: { name?: string } | null
  latestTest: {
    ph: number
    freeChlorine?: number | null
    combinedChlorine?: number | null
    alkalinity?: number | null
    cyanuricAcid?: number | null
    phosphates?: number | null
    createdAt?: string
  } | null
}

interface WeatherLite {
  weather?: { location?: string; tomorrowMaxC?: number; tomorrowChanceStorm?: number } | null
  assessment?: { alerts?: { id?: string; type?: string; severity?: string }[] } | null
}

// Animated golden water-drop avatar for Lagoon.
function LagoonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-16 w-16' : size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  const icon = size === 'lg' ? 'h-8 w-8' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <div className={`relative ${dim}`}>
      {/* Outer pulsing halo (gold) */}
      <span className="absolute inset-0 animate-ping rounded-full bg-gold/30" style={{ animationDuration: '2.4s' }} />
      {/* Drop body */}
      <div
        className={`relative flex ${dim} items-center justify-center rounded-full bg-gradient-to-br from-gold via-[oklch(0.72_0.13_95)] to-[oklch(0.55_0.10_75)] shadow-lg shadow-gold/40`}
      >
        <Droplets className={`${icon} text-white`} />
      </div>
    </div>
  )
}

// SUGGESTIONS is built inside the component from t() calls so that preset questions
// are localized. See ModuleAssistant below.

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const out: React.ReactNode[] = []
  let listItems: string[] = []

  const flushList = (key: number) => {
    if (listItems.length) {
      out.push(
        <ul key={`ul-${key}`} className="my-1.5 ml-4 list-disc space-y-1 text-sm">
          {listItems.map((li, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inline(li) }} />
          ))}
        </ul>
      )
      listItems = []
    }
  }

  function inline(s: string) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-xs">$1</code>')
  }

  lines.forEach((line, i) => {
    const t = line.trim()
    if (/^[-*]\s+/.test(t)) {
      listItems.push(t.replace(/^[-*]\s+/, ''))
    } else {
      flushList(i)
      if (/^#{1,3}\s+/.test(t)) {
        const level = t.match(/^#+/)![0].length
        const content = t.replace(/^#+\s+/, '')
        const cls =
          level === 1
            ? 'text-base font-bold mt-2'
            : level === 2
              ? 'text-sm font-bold mt-2'
              : 'text-sm font-semibold mt-1'
        out.push(<p key={i} className={cls} dangerouslySetInnerHTML={{ __html: inline(content) }} />)
      } else if (t === '') {
        out.push(<div key={i} className="h-1.5" />)
      } else {
        out.push(
          <p key={i} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: inline(t) }} />,
        )
      }
    }
  })
  flushList(lines.length)
  return out
}

export function ModuleAssistant({ presetQuestion, onConsumePreset }: Props) {
  const t = useTranslations('modules.assistant')
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contextReady, setContextReady] = useState(false)
  const [contextData, setContextData] = useState<ContextData | null>(null)
  const [weather, setWeather] = useState<WeatherLite | null>(null)
  const [listening, setListening] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  const isOnline = useOfflineStore((s) => s.isOnline)
  const queueAction = useOfflineStore((s) => s.queueAction)

  const showMic = useMemo(() => isMobile(), [])

  // ── Contextual suggestions based on latest test + weather ───────────────
  // Build a list of proactive suggestion strings (already-localized via t()).
  const CONTEXT_SUGGESTIONS = useMemo(() => {
    const out: string[] = []
    const lt = contextData?.latestTest
    if (lt) {
      const phStatus = evaluateParam('ph', lt.ph)
      if (lt.ph >= 7.5 || phStatus.includes('high')) {
        out.push(t('ctxSuggestionPhHigh', { value: lt.ph }))
      } else if (lt.ph <= 6.9 || phStatus.includes('low')) {
        out.push(t('ctxSuggestionPhLow', { value: lt.ph }))
      }
      if (lt.freeChlorine != null && lt.freeChlorine < 1) {
        out.push(t('ctxSuggestionChlorineLow', { value: lt.freeChlorine }))
      }
      if (lt.cyanuricAcid != null && lt.cyanuricAcid >= 50) {
        out.push(t('ctxSuggestionCyaHigh', { value: lt.cyanuricAcid }))
      }
      if (lt.combinedChlorine != null && lt.combinedChlorine > 0.4) {
        out.push(t('ctxSuggestionCombinedChlorine', { value: lt.combinedChlorine }))
      }
    }
    // Weather-based suggestions
    const alerts = weather?.assessment?.alerts || []
    const storm = alerts.find((a) => a.type === 'storm')
    if (storm) {
      out.push(t('ctxSuggestionStorm'))
    }
    const heat = alerts.find((a) => a.type === 'heat')
    if (heat) {
      out.push(t('ctxSuggestionHeat'))
    }
    return out
  }, [contextData, weather, t])

  // Mix contextual + preset suggestions (contextual first, max 4 visible)
  const SUGGESTIONS = useMemo(() => {
    const presets = [
      t('presetQ1'),
      t('presetQ2'),
      t('presetQ3'),
      t('presetQ4'),
      t('presetQ5'),
      t('presetQ6'),
    ]
    if (CONTEXT_SUGGESTIONS.length === 0) return presets
    return [...CONTEXT_SUGGESTIONS, ...presets].slice(0, 4 + CONTEXT_SUGGESTIONS.length)
  }, [CONTEXT_SUGGESTIONS, t])

  // Check that a profile/test exists for context (+ capture data for suggestions)
  useEffect(() => {
    let cancelled = false
    Promise.all([
      offlineApi.dashboard(),
      offlineApi.weather().catch(() => ({ data: null, stale: false })),
    ])
      .then(([dashRes, wxRes]) => {
        if (cancelled) return
        const dashData = dashRes.data as ContextData | null
        setContextData(dashData)
        setContextReady(!!dashData?.profile)
        setWeather((wxRes.data as WeatherLite | null) ?? null)
      })
      .catch(() => {
        if (!cancelled) setContextReady(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // ── Voice input (mobile only) via Web Speech API ─────────────────────────
  useEffect(() => {
    if (!showMic) return
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'fr-FR'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript || ''
      setInput((prev) => (prev ? `${prev} ${text}` : text))
      setListening(false)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    return () => {
      try { rec.abort() } catch {}
    }
  }, [showMic])

  function toggleMic() {
    const rec = recognitionRef.current
    if (!rec) return
    if (listening) {
      try { rec.stop() } catch {}
      setListening(false)
    } else {
      try { rec.start(); setListening(true) } catch {}
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  // Handle preset question from emergency mode
  useEffect(() => {
    if (presetQuestion) {
      send(presetQuestion)
      onConsumePreset?.()
    }
  }, [presetQuestion])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Msg = { role: 'user', content: trimmed }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)

    try {
      if (!isOnline) {
        queueAction({ method: 'POST', path: '/api/chat', body: { message: trimmed } })
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content: t('offlineReply'),
          },
        ])
        toast({
          title: t('actionRecorded'),
          description: t('willSync'),
        })
        return
      }
      const data = await api.post<{ reply?: string; error?: string }>('/api/chat', {
        message: trimmed,
      })
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || '' }])
    } catch (e) {
      toast({
        title: t('errorTitle'),
        description: e instanceof Error ? e.message : t('communicationError'),
        variant: 'destructive',
      })
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: t('errorReply') },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function clearHistory() {
    try {
      if (!isOnline) {
        queueAction({ method: 'DELETE', path: '/api/chat' })
        setMessages([])
        toast({
          title: t('historyCleared'),
          description: t('willSync'),
        })
        return
      }
      await api.delete('/api/chat')
      setMessages([])
      toast({ title: t('historyCleared'), description: t('newConversation') })
    } catch {
      toast({ title: t('errorTitle'), description: t('clearFailed'), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="section-label">{t('title')}</span>
            <span className="h-px w-8 bg-gold/40" />
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('expertTitle')}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            {t('expertSubtitle')}
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearHistory}>
            <Trash2 className="h-3.5 w-3.5" />
            {t('clear')}
          </Button>
        )}
      </div>

      {/* Context chip */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/5 px-3 py-1 font-medium text-gold">
          <Sparkles className="h-3 w-3" />
          {t('contextUsed')}
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-muted-foreground">
          <Droplets className="h-3 w-3 text-primary" />
          {contextReady ? t('profileInjected') : t('profileNotConfigured')}
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-muted-foreground">
          <FlaskConical className="h-3 w-3 text-primary" />
          {t('lastTestInjected')}
        </span>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-gradient-to-r from-gold/10 via-secondary/40 to-transparent pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2.5 font-display text-base">
              <LagoonAvatar size="sm" />
              <span>
                {t('lagoonName')}
                <span className="ml-1.5 align-middle text-[10px] font-normal uppercase tracking-wider text-gold">
                  {t('lagoonTagline')}
                </span>
              </span>
            </CardTitle>
            <Sparkles className="h-4 w-4 text-gold/60" />
          </div>
          <CardDescription className="text-xs">
            {t('disclaimer')}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div ref={scrollRef} className="custom-scroll h-[460px] space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <LagoonAvatar size="lg" />
                <div>
                  <p className="font-display text-lg font-semibold text-gold">{t('lagoonWelcome')}</p>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    {t('lagoonGreeting')}
                  </p>
                </div>
                {CONTEXT_SUGGESTIONS.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <span className="flex items-center gap-1 rounded-full border border-gold/30 bg-gold/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold">
                      <Sparkles className="h-3 w-3" />
                      {t('ctxSuggestionsLabel')}
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className={`glass-pill rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:border-gold/40 hover:text-foreground ${
                        i < CONTEXT_SUGGESTIONS.length
                          ? 'border-gold/40 bg-gold/5 text-gold'
                          : 'text-foreground/80'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    m.role === 'user'
                      ? 'bg-secondary'
                      : 'bg-gradient-to-br from-gold via-[oklch(0.72_0.13_95)] to-[oklch(0.55_0.10_75)] shadow-md shadow-gold/30'
                  }`}
                >
                  {m.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Droplets className="h-4 w-4 text-white" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {m.role === 'assistant' ? renderMarkdown(m.content) : <p className="text-sm">{m.content}</p>}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-gold via-[oklch(0.72_0.13_95)] to-[oklch(0.55_0.10_75)] shadow-md shadow-gold/30">
                  <Droplets className="h-4 w-4 animate-pulse text-white" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">{t('thinkingFallback')}</span>
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/40 bg-gradient-to-r from-gold/5 via-secondary/30 to-transparent p-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send(input)
                  }
                }}
                placeholder={t('inputPlaceholder')}
                className="min-h-[44px] max-h-32 resize-none bg-background"
                rows={1}
              />
              {showMic && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={toggleMic}
                  disabled={loading}
                  className={`h-11 shrink-0 ${listening ? 'border-destructive/40 bg-destructive/10 text-destructive animate-pulse' : 'border-gold/40 text-gold hover:bg-gold/10'}`}
                  size="icon"
                  title={t('micTitle')}
                  aria-label={t('micTitle')}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              )}
              <Button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className="h-11 shrink-0 bg-gradient-to-r from-gold via-[oklch(0.72_0.13_95)] to-[oklch(0.55_0.10_75)] shadow-lg shadow-gold/30 hover:shadow-xl hover:shadow-gold/40"
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {listening && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-gold">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
                {t('micListening')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
