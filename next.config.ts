import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    // P0-FIX Bug 1: do not silently swallow TS errors — they mask real bugs
    // (e.g. the missing ./local-notifications module that crashed the native
    // layer at import time). Errors are kept at 0 in src/ by the team.
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  allowedDevOrigins: ['*.space-z.ai', 'localhost', '127.0.0.1', '21.0.8.23'],
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

export default withNextIntl(nextConfig);
