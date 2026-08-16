import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import mobileNextConfig from './next.config.mobile'

// P8-INFRA: the canonical site URL (env-driven so preview deploys can override
// it via NEXT_PUBLIC_SITE_URL). Used by the Next.js Metadata API in
// `src/app/layout.tsx` (`metadataBase`) and by the SEO helpers in
// `src/lib/seo.ts`.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqwelia.app'

const isMobileBuild = process.env.MOBILE_BUILD === 'true'

const sharedConfig = {
  // The approved campaign PNG files are served directly. Vercel's image
  // optimizer rejects three of these large exported assets even though the
  // original static files are valid PNGs. They will be converted to WebP/AVIF
  // in the dedicated asset-optimization pass before production launch.
  images: {
    unoptimized: true,
  },
  typescript: {
    // P0-FIX Bug 1: do not silently swallow TS errors — they mask real bugs
    // (e.g. the missing ./local-notifications module that crashed the native
    // layer at import time). Errors are kept at 0 in src/ by the team.
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
} satisfies NextConfig

const webConfig: NextConfig = {
  ...sharedConfig,
  output: 'standalone',
  // PR #97: the standalone file tracer copies sharp's JS entry points but DROPS
  // the platform-native libvips binary (@img/sharp-libvips-*/lib/libvips-cpp*.so)
  // that sharp's .node binding dlopens at runtime — causing
  // "ERR_DLOPEN_FAILED: libvips-cpp.so... cannot open shared object file" on the
  // Vercel linux-x64 runtime.
  // PR #98: scope the tracing STRICTLY to the routes that actually import
  // normalizeImageForAi (sharp). A broad '/api/**/*' glob pulls the native
  // packages into every API route's trace, which pushed the Vercel deployment
  // over the 12 Serverless Functions limit on the Hobby plan.
  outputFileTracingIncludes: {
    '/api/pool/strip-scan': ['./node_modules/@img/**/*', './node_modules/sharp/**/*'],
    '/api/pool/photo-diagnostic': ['./node_modules/@img/**/*', './node_modules/sharp/**/*'],
  },
  allowedDevOrigins: ['*.space-z.ai', 'localhost', '127.0.0.1', '21.0.8.23'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=()' },
        ],
      },
    ]
  },
}

const nextConfig: NextConfig = isMobileBuild
  ? { ...sharedConfig, ...mobileNextConfig }
  : webConfig

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

export default withNextIntl(nextConfig)
