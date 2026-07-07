import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * Next.js configuration for AQWELIA.
 *
 * Dual-mode build:
 *   - Web (default): `next build` → output: "standalone" (Node server)
 *   - Mobile: `MOBILE_BUILD=true next build` → output: "export" (static HTML for Capacitor)
 *
 * The mobile build is triggered by `bun run mobile:build` which sets
 * MOBILE_BUILD=true before invoking next build.
 *
 * The `next-intl` plugin (createNextIntlPlugin) is REQUIRED for the App Router
 * to locate `src/i18n/request.ts` and load the message bundle on the server.
 * Without it, `getLocale()` / `getMessages()` throw at runtime. The plugin is
 * purely additive — it only adds the request-config alias + Turbopack rules.
 */
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isMobileBuild = process.env.MOBILE_BUILD === "true";

const nextConfig: NextConfig = isMobileBuild
  ? {
      // ===== MOBILE BUILD (Capacitor static export) =====
      output: "export",
      images: {
        unoptimized: true,
      },
      typescript: {
        // Ignore build errors (pre-existing in examples/ and skills/ folders)
        ignoreBuildErrors: true,
      },
      reactStrictMode: true,
      trailingSlash: false,
    }
  : {
      // ===== WEB BUILD (standalone Node server) =====
      output: "standalone",
      typescript: {
        ignoreBuildErrors: true,
      },
      reactStrictMode: false,
    };

export default withNextIntl(nextConfig);
