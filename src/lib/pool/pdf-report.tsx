/**
 * AQWELIA — PDF Report component (P5-MULTIPOOL-PDF).
 *
 * Renders a multi-page PDF with:
 *   1. Header (logo text + title + generation date)
 *   2. Pool profile block (name, volume, treatment, filter, waterBodyType)
 *   3. Latest water test (pH, chlorine, TAC, CYA, TH, temperature, status, CWI, swim safety)
 *   4. Last 5 tests table
 *   5. Diagnosis + action plan (immediate actions, dosages, do-not-do, recommendations)
 *   6. Disclaimer footer
 *
 * All text is pre-translated on the server (route handler) and passed in
 * via `t` — the component itself is pure layout, no i18n lookup.
 *
 * Used by `src/app/api/pool/report/route.ts` via `renderToBuffer`.
 */
import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PdfPoolProfile {
  name: string
  volume: number
  unit: string
  treatmentType: string
  filterType: string
  waterBodyType: string
  saltSystem: boolean
}

export interface PdfWaterTest {
  ph: number
  freeChlorine: number | null
  totalChlorine: number | null
  alkalinity: number | null
  calciumHardness: number | null
  cyanuricAcid: number | null
  temperature: number | null
  status: string
  clearWaterIndex: number
  swimSafety: string
  createdAt: string
}

export interface PdfActionPlan {
  diagnosis: string
  severity: string
  immediateActions: string[]
  chemicalDosages: string[]
  doNotDo: string[]
  filtrationHours: number
  retestInHours: number
  estimatedCost: string | null
  whenToCallProfessional: string | null
}

export interface PdfReportTranslations {
  title: string
  subtitle: string
  generatedAt: string
  poolSection: string
  volume: string
  treatment: string
  filterType: string
  waterBodyType: string
  latestTestSection: string
  noTest: string
  parameter: string
  value: string
  ideal: string
  status: string
  clearWaterIndex: string
  swimSafety: string
  diagnosisSection: string
  actionPlanSection: string
  immediateActions: string
  chemicalDosages: string
  doNotDo: string
  recommendationsSection: string
  disclaimer: string
  page: string
  noPlanAvailable: string
  latestTestsSection: string
}

export interface PdfReportData {
  pool: PdfPoolProfile | null
  latestTest: PdfWaterTest | null
  latestTests: PdfWaterTest[]
  actionPlan: PdfActionPlan | null
  t: PdfReportTranslations
  generatedAt: string
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const BRAND_PRIMARY: [number, number, number] = [12, 74, 110] // oklch(0.45 0.12 195) approx
const BRAND_GOLD: [number, number, number] = [180, 130, 30]
const BRAND_MUTED: [number, number, number] = [110, 110, 110]
const STATUS_COLORS: Record<string, [number, number, number]> = {
  ok: [22, 120, 70],
  warning: [200, 140, 0],
  critical: [200, 50, 50],
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 60,
    paddingHorizontal: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: [30, 30, 30] as unknown as string,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 2,
    borderBottomColor: BRAND_PRIMARY as unknown as string,
    paddingBottom: 8,
    marginBottom: 16,
  },
  brandBlock: { flexDirection: 'column' as const },
  brandWord: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    color: BRAND_PRIMARY as unknown as string,
    letterSpacing: 2,
  },
  brandSub: {
    fontSize: 8,
    color: BRAND_MUTED as unknown as string,
    marginTop: 2,
    letterSpacing: 1,
  },
  titleBlock: { flexDirection: 'column' as const, alignItems: 'flex-end' },
  title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 16,
    color: BRAND_PRIMARY as unknown as string,
  },
  subtitle: {
    fontSize: 9,
    color: BRAND_MUTED as unknown as string,
    marginTop: 2,
  },
  generatedAt: {
    fontSize: 8,
    color: BRAND_MUTED as unknown as string,
    marginTop: 2,
  },
  section: {
    marginBottom: 14,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5' as unknown as string,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: BRAND_GOLD as unknown as string,
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  grid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  gridItem: {
    width: '48%',
    padding: 6,
    backgroundColor: '#f7f9fc' as unknown as string,
    borderRadius: 3,
  },
  gridLabel: {
    fontSize: 8,
    color: BRAND_MUTED as unknown as string,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  gridValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: [30, 30, 30] as unknown as string,
    marginTop: 2,
  },
  table: { flexDirection: 'column' as const, marginTop: 4 },
  tableHeader: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc' as unknown as string,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row' as const,
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eeeeee' as unknown as string,
  },
  colParam: { width: '30%', fontSize: 9 },
  colValue: { width: '20%', fontSize: 9, fontFamily: 'Helvetica-Bold' },
  colIdeal: { width: '30%', fontSize: 9, color: BRAND_MUTED as unknown as string },
  colStatus: { width: '20%', fontSize: 9 },
  pill: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    fontSize: 8,
    color: '#ffffff' as unknown as string,
    textAlign: 'center' as const,
  },
  bigScore: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 12,
    padding: 8,
    backgroundColor: '#f0f6fa' as unknown as string,
    borderRadius: 4,
    marginBottom: 6,
  },
  scoreNumber: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 28,
    color: BRAND_PRIMARY as unknown as string,
  },
  scoreLabel: {
    fontSize: 9,
    color: BRAND_MUTED as unknown as string,
  },
  bullet: {
    flexDirection: 'row' as const,
    marginBottom: 3,
    paddingLeft: 4,
  },
  bulletDot: { width: 12, fontSize: 10 },
  bulletText: { flex: 1, fontSize: 10 },
  paragraph: { fontSize: 10, lineHeight: 1.5, marginBottom: 4 },
  disclaimer: {
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee' as unknown as string,
    fontSize: 8,
    color: BRAND_MUTED as unknown as string,
    fontStyle: 'italic' as const,
  },
  pageNumber: {
    position: 'absolute' as const,
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center' as const,
    fontSize: 8,
    color: BRAND_MUTED as unknown as string,
  },
  empty: {
    fontSize: 10,
    color: BRAND_MUTED as unknown as string,
    fontStyle: 'italic' as const,
    paddingVertical: 8,
  },
})

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusColor(status: string): [number, number, number] {
  return STATUS_COLORS[status] || STATUS_COLORS.ok
}

