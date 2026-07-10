/**
 * AQWELIA Academy — Certification API (P8-INFRA, Phase 12)
 *
 * GET /api/academy/certification
 *   Auth-gated. Returns the authenticated user's certifications:
 *
 *     {
 *       certifications: Array<{
 *         id, courseId, status, score, completedAt, expiresAt,
 *         course: { slug, title, titleKey, level, duration }
 *       }>
 *     }
 *
 * POST /api/academy/certification
 *   Auth-gated. Two actions, selected by `body.action`:
 *
 *     action: 'start'
 *       Body: { courseId: string }
 *       Creates a Certification row in 'in_progress' status (idempotent —
 *       if an in_progress row exists for this user+course, returns it).
 *       Returns: { certification: Certification }
 *
 *     action: 'complete'
 *       Body: { courseId: string, score: number }
 *       Marks the user's in_progress Certification as 'completed', sets
 *       `completedAt` to now and `expiresAt` to now + 1 year. Score must be
 *       0-100. Returns: { certification: Certification }
 *
 *   Validation:
 *     - courseId must reference an existing AcademyCourse.
 *     - score (for 'complete') must be an integer in [0, 100].
 *
 *   Errors (English, mapped client-side via t()):
 *     - 401  'unauthorized'
 *     - 400  'missing_course_id' | 'invalid_action' | 'invalid_score'
 *     - 404  'course_not_found'
 *     - 404  'certification_not_found' (on 'complete' if not started)
 *     - 500  'certification_update_failed'
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Certification validity period (1 year, in ms). */
const CERT_VALIDITY_MS = 365 * 24 * 60 * 60 * 1000

/** Verify the session and return the userId, or throw a 401 response. */
async function requireAuth(): Promise<string> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return session.user.id
}

// ──────────────────────────────────────────────────────────────────────────
// GET — list the user's certifications
// ──────────────────────────────────────────────────────────────────────────

export async function GET() {
  let userId: string
  try {
    userId = await requireAuth()
  } catch (e) {
    return e as Response
  }

  try {
    const certifications = await db.certification.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            slug: true,
            title: true,
            titleKey: true,
            level: true,
            duration: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ certifications })
  } catch (err) {
    console.error('[api/academy/certification] GET failed:', err)
    return NextResponse.json({ error: 'certifications_fetch_failed' }, { status: 500 })
  }
}

// ──────────────────────────────────────────────────────────────────────────
// POST — start OR complete a certification
// ──────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let userId: string
  try {
    userId = await requireAuth()
  } catch (e) {
    return e as Response
  }

  let body: { action?: string; courseId?: string; score?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const action = body.action
  const courseId = body.courseId

  if (!courseId || typeof courseId !== 'string') {
    return NextResponse.json({ error: 'missing_course_id' }, { status: 400 })
  }

  // Verify the course exists (defensive — prevents creating certifications
  // for ghost courses if the DB is out of sync).
  try {
    const course = await db.academyCourse.findUnique({ where: { id: courseId } })
    if (!course) {
      return NextResponse.json({ error: 'course_not_found' }, { status: 404 })
    }
  } catch (err) {
    console.error('[api/academy/certification] course lookup failed:', err)
    return NextResponse.json({ error: 'course_lookup_failed' }, { status: 500 })
  }

  // ── action: start ────────────────────────────────────────────────────
  if (action === 'start') {
    try {
      // Idempotent: if an in_progress certification already exists for this
      // user+course, return it; otherwise create a new one.
      const existing = await db.certification.findFirst({
        where: { userId, courseId, status: 'in_progress' },
      })
      if (existing) {
        return NextResponse.json({ certification: existing })
      }
      const created = await db.certification.create({
        data: {
          userId,
          courseId,
          status: 'in_progress',
        },
      })
      return NextResponse.json({ certification: created })
    } catch (err) {
      console.error('[api/academy/certification] start failed:', err)
      return NextResponse.json(
        { error: 'certification_start_failed' },
        { status: 500 }
      )
    }
  }

  // ── action: complete ─────────────────────────────────────────────────
  if (action === 'complete') {
    const score = body.score
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 100) {
      return NextResponse.json({ error: 'invalid_score' }, { status: 400 })
    }

    try {
      // Find the user's in_progress certification for this course.
      const cert = await db.certification.findFirst({
        where: { userId, courseId, status: 'in_progress' },
      })
      if (!cert) {
        return NextResponse.json(
          { error: 'certification_not_found' },
          { status: 404 }
        )
      }

      const now = new Date()
      const expiresAt = new Date(now.getTime() + CERT_VALIDITY_MS)

      const updated = await db.certification.update({
        where: { id: cert.id },
        data: {
          status: 'completed',
          score,
          completedAt: now,
          expiresAt,
        },
      })
      return NextResponse.json({ certification: updated })
    } catch (err) {
      console.error('[api/academy/certification] complete failed:', err)
      return NextResponse.json(
        { error: 'certification_update_failed' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
}
