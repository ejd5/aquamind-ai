/**
 * AQWELIA Academy — Courses catalogue API (P8-INFRA, Phase 12)
 *
 * GET /api/academy/courses
 *   Public (no auth). Returns the active academy courses, ordered by `order`
 *   then `createdAt`. Response shape:
 *
 *     {
 *       courses: Array<{
 *         id, slug, titleKey, descriptionKey, title, description,
 *         level, duration, videoUrl, content
 *       }>
 *     }
 *
 * Query params:
 *   - level=beginner|intermediate|expert  — filter by level (optional)
 *
 * Notes:
 *   - This endpoint is intentionally public so the academy home page can
 *     server-render the catalogue without exposing the user's session.
 *   - The `content` markdown is returned as-is; the client renders it with
 *     react-markdown (see src/components/aquamind/module-guides.tsx pattern).
 *   - Errors are returned as English strings (no French hardcoded) to comply
 *     with the pre-commit hook. The client maps them via t() if needed.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_LEVELS = new Set(['beginner', 'intermediate', 'expert'])

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const level = searchParams.get('level')

  const where = level && VALID_LEVELS.has(level) ? { active: true, level } : { active: true }

  try {
    const courses = await db.academyCourse.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        slug: true,
        titleKey: true,
        descriptionKey: true,
        title: true,
        description: true,
        level: true,
        duration: true,
        videoUrl: true,
        content: true,
      },
    })

    return NextResponse.json({ courses })
  } catch (err) {
    console.error('[api/academy/courses] list failed:', err)
    return NextResponse.json(
      { error: 'courses_fetch_failed' },
      { status: 500 }
    )
  }
}
