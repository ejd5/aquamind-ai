import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin'

// P8-INFRA: the canonical site URL (env-driven so preview deploys can override
// it via NEXT_PUBLIC_SITE_URL). Used by the Next.js Metadata API in
// `src/app/layout.tsx` (`metadataBase`) and by the SEO helpers in
// `src/lib/seo.ts`.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aqwelia.app'

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    // P0-FIX Bug 1: do not silently swallow TS errors — they mask real bugs
    // (e.g. the missing ./local-notifications module that crashed the native
    // layer at import time). Errors are kept at 0 in src/ by the team.
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
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
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

export default withNextIntl(nextConfig);
