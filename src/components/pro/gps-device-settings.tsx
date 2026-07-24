'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import { Check, Clipboard, Loader2, RadioTower, Trash2 } from 'lucide-react'

const COPY = {
  fr: { title: 'Balises GPS véhicules', subtitle: 'Connectez un boîtier GPS ou un serveur Traccar à la carte Dispatch Live.', add: 'Ajouter une balise', technician: 'Technicien', label: 'Nom de la balise', vehicle: 'Véhicule', provider: 'Fournisseur', external: 'Identifiant du boîtier', token: 'Jeton secret — affiché une seule fois', copy: 'Copier', copied: 'Copié', revoke: 'Révoquer', noDevice: 'Aucune balise enregistrée.', lastSeen: 'Dernier signal', never: 'Jamais', endpoint: 'URL de réception', privacy: 'Les points sont refusés hors jours et horaires de travail configurés.' },
  en: { title: 'Vehicle GPS devices', subtitle: 'Connect a GPS tracker or Traccar server to the Live Dispatch map.', add: 'Add device', technician: 'Technician', label: 'Device label', vehicle: 'Vehicle', provider: 'Provider', external: 'External device ID', token: 'Secret token — shown once', copy: 'Copy', copied: 'Copied', revoke: 'Revoke', noDevice: 'No device registered.', lastSeen: 'Last signal', never: 'Never', endpoint: 'Ingestion URL', privacy: 'Points are rejected outside configured working days and hours.' },
  es: { title: 'Balizas GPS de vehículos', subtitle: 'Conecte un GPS o servidor Traccar al mapa Dispatch Live.', add: 'Añadir baliza', technician: 'Técnico', label: 'Nombre', vehicle: 'Vehículo', provider: 'Proveedor', external: 'ID externo', token: 'Token secreto — se muestra una vez', copy: 'Copiar', copied: 'Copiado', revoke: 'Revocar', noDevice: 'Ninguna baliza registrada.', lastSeen: 'Última señal', never: 'Nunca', endpoint: 'URL de recepción', privacy: 'Los puntos se rechazan fuera de los días y horarios configurados.' },
  de: { title: 'GPS-Fahrzeuggeräte', subtitle: 'GPS-Tracker oder Traccar mit Dispatch Live verbinden.', add: 'Gerät hinzufügen', technician: 'Techniker', label: 'Gerätename', vehicle: 'Fahrzeug', provider: 'Anbieter', external: 'Externe Geräte-ID', token: 'Geheimer Token — einmalig sichtbar', copy: 'Kopieren', copied: 'Kopiert', revoke: 'Widerrufen', noDevice: 'Kein Gerät registriert.', lastSeen: 'Letztes Signal', never: 'Nie', endpoint: 'Empfangs-URL', privacy: 'Punkte außerhalb der Arbeitszeiten werden abgelehnt.' },
  it: { title: 'Dispositivi GPS veicoli', subtitle: 'Collega un GPS o server Traccar a Dispatch Live.', add: 'Aggiungi dispositivo', technician: 'Tecnico', label: 'Nome dispositivo', vehicle: 'Veicolo', provider: 'Fornitore', external: 'ID esterno', token: 'Token segreto — mostrato una volta', copy: 'Copia', copied: 'Copiato', revoke: 'Revoca', noDevice: 'Nessun dispositivo registrato.', lastSeen: 'Ultimo segnale', never: 'Mai', endpoint: 'URL di ricezione', privacy: 'I punti fuori dall’orario di lavoro vengono rifiutati.' },
  pt: { title: 'Dispositivos GPS de veículos', subtitle: 'Ligue um GPS ou servidor Traccar ao Dispatch Live.', add: 'Adicionar dispositivo', technician: 'Técnico', label: 'Nome', vehicle: 'Veículo', provider: 'Fornecedor', external: 'ID externo', token: 'Token secreto — mostrado uma vez', copy: 'Copiar', copied: 'Copiado', revoke: 'Revogar', noDevice: 'Nenhum dispositivo registado.', lastSeen: 'Último sinal', never: 'Nunca', endpoint: 'URL de receção', privacy: 'Pontos fora do horário configurado são recusados.' },
  nl: { title: 'GPS-apparaten voor voertuigen', subtitle: 'Koppel een GPS-tracker of Traccar-server aan Dispatch Live.', add: 'Apparaat toevoegen', technician: 'Technicus', label: 'Naam', vehicle: 'Voertuig', provider: 'Provider', external: 'Extern apparaat-ID', token: 'Geheim token — één keer zichtbaar', copy: 'Kopiëren', copied: 'Gekopieerd', revoke: 'Intrekken', noDevice: 'Geen apparaat geregistreerd.', lastSeen: 'Laatste signaal', never: 'Nooit', endpoint: 'Ontvangst-URL', privacy: 'Punten buiten de ingestelde werktijden worden geweigerd.' },
} as const

