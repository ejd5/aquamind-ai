# AQWELIA — Mobile Readiness Report

> Status of the Capacitor iOS/Android mobile build as of the **P4-MOBILE** task.
> Owner: native / mobile layer. Author: P4-MOBILE agent.

---

## TL;DR

The Capacitor layer is **functionally complete at the wrapper level** — every
plugin needed by the product is installed in `package.json`, and every native
wrapper exists under `src/lib/native/` with SSR-safe + web-fallback behaviour.
The only remaining step before producing an `.ipa` / `.aab` is the **native
project scaffolding** (`npx cap add ios` + `npx cap add android`), which
requires macOS + Xcode (iOS) or Android Studio and therefore cannot run inside
this Linux sandbox.

| Capability | Status |
|------------|--------|
| Capacitor config (`capacitor.config.ts`) | ✅ Complete (appId, webDir, plugins) |
| Capacitor plugins in `package.json` | ✅ All 11 required + 2 extras |
| Native wrappers (`src/lib/native/*`) | ✅ 15 modules (14 wrappers + barrel) |
| Mobile UI shell (`src/components/mobile/*`) | ✅ Complete (header, bottom tabs, 5 screens) |
| Responsive desktop ↔ mobile switch | ✅ `hidden md:block` / `md:hidden` |
| Safe-area handling (notch, home indicator) | ✅ CSS `env(safe-area-inset-*)` + utility classes |
| RevenueCat mobile billing | ✅ SSR-safe, new plan IDs (Découverte/Oasis/Wellness) |
| `ios/` and `android/` native projects | ❌ Missing — requires `npx cap add` on dev machine |
| App Store / Play Store metadata | ⚠️ Documented in `STORE_READINESS.md`, not yet submitted |

---

## 1. Capacitor configuration (`capacitor.config.ts`)

| Field | Value | Note |
|-------|-------|------|
| `appId` | `com.aqwelia.app` | ✅ Matches App Store / Play Store plan |
| `appName` | `Aqwelia` | ✅ |
| `webDir` | `out` | ✅ Matches `next.config.mobile.ts` → `output: "export"` |
| `backgroundColor` | `#003B4A` | ✅ AQWELIA oceanic brand |
| `ios.contentInset` | `'always'` | ✅ Safe-area aware |
| `android.allowMixedContent` | `false` | ✅ HTTPS-only |
| `plugins.SplashScreen` | `launchShowDuration: 1500` | ✅ Auto-hides, brand colour background |
| `plugins.StatusBar` | `style: 'LIGHT'`, `bg: #003B4A` | ✅ Light text on brand-dark background |
| `plugins.Keyboard` | `resize: Body`, `style: Light` | ✅ |
| `plugins.LocalNotifications` | `smallIcon`, `iconColor`, `sound` | ✅ |

**No changes required** — the config matches the product spec.

---

## 2. Plugins installed (`package.json`)

### 2.1 Required (per P4-MOBILE task) — all installed ✅

| Plugin | Version | Purpose | Wrapper file |
|--------|---------|---------|--------------|
| `@capacitor/camera` | `^8.2.0` | Photos diagnostic | `src/lib/native/camera.ts` |
| `@capacitor/geolocation` | `^8.2.0` | Météo auto-locate | `src/lib/native/geolocation.ts` (new) |
| `@capacitor/local-notifications` | `^8.2.0` | Rappels | `src/lib/native/local-notifications.ts` (other agent) |
| `@capacitor/haptics` | `^8.0.2` | Tactile feedback | `src/lib/native/haptics.ts` |
| `@capacitor/share` | `^8.0.1` | Partage rapports | `src/lib/native/share.ts` (new) |
| `@capacitor/filesystem` | `^8.1.2` | Export PDF | `src/lib/native/filesystem.ts` (new) |
| `@capacitor/preferences` | `^8.0.1` | Stockage local | `src/lib/native/storage.ts` |
| `@capacitor/status-bar` | `^8.0.2` | Status bar native | `src/lib/native/status-bar.ts` (fixed) |
| `@capacitor/splash-screen` | `^8.0.1` | Splash screen | `src/lib/native/splash-screen.ts` (new) |
| `@capacitor/app` | `^8.1.0` | Lifecycle + back button | `src/lib/native/lifecycle.ts`, `back-button.ts`, `app-exit.ts` |
| `@capacitor/keyboard` | `^8.0.5` | Keyboard events | `src/lib/native/keyboard.ts` |

### 2.2 Additional plugins installed

