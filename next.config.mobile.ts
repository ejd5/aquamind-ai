import type { NextConfig } from "next";

/**
 * Next.js config for MOBILE build (Capacitor).
 *
 * This config is used when building the static export that gets bundled into
 * the iOS/Android app via Capacitor. It produces a `out/` directory with
 * fully static HTML/JS/CSS that Capacitor wraps in a native WebView.
 *
 * Usage:
 *   MOBILE_BUILD=true next build -c next.config.mobile.ts
 *
 * Key differences from the web config (next.config.ts):
 *   - output: "export"  (static HTML, no Node server)
 *   - images.unoptimized: true  (no server-side image optimization)
 *   - No standalone output
 *
 * API routes are NOT included in this build — the mobile app calls the
 * deployed backend via NEXT_PUBLIC_API_BASE_URL.
 */
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  // Disable trailing slash for cleaner Capacitor routing
  trailingSlash: false,
  // Static export doesn't support rewrites/redirects
};

export default nextConfig;
