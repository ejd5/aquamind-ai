'use client'

import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

// Simple admin gate — password stored in localStorage after first entry
const ADMIN_PASSWORD = 'aqwelia-admin-2026' // TODO: move to env

type AdminTab = 'banner' | 'popup' | 'content' | 'analytics' | 'users'

interface BannerConfig {
  enabled: boolean
  text: string
  bgColor: string
  textColor: string
  link: string
  startDate: string
  endDate: string
}

interface PopupConfig {
  id: string
  enabled: boolean
  title: string
  body: string
  imageUrl: string
  ctaText: string
  ctaLink: string
  trigger: 'on_load' | 'on_exit' | 'after_diagnostic' | 'manual'
  frequency: 'once' | 'session' | 'always'
}

export default function AdminPage() {
  const { toast } = useToast()
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState<AdminTab>('banner')

  // Check if already authed
  useEffect(() => {
    const saved = localStorage.getItem('aqwelia-admin')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === 'ok') setAuthed(true)
  }, [])

  function tryAuth() {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('aqwelia-admin', 'ok')
      setAuthed(true)
    } else {
      toast({
        title: 'Mot de passe incorrect',
        description: 'Accès refusé.',
        variant: 'destructive',
      })
    }
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="glass-card w-full max-w-sm rounded-2xl p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl">
              <img
                src="/icon-aqwelia-48.png"
                alt="AQWELIA"
                className="h-12 w-12 object-cover"
              />
            </div>
            <h1 className="font-display text-xl font-bold">
              <span className="aqua-text-gradient">AQWELIA Admin</span>
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Espace réservé — Accès protégé
            </p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') tryAuth()
            }}
            placeholder="Mot de passe administrateur"
            className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
          />
          <button
            onClick={tryAuth}
            className="mt-3 w-full rounded-full bg-gradient-to-r from-primary to-gold px-6 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            Accéder
          </button>
          <a
            href="/"
            className="mt-3 block text-center text-xs text-muted-foreground hover:text-foreground"
          >
            ← Retour au site
          </a>
        </div>
      </div>
    )
  }

  const tabs: Array<{ id: AdminTab; label: string; icon: string }> = [
    { id: 'banner', label: 'Bannière saisonnière', icon: '📢' },
    { id: 'popup', label: 'Popups promo', icon: '🎁' },
    { id: 'content', label: 'Contenu & textes', icon: '📝' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'users', label: 'Utilisateurs', icon: '👥' },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Admin header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img
              src="/icon-aqwelia-48.png"
              alt=""
              className="h-8 w-8 rounded-lg"
            />
            <span className="font-display font-bold">
              <span className="aqua-text-gradient">AQWELIA</span>
              <span className="ml-2 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-destructive">
                Admin
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Voir le site
            </a>
            <button
              onClick={() => {
                localStorage.removeItem('aqwelia-admin')
                setAuthed(false)
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Tab bar + content */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'banner' && <BannerAdmin />}
        {activeTab === 'popup' && <PopupAdmin />}
        {activeTab === 'content' && <ContentAdmin />}
        {activeTab === 'analytics' && <AnalyticsAdmin />}
        {activeTab === 'users' && <UsersAdmin />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Banner Admin — seasonal promotional banner                          */
/* ------------------------------------------------------------------ */

function BannerAdmin() {
  const { toast } = useToast()
  const [banner, setBanner] = useState<BannerConfig>({
    enabled: false,
    text: '☀️ Été 2026 — Profitez de -20% sur le plan Lagoon !',
    bgColor: '#004D5A',
    textColor: '#FFFFFF',
    link: '/settings',
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    const saved = localStorage.getItem('aqwelia-banner')
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBanner(JSON.parse(saved))
      } catch {
        // ignore malformed
      }
    }
  }, [])

  function save() {
    localStorage.setItem('aqwelia-banner', JSON.stringify(banner))
    // Also save to API for server-side rendering (à venir)
    toast({ title: 'Bannière enregistrée' })
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-bold">📢 Bannière saisonnière</h2>
      <p className="text-sm text-muted-foreground">
        Personnalisez la bannière promotionnelle en haut de l&apos;app. Idéal pour
        les saisons, promotions, annonces.
      </p>

      {/* Preview */}
      <div
        className="overflow-hidden rounded-xl"
        style={{ backgroundColor: banner.bgColor }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ color: banner.textColor }}
        >
          <span className="text-sm font-medium">{banner.text}</span>
          {banner.link && (
            <span className="text-xs underline">En savoir plus →</span>
          )}
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-3">
        <Switch
          checked={banner.enabled}
          onCheckedChange={(v) => setBanner({ ...banner, enabled: v })}
        />
        <span className="text-sm">Activer la bannière</span>
      </div>

      {/* Form */}
      <div className="grid gap-3">
        <label className="text-xs font-semibold">Texte</label>
        <input
          value={banner.text}
          onChange={(e) => setBanner({ ...banner, text: e.target.value })}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        />

        <label className="text-xs font-semibold">Couleur de fond</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={banner.bgColor}
            onChange={(e) => setBanner({ ...banner, bgColor: e.target.value })}
            className="h-10 w-16 rounded-lg"
          />
          <input
            value={banner.bgColor}
            onChange={(e) => setBanner({ ...banner, bgColor: e.target.value })}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>

        <label className="text-xs font-semibold">Couleur du texte</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={banner.textColor}
            onChange={(e) => setBanner({ ...banner, textColor: e.target.value })}
            className="h-10 w-16 rounded-lg"
          />
          <input
            value={banner.textColor}
            onChange={(e) => setBanner({ ...banner, textColor: e.target.value })}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>

        <label className="text-xs font-semibold">Lien (optionnel)</label>
        <input
          value={banner.link}
          onChange={(e) => setBanner({ ...banner, link: e.target.value })}
          placeholder="/settings, /auth/signin..."
          className="rounded-lg border border-border px-3 py-2 text-sm"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold">Date de début</label>
            <input
              type="date"
              value={banner.startDate}
              onChange={(e) => setBanner({ ...banner, startDate: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold">Date de fin</label>
            <input
              type="date"
              value={banner.endDate}
              onChange={(e) => setBanner({ ...banner, endDate: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <Button onClick={save} className="mt-2 w-fit">
          Enregistrer la bannière
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Popup Admin — promotional popups                                    */
/* ------------------------------------------------------------------ */

function PopupAdmin() {
  const { toast } = useToast()
  const [popups, setPopups] = useState<PopupConfig[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('aqwelia-popups')
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPopups(JSON.parse(saved))
      } catch {
        // ignore
      }
    }
  }, [])

  function persist(next: PopupConfig[]) {
    setPopups(next)
    localStorage.setItem('aqwelia-popups', JSON.stringify(next))
    toast({ title: 'Popups enregistrés' })
  }

  function saveAll() {
    localStorage.setItem('aqwelia-popups', JSON.stringify(popups))
    toast({ title: 'Popups enregistrés' })
  }

  function addPopup() {
    persist([
      ...popups,
      {
        id: Date.now().toString(),
        enabled: false,
        title: 'Nouveau popup promo',
        body: 'Description de la promo...',
        imageUrl: '',
        ctaText: 'En profiter',
        ctaLink: '/settings',
        trigger: 'on_load',
        frequency: 'once',
      },
    ])
  }

  function updatePopup(index: number, patch: Partial<PopupConfig>) {
    const next = [...popups]
    next[index] = { ...next[index], ...patch }
    setPopups(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">🎁 Popups promotionnels</h2>
        <Button onClick={addPopup} size="sm">
          + Ajouter
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Créez des popups qui s&apos;affichent selon des déclencheurs. Upload
        d&apos;images promo à venir.
      </p>

      {popups.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
          Aucun popup. Cliquez sur &quot;+ Ajouter&quot; pour créer votre premier
          popup promo.
        </div>
      )}

      {popups.map((popup, i) => (
        <div
          key={popup.id}
          className="space-y-3 rounded-xl border border-border/50 bg-background/60 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={popup.enabled}
                onCheckedChange={(v) => {
                  const next = [...popups]
                  next[i] = { ...popup, enabled: v }
                  persist(next)
                }}
              />
              <span className="text-sm font-semibold">{popup.title}</span>
            </div>
            <button
              onClick={() => persist(popups.filter((p) => p.id !== popup.id))}
              className="text-xs text-destructive hover:underline"
            >
              Supprimer
            </button>
          </div>

          <input
            value={popup.title}
            onChange={(e) => updatePopup(i, { title: e.target.value })}
            placeholder="Titre"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
          <textarea
            value={popup.body}
            onChange={(e) => updatePopup(i, { body: e.target.value })}
            placeholder="Description"
            rows={2}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              value={popup.trigger}
              onChange={(e) =>
                updatePopup(i, { trigger: e.target.value as PopupConfig['trigger'] })
              }
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="on_load">Au chargement</option>
              <option value="on_exit">À la fermeture</option>
              <option value="after_diagnostic">Après diagnostic</option>
              <option value="manual">Manuel</option>
            </select>
            <select
              value={popup.frequency}
              onChange={(e) =>
                updatePopup(i, {
                  frequency: e.target.value as PopupConfig['frequency'],
                })
              }
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="once">Une fois (jamais revoir)</option>
              <option value="session">Une fois par session</option>
              <option value="always">Toujours</option>
            </select>
          </div>

          <input
            value={popup.imageUrl}
            onChange={(e) => updatePopup(i, { imageUrl: e.target.value })}
            placeholder="URL image promo (à venir: upload)"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              value={popup.ctaText}
              onChange={(e) => updatePopup(i, { ctaText: e.target.value })}
              placeholder="Texte bouton"
              className="rounded-lg border border-border px-3 py-2 text-sm"
            />
            <input
              value={popup.ctaLink}
              onChange={(e) => updatePopup(i, { ctaLink: e.target.value })}
              placeholder="Lien bouton"
              className="rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>

          <Button onClick={saveAll} size="sm" variant="outline">
            Enregistrer ce popup
          </Button>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Content Admin — placeholder                                         */
/* ------------------------------------------------------------------ */

function ContentAdmin() {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-bold">📝 Contenu & textes</h2>
      <p className="text-sm text-muted-foreground">
        Personnalisez les textes de l&apos;app sans modifier le code.
      </p>
      <div className="rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
        Module à venir — Éditeur de contenu WYSIWYG pour landing page, guides,
        emails...
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Analytics Admin — placeholder with KPI cards                        */
/* ------------------------------------------------------------------ */

function AnalyticsAdmin() {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-bold">📊 Analytics</h2>
      <p className="text-sm text-muted-foreground">
        Statistiques d&apos;utilisation de l&apos;app.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="glass-card rounded-xl p-4">
          <p className="text-2xl font-bold text-primary">—</p>
          <p className="text-xs text-muted-foreground">Utilisateurs totaux</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-2xl font-bold text-primary">—</p>
          <p className="text-xs text-muted-foreground">Diagnostics IA</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-2xl font-bold text-primary">—</p>
          <p className="text-xs text-muted-foreground">Tests d&apos;eau</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-2xl font-bold text-primary">—</p>
          <p className="text-xs text-muted-foreground">Abonnements actifs</p>
        </div>
      </div>
      <div className="rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
        Données détaillées à venir — Connexion API /api/analytics
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Users Admin — placeholder                                           */
/* ------------------------------------------------------------------ */

function UsersAdmin() {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-bold">👥 Utilisateurs</h2>
      <p className="text-sm text-muted-foreground">
        Gérez les utilisateurs, abonnements et accès.
      </p>
      <div className="rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
        Module à venir — Liste utilisateurs, gestion abonnements, support...
      </div>
    </div>
  )
}
