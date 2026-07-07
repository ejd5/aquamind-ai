import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ['*.space-z.ai', 'localhost', '127.0.0.1', '21.0.8.23'],
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

export default withNextIntl(nextConfig);