| Plugin | Version | Purpose |
|--------|---------|---------|
| `@capacitor/browser` | `^8.0.3` | In-app browser (external links, subscription mgmt) |
| `@capacitor/network` | `^8.0.1` | Online/offline detection |
| `@capacitor/core` / `cli` | `^8.4.1` | Core + CLI |
| `@capacitor/ios` / `android` | `^8.4.1` | Native platform packages (devDep) |
| `@revenuecat/purchases-capacitor` | `^13.2.1` | In-app purchases (iOS App Store + Google Play) |

### 2.3 Plugins NOT installed (and why)

| Plugin | Reason |
|--------|--------|
| `@capacitor/push-notifications` | Not in P4 spec — local notifications are sufficient for reminders. Can be added later for marketing campaigns. |
| `@capacitor/device` | Not required — platform detection uses `navigator.userAgent` + `window.Capacitor`. |
| `@capacitor/app-launcher` | Not required — deep links handled via `@capacitor/app` `appUrlOpen` event. |

---

## 3. Native wrappers (`src/lib/native/`)

15 files total — 14 wrappers + 1 barrel (`index.ts`).

| File | Exports | SSR-safe | Web fallback | Created by |
|------|---------|----------|--------------|------------|
| `camera.ts` | `takePhoto`, `pickFromGallery`, `requestCameraPermission`, `PhotoResult` | ✅ `isNative()` gate | `<input type="file" capture>` | Pre-existing |
| `haptics.ts` | `hapticLight/Medium/Heavy`, `hapticSuccess/Error/Warning` | ✅ | No-op (no haptics on web) | Pre-existing |
| `keyboard.ts` | `setupKeyboard`, `hideKeyboard` | ✅ | No-op | Pre-existing |
| `back-button.ts` | `setupBackButton`, `BackButtonHandler` | ✅ | No-op (Android-only) | Pre-existing |
| `links.ts` | `openExternalLink`, `setupDeepLinks`, `DeepLinkHandler` | ✅ | `window.open` | Pre-existing |
| `network.ts` | `getNetworkState`, `onNetworkChange`, `NetworkState` | ✅ | `navigator.onLine` + `online/offline` events | Pre-existing |
| `lifecycle.ts` | `onAppStateChange`, `getCurrentAppState`, `AppLifecycleState` | ✅ | `document.visibilitychange` | Pre-existing |
| `storage.ts` | `setPref`, `getPref`, `removePref`, `clearPrefs` | ✅ | `localStorage` | Pre-existing |
| `status-bar.ts` | `setStatusBarDark`, `setStatusBarLight`, `showStatusBar`, `hideStatusBar` | ✅ | No-op | Pre-existing (fixed) |
| `app-exit.ts` | `exitApp` | ✅ | No-op (Android-only) | Pre-existing |
| `geolocation.ts` | `getCurrentPosition`, `requestGeoPermission`, `GeoPosition` | ✅ | `navigator.geolocation` + `permissions.query` | **P4-MOBILE (new)** |
| `share.ts` | `shareText`, `shareReport`, `SharePayload` | ✅ | `navigator.share` → clipboard fallback | **P4-MOBILE (new)** |
| `filesystem.ts` | `writeFile`, `readFile`, `deleteFile`, `getExportUri`, `listFiles`, `WriteOptions`, `WrittenFile`, `FileEncoding` | ✅ | No-op (web downloads via `window.open`) | **P4-MOBILE (new)** |
| `splash-screen.ts` | `hideSplash`, `showSplash`, `onSplashDismissed` | ✅ | No-op | **P4-MOBILE (new)** |
| `local-notifications.ts` | `requestNotificationPermission`, `scheduleLocalNotification`, `cancelLocalNotification`, `getPendingNotifications`, `LocalNotificationPayload` | ✅ | Web Notifications API | **Parallel agent (P4-NOTIF)** |
| `index.ts` | Barrel export of all of the above | — | — | Pre-existing (updated) |

### 3.1 Wrapper conventions

Every wrapper follows the same contract:

1. **SSR-safe**: every function checks `isNative()` from `@/lib/platform` first.
   On the server (`typeof window === 'undefined'`), `isNative()` returns `false`
   and the function returns safe defaults (`null`, `false`, `[]`, `void`).
2. **Dynamic imports**: where a plugin is only needed on mobile (heavy SDK),
   the wrapper uses top-level `import` guarded by `isNative()`. The Capacitor
   tree-shaker eliminates the plugin from the web bundle.
