/**
 * ARQWELIA Lot 1 — CLIENT analytics wrapper.
 *
 * Client-only. Wraps the existing `trackEvent` from `@/lib/analytics-client`
 * under an ARQ-prefixed name. Never sends PII (only screen names + counts +
 * flags). Import this from 'use client' components only.
 */
import { trackEvent } from '@/lib/analytics-client'

export const arqTrackClient = trackEvent