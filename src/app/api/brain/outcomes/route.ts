import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { assessRecommendationOutcome, clampRating } from '@/lib/brain/outcome'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.outcomeId) {
    return NextResponse.json({ error: 'Outcome required' }, { status: 400 })
  }

  const outcome = await db.recommendationOutcome.findFirst({
    where: {
      id: String(body.outcomeId),
      userId: session.user.id,
    },
  })
  if (!outcome) {
    return NextResponse.json({ error: 'Outcome not found' }, { status: 404 })
  }

  const requestedFollowupId = body.followupWaterTestId
    ? String(body.followupWaterTestId)
    : null

  const followupTest = requestedFollowupId
    ? await db.waterTest.findFirst({
        where: {
          id: requestedFollowupId,
          userId: session.user.id,
          poolId: outcome.poolId,
        },
      })
    : null

  if (requestedFollowupId && !followupTest) {
    return NextResponse.json(
      { error: 'Follow-up water test not found for this pool' },
      { status: 404 }
    )
  }

  const rating = clampRating(body.rating)
  if (body.rating != null && rating == null) {
    return NextResponse.json(
      { error: 'Rating must be an integer between 1 and 5' },
      { status: 400 }
    )
  }

  const assessment = followupTest
    ? assessRecommendationOutcome(
        outcome.clearWaterIndexBefore,
        followupTest.clearWaterIndex
      )
    : null

  const updated = await db.recommendationOutcome.update({
    where: { id: outcome.id },
    data: {
      followupWaterTestId: followupTest?.id,
      clearWaterIndexAfter: followupTest?.clearWaterIndex ?? undefined,
      status: assessment?.status ?? outcome.status,
      userRating: body.rating != null ? rating : undefined,
      userFeedback: body.feedback
        ? String(body.feedback).slice(0, 2000)
        : undefined,
      evaluatedAt: followupTest ? new Date() : undefined,
    },
  })

  return NextResponse.json({ outcome: updated, assessment })
}
