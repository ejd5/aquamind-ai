# AQWELIA — i18n Routing Migration Guide

> How to migrate from the current cookie-based locale detection to URL-prefixed routing (`/fr/`, `/en/`, `/es/`...).
>
> Last updated: P6-DESIGN · Stack: Next.js 16 App Router + next-intl v4.3.4

---

## 1. Current State (Non-routed)

| Aspect | Implementation |
|--------|----------------|
| **Locales** | `['fr', 'en', 'es', 'de', 'it', 'pt', 'nl']` (defined in `src/i18n/config.ts`) |
| **Default locale** | `fr` |
| **URL structure** | All locales share the same URL: `https://aqwelia.app/contact` (no prefix). |
| **Locale detection** | Custom `detectLocale()` in `src/middleware.ts` (cookie `NEXT_LOCALE` → `Accept-Language` → `fr`). |
| **Locale persistence** | `NEXT_LOCALE` cookie (1 year, lax same-site) set by middleware. |
| **next-intl setup** | Non-routed: `getRequestConfig` in `src/i18n/request.ts` reads `requestLocale` (header `x-next-intl-locale` set by middleware). |
| **App structure** | Routes live directly under `src/app/` (e.g. `src/app/(public)/contact/page.tsx`). No `[locale]` segment. |

### Why this works today
- Single URL per page → simple SEO (one canonical URL per locale handled via `<link rel="alternate" hreflang="...">` in `generateMetadata`).
- No 301 redirects needed when user switches language (just re-renders with new locale from cookie).
- Compatible with Capacitor (mobile app loads from `capacitor://localhost/` — no locale prefix needed).

