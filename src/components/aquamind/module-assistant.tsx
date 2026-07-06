'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Brain,
  Send,
  Trash2,
  Sparkles,
  User,
  Loader2,
  Droplets,
  FlaskConical,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  presetQuestion?: string
  onConsumePreset?: () => void
}

const SUGGESTIONS = [
  'Puis-je me baigner aujourd\'hui ?',
  'Combien de pH- ajouter pour mon volume ?',
  'Mon eau est verte, que faire ?',
  'Comment bien hiverner ma piscine ?',
  'Faut-il faire un traitement choc chlore ?',
  'Mon électrolyseur affiche une erreur, aide-moi.',
]

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
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contextReady, setContextReady] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Check that a profile/test exists for context
  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => setContextReady(!!d?.profile))
      .catch(() => setContextReady(false))
  }, [])

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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }])
    } catch (e) {
      toast({
        title: 'Erreur',
        description: e instanceof Error ? e.message : 'Erreur lors de la communication',
        variant: 'destructive',
      })
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Désolé, une erreur est survenue. Réessayez.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function clearHistory() {
    try {
      await fetch('/api/chat', { method: 'DELETE' })
      setMessages([])
      toast({ title: 'Historique effacé', description: 'Nouvelle conversation.' })
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d\'effacer', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="section-label">Assistant IA</span>
            <span className="h-px w-8 bg-gold/40" />
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Votre expert piscine
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Posez vos questions : dosages, entretien, sécurité, équipements. L'assistant connaît
            votre piscine et vos dernières mesures.
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearHistory}>
            <Trash2 className="h-3.5 w-3.5" />
            Effacer
          </Button>
        )}
      </div>

      {/* Context chip */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/5 px-3 py-1 font-medium text-gold">
          <Sparkles className="h-3 w-3" />
          Contexte utilisé :
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-muted-foreground">
          <Droplets className="h-3 w-3 text-primary" />
          {contextReady ? 'Profil piscine injecté' : 'Profil non configuré'}
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-muted-foreground">
          <FlaskConical className="h-3 w-3 text-primary" />
          Dernier test d'eau injecté
        </span>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-gradient-to-r from-secondary/40 to-transparent pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-gold shadow-md shadow-primary/30">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </span>
              AquaMind Assistant
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Réponses indicatives. Vérifiez toujours avec un test d'eau avant traitement.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div ref={scrollRef} className="custom-scroll h-[460px] space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
                    <Brain className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <Sparkles className="absolute -right-1 -top-1 h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-semibold">Bonjour ! Je suis votre expert piscine 👋</p>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    Demandez-moi tout sur le pH, le chlore, les algues, la filtration, l'hivernage…
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="glass-pill rounded-full px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-gold/40 hover:text-foreground"
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
                      : 'bg-gradient-to-br from-primary to-accent'
                  }`}
                >
                  {m.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
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
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">L'expert réfléchit...</span>
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/40 bg-gradient-to-r from-secondary/30 to-transparent p-3">
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
                placeholder="Écrivez votre question... (Entrée pour envoyer)"
                className="min-h-[44px] max-h-32 resize-none bg-background"
                rows={1}
              />
              <Button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className="h-11 shrink-0 bg-gradient-to-r from-primary to-gold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
