'use client'

/**
 * AQWELIA Family — modal to manage pool sharing.
 *
 * Triggered from the Header (next to the pool selector). Shows the list of
 * people who have access to the active pool, lets the owner invite a new
 * person by email (role: co_manager | viewer) and revoke any share.
 *
 * i18n: all visible strings come from the `family` namespace via
 * useTranslations('family').
 */
import { useCallback, useEffect, useState } from 'react'
import { Users, X, Mail, Crown, Pencil, Eye, Trash2, Loader2, Plus, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'

interface ShareEntry {
  id: string
  role: string
  createdAt: string
  sharedWith: { id: string; name: string | null; email: string }
}

interface OwnerEntry {
  id: string
  name: string | null
  email: string
}

interface FamilyManagerProps {
  open: boolean
  onClose: () => void
  poolId: string | null
  poolName: string
}

const ROLE_CFG: Record<
  string,
  { icon: typeof Crown; cls: string; labelKey: string; descKey: string }
> = {
  owner: {
    icon: Crown,
    cls: 'border-gold/40 bg-gold/10 text-gold',
    labelKey: 'roleOwner',
    descKey: 'roleOwnerDesc',
  },
  co_manager: {
    icon: Pencil,
    cls: 'border-primary/40 bg-primary/10 text-primary',
    labelKey: 'roleCoManager',
    descKey: 'roleCoManagerDesc',
  },
  viewer: {
    icon: Eye,
    cls: 'border-border bg-secondary text-muted-foreground',
    labelKey: 'roleViewer',
    descKey: 'roleViewerDesc',
  },
}

export function FamilyManager({ open, onClose, poolId, poolName }: FamilyManagerProps) {
  const t = useTranslations('family')
  const tc = useTranslations('common')
  const [shares, setShares] = useState<ShareEntry[]>([])
  const [owner, setOwner] = useState<OwnerEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'co_manager' | 'viewer'>('viewer')
  const [submitting, setSubmitting] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!poolId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/pool/share?poolId=${encodeURIComponent(poolId)}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setShares(data.shares || [])
      setOwner(data.owner || null)
    } catch {
      setShares([])
      setOwner(null)
    } finally {
      setLoading(false)
    }
  }, [poolId])

  useEffect(() => {
    if (open && poolId) load()
  }, [open, poolId, load])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!poolId || !email.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/pool/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poolId, email: email.trim(), role }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data?.code === 'USER_NOT_FOUND') {
          toast({ title: t('inviteNotFoundTitle'), description: t('inviteNotFoundDesc'), variant: 'destructive' })
        } else {
          toast({ title: tc('error'), description: data?.error || t('inviteError'), variant: 'destructive' })
        }
        return
      }
      toast({ title: t('inviteSuccess') })
      setEmail('')
      setRole('viewer')
      load()
    } catch {
      toast({ title: t('inviteError'), variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRevoke(shareId: string) {
    setRevokingId(shareId)
    try {
      const res = await fetch(`/api/pool/share?id=${encodeURIComponent(shareId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast({ title: tc('error'), description: data?.error || t('revokeError'), variant: 'destructive' })
        return
      }
      toast({ title: t('revokeSuccess') })
      setShares((s) => s.filter((x) => x.id !== shareId))
    } finally {
      setRevokingId(null)
    }
  }

  if (!open) return null

  const displayName = (name: string | null, email: string) => name?.trim() || email.split('@')[0]
  const initials = (name: string | null, email: string) =>
    (displayName(name, email).charAt(0) || '?').toUpperCase()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('modalAriaLabel')}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-background/80 backdrop-blur-2xl sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-t-3xl border border-gold/20 bg-background/95 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
        <button
          onClick={onClose}
          aria-label={tc('close')}
          className="absolute right-3 top-3 z-10 rounded-full bg-secondary/60 p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="border-b border-border/40 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-primary-foreground shadow-md shadow-primary/30">
              <Users className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">
                {t('modalTitle')}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {t('modalSubtitle', { pool: poolName })}
              </p>
            </div>
          </div>
        </div>

        <div className="custom-scroll max-h-[60vh] overflow-y-auto px-5 py-4">
          {/* Owner */}
          {owner && (
            <div className="mb-3 rounded-xl border border-gold/30 bg-gold/5 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold to-primary text-xs font-bold text-white">
                  {initials(owner.name, owner.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {displayName(owner.name, owner.email)}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{owner.email}</p>
                </div>
                <Badge className="border-gold/40 bg-gold/10 text-gold">
                  <Crown className="mr-1 h-3 w-3" />
                  {t('roleOwner')}
                </Badge>
              </div>
            </div>
          )}

          {/* Shares list */}
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('sharedWith', { count: shares.length })}
          </p>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tc('loading')}
            </div>
          ) : shares.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-secondary/20 p-5 text-center">
              <Users className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">{t('emptyTitle')}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t('emptyDesc')}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {shares.map((s) => {
                const cfg = ROLE_CFG[s.role] || ROLE_CFG.viewer
                const RoleIcon = cfg.icon
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 p-2.5"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/70 to-gold/70 text-xs font-bold text-white">
                      {initials(s.sharedWith.name, s.sharedWith.email)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {displayName(s.sharedWith.name, s.sharedWith.email)}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {s.sharedWith.email}
                      </p>
                    </div>
                    <Badge variant="outline" className={cfg.cls}>
                      <RoleIcon className="mr-1 h-3 w-3" />
                      {t(cfg.labelKey as any)}
                    </Badge>
                    <button
                      onClick={() => handleRevoke(s.id)}
                      disabled={revokingId === s.id}
                      aria-label={t('revokeAria')}
                      title={t('revokeAria')}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    >
                      {revokingId === s.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Invite form (owner only — shown if no shares error and owner is the session user) */}
          <form onSubmit={handleInvite} className="mt-5 space-y-3 border-t border-border/40 pt-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Plus className="h-4 w-4 text-gold" />
              {t('inviteTitle')}
            </p>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              required
              className="input-glass"
              disabled={submitting}
            />
            <div className="flex gap-2">
              {(['co_manager', 'viewer'] as const).map((r) => {
                const cfg = ROLE_CFG[r]
                const RoleIcon = cfg.icon
                const active = role === r
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex flex-1 items-start gap-2 rounded-xl border p-2.5 text-left transition-all ${
                      active
                        ? 'border-gold/60 bg-gold/10 shadow-sm'
                        : 'border-border/50 bg-background/40 hover:border-gold/40'
                    }`}
                  >
                    <RoleIcon className={`mt-0.5 h-4 w-4 ${active ? 'text-gold' : 'text-muted-foreground'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 text-xs font-semibold">
                        {t(cfg.labelKey as any)}
                        {active && <Check className="h-3 w-3 text-gold" />}
                      </p>
                      <p className="text-[10px] leading-snug text-muted-foreground">
                        {t(cfg.descKey as any)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
            <Button
              type="submit"
              disabled={submitting || !email.trim()}
              className="w-full bg-gradient-to-r from-primary to-gold text-primary-foreground"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('inviting')}
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  {t('inviteCta')}
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