### Why we may want to migrate
- **SEO**: Google prefers locale-specific URLs. With cookie-only detection, Googlebot (which sends `Accept-Language: en`) sees the English version for all URLs — French content is "hidden" from indexing.
- **Shareable links**: A French user sharing `https://aqwelia.app/contact` to a Spanish friend sends them to a Spanish-rendered page (because their browser's `Accept-Language` is `es`), which may be confusing.
- **Analytics**: Per-locale pageview tracking requires URL differentiation.
- **Hreflang correctness**: Locale-prefixed URLs make `<link rel="alternate" hreflang>` trivially correct.

---

## 2. Target State (Locale-prefixed)

| Aspect | Implementation |
|--------|----------------|
| **URL structure** | `https://aqwelia.app/` (French, default, no prefix) · `https://aqwelia.app/en/contact` · `https://aqwelia.app/es/contacto` · ... |
| **Locale detection** | `createMiddleware(routing)` from next-intl (URL prefix → cookie → `Accept-Language` → default). |
| **Locale persistence** | `NEXT_LOCALE` cookie (set by next-intl middleware). |
| **next-intl setup** | Routed: `getRequestConfig` reads `requestLocale` (provided by `[locale]` segment in app router). |
| **App structure** | Routes moved under `src/app/[locale]/` (e.g. `src/app/[locale]/(public)/contact/page.tsx`). |
| **Strategy** | `localePrefix: 'as-needed'` (default `fr` unprefixed, all others prefixed). |

### Why `as-needed` and not `always`?
- `as-needed` keeps the existing URL contract: `https://aqwelia.app/` is still the French homepage (no `/fr/` prefix). This means **zero redirects on migration day** for the default locale — French users see the same URL they always have.
- `always` would force `/fr/` on the homepage, requiring 301 redirects from `/` → `/fr/` for every indexed French URL. SEO-disruptive.
- Trade-off: `as-needed` requires the middleware to special-case the default locale (slightly more complex, but next-intl handles it).

---

## 3. Files Already Prepared (P6-DESIGN)

These are committed but **NOT YET ACTIVE**. They are the future entry points:

### `src/i18n/routing.ts` (new, prep only)

```ts
import { defineRouting } from 'next-intl'
import { locales, defaultLocale } from './config'

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  localeDetection: true,
})
```

This is a pure declaration — no middleware imports it yet. Once we are ready to migrate, the middleware swap is a one-line change.

---

## 4. Migration Plan (Step-by-Step)

> **Estimated effort**: 2-3 hours of code + 1 hour of testing. Best done in a dedicated PR (not a hotfix).

### Step 0 — Backup & branch

```bash
git checkout -b feat/i18n-routed
git push -u origin feat/i18n-routed
```

Take a snapshot of the current `src/middleware.ts`, `src/i18n/request.ts`, and `src/app/layout.tsx` — they will be replaced.

### Step 1 — Update `src/i18n/request.ts`

Replace the `requestLocale`-based logic with the routed pattern.

**Before** (current, non-routed):
```ts
import { getRequestConfig } from 'next-intl/server'
import { normalizeLocale } from './config'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = normalizeLocale(requested)
  return {
    locale,
    messages: (await import(`./locales/${locale}.json`)).default,
  }
})
```

**After** (routed):
```ts
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'
import { normalizeLocale } from './config'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = normalizeLocale(requested)
  if (!routing.locales.includes(locale as any)) {
    return { locale: routing.defaultLocale, messages: {} }
  }
  return {
    locale,
    messages: (await import(`./locales/${locale}.json`)).default,
  }
})
```

> The `requestLocale` now comes from the `[locale]` URL segment (set by next-intl middleware) instead of the custom header. The signature is identical — no breaking change to callers.

### Step 2 — Swap the middleware (`src/middleware.ts`)

**Before**: custom `detectLocale()` + `NextResponse.next()` with cookie/header injection + NextAuth `withAuth`.

**After**: `createMiddleware(routing)` composed with `withAuth`.

```ts
import createNextIntlMiddleware from 'next-intl/middleware'
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'

const intlMiddleware = createNextIntlMiddleware(routing)

const PROTECTED_PATTERNS = [
  /^\/(fr|en|es|de|it|pt|nl)?\/?api\/pool\//,
  /^\/(fr|en|es|de|it|pt|nl)?\/?api\/dashboard\//,
  // ... extend all protected patterns with optional locale prefix
]

const authMiddleware = withAuth(
  function middleware(req: NextRequest) {
    return NextResponse.next()
  },
  { pages: { signIn: '/auth/signin' } }
)

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Run next-intl middleware FIRST (handles locale prefix + cookie + redirect)
  const intlRes = intlMiddleware(req)

  // Then run auth protection on protected API routes
  const isProtected = PROTECTED_PATTERNS.some((p) => p.test(pathname))
  if (isProtected) {
    // Compose: intl sets cookie/header, auth checks session
    return authMiddleware(req as any, { params: {} } as any)
  }

  return intlRes
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next`, `/_vercel`, or contain a dot (`.`)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

> **Risk**: NextAuth `withAuth` and next-intl middleware both manipulate the response. The composition above is the recommended pattern from next-intl docs. Test thoroughly — especially the `/api/auth/*` callback URLs (Google OAuth, Apple Sign-In) which must NOT be intercepted by locale redirects.

### Step 3 — Move app routes under `[locale]`

This is the biggest mechanical change. Move every page under `src/app/[locale]/`:

```
src/app/
├── [locale]/
│   ├── layout.tsx          ← new (was src/app/layout.tsx)
│   ├── page.tsx            ← was src/app/page.tsx (landing)
│   ├── (public)/
│   │   ├── layout.tsx
│   │   ├── contact/
│   │   ├── fonctionnalites/
│   │   └── ...
│   ├── auth/
│   │   └── signin/page.tsx
│   ├── settings/page.tsx
│   ├── pro/
│   ├── care/
│   ├── partenaires/
│   ├── affiliation/
│   ├── admin/
│   ├── store/
│   └── legal/
├── api/                    ← STAYS at src/app/api (no [locale] prefix — APIs are locale-agnostic)
└── globals.css             ← STAYS at src/app/globals.css
```

In the new `src/app/[locale]/layout.tsx`:

```tsx
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { locales } from '@/i18n/config'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!routing.locales.includes(locale as any)) notFound()
  setRequestLocale(locale)

  const messages = await getMessages()
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {/* ... providers ... */}
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

### Step 4 — Add `src/i18n/navigation.ts` (typed Link + useRouter)

```ts
import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
```

Then refactor every `<Link href="/contact">` from `next/link` to `@/i18n/navigation` so the locale prefix is auto-injected. (Search-and-replace: `from 'next/link'` → `from '@/i18n/navigation'`.)

> This is the most tedious step (~50-100 Link instances across the codebase). A codemod script can automate it: `rg "from 'next/link'" --type tsx -l | xargs sed -i "s/from 'next\/link'/from '@\/i18n\/navigation'/"`.

### Step 5 — Update API routes (no change needed)

API routes under `src/app/api/*` do NOT get a `[locale]` prefix. They keep reading the locale from the `NEXT_LOCALE` cookie / `accept-language` header (next-intl middleware sets these for free).

Verify all API routes use the existing `pickLocale()` helper from `src/lib/i18n-api.ts` (no hardcoded `fr`).

### Step 6 — SEO: redirects + sitemap + hreflang

#### 6a. Redirect existing non-default-locale URLs

For users who bookmarked `https://aqwelia.app/contact` with `NEXT_LOCALE=en` cookie: the cookie still works (next-intl reads it). No redirect needed.

For Google's indexed URLs (mostly `fr`): they stay at `/contact` (default, unprefixed). No redirect needed.

#### 6b. Sitemap

Update `src/app/sitemap.ts` (if it exists) to emit per-locale URLs:

```ts
import { routing } from '@/i18n/routing'
import { locales } from '@/i18n/config'

export default function sitemap() {
  const pages = ['/contact', '/fonctionnalites', '/tarifs', ...]
  const urls = []
  for (const page of pages) {
    for (const locale of locales) {
      // default locale (fr) → no prefix
      const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
      urls.push({
        url: `https://aqwelia.app${prefix}${page}`,
        alternates: { languages: buildHreflang(page) },
      })
    }
  }
  return urls
}
```

#### 6c. hreflang in `generateMetadata`

In each page's `generateMetadata`:

```ts
export async function generateMetadata({ params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'contact' })
  return {
    title: t('metaTitle'),
    alternates: {
      canonical: `/contact`,
      languages: {
        fr: `https://aqwelia.app/contact`,
        en: `https://aqwelia.app/en/contact`,
        es: `https://aqwelia.app/es/contact`,
        // ...
      },
    },
  }
}
```

### Step 7 — Test matrix

| Scenario | URL | Expected |
|----------|-----|----------|
| French user (default) | `/` | French homepage, no redirect |
| English user, first visit | `/` | 302 → `/en/` |
| Spanish user, cookie set to `fr` | `/` | French homepage (cookie wins) |
| Googlebot (`Accept-Language: en`) | `/contact` | 302 → `/en/contact` |
| API call (with auth) | `/api/pool/profile` | 200, no locale redirect |
| OAuth callback | `/api/auth/callback/google` | 200, no locale redirect |
| Mobile app (Capacitor) | `capacitor://localhost/` | 200 (no locale prefix in capacitor origin) |
| Switch language (cookie change) | `/en/contact` → click "FR" | 302 → `/contact` |

### Step 8 — Capacitor considerations

The mobile app loads HTML from `capacitor://localhost/` (no host, no locale prefix). The next-intl middleware will see no URL prefix and default to `fr` (or whatever the saved `NEXT_LOCALE` Preferences key says).

Verify `src/lib/native/storage.ts` reads/writes `NEXT_LOCALE` correctly (Capacitor Preferences ↔ browser cookie bridge). If not, add a fallback: app reads locale from Preferences, sets `Accept-Language` header on every API call.

### Step 9 — Roll out

1. Merge PR to `main`.
2. Vercel auto-deploys.
3. Monitor:
   - 404s (Google Search Console — should be zero for `fr`, some new `/en/*` URLs).
   - 301/302 redirects (Vercel analytics — should be minimal).
   - Conversion rate per locale (PostHog — French should stay flat, others may rise).
4. Submit updated sitemap to Google Search Console.
5. After 30 days, verify Google has re-indexed `/en/*` URLs.

---

## 5. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OAuth callback URLs break | Medium | High (sign-in broken) | Match `/api/auth/*` in middleware matcher to exclude from locale redirect. Test all 3 providers (Credentials, Google, Apple). |
| Indexed URLs 404 | Low | Medium (SEO) | `as-needed` strategy means default-locale URLs (`/`) stay unchanged. Only new `/en/*` URLs are added. |
| Capacitor app breaks | Low | High (mobile broken) | Test on iOS + Android simulator before merge. Capacitor loads from local origin, no locale prefix. |
| Stripe webhook URL changes | None | — | Webhooks are server-to-server, no middleware interception. |
| Crowdin sync script breaks | Medium | Low (translations delayed) | `scripts/i18n/*.py` operate on JSON files, not URLs. No change needed. |
| `<Link>` codemod misses instances | Medium | Low (broken links) | Add an ESLint rule that forbids `next/link` direct import. |

---

## 6. Rollback Plan

If the routed setup causes production issues:

1. Revert the merge commit (`git revert <sha>`).
2. Vercel auto-deploys the revert.
3. The `NEXT_LOCALE` cookie (1-year expiry) ensures users keep their preferred locale even after rollback.
4. Google's `/en/*` URLs will 404 — submit removal request in Search Console if needed.

The pre-migration state (this commit, P6-DESIGN) is always recoverable from git history.

---

## 7. Why We Did NOT Activate Routing in P6-DESIGN

The task brief explicitly warned:

> La migration vers `/fr/`, `/en/` est risquée. Si le middleware actuel utilise déjà next-intl avec locale detection (cookie/header), NE PAS casser l'existant. Juste préparer la config pour le routing future.

The current middleware:
- ✅ Uses next-intl (via `requestLocale` in `src/i18n/request.ts`)
- ✅ Does locale detection (cookie + `Accept-Language`)
- ✅ Is integrated with NextAuth (`withAuth`) on protected API routes
- ❌ Does NOT use `createMiddleware(routing)` — it's the non-routed pattern

Activating `createMiddleware(routing)` would require:
1. Replacing the custom `detectLocale()` + `NextResponse` with `createMiddleware(routing)`.
2. Composing with `withAuth` (delicate — both manipulate the response).
3. Moving every page under `src/app/[locale]/` (~50+ files).
4. Refactoring every `<Link>` to use `createNavigation(routing).Link`.
5. Testing OAuth callbacks, Stripe webhooks, Capacitor app, all 7 locales.

This is a **dedicated PR** worth of work, not a sub-task of P6-DESIGN. We deliver:
- `src/i18n/routing.ts` — the `defineRouting` declaration (typed, importable, future-ready).
- This document — the step-by-step migration plan.

The next engineer picking up the i18n routing migration has a clear playbook.

---

## 8. File References

| File | Status | Purpose |
|------|--------|---------|
| `src/i18n/config.ts` | unchanged | `locales`, `defaultLocale`, `normalizeLocale()` (legacy) |
| `src/i18n/request.ts` | unchanged (will change on migration) | `getRequestConfig` — reads `requestLocale` |
| `src/i18n/routing.ts` | **new (P6-DESIGN, prep only)** | `defineRouting` — future middleware source |
| `src/middleware.ts` | unchanged (will change on migration) | Custom locale detection + NextAuth |
| `src/app/layout.tsx` | unchanged (will move to `[locale]/layout.tsx` on migration) | Root layout, `<NextIntlClientProvider>` |
| `src/app/[locale]/` | does NOT exist yet | Target app structure post-migration |
| `docs/I18N_ROUTING.md` | **new (P6-DESIGN)** | This file |
| `docs/DESIGN_SYSTEM.md` | new (P6-DESIGN) | Design tokens documentation |

---

_Maintained by the AQWELIA engineering team. Update this document if the migration plan changes or after the migration is completed._
