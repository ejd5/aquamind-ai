import React from 'react'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'

const s = StyleSheet.create({
  page: { padding: 34, fontSize: 9, color: '#18333b', fontFamily: 'Helvetica' },
  header: { borderBottomWidth: 2, borderBottomColor: '#18a8a4', paddingBottom: 12, marginBottom: 18 },
  brand: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#0d7775' },
  title: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginTop: 5 },
  muted: { color: '#60757b', marginTop: 3 },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0d7775', marginBottom: 7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  card: { width: '48%', backgroundColor: '#f1f8f8', padding: 8, borderRadius: 4 },
  label: { color: '#60757b', fontSize: 7, textTransform: 'uppercase' },
  value: { marginTop: 2, fontFamily: 'Helvetica-Bold' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#dce9e9', paddingVertical: 5 },
  cell: { flex: 1 },
  disclaimer: { marginTop: 22, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#dce9e9', color: '#60757b', fontSize: 7 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoCard: { width: '48%' },
  photo: { width: '100%', height: 120, objectFit: 'cover', borderRadius: 4 },
  photoCaption: { color: '#60757b', fontSize: 7, marginTop: 3 },
})

export function ProPoolPdf({ pool, locale }: { pool: any; locale?: string }) {
  const t = (key: Parameters<typeof toolWorkspaceText>[1]) => toolWorkspaceText(locale, key)
  return <Document><Page size="A4" style={s.page}>
    <Header title={`Dossier bassin — ${pool.name}`} />
    <View style={s.grid}>
      <Card label="Client" value={`${pool.client.firstName} ${pool.client.lastName}`} />
      <Card label="Type" value={pool.type} />
      <Card label="Volume" value={pool.volume ? `${pool.volume} ${pool.unit}` : t('notProvided')} />
      <Card label="Treatment" value={pool.treatmentType || t('notProvided')} />
      <Card label="Filtration" value={pool.filterType || t('notProvided')} />
      <Card label="Address" value={pool.address || pool.client.address || t('notProvidedF')} />
    </View>
    <Section title="Historique chimique">
      {pool.waterTests.length === 0 ? <Text>Aucune analyse enregistrée.</Text> : pool.waterTests.map((t: any) => <View key={t.id} style={s.row}>
        <Text style={s.cell}>{new Date(t.testedAt).toLocaleDateString('fr-FR')}</Text>
        <Text style={s.cell}>pH {t.ph ?? '—'}</Text><Text style={s.cell}>Cl {t.freeChlorine ?? '—'}</Text><Text style={s.cell}>TAC {t.alkalinity ?? '—'}</Text>
      </View>)}
    </Section>
    <Section title={t('recentInterventions')}>
      {pool.interventions.length === 0 ? <Text>Aucune intervention enregistrée.</Text> : pool.interventions.map((iv: any) => <View key={iv.id} style={s.row}>
        <Text style={s.cell}>{new Date(iv.scheduledAt).toLocaleDateString('fr-FR')}</Text><Text style={s.cell}>{iv.type}</Text><Text style={s.cell}>{iv.status}</Text>
      </View>)}
    </Section>
    <Footer />
  </Page></Document>
}

export function ProInterventionPdf({ intervention, locale }: { intervention: any; locale?: string }) {
  const t = (key: Parameters<typeof toolWorkspaceText>[1]) => toolWorkspaceText(locale, key)
  const actions = parseArray(intervention.actions)
  const products = parseArray(intervention.productsUsed)
  const photos = parseArray(intervention.photos)
  return <Document><Page size="A4" style={s.page}>
    <Header title="Rapport d’intervention" />
    <View style={s.grid}>
      <Card label="Client" value={`${intervention.client.firstName} ${intervention.client.lastName}`} />
      <Card label="Pool" value={intervention.pool?.name || t('notAssociated')} />
      <Card label={t('scheduledDate')} value={new Date(intervention.scheduledAt).toLocaleString(locale)} />
      <Card label="Completion date" value={intervention.completedAt ? new Date(intervention.completedAt).toLocaleString(locale) : t('unfinished')} />
      <Card label="Type" value={intervention.type} />
      <Card label="Statut" value={intervention.status} />
      <Card label="Duration" value={intervention.duration ? `${intervention.duration} minutes` : t('notProvidedF')} />
      <Card label="Technician" value={intervention.technicianId || t('unassigned')} />
    </View>
    <Section title="Compte rendu"><Text>{intervention.notes || 'Aucune observation.'}</Text></Section>
    <Section title={t('actionsDone')}>{actions.length ? actions.map((a, i) => <Text key={i}>• {label(a)}</Text>) : <Text>No action provided.</Text>}</Section>
    <Section title={t('productsUsed')}>{products.length ? products.map((p, i) => <Text key={i}>• {label(p)}</Text>) : <Text>No product provided.</Text>}</Section>
    <Section title={t('timestampedPhotos')}>{photos.length ? <View style={s.photoGrid}>{photos.slice(0, 6).map((photo: any, index: number) => <View key={index} style={s.photoCard}>
      <Image src={typeof photo === 'string' ? photo : photo.url} style={s.photo} aria-label={`Photo terrain ${index + 1}`} />
      <Text style={s.photoCaption}>{photo?.capturedAt ? new Date(photo.capturedAt).toLocaleString('fr-FR') : `Photo ${index + 1}`}</Text>
    </View>)}</View> : <Text>Aucune photo enregistrée.</Text>}</Section>
    <Footer />
  </Page></Document>
}

function Header({ title }: { title: string }) { return <View style={s.header}><Text style={s.brand}>AQWELIA PRO</Text><Text style={s.title}>{title}</Text><Text style={s.muted}>Généré le {new Date().toLocaleString('fr-FR')}</Text></View> }
function Card({ label, value }: { label: string; value: string }) { return <View style={s.card}><Text style={s.label}>{label}</Text><Text style={s.value}>{value}</Text></View> }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{children}</View> }
function Footer() { return <Text style={s.disclaimer}>Rapport opérationnel AQWELIA Pro. Les mesures et actions doivent être validées par le professionnel responsable de l’intervention.</Text> }
function parseArray(value: string | null): any[] { if (!value) return []; try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : [] } catch { return [] } }
function label(value: any): string { if (typeof value === 'string') return value; if (value && typeof value === 'object') return value.label || value.name || JSON.stringify(value); return String(value) }
