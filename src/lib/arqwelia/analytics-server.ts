/**
 * ARQWELIA Lot 1 — SERVER analytics wrapper.
 *
 * Server-only. Wraps `trackEventServer` under an ARQ-prefixed name. Import
 * this only from API route handlers (src/app/api/...). Never sends PII.
 */
export { trackEventServer as arqTrackServer } from '@/lib/analytics-server'