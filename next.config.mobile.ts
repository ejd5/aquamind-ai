import type { NextConfig } from 'next'

/**
 * Mobile-only Next.js overrides.
 *
 * Next.js 16 does not expose a `next build -c <config>` option. The canonical
 * `next.config.ts` imports these overrides when `MOBILE_BUILD=true`, so web and
 * Capacitor builds share the same plugins and type-safety settings while using
 * different output modes.
 */
const mobileNextConfig = {
  output: 'export',
  trailingSlash: false,
} satisfies NextConfig

export default mobileNextConfig