3. **Try/catch**: every native call is wrapped so a plugin failure never
   crashes a user-facing flow. Errors are silently swallowed (`/* graceful
   degradation */`) and the caller gets a safe default.
4. **Web fallback**: every wrapper exposes a sensible browser equivalent
   (localStorage for Preferences, `<input type=file>` for Camera,
   `navigator.share` for Share, `navigator.geolocation` for Geolocation, etc.).
5. **Single source of truth**: the barrel `src/lib/native/index.ts` re-exports
   everything, so callers do `import { takePhoto, hapticSuccess } from '@/lib/native'`.

### 3.2 Bug fixed in `status-bar.ts`

The previous `setStatusBarDark()` / `setStatusBarLight()` had **inverted
`Style` enum semantics** (Capacitor confusingly names `Style.Dark` = dark
content for light backgrounds, and `Style.Light` = light content for dark
backgrounds). The fix:

- `setStatusBarDark()` now uses `Style.Light` (light text) + brand `#003B4A`
  dark background — correct for the AQWELIA brand header.
- `setStatusBarLight()` now uses `Style.Dark` (dark text) + `#FFFFFF` background.
- Both functions now also call `StatusBar.setOverlaysWebView({ overlay: false })`
  on iOS so the status bar doesn't overlap the WebView content.

---

## 4. Mobile UI shell (`src/components/mobile/`)

### 4.1 `mobile-app-shell.tsx`

- ✅ Sticky `MobileHeader` (h-14) with safe-area top padding.
- ✅ Scrollable `<main>` (flex-1) hosting one of 5 screens.
- ✅ Fixed `BottomTabs` (z-40) with safe-area bottom padding.
- ✅ Wires up `useNetworkStatus()`, `setupKeyboard()`, `setupBackButton()`
  (Android back navigates between screens), `setupDeepLinks()`.
- ✅ Loading state + Onboarding state handled.
- ✅ Emergency mode sheet.

### 4.2 `bottom-tabs.tsx`

- ✅ 5 tabs (Accueil / Analyses / Assistant / Entretien / Profil).
- ✅ Each tab button: `min-h-[56px]` → exceeds the 44px Apple HIG minimum
  touch target.
- ✅ Active tab: gold accent (`text-gold`) + filled icon container.
- ✅ Container: `mobile-bottom-tabs` CSS class with `padding-bottom:
  env(safe-area-inset-bottom)` (clears the iOS home indicator).

### 4.3 `mobile-header.tsx`

- ✅ Compact h-14 layout, logo + "AQWELIA" wordmark + "Pro" badge.
- ✅ Pool profile pill (name + volume) on the right.
- ✅ User avatar dropdown (settings + sign-out).
- ✅ Gold divider line at the bottom (matches desktop Header).
- ✅ Touch targets ≥ 44px.

### 4.4 Screens

5 screens under `src/components/mobile/screens/`:

| Screen | File | Desktop modules reused |
|--------|------|------------------------|
| Accueil (Today) | `home-screen.tsx` | `ModuleDashboard` |
| Analyses | `analyses-screen.tsx` | `ModuleWaterTest`, `ModuleDiagnostic`, `ModuleHealthLog` (sub-tabs) |
| Assistant | `assistant-screen.tsx` | `ModuleAssistant` |
| Entretien | `maintenance-screen.tsx` | `ModuleMaintenance`, `ModuleActionPlan`, `ModuleReminders`, `ModuleWeather`, `ModuleGuides` (sub-tabs) |
| Profil | `profile-screen.tsx` | (settings, account, sign-out) |

---

## 5. Responsive design (`src/components/aquamind/app-shell.tsx`)

The desktop `AppShell` provides a **dual layout** that adapts to viewport:

| Element | Desktop (≥768px) | Mobile (<768px) |
|---------|------------------|-----------------|
| Sidebar | `hidden md:block` — fixed 224px (`w-56`) left rail with all 11 nav items | Hidden — replaced by `MobileAppShell` |
| Bottom nav | Hidden (`md:hidden`) | Visible — `fixed bottom-0`, horizontally-scrollable pill bar with primary items + "Plus" sheet for secondary items |
| Header | `Header` component (desktop) | `MobileHeader` (h-14, compact) |
| Footer | `Footer` (full) | Same `Footer` (responsive internals) |
| Main content | `max-w-7xl` centered, `px-4 sm:px-6`, `pb-10` | Same, but `pb-28` to clear the bottom nav |

