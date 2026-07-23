import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { nvidiaVision } from '@/lib/ai/nvidia'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { trackEventServer } from '@/lib/analytics-server'
import {
  PLANS,
  DEFAULT_PLAN,
  canAccess,
  type PlanId,
} from '@/lib/pool/freemium'
import { generateActionPlan } from '@/lib/pool/action-plan'
import {
  calculateClearWaterIndex,
  calculateLSI,
} from '@/lib/pool/water-balance'
import { assessSwimSafety } from '@/lib/pool/safety-rules'
import { normalizeImageForAi, SecureImageError } from '@/lib/images/secure-image'

export const runtime = 'nodejs'

/**
 * AQWELIA StripScan™ — IA-powered pool/spa test strip scanner.
 *
 * POST /api/pool/strip-scan
 *   Body: { image: <base64|data-url>, save?: boolean }
 *
 * Pipeline:
 *   1. Auth + plan gate (canAccess('photo_scan') with monthly quota)
 *   2. Server-side image normalization removes metadata and bounds dimensions
 *   3. NVIDIA VLM (nemotron-nano-12b-v2-vl) analyzes the normalized strip
 *   4. Parameter names are normalized to WaterTest fields (ph, freeChlorine, …)
 *   5. If `save: true`, persists a WaterTest (source='strip_photo') + action plan
 */