type Member = {
  id: string
  userId: string
  user: { name: string | null; email: string }
  locationSharingEnabled: boolean
  locationNoticeAcknowledgedAt: string | null
}

type Device = {
  id: string
  assignedUserId: string
  provider: string
  externalDeviceId: string
  label: string
  vehicle: string | null
  status: string
  lastSeenAt: string | null
  member: Member | null
}

export function GpsDeviceSettings({ members }: { members: Member[] }) {
  const locale = useLocale() as keyof typeof COPY
  const copy = COPY[locale] ?? COPY.en
  const [devices, setDevices] = useState<Device[]>([])
  const [ingestPath, setIngestPath] = useState('/api/pro/location/device')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({ assignedUserId: '', provider: 'generic', externalDeviceId: '', label: '', vehicle: '' })

  const eligibleMembers = useMemo(
    () => members.filter((member) => member.locationSharingEnabled && member.locationNoticeAcknowledgedAt),
    [members],
  )

  const load = useCallback(async () => {
    const response = await fetch('/api/pro/dispatch/devices', { cache: 'no-store' })
    const payload = await response.json() as { devices?: Device[]; ingestPath?: string; error?: string }
    if (!response.ok) throw new Error(payload.error || 'Unable to load devices')
    setDevices(payload.devices ?? [])
    if (payload.ingestPath) setIngestPath(payload.ingestPath)
  }, [])

  useEffect(() => {
    void load().catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load devices'))
  }, [load])

  async function createDevice() {
    setBusy(true)
    setError(null)
    setToken(null)
    setCopied(false)
    try {
      const response = await fetch('/api/pro/dispatch/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json() as { token?: string; error?: string }
      if (!response.ok) throw new Error(payload.error || 'Unable to create device')
      setToken(payload.token ?? null)
      setForm({ assignedUserId: '', provider: 'generic', externalDeviceId: '', label: '', vehicle: '' })
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create device')
    } finally {
      setBusy(false)
    }
  }

  async function revoke(id: string) {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/pro/dispatch/devices/${encodeURIComponent(id)}`, { method: 'DELETE' })
      const payload = await response.json() as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Unable to revoke device')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to revoke device')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-[1.75rem] border border-border/60 bg-card/80 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <RadioTower className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold">{copy.title}</h2>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
      </div>
      <p className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">{copy.privacy}</p>
      {error ? <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-700">{error}</p> : null}

      {token ? (
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-amber-900">{copy.token}</p>
          <code className="mt-2 block break-all rounded-lg bg-white p-3 text-xs text-amber-950">{token}</code>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(token)
              setCopied(true)
            }}
            className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-amber-900"
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? copy.copied : copy.copy}
          </button>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-xs font-bold">
          {copy.technician}
          <select value={form.assignedUserId} onChange={(event) => setForm((value) => ({ ...value, assignedUserId: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm">
            <option value="">—</option>
            {eligibleMembers.map((member) => <option key={member.id} value={member.userId}>{member.user.name || member.user.email}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold">
          {copy.provider}
          <select value={form.provider} onChange={(event) => setForm((value) => ({ ...value, provider: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm">
            {['generic', 'traccar', 'samsara', 'geotab', 'webfleet'].map((provider) => <option key={provider} value={provider}>{provider}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold">{copy.label}<input value={form.label} onChange={(event) => setForm((value) => ({ ...value, label: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" /></label>
        <label className="text-xs font-bold">{copy.external}<input value={form.externalDeviceId} onChange={(event) => setForm((value) => ({ ...value, externalDeviceId: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" /></label>
        <label className="text-xs font-bold">{copy.vehicle}<input value={form.vehicle} onChange={(event) => setForm((value) => ({ ...value, vehicle: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" /></label>
      </div>
      <button type="button" disabled={busy || !form.assignedUserId || !form.externalDeviceId || !form.label} onClick={() => { void createDevice() }} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-40">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RadioTower className="h-4 w-4" />}
        {copy.add}
      </button>

      <div className="mt-5 rounded-xl bg-secondary/50 p-3 text-xs"><strong>{copy.endpoint}:</strong> <code>{ingestPath}</code></div>
      <div className="mt-4 space-y-2">
        {devices.length === 0 ? <p className="py-5 text-center text-sm text-muted-foreground">{copy.noDevice}</p> : devices.map((device) => (
          <article key={device.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-background p-3">
            <span className={`h-2.5 w-2.5 rounded-full ${device.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{device.label} · {device.vehicle || device.externalDeviceId}</p>
              <p className="text-xs text-muted-foreground">{device.provider} · {device.member?.user.name || device.member?.user.email || device.assignedUserId} · {copy.lastSeen}: {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : copy.never}</p>
            </div>
            {device.status === 'active' ? (
              <button type="button" disabled={busy} onClick={() => { void revoke(device.id) }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 text-xs font-bold text-red-700">
                <Trash2 className="h-4 w-4" />{copy.revoke}
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}