**Note**: In production, the mobile build (`next.config.mobile.ts`) bundles
only `MobileAppShell`. The desktop `AppShell` is used for the responsive
web build. Both layouts share the same underlying `Module*` components.

---

## 6. RevenueCat mobile billing (`src/lib/billing/revenuecat.ts`)

### 6.1 Plan IDs ✅ aligned with new pricing (P1-TARIFS)

| PlanId | Product ID pattern (RevenueCat) | Default active? |
|--------|--------------------------------|-----------------|
| `decouverte` | (free — no IAP product) | ✅ Yes (fallback) |
| `oasis` | `aqwelia_oasis_<duration>` | When entitlement active |
| `wellness` | `aqwelia_wellness_<duration>` | When entitlement active |

Durations: `weekly` / `monthly` / `seasonal` (6 mois) / `yearly`.

### 6.2 SSR-safe ✅

- Every method starts with `if (!isNative()) return <safe-default>`.
- `ensureInitialized()` is a no-op if `!isNative()` — the RevenueCat SDK is
  never imported on web (and never runs on the server).
- API keys are read from `NEXT_PUBLIC_REVENUECAT_IOS_KEY` /
  `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY` env vars (client-side, safe to expose).

### 6.3 Purchase flow ✅

1. `getProducts()` — fetches all offerings + packages, filters to Aqwelia
   product IDs, maps to `Product[]` with `{ id, plan, duration, price,
   priceString, currency }`.
2. `purchase(productId)` — finds the package, calls `Purchases.purchasePackage`,
   maps the resulting `customerInfo` to `Entitlement[]`, returns the first
   active entitlement.
3. `restorePurchases()` — calls `Purchases.restorePurchases()`, returns
   `Entitlement[]` (used by App Store / Play Store "Restore Purchases" button).
4. `getActivePlan()` — wellness > oasis > decouverte priority.
5. `manageSubscription()` — opens the platform's subscription management
   page via `@capacitor/browser` (App Store / Play Store URLs).

### 6.4 Webhook

`POST /api/revenuecat/webhook` (server-side) receives signed webhook events
from RevenueCat and updates `Subscription` rows in the database. Configured
via `REVENUECAT_WEBHOOK_SECRET` env var (Bearer token).

---

## 7. Problems detected & fixed

| # | Problem | Severity | Fix |
|---|---------|----------|-----|
| 1 | `@capacitor/geolocation`, `@capacitor/share`, `@capacitor/filesystem` were **not installed** despite being required by the product spec | High | Installed via `bun add` (all `^8`) |
| 2 | Native wrappers for geolocation, share, filesystem, splash-screen were **missing** | High | Created all 4 wrappers with SSR-safe + web-fallback contracts |
| 3 | `status-bar.ts` had **inverted Style semantics** (`Style.Dark` for dark background → produced invisible dark-on-dark text) | Medium | Swapped to `Style.Light` for `setStatusBarDark()`, `Style.Dark` for `setStatusBarLight()`; both now also call `setOverlaysWebView({ overlay: false })` |
| 4 | `local-notifications.ts` was missing → TS2307 on `index.ts` line 72 | High | Created by **P4-NOTIF agent in parallel** (not by this agent). Resolved — barrel now resolves. |

---

## 8. Problems still open

| # | Problem | Severity | Owner | Recommended next step |
|---|---------|----------|-------|------------------------|
| 1 | `ios/` and `android/` native project folders do not exist | High | Dev ops | Run `npx cap add ios` (requires macOS + Xcode 15+) and `npx cap add android` (requires Android Studio). Cannot be done in this Linux sandbox. |
| 2 | Splash screen assets are present in `public/mobile/ios/` and `public/mobile/android/` but not yet wired into the native projects (no native projects to wire into) | Medium | Dev ops | After `cap add`, run `npx cap sync ios android` — Capacitor will copy the assets. |
| 3 | `NEXT_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY` env vars not yet set (placeholder `appl_xxx` / `goog_xxx` in `.env.example`) | Medium | Product | Create the RevenueCat project, copy the public API keys into `.env`. |
| 4 | App Store Connect app record + Google Play Console app record not yet created | Medium | Product | See `STORE_READINESS.md` for the step-by-step process. |
| 5 | Push notifications (remote, marketing) not implemented (only local notifications) | Low | Product | Optional — add `@capacitor/push-notifications` if marketing campaigns are planned. |
| 6 | `cap sync` has not been run yet (no native projects) | High | Dev ops | Run after `cap add ios/android`. |