async function getUserPlanInfo(userId: string): Promise<{
  planId: PlanId
  status: import('@/lib/billing/plans').SubscriptionStatus
  expiresAt: Date | null
}> {
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

/** Count photo diagnostics + strip scans this month for quota enforcement. */
async function getPhotoScansThisMonth(userId: string): Promise<number> {
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  const [photoCount, stripCount] = await Promise.all([
    db.photoDiagnostic.count({
      where: { userId, createdAt: { gte: start } },
    }),
    db.waterTest.count({
      where: { userId, source: 'strip_photo', createdAt: { gte: start } },
    }),
  ])
  return photoCount + stripCount
}

const STRIP_SCAN_PROMPT = `Analyze this pool/spa test strip image. For each pad on the strip, identify:
  1. Which parameter it tests (pH, Free Chlorine, Total Chlorine, Total Alkalinity, Cyanuric Acid, Hardness, Bromine, Salt, Phosphates, Temperature)
  2. The color match value based on standard pool test strip color charts
  3. Your confidence level (0-100%)

Return ONLY valid JSON (no markdown, no prose), with this exact shape:
{
  "parameters": [
    { "name": "pH", "value": 7.2, "unit": "", "confidence": 95 },
    { "name": "Free Chlorine", "value": 2.0, "unit": "mg/L", "confidence": 90 }
  ],
  "stripBrand": "auto-detected brand or 'unknown'",
  "overallConfidence": 88,
  "imageQuality": "good" | "fair" | "poor",
  "qualityNotes": "Brief note about lighting, focus, framing…"
}

Rules:
- If you cannot see a test strip, return { "parameters": [], "stripBrand": "unknown", "overallConfidence": 0, "imageQuality": "poor", "qualityNotes": "No strip detected" }
- Values MUST be numeric (not strings). Use null only if a pad is completely unreadable.
- Confidence is 0-100 (integer). Be honest: blurry or poorly lit pads should be 40-70%.
- "imageQuality" reflects overall photo quality, not the strip itself.
- Never invent values you cannot see. Omit pads you cannot read rather than guessing.`

interface StripParameter {
  name: string
  value: number | null
  unit?: string
  confidence?: number
}

interface StripScanAnalysis {
  parameters: StripParameter[]
  stripBrand: string
  overallConfidence: number
  imageQuality: 'good' | 'fair' | 'poor'
  qualityNotes?: string
}

import { normalizeParamName } from '@/lib/pool/strip-scan-synonyms'

function numOrNull(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

function parseAnalysis(content: string): StripScanAnalysis | null {
  if (!content) return null
  const m = content.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    const parsed = JSON.parse(m[0]) as Partial<StripScanAnalysis>
    return {
      parameters: Array.isArray(parsed.parameters) ? parsed.parameters : [],
      stripBrand: typeof parsed.stripBrand === 'string' ? parsed.stripBrand : 'unknown',
      overallConfidence:
        typeof parsed.overallConfidence === 'number'
          ? Math.max(0, Math.min(100, parsed.overallConfidence))
          : 0,
      imageQuality:
        parsed.imageQuality === 'good' ||
        parsed.imageQuality === 'fair' ||
        parsed.imageQuality === 'poor'
          ? parsed.imageQuality
          : 'fair',
      qualityNotes: typeof parsed.qualityNotes === 'string' ? parsed.qualityNotes : undefined,
    }
  } catch {
    return null
  }
}

function buildTestPayload(analysis: StripScanAnalysis) {
  const mapped: Record<string, number | null> = {}
  for (const p of analysis.parameters) {
    const key = normalizeParamName(p.name)
    if (!key) continue
    const v = numOrNull(p.value)
    if (v != null) mapped[key] = v
  }
  if (mapped.ph == null) return null
  return {
    ph: mapped.ph,
    freeChlorine: mapped.freeChlorine ?? null,
    totalChlorine: mapped.totalChlorine ?? null,
    combinedChlorine: mapped.combinedChlorine ?? null,
    alkalinity: mapped.alkalinity ?? null,
    calciumHardness: mapped.calciumHardness ?? null,
    cyanuricAcid: mapped.cyanuricAcid ?? null,
    salt: mapped.salt ?? null,
    bromine: mapped.bromine ?? null,
    phosphates: mapped.phosphates ?? null,
    temperature: mapped.temperature ?? null,
  }
}

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const body = await req.json()
    const image: string | undefined = body?.image
    const save: boolean = Boolean(body?.save)
    if (!image || typeof image !== 'string') {
      const msg = await translate(locale, 'stripScan.noImage', 'Image base64 requise')
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const { planId, status, expiresAt } = await getUserPlanInfo(userId)
    const plan = PLANS.find((p) => p.id === planId) || PLANS[0]
    const used = await getPhotoScansThisMonth(userId)
    const gate = canAccess(
      planId,
      status,
      'photo_scan',
      { photoScansThisMonth: used },
      expiresAt,
    )
    if (!gate.allowed) {
      const fallback = gate.reason || 'Quota de scans atteint'
      const msg = await translate(locale, gate.reasonKey || 'gates.photo_scan_limit', fallback)
      return NextResponse.json(
        {
          error: msg,
          code: 'quota_exceeded',
          quota: { used, limit: plan.limits.maxPhotoScansPerMonth },
          ctaPlan: gate.ctaPlan,
        },
        { status: 403 },
      )
    }

    // Security boundary: the provider only receives a normalized JPEG without
    // EXIF/GPS metadata, bounded to 1600 px and 6 MB input.
    const normalized = await normalizeImageForAi(image)
    const vlm = await nvidiaVision(STRIP_SCAN_PROMPT, normalized.dataUrl, {
      maxTokens: 1200,
      temperature: 0.2,
    })
    const content = vlm.content || ''
    let analysis = parseAnalysis(content)

    if (!analysis) {
      analysis = {
        parameters: [],
        stripBrand: 'unknown',
        overallConfidence: 0,
        imageQuality: 'poor',
        qualityNotes: content.slice(0, 300) || 'No response from VLM',
      }
    }

    let waterTest: Awaited<ReturnType<typeof db.waterTest.create>> | null = null
    let actionPlan: Awaited<ReturnType<typeof db.actionPlan.create>> | null = null
    if (save) {
      const payload = buildTestPayload(analysis)
      if (!payload) {
        return NextResponse.json({
          analysis,
          raw: content,
          saved: false,
          reason: 'no_ph',
          quota: { used, limit: plan.limits.maxPhotoScansPerMonth },
        })
      }
      const cwi = calculateClearWaterIndex(payload as any)
      const swim = assessSwimSafety(payload as any)
      const lsi = calculateLSI(payload as any)
      let testStatus = 'ok'
      if (swim.status === 'forbidden' || cwi < 40) testStatus = 'critical'
      else if (cwi < 85 || swim.status === 'avoid') testStatus = 'warning'

      waterTest = await db.waterTest.create({
        data: {
          ...payload,
          userId,
          source: 'strip_photo',
          status: testStatus,
          clearWaterIndex: cwi,
          swimSafety: swim.status,
          lsi,
        },
      })

      const profile = await db.poolProfile.findFirst({ where: { userId } })
      if (profile) {
        const plan2 = generateActionPlan(payload as any, {
          volume: profile.volume,
          unit: profile.unit as any,
          treatmentType: profile.treatmentType,
          saltSystem: profile.saltSystem,
        })
        actionPlan = await db.actionPlan.create({
          data: {
            waterTestId: waterTest.id,
            diagnosis: plan2.diagnosis,
            severity: plan2.severity,
            confidence: plan2.confidence,
            immediateActions: JSON.stringify(plan2.immediateActions),
            chemicalDosages: JSON.stringify(plan2.chemicalDosages),
            filtrationHours: plan2.filtrationHours,
            retestInHours: plan2.retestInHours,
            swimSafety: plan2.swimSafety,
            doNotDo: JSON.stringify(plan2.doNotDo),
            estimatedCost: plan2.estimatedCost,
            whenToCallProfessional: plan2.whenToCallProfessional,
          },
        })
      }
    }

    void trackEventServer(
      'strip_scan_run',
      {
        brand: analysis.stripBrand,
        paramCount: analysis.parameters.length,
        overallConfidence: analysis.overallConfidence,
        imageQuality: analysis.imageQuality,
        saved: save,
        plan: planId,
        imageInputBytes: normalized.inputBytes,
        imageOutputBytes: normalized.outputBytes,
        imageWidth: normalized.width,
        imageHeight: normalized.height,
      },
      userId,
    )

    return NextResponse.json({
      analysis,
      raw: content,
      saved: Boolean(waterTest),
      waterTest,
      actionPlan,
      quota: { used: used + 1, limit: plan.limits.maxPhotoScansPerMonth },
    })
  } catch (e) {
    if (e instanceof SecureImageError) {
      return NextResponse.json(
        { error: e.message, code: 'invalid_image' },
        { status: e.statusCode },
      )
    }
    const msg = e instanceof Error ? e.message : 'Erreur'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
