import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import type { Locale } from '@/i18n/config'
import { PLANS, DEFAULT_PLAN, canAccess, type PlanId } from '@/lib/pool/freemium'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import {
  PdfReport,
  PDF_REPORT_FR_FALLBACKS,
  type PdfReportData,
  type PdfReportTranslations,
  type PdfPoolProfile,
  type PdfWaterTest,
  type PdfActionPlan,
} from '@/lib/pool/pdf-report'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/pool/report
 * GET /api/pool/report?poolId=xxx
 *
 * Generates a PDF report with the latest test, diagnosis, action plan,
 * and last 5 tests. Gated by `canAccess(planId, 'pdf_report')` —
 * only Oasis and Wellness plans can download.
 */

async function getTranslations(locale: Locale): Promise<PdfReportTranslations> {
  const keys: (keyof PdfReportTranslations)[] = [
    'title', 'subtitle', 'generatedAt', 'poolSection', 'volume', 'treatment',
    'filterType', 'waterBodyType', 'latestTestSection', 'noTest', 'parameter',
    'value', 'ideal', 'status', 'clearWaterIndex', 'swimSafety',
    'diagnosisSection', 'actionPlanSection', 'immediateActions',
    'chemicalDosages', 'doNotDo', 'recommendationsSection', 'disclaimer',
    'page', 'noPlanAvailable', 'latestTestsSection',
  ]
  const out = {} as Record<string, string>
  for (const k of keys) {
    const fallback = PDF_REPORT_FR_FALLBACKS[k] || k
    out[k] = await translate(locale, `pdfReport.${k}`, fallback)
  }
  return out as unknown as PdfReportTranslations
}

async function getUserPlanInfo(userId: string): Promise<{ planId: PlanId; status: import('@/lib/billing/plans').SubscriptionStatus; expiresAt: Date | null }> {
  const sub = await db.subscription.findFirst({
    where: { userId, active: true },
    orderBy: { startedAt: 'desc' },
  })
  return {
    planId: (sub?.plan as PlanId) || DEFAULT_PLAN,
    status: (sub?.status as import('@/lib/billing/plans').SubscriptionStatus) || 'inactive',
    expiresAt: sub?.expiresAt || null,
  }
}

function safeParse<T>(s: string | null, fallback: T): T {
  if (!s) return fallback
  try { return JSON.parse(s) as T } catch { return fallback }
}

export async function GET(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  // ── Plan gate ──────────────────────────────────────────────────────────
  const { planId, status, expiresAt } = await getUserPlanInfo(userId)
  const gate = canAccess(planId, status, 'pdf_report', undefined, expiresAt)
  if (!gate.allowed) {
    const plan = PLANS.find((p) => p.id === planId) || PLANS[0]
    const msg = await translate(
      locale,
      'pdfReport.upgradeForPdf',
      'Passez à AQWELIA Pool ou Complete pour télécharger le rapport PDF.'
    )
    return NextResponse.json(
      {
        error: msg,
        code: 'PDF_REPORT_NOT_ALLOWED',
        ctaPlan: gate.ctaPlan,
        plan: plan.id,
      },
      { status: 403 }
    )
  }

  // ── Resolve pool (active or first) ──────────────────────────────────────
  const url = new URL(req.url)
  const poolId = url.searchParams.get('poolId')
  const profile = await db.poolProfile.findFirst({
    where: poolId ? { id: poolId, userId } : { userId },
  })
  if (!profile) {
    const msg = await translate(locale, 'common.errors.poolProfileRequired', 'Profil piscine requis')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // ── Fetch latest test + last 5 tests + latest action plan ──────────────
  const [latestTest, recentTests, latestPlan] = await Promise.all([
    db.waterTest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    db.waterTest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.actionPlan.findFirst({
      where: { waterTest: { userId } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  // ── Map to PDF types ───────────────────────────────────────────────────
  const pdfPool: PdfPoolProfile = {
    name: profile.name,
    volume: profile.volume,
    unit: profile.unit,
    treatmentType: profile.treatmentType,
    filterType: profile.filterType,
    waterBodyType: profile.waterBodyType,
    saltSystem: profile.saltSystem,
  }

  const mapTest = (t: typeof latestTest): PdfWaterTest | null => {
    if (!t) return null
    return {
      ph: t.ph,
      freeChlorine: t.freeChlorine,
      totalChlorine: t.totalChlorine,
      alkalinity: t.alkalinity,
      calciumHardness: t.calciumHardness,
      cyanuricAcid: t.cyanuricAcid,
      temperature: t.temperature,
      status: t.status,
      clearWaterIndex: t.clearWaterIndex,
      swimSafety: t.swimSafety,
      createdAt: t.createdAt.toISOString(),
    }
  }

  const pdfLatestTest = mapTest(latestTest)
  const pdfTests: PdfWaterTest[] = recentTests
    .map(mapTest)
    .filter((t): t is PdfWaterTest => t !== null)

  let pdfActionPlan: PdfActionPlan | null = null
  if (latestPlan) {
    pdfActionPlan = {
      diagnosis: latestPlan.diagnosis,
      severity: latestPlan.severity,
      immediateActions: safeParse<string[]>(latestPlan.immediateActions, []),
      chemicalDosages: safeParse<string[]>(latestPlan.chemicalDosages, []),
      doNotDo: safeParse<string[]>(latestPlan.doNotDo, []),
      filtrationHours: latestPlan.filtrationHours,
      retestInHours: latestPlan.retestInHours,
      estimatedCost: latestPlan.estimatedCost,
      whenToCallProfessional: latestPlan.whenToCallProfessional,
    }
  }

  // ── Build translations ─────────────────────────────────────────────────
  const t = await getTranslations(locale)
  const generatedAt = new Date().toLocaleString(locale, {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  const data: PdfReportData = {
    pool: pdfPool,
    latestTest: pdfLatestTest,
    latestTests: pdfTests,
    actionPlan: pdfActionPlan,
    t,
    generatedAt,
  }

  // ── Render PDF ─────────────────────────────────────────────────────────
  // Construct the JSX element OUTSIDE the try/catch — see
  // https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
  const element = <PdfReport {...data} />
  try {
    const buffer = await renderToBuffer(element)
    const filename = `AQWELIA-rapport-${profile.name.replace(/[^a-zA-Z0-9-_]/g, '_')}-${new Date().toISOString().slice(0, 10)}.pdf`
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : 'PDF render error',
        code: 'PDF_RENDER_ERROR',
      },
      { status: 500 }
    )
  }
}