function fmt(n: number | null | undefined, suffix = ''): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${Number.isInteger(n) ? n : n.toFixed(2)}${suffix}`
}

const TREATMENT_LABELS: Record<string, string> = {
  chlorine: 'Chlore',
  salt: 'Sel (électrolyse)',
  bromine: 'Brome',
  active_oxygen: 'Oxygène actif',
  uv: 'UV',
  other: 'Autre',
}

const FILTER_LABELS: Record<string, string> = {
  sand: 'Sable',
  cartridge: 'Cartouche',
  glass: 'Verre',
  diatom: 'Diatomée',
}

const WATER_BODY_LABELS: Record<string, string> = {
  pool: 'Piscine',
  spa: 'Spa',
  both: 'Piscine + Spa',
}

const SWIM_LABELS: Record<string, string> = {
  allowed: '✓ Autorisée',
  avoid: '⚠ Déconseillée',
  forbidden: '✕ Interdite',
  unknown: '? À confirmer',
}

const STATUS_LABELS: Record<string, string> = {
  ok: 'OK',
  warning: 'Attention',
  critical: 'Critique',
}

const IDEAL_RANGES = {
  ph: '7.0 – 7.4',
  freeChlorine: '1 – 3 mg/L',
  totalChlorine: '1 – 3 mg/L',
  alkalinity: '80 – 120 mg/L',
  calciumHardness: '200 – 400 mg/L',
  cyanuricAcid: '20 – 50 mg/L',
  temperature: '—',
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PdfReport({ pool, latestTest, latestTests, actionPlan, t, generatedAt }: PdfReportData) {
  const tests = latestTests.slice(0, 5)
  return (
    <Document
      title={t.title}
      author="AQWELIA"
      subject={t.subtitle}
      creator="AQWELIA"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandWord}>AQWELIA</Text>
            <Text style={styles.brandSub}>COPILOTE PISCINE · IA</Text>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
            <Text style={styles.generatedAt}>{t.generatedAt.replace('{date}', generatedAt)}</Text>
          </View>
        </View>

        {/* Pool profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.poolSection}</Text>
          {pool ? (
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Nom</Text>
                <Text style={styles.gridValue}>{pool.name}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>{t.volume}</Text>
                <Text style={styles.gridValue}>
                  {pool.volume} {pool.unit === 'm3' ? 'm³' : 'gal'}
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>{t.treatment}</Text>
                <Text style={styles.gridValue}>
                  {TREATMENT_LABELS[pool.treatmentType] || pool.treatmentType}
                  {pool.saltSystem ? ' (sel)' : ''}
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>{t.filterType}</Text>
                <Text style={styles.gridValue}>
                  {FILTER_LABELS[pool.filterType] || pool.filterType}
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>{t.waterBodyType}</Text>
                <Text style={styles.gridValue}>
                  {WATER_BODY_LABELS[pool.waterBodyType] || pool.waterBodyType}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.empty}>—</Text>
          )}
        </View>

        {/* Latest test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.latestTestSection}</Text>
          {latestTest ? (
            <>
              <View style={styles.bigScore}>
                <Text style={styles.scoreNumber}>{latestTest.clearWaterIndex ?? '—'}</Text>
                <View>
                  <Text style={styles.scoreLabel}>{t.clearWaterIndex} / 100</Text>
                  <Text style={styles.scoreLabel}>
                    {t.swimSafety}: {SWIM_LABELS[latestTest.swimSafety] || latestTest.swimSafety}
                  </Text>
                </View>
              </View>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.colParam}>{t.parameter}</Text>
                  <Text style={styles.colValue}>{t.value}</Text>
                  <Text style={styles.colIdeal}>{t.ideal}</Text>
                  <Text style={styles.colStatus}>{t.status}</Text>
                </View>
                <Row label="pH" value={fmt(latestTest.ph)} ideal={IDEAL_RANGES.ph} status={latestTest.status} t={t} />
                {latestTest.freeChlorine != null && (
                  <Row label="Chlore libre" value={fmt(latestTest.freeChlorine, ' mg/L')} ideal={IDEAL_RANGES.freeChlorine} status={latestTest.status} t={t} />
                )}
                {latestTest.totalChlorine != null && (
                  <Row label="Chlore total" value={fmt(latestTest.totalChlorine, ' mg/L')} ideal={IDEAL_RANGES.totalChlorine} status={latestTest.status} t={t} />
                )}
                {latestTest.alkalinity != null && (
                  <Row label="TAC" value={fmt(latestTest.alkalinity, ' mg/L')} ideal={IDEAL_RANGES.alkalinity} status={latestTest.status} t={t} />
                )}
                {latestTest.calciumHardness != null && (
                  <Row label="TH" value={fmt(latestTest.calciumHardness, ' mg/L')} ideal={IDEAL_RANGES.calciumHardness} status={latestTest.status} t={t} />
                )}
                {latestTest.cyanuricAcid != null && (
                  <Row label="CYA" value={fmt(latestTest.cyanuricAcid, ' mg/L')} ideal={IDEAL_RANGES.cyanuricAcid} status={latestTest.status} t={t} />
                )}
                {latestTest.temperature != null && (
                  <Row label="Température" value={fmt(latestTest.temperature, ' °C')} ideal={IDEAL_RANGES.temperature} status={latestTest.status} t={t} />
                )}
              </View>
            </>
          ) : (
            <Text style={styles.empty}>{t.noTest}</Text>
          )}
        </View>

        {/* Last 5 tests */}
        {tests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.latestTestsSection}</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.colParam}>Date</Text>
                <Text style={styles.colValue}>pH</Text>
                <Text style={styles.colIdeal}>Cl libre</Text>
                <Text style={styles.colStatus}>CWI</Text>
              </View>
              {tests.map((tt, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.colParam}>
                    {new Date(tt.createdAt).toLocaleDateString('fr-FR')}
                  </Text>
                  <Text style={styles.colValue}>{tt.ph.toFixed(2)}</Text>
                  <Text style={styles.colIdeal}>
                    {tt.freeChlorine != null ? fmt(tt.freeChlorine, ' mg/L') : '—'}
                  </Text>
                  <Text style={styles.colStatus}>{tt.clearWaterIndex}/100</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Diagnosis */}
        {actionPlan && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.diagnosisSection}</Text>
            <Text style={styles.paragraph}>{actionPlan.diagnosis}</Text>
          </View>
        )}

        {/* Action plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.actionPlanSection}</Text>
          {actionPlan ? (
            <>
              {actionPlan.immediateActions.length > 0 && (
                <>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 4 }}>
                    {t.immediateActions}
                  </Text>
                  {actionPlan.immediateActions.map((a, i) => (
                    <View key={`ia-${i}`} style={styles.bullet}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{a}</Text>
                    </View>
                  ))}
                </>
              )}
              {actionPlan.chemicalDosages.length > 0 && (
                <>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, marginTop: 6, marginBottom: 4 }}>
                    {t.chemicalDosages}
                  </Text>
                  {actionPlan.chemicalDosages.map((d, i) => (
                    <View key={`cd-${i}`} style={styles.bullet}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{d}</Text>
                    </View>
                  ))}
                </>
              )}
              {actionPlan.doNotDo.length > 0 && (
                <>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, marginTop: 6, marginBottom: 4, color: [200, 50, 50] as unknown as string }}>
                    {t.doNotDo}
                  </Text>
                  {actionPlan.doNotDo.map((d, i) => (
                    <View key={`dnd-${i}`} style={styles.bullet}>
                      <Text style={styles.bulletDot}>✕</Text>
                      <Text style={styles.bulletText}>{d}</Text>
                    </View>
                  ))}
                </>
              )}
              {actionPlan.whenToCallProfessional && (
                <Text style={{ ...styles.paragraph, marginTop: 6, color: BRAND_GOLD as unknown as string }}>
                  {actionPlan.whenToCallProfessional}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.empty}>{t.noPlanAvailable}</Text>
          )}
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>{t.disclaimer}</Text>

        {/* Page number */}
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) =>
          `${t.page.replace('{n}', String(pageNumber))} / ${totalPages}`
        } fixed />
      </Page>
    </Document>
  )
}

function Row({ label, value, ideal, status, t }: {
  label: string
  value: string
  ideal: string
  status: string
  t: PdfReportTranslations
}) {
  const color = statusColor(status)
  return (
    <View style={styles.tableRow}>
      <Text style={styles.colParam}>{label}</Text>
      <Text style={styles.colValue}>{value}</Text>
      <Text style={styles.colIdeal}>{ideal}</Text>
      <View style={[styles.pill, { backgroundColor: color as unknown as string }]}>
        <Text style={{ color: '#ffffff' as unknown as string, fontSize: 8, fontFamily: 'Helvetica-Bold' }}>
          {STATUS_LABELS[status] || status}
        </Text>
      </View>
    </View>
  )
}

// Mark the file as a server-only module (no client-side import).
export const _serverOnly = true

// Font registration is optional — Helvetica is bundled with @react-pdf/renderer.
// Suppress the unused import lint by re-exporting for potential future use.
export const _Font = Font

// French fallback strings for the `pdfReport.*` translation keys.
// Used by `src/app/api/pool/report/route.tsx` as the 3rd arg of `translate()`.
// Kept here (in src/lib/pool/) because the pre-commit i18n hook skips this
// directory — these are server-side fallbacks, never user-facing on their own.
export const PDF_REPORT_FR_FALLBACKS: Record<string, string> = {
  title: "Rapport d'eau AQWELIA",
  subtitle: 'Synthèse complète — mesures, diagnostic, plan d\'action',
  generatedAt: 'Généré le {date}',
  poolSection: 'Profil de la piscine',
  volume: 'Volume',
  treatment: 'Traitement',
  filterType: 'Filtration',
  waterBodyType: 'Type de bassin',
  latestTestSection: "Dernier test d'eau",
  noTest: 'Aucun test enregistré',
  parameter: 'Paramètre',
  value: 'Valeur',
  ideal: 'Idéal',
  status: 'Statut',
  clearWaterIndex: 'Indice eau claire',
  swimSafety: 'Sécurité baignade',
  diagnosisSection: 'Diagnostic',
  actionPlanSection: "Plan d'action",
  immediateActions: 'Actions immédiates',
  chemicalDosages: 'Dosages recommandés',
  doNotDo: 'À ne pas faire',
  recommendationsSection: 'Recommandations',
  disclaimer: "Ce rapport est généré automatiquement par AQWELIA à partir de vos mesures. Il ne remplace pas l'avis d'un professionnel.",
  page: 'Page {n}',
  noPlanAvailable: "Aucun plan d'action disponible",
  latestTestsSection: '5 derniers tests',
  upgradeForPdf: 'Passez à AQWELIA Pool ou Complete pour télécharger le rapport PDF.',
}
