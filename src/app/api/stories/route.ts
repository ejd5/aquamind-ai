/**
 * AQWELIA Stories — API.
 *
 * URL: /api/stories
 *
 * GET  → returns the list of available "stories" (short video tutorials).
 *       Each story references an existing guide + a topic key, with a placeholder
 *       thumbnail. No real video files yet — the UI displays a "video coming
 *       soon" placeholder in the player modal.
 *
 * Auth: optional (catalog is public, like /api/guides).
 */
import { NextResponse } from 'next/server'
import { GUIDES } from '@/lib/pool/guides-data'

export const runtime = 'nodejs'

export interface Story {
  id: string
  topicKey: string // 'green-water' | 'ph-perfect' | ... (stories.topics namespace)
  guideId: string | null
  durationSec: number
  thumbnailHue: number // for the placeholder gradient
  category: string // emoji-style icon
}

// Static catalogue — the 6 topics specified in the brief.
// Each maps to an existing guide where possible (so the modal can deep-link
// to the full guide if the user wants more detail).
const STORY_CATALOG: Omit<Story, 'guideId'>[] = [
  { id: 'green-water', topicKey: 'green-water', durationSec: 28, thumbnailHue: 145, category: '🟢' },
  { id: 'ph-perfect', topicKey: 'ph-perfect', durationSec: 22, thumbnailHue: 195, category: '⚗️' },
  { id: 'backwash', topicKey: 'backwash', durationSec: 25, thumbnailHue: 215, category: '🌊' },
  { id: 'shock-chlorine', topicKey: 'shock-chlorine', durationSec: 30, thumbnailHue: 25, category: '💥' },
  { id: 'filter-clean', topicKey: 'filter-clean', durationSec: 26, thumbnailHue: 85, category: '🔧' },
  { id: 'winterize', topicKey: 'winterize', durationSec: 29, thumbnailHue: 240, category: '❄️' },
]

// Map a story topic to its best matching guide id (manual curation).
const TOPIC_TO_GUIDE: Record<string, string> = {
  'green-water': 'green-water',
  'ph-perfect': 'ph-control',
  'backwash': 'filter-backwash',
  'shock-chlorine': 'chlorine-shock',
  'filter-clean': 'filter-cartridge-clean',
  'winterize': 'winterization',
}

export async function GET() {
  const guideIds = new Set(GUIDES.map((g) => g.id))
  const stories: Story[] = STORY_CATALOG.map((s) => ({
    ...s,
    guideId: TOPIC_TO_GUIDE[s.id] && guideIds.has(TOPIC_TO_GUIDE[s.id])
      ? TOPIC_TO_GUIDE[s.id]
      : null,
  }))

  return NextResponse.json({ stories })
}