---

## 9. Build & deploy — iOS / Android

### 9.1 Prerequisites

| Platform | Toolchain | Minimum version |
|----------|-----------|-----------------|
| iOS | macOS + Xcode + CocoaPods | Xcode 15+, iOS deployment target 14.0 |
| Android | Android Studio + JDK | Android Studio Hedgehog+, Android 6.0 (API 23) |

### 9.2 One-time native project scaffolding

```bash
# From project root, after `bun install`
npx cap add ios
npx cap add android
npx cap sync ios android   # copies web assets + plugins into native projects
```

> This must be run once on a dev machine that has the native toolchains.
> The `ios/` and `android/` directories are git-ignored by default and
> should be regenerated from `capacitor.config.ts` whenever a new plugin
> is added or the config changes.

### 9.3 Routine mobile build

```bash
# 1. Build the static web export (Next.js → out/)
bun run mobile:build

# 2. Sync web assets + plugin configs into the native projects
npx cap sync ios android

# 3. Open the native project for debugging / archive
npx cap open ios          # opens Xcode
npx cap open android      # opens Android Studio
```

The project also exposes the convenience scripts:

```bash
bun run mobile:sync       # build + sync (ios + android)
bun run mobile:ios        # build + sync + open Xcode
bun run mobile:android    # build + sync + open Android Studio
bun run mobile:clean      # rm -rf out .next && rebuild + sync
```

### 9.4 App Store submission (iOS)

1. In Xcode: select the `Aqwelia` target → **General** → set Version + Build.
2. Select a development team (Apple Developer Program).
3. Configure signing automatically (Xcode manages provisioning profiles).
4. **Product → Archive** → **Distribute App → App Store Connect**.
5. In App Store Connect: create the app record (`com.aqwelia.app`),
   fill metadata (see `STORE_READINESS.md`), upload screenshots, submit
   for review.

### 9.5 Play Store submission (Android)

1. In Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**.
2. Use the production keystore (stored securely, NOT in the repo).
3. Upload the `.aab` to the Play Console → **Production → Create release**.
4. Fill store listing (see `STORE_READINESS.md`), upload screenshots,
   roll out to 100% after internal testing.

---

## 10. Configuration — App Store / Play Store

### 10.1 App identifiers

| Store | Bundle ID / App ID | App name |
|-------|--------------------|----------|
| Apple App Store | `com.aqwelia.app` | AQWELIA |
| Google Play Store | `com.aqwelia.app` | AQWELIA |

### 10.2 Required native capabilities (info.plist / AndroidManifest)

| Capability | iOS key | Android key | Why |
|------------|---------|-------------|-----|
| Camera | `NSCameraUsageDescription` | (auto via Camera plugin) | Photo diagnostic |
| Photo library | `NSPhotoLibraryUsageDescription` | (auto via Camera plugin) | Gallery picker |
| Location (when in use) | `NSLocationWhenInUseUsageDescription` | (auto via Geolocation plugin) | Weather auto-locate |
| Notifications | (auto via LocalNotifications plugin) | (auto) | Reminders |
| Local network (DevURL) | `NSAppTransportSecurity` → `NSAllowsLocalNetworking` | (n/a) | Dev server on LAN |

> These keys are auto-injected by `npx cap sync` based on the plugins in
> `package.json`. After running `cap add`, verify them in Xcode's Info tab
> and in `android/app/src/main/AndroidManifest.xml`.

### 10.3 Environment variables (production mobile)

```env
# .env (mobile build — set in CI before `bun run mobile:build`)
NEXT_PUBLIC_API_BASE_URL=https://api.aqwelia.app
NEXT_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxx
NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxx
```

> `NEXT_PUBLIC_API_BASE_URL` MUST point to the deployed backend (not localhost)
> — the static export has no server-side env access.

---

## 11. References

- `MOBILE_IOS_ANDROID.md` — full technical iOS/Android documentation (1500+ lines).
- `STORE_READINESS.md` — App Store + Play Store metadata, screenshots, review checklist.
- `AUDIT_MOBILE.md` — pre-Capacitor audit (architectural decisions).
- `capacitor.config.ts` — Capacitor config (appId, plugins, splash, status bar).
- `next.config.mobile.ts` — Next.js config for static export.
- `scripts/mobile-build.sh` — CI script for mobile build.
- `public/mobile/ios/` — iOS app icons + splash images.
- `public/mobile/android/` — Android launcher icons + splash image.
