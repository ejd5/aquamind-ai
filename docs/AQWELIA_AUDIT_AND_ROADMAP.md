# AQWELIA — Audit complet & Roadmap

> **Task ID:** P0-AUDIT
> **Date:** 2026-01-15
> **Auditeur:** sub-agent (general-purpose)
> **Périmètre:** audit complet du projet AQWELIA (app Next.js 16 piscine/spa).
> **Méthode:** lecture réelle de chaque fichier décrit ci-dessous — aucune description n'est devinée.

---

## 0. Résumé exécutif

AQWELIA est une application **Next.js 16 + React 19** mature (~24 000 lignes de code source, 22 namespaces i18n × 7 langues = ~20 500 traductions, 13 modèles Prisma, 25 routes API, 16 sections landing, 11 modules desktop + 5 écrans mobile, paiements Stripe + RevenueCat, IA NVIDIA NIM). L'app couvre ~80 % du périmètre d'un MVP production-ready.

**Cependant, le projet ne peut PAS être déployé en l'état** principalement à cause de :
1. `next.config.ts: typescript.ignoreBuildErrors: true` qui masque **7 erreurs TypeScript** dont une critique (module `./local-notifications` référencé mais absent du disque).
2. Incohérence DB : `prisma/schema.prisma` déclare `provider = "postgresql"` mais `.env` pointe vers SQLite (`file:/home/z/my-project/db/custom.db`) — et le fichier DB réel est à `/tmp/my-project/db/custom.db` (chemin invalide pour un déploiement).
3. Page `/admin` en sécurité théâtrale (mot de passe en clair dans le bundle client, persistance uniquement localStorage).
4. Projets natifs iOS/Android **non initialisés** (`ios/` et `android/` absents — `npx cap add ios/android` jamais exécuté).
5. Plusieurs champs spa saisis dans l'onboarding sont **silencieusement jetés** par l'API `/api/pool/profile`.

Le reste du présent document détaille chaque dimension auditée, les problèmes détectés, les fonctionnalités disponibles/manquantes, et propose un plan d'exécution priorisé.

---

## 1. Framework & versions des dépendances (`package.json`)

| Catégorie | Dépendance | Version installée | Statut |
|---|---|---|---|
| Core | `next` | `^16.1.1` | ✅ Next.js 16 (App Router, Turbopack) |
| Core | `react` / `react-dom` | `^19.0.0` | ✅ React 19 |
| Core | `typescript` | `^5` | ✅ TS 5 (strict mode ON dans `tsconfig.json`) |
| Build | `bun-types` | `^1.3.4` | Runtime Bun (lockfile `bun.lock`) |
| i18n | `next-intl` | `^4.3.4` | ✅ Plugin NextIntlPlugin branché dans `next.config.ts` |
| Auth | `next-auth` | `^4.24.11` | ⚠️ **v4, pas v5** — middleware `withAuth` legacy |
| DB | `prisma` / `@prisma/client` | `^6.11.1` | ✅ Prisma 6 |
| UI | `tailwindcss` | `^4` | ✅ Tailwind 4 (nouvelle syntaxe `@import "tailwindcss"`) |
| UI | `tailwindcss-animate` / `tw-animate-css` | `^1.0.7` / `^1.3.5` | ✅ |
| UI | shadcn/ui (radix-ui) | 26 paquets `@radix-ui/*` | ✅ Complet |
| Paiement web | `stripe` | `^22.3.0` | ✅ Stripe SDK v22 |
| Paiement mobile | `@revenuecat/purchases-capacitor` | `^13.2.1` | ✅ RevenueCat v13 |
| Mobile | `@capacitor/*` (10 plugins) | `^8.x` | ✅ Capacitor 8 (app, browser, camera, haptics, keyboard, local-notifications, network, preferences, splash-screen, status-bar) |
| IA | `z-ai-web-dev-sdk` | `^0.0.18` | SDK Z.ai (auxiliaire) |
| IA | NVIDIA NIM | via `fetch` direct | ✅ `src/lib/ai/nvidia.ts` — chat GLM-5.2 + vision nemotron-nano-12b-v2-vl |
| State | `zustand` / `@tanstack/react-query` / `react-hook-form` | `^5` / `^5.82` / `^7.60` | ✅ |
| Charts | `recharts` | `^2.15.4` | ✅ |
| Forms | `zod` / `@hookform/resolvers` | `^4` / `^5.1.1` | ✅ |
| Misc | `framer-motion` / `lucide-react` / `date-fns` / `uuid` / `sharp` / `sonner` | récents | ✅ |

**Scripts disponibles** (`package.json:5-23`) :
- `dev` / `build` (standalone) / `start` — cycle web classique
- `db:push` / `db:generate` / `db:migrate` / `db:reset` — Prisma
- `mobile:build` / `mobile:sync` / `mobile:ios` / `mobile:android` / `mobile:clean` — pipeline Capacitor

**Aucune dépendance de test** (pas de `vitest`, `jest`, `playwright`, `cypress`). Aucun fichier `*.test.*` ou `*.spec.*` n'existe dans `src/`.

---

## 2. Structure des routes (`src/app/`)

### 2.1 Pages web (5 pages)

| Route | Fichier | Lignes | Type | Description |
|---|---|---|---|---|
| `/` | `src/app/page.tsx` | 120 | Client | Routeur 4-vues : landing / desktop AppShell / mobile MobileAppShell / splash. Détecte `isNative()` (Capacitor) et `isMobile()` (UA). |
| `/admin` | `src/app/admin/page.tsx` | 571 | Client | 5 onglets admin (banner, popup, content, analytics, users) — 3 sont des placeholders. |
| `/auth/signin` | `src/app/auth/signin/page.tsx` | 240 | Client | Sign-in + sign-up combinés (mode `?mode=signup\|signin`). |
| `/settings` | `src/app/settings/page.tsx` | 1091 | Client | 15 sections : abonnement, restaurer achats, notifications, préférences (langue/pays/unités/normes), données perso, export, suppression, légal, support, version, déconnexion. |
| `/legal/cgu` | `src/app/legal/cgu/page.tsx` | 187 | Server | CGU multilingue, dernière MAJ 2026-01-15. |
| `/legal/privacy` | `src/app/legal/privacy/page.tsx` | 195 | Server | Politique de confidentialité RGPD. |
| `/legal/support` | `src/app/legal/support/page.tsx` | 232 | Server | Page de contact support. |

**Note:** `src/app/layout.tsx` (root) — 72 lignes, fonts Geist + Geist_Mono + Playfair_Display, NextIntlClientProvider, SessionProvider via `Providers`, Toaster shadcn.

### 2.2 API routes (25 routes)

25 fichiers `route.ts` répartis sous `src/app/api/` :

| Route | Méthodes | Auth | Description |
|---|---|---|---|
| `/api` | (root) | — | Route placeholder |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth | Handler NextAuth v4 |
| `/api/auth/me` | GET | Session | Profil utilisateur courant |
| `/api/auth/register` | POST | Public | Inscription email+password |
| `/api/account/delete` | POST | Session | RGPD suppression cascade |
| `/api/account/export` | GET | Session | RGPD portabilité (JSON download) |
| `/api/account/notifications` | GET/POST | Session | Préférences notif (STUB — non persisté) |
| `/api/analytics` | GET/POST | Session | KPIs + events |
| `/api/chat` | POST/DELETE | Session | Assistant IA NVIDIA GLM-5.2 + historique |
| `/api/dashboard` | GET | Session | Agrégat dashboard (profile, latestTest, latestPlan, trend, counts) |
| `/api/demo/login` | POST | Public | Provisionne compte démo pour review App Store |
| `/api/guides` | GET | Session (soft) | Liste 32 guides + tracking GuideView |
| `/api/pool/action-plan` | GET/POST | Session | Plans d'action déterministes + IA |
| `/api/pool/equipment` | GET/POST/PATCH/DELETE | Session | Équipements |
| `/api/pool/inventory` | GET/POST/DELETE | Session | Inventaire produits |
| `/api/pool/photo-diagnostic` | GET/POST/DELETE | Session | VLM NVIDIA nemotron-nano |
| `/api/pool/profile` | GET/POST | Session | Pool profile (singleton per user) |
| `/api/pool/reminders` | GET/POST/PATCH/DELETE | Session | Rappels |
| `/api/pool/water-test` | GET/POST/DELETE | Session | Tests d'eau (10 paramètres) |
| `/api/pool/weather` | GET | Session | wttr.in + assessWeather |
| `/api/revenuecat/webhook` | POST | Bearer | Webhook RevenueCat |
| `/api/stripe/checkout` | POST | Session | Stripe Checkout |
| `/api/stripe/portal` | POST | Session | Stripe Customer Portal |
| `/api/stripe/webhook` | POST | Signature | Webhook Stripe (4 events) |
| `/api/subscription` | GET/POST | Session | Plan courant + sync |

### 2.3 Modules applicatifs (`src/components/aquamind/`)

11 modules + onboarding + emergency + app-shell + header + footer = 17 fichiers, ~10 361 lignes :

| Fichier | Lignes | Fonction |
|---|---|---|
| `app-shell.tsx` | 376 | Shell desktop (sidebar + bottom nav mobile) |
| `onboarding.tsx` | 812 | Wizard 4 étapes (type bassin, volume, traitement, filtre, météo) |
| `module-dashboard.tsx` | 925 | Vue d'ensemble : CWI, swim safety, weather, derniers tests |
| `module-diagnostic.tsx` | 741 | Diagnostic photo IA |
| `module-water-test.tsx` | 675 | Formulaire 10 paramètres + calculs LSI/CWI |
| `module-assistant.tsx` | 362 | Chat IA + presets |
| `module-action-plan.tsx` | 461 | Plan d'action déterministe |
| `module-health-log.tsx` | 478 | Historique tests |
| `module-maintenance.tsx` | 901 | Équipements + inventaire + tâches |
| `module-weather.tsx` | 668 | Météo + alerts |
| `module-guides.tsx` | 526 | Hub 32 guides |
| `module-reminders.tsx` | 672 | Rappels smart + manuels |
| `module-paywall.tsx` | 532 | Tunnel conversion Premium/Expert |
| `emergency-mode.tsx` | 343 | Sheet assistance urgente |
| `diagnostic-action-plan.tsx` | 1674 | Plan d'action détaillé (le plus gros fichier) |
| `header.tsx` | 151 | Header desktop |
| `footer.tsx` | 64 | Footer partagé |

### 2.4 Landing page (`src/components/landing/`)

`landing-page.tsx` (328 lignes) orchestre **16 sections** (et non 14 comme le worklog l'indiquait) :

1. `Hero` — titre + CTA + stats
2. `Problem` — points de douleur
3. `RealCosts` — coûts réels piscine
4. `PiscinisteCost` — comparaison tarif pisciniste
5. `Solution` — présentation AQWELIA
6. `Comparator` — avant/après
7. `Simulations` — cas concrets
8. `Savings` — économies
9. `Story` — storytelling
10. `Variations` — variations produit
11. `SpaSection` — section spa
12. `FeaturesGrid` — grille features
13. `InternationalSection` — section i18n/pays
14. `Pricing` — 3 plans + 4 durées
15. `Faq` — foire aux questions
16. `FinalCta` — call-to-action final

Le footer partagé (image `footer-bg.png`) contient disclaimer `ShieldAlert`, liens légaux, sélecteur de langue (composant `LanguageSwitcher`).

---

## 3. Système d'authentification (`src/lib/auth.ts`)

**Stratégie** : NextAuth v4, JWT stateless, session 30 jours (`maxAge: 30 * 24 * 60 * 60`).

**Provider unique** : `CredentialsProvider` (email + password). Pas d'OAuth (Google/Apple) bien que le modèle `Account` soit réservé dans Prisma pour future-proof.

**Hashing mot de passe** : `crypto.scryptSync` via `src/lib/password.ts` (44 lignes) — **aucune dépendance externe** (pas de bcryptjs). Format `saltHex:hashHex` (16 + 64 bytes). `timingSafeEqual` pour comparaison constant-time. ✅ Solide.

**Callbacks** : `jwt` injecte `token.id` ; `session` propage `session.user.id`. Pas de gestion de rôles.

**Pages** : `signIn: '/auth/signin'`.

**Secret** : `process.env.NEXTAUTH_SECRET` (non fourni dans `.env` sandbox — `.env.example:12` indique `change-me-to-a-long-random-string`).

**Middleware auth** (`src/middleware.ts`) :
- 8 patterns protégés : `/api/pool/`, `/api/dashboard/`, `/api/chat/`, `/api/guides/`, `/api/subscription/`, `/api/analytics/`, `/api/account/`, `/api/stripe/`.
- **BUG TS** (`middleware.ts:104`) : `authMiddleware(req as any)` appelé avec 1 argument alors que `withAuth` en attend 2 (req + ctx). → voir §13.

---

## 4. Base de données — Prisma (`prisma/schema.prisma`)

### 4.1 Configuration
- `provider = "postgresql"` (⚠️ mismatch avec `.env` — voir §13)
- `url = env("DATABASE_URL")`
- Pas de migrations SQL générées (`prisma/migrations/` ne contient que `README.md` documentant la procédure SQLite→PostgreSQL)

### 4.2 Liste exhaustive des 13 modèles Prisma

| # | Modèle | Description | Relations clés |
|---|---|---|---|
| 1 | `User` | Utilisateur AQWELIA | id, email, passwordHash, name + 13 relations cascade |
| 2 | `Account` | OAuth (NextAuth future-proof) | userId, provider, providerAccountId, tokens |
| 3 | `PoolProfile` | Profil piscine/spa | userId, volume, unit, shape, surfaceType, treatmentType, filterType, pumpType, saltSystem, region, sunExposure, covered, **waterBodyType, spaSeats, spaTempTarget, spaUsageFreq, spaBrand**, usageLevel |
| 4 | `WaterTest` | Test d'eau | userId, ph, freeChlorine, totalChlorine, combinedChlorine, alkalinity, calciumHardness, cyanuricAcid, salt, bromine, phosphates, temperature, source, status, clearWaterIndex, swimSafety, lsi + 1 actionPlan[] |
| 5 | `PhotoDiagnostic` | Diagnostic VLM IA | userId, type, imageUrl, detectedIssues, probableIssues, confidence, aiSummary, missingData, recommendedNextStep, safetyWarnings |
| 6 | `ActionPlan` | Plan d'action | waterTestId (cascade), diagnosis, severity, confidence, immediateActions, chemicalDosages, filtrationHours, retestInHours, swimSafety, doNotDo, estimatedCost, whenToCallProfessional |
| 7 | `Equipment` | Équipement | userId, type (9 types), brand, model, installedAt, lastMaintenanceAt, nextMaintenanceAt, photoUrl, status, notes |
| 8 | `ProductInventory` | Inventaire produit | userId, productName, category (12), concentration, quantity, unit, price, instructions |
| 9 | `ChatMessage` | Message assistant | userId, role, content |
| 10 | `MaintenanceTask` | Tâche entretien | userId, title, description, type, priority, status, dueDate, doneAt |
| 11 | `PoolDesign` | Design IA (studio) | userId, prompt, imageUrl, style |
| 12 | `Reminder` | Rappel | userId, type, title, detail, action, priority, source (6 sources), dueAt, done, doneAt, snoozed |
| 13 | `GuideView` | Tracking guide | userId, guideId, viewedAt |
| 14 | `Subscription` | Abonnement | userId, plan (free/premium/expert), duration (week/month/quarter/halfyear), startedAt, expiresAt, active |
| 15 | `AnalyticsEvent` | Event analytics | userId, event, props (JSON) |

Total : **15 modèles** (le worklog mentionnait 13 — en réalité il y en a 15 : `User`, `Account`, `PoolProfile`, `WaterTest`, `PhotoDiagnostic`, `ActionPlan`, `Equipment`, `ProductInventory`, `ChatMessage`, `MaintenanceTask`, `PoolDesign`, `Reminder`, `GuideView`, `Subscription`, `AnalyticsEvent`).

Toutes les relations vers `User` sont `onDelete: Cascade` — la suppression d'un user propage atomiquement à toutes ses données (RGPD-friendly).

---

## 5. Routes API — voir §2.2

(Pas de répétition — la table §2.2 liste les 25 routes avec méthodes, auth et description.)

---

## 6. Rôles utilisateurs

**AUCUN système de rôles n'existe.**

- Modèle `User` : pas de champ `role`, `isAdmin`, `plan`, ou `permissions`.
- Pas de RBAC dans le middleware.
- La page `/admin` utilise un mot de passe hardcodé `aqwelia-admin-2026` (`src/app/admin/page.tsx:10`) — **`// TODO: move to env`** — validé côté client uniquement via `localStorage.setItem('aqwelia-admin', 'ok')`. N'importe qui peut le lire dans le bundle JS.
- Pas d'endpoint admin protégé côté serveur (les 5 onglets admin écrivent uniquement en `localStorage` — pas de backend).
- Pas de concept "pisciniste pro" distinct de l'utilisateur standard, malgré le plan `Expert` réservé à ce persona dans `freemium.ts`.

**Recommandation** : ajouter `role: 'user' | 'pro' | 'admin'` au modèle `User`, middleware RBAC, et déplacer le secret admin vers `ADMIN_PASSWORD_HASH` (scrypt) en variable d'environnement.

---

## 7. Composants UI (`src/components/`)

| Catégorie | Compte | Chemin |
|---|---|---|
| shadcn/ui primitifs | 48 fichiers | `src/components/ui/` (accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip) |
| Modules AQWELIA (desktop) | 17 fichiers | `src/components/aquamind/` |
| Landing sections | 16 fichiers | `src/components/landing/sections/` |
| Mobile screens + shell | 9 fichiers | `src/components/mobile/` (mobile-app-shell, mobile-header, bottom-tabs, types, screens/{home,analyses,assistant,maintenance,profile}) |
| Providers / switchers | 3 fichiers | `providers.tsx`, `language-switcher.tsx`, `offline-banner.tsx` |

**Total : ~93 composants** dans `src/components/`.

### Design system (extrait de `src/app/globals.css`, 407 lignes)
- Palette "Oceanic Luxury" : `--gold`, `--ocean`, `--ocean-deep`, `--ocean-light`, `--pearl`
- Fonts : `--font-geist-sans`, `--font-geist-mono`, `--font-playfair-display` (display)
- Classes utilitaires custom : `.glass-card`, `.glass-pill`, `.aqua-text-gradient`, `.gold-divider`, `.glow-gold`, `.gradient-text-premium`, `.custom-scroll`, `.safe-area-top`, `.mobile-scroll`, `.nav-link`
- Variables de spacing / radius standard shadcn (`--radius`, `--radius-sm/md/lg`)
- Variant dark via `@custom-variant dark (&:is(.dark *))`

---

## 8. Responsive & mobile

**3 breakpoints gérés via Tailwind 4** : `sm:` (640px), `md:` (768px), `lg:` (1024px).

### Stratégie 3-vues (`src/app/page.tsx`)
```ts
const mobileVal = isMobile()  // UA sniffing Mobile|Android|iPhone|iPad|iPod|...
const nativeVal = isNative()  // Capacitor.isNativePlatform() ou UA match AQWELIA-iOS|Android
// native → MobileAppShell (toujours)
// mobile browser + view=app → MobileAppShell
// desktop + view=app → AppShell (desktop)
// sinon → LandingPage
```

### Points de rupture vérifiés
- **Landing header** (`landing-page.tsx:65-135`) : nav desktop cachée en `lg:hidden`, menu hamburger mobile avec `AnimatePresence` + `motion.div`.
- **AppShell desktop** (`app-shell.tsx:178`) : sidebar desktop `hidden md:block` + bottom nav mobile `md:hidden`.
- **Landing hero** (`hero.tsx`) : `text-4xl sm:text-5xl md:text-6xl`, padding `px-4 sm:px-6`, `pt-24 sm:pt-28`.
- **Mobile shell** : `MobileHeader` h-14 + safe-area-top, `BottomTabs` 5 onglets avec `paddingBottom: env(safe-area-inset-bottom)`.

### Safe areas iOS
- `capacitor.config.ts:10` : `contentInset: 'always'`, `scrollEnabled: true`
- Classes CSS `.safe-area-top` et `paddingBottom: env(safe-area-inset-bottom)` utilisées dans mobile-app-shell.tsx:237

### Émulation mobile Capacitor (`src/components/mobile/`)
Le `MobileAppShell` (250 lignes) implémente :
- 5 onglets bottom tabs : Home, Analyses, Assistant, Maintenance, Profile
- Sous-tabs : Analyses (mesures/diagnostic/plan), Maintenance (actions/équipement/inventaire)
- Setup natif : keyboard (`setupKeyboard`), back button Android (`setupBackButton`), deep links (`setupDeepLinks`), network status
- Réutilisation des modules desktop via `mapDesktopTabToMobile()`

**Verdict responsive** : ✅ cohérent sur 3 breakpoints, mais **pas de tests E2E** pour valider (pas de Playwright).

---

## 9. Fonctionnalités piscine déjà développées

### 9.1 Cœur fonctionnel (pool)

| # | Feature | Fichier(s) | Statut |
|---|---|---|---|
| 1 | **Onboarding multi-étapes** (type bassin pool/spa/both, volume, traitement, filtre, météo) | `onboarding.tsx` (812 lignes) | ✅ mais champs spa perdus côté API (voir §13) |
| 2 | **Pool profile** complet (15 champs dont spa) | `prisma/schema.prisma:71-98`, `api/pool/profile/route.ts` | ⚠️ API drop spa fields |
| 3 | **Water test** 10 paramètres (pH, freeCl, totalCl, combinedCl, TAC, TH, CYA, salt, brome, phosphates, temp) | `module-water-test.tsx`, `api/pool/water-test/route.ts` | ✅ |
| 4 | **Calcul Clear Water Index** (0-100) | `src/lib/pool/water-balance.ts` | ✅ |
| 5 | **Calcul LSI** (Langelier Saturation Index) | `src/lib/pool/water-balance.ts` | ✅ |
| 6 | **Swim safety** (allowed/avoid/forbidden/unknown) | `src/lib/pool/safety-rules.ts` (158 lignes) | ⚠️ bug TS ligne 47 (dead code) |
| 7 | **Action plan** déterministe + IA (immediateActions, chemicalDosages, doNotDo, estimatedCost, whenToCallProfessional) | `src/lib/pool/action-plan.ts`, `api/pool/action-plan/route.ts` | ✅ |
| 8 | **Dosing engine** (calcul dosages produits) | `src/lib/pool/dosing-engine.ts` | ✅ |
| 9 | **Photo diagnostic IA** (8 types : water, wall, filter, electrolyzer, pump, strip, product, equipment) | `module-diagnostic.tsx`, `api/pool/photo-diagnostic/route.ts`, `src/lib/ai/nvidia.ts` (nvidiaVision) | ⚠️ imageUrl stocké en base64 (dev only) |
| 10 | **Assistant IA** (chat avec contexte piscine) | `module-assistant.tsx`, `api/chat/route.ts`, `src/lib/pool/ai-context.ts` | ✅ |
| 11 | **Equipment management** (9 types : pump, filter, electrolyzer, cell, phProbe, robot, cover, heatpump, skimmer) | `module-maintenance.tsx`, `api/pool/equipment/route.ts` | ✅ |
| 12 | **Inventaire produits** (12 catégories : ph_minus, ph_plus, chlorine_slow, chlorine_shock, salt, alkalinity_plus, stabilizer, flocculant, anti_algae, filter_cleaner, other) | `module-maintenance.tsx`, `api/pool/inventory/route.ts` | ✅ |
| 13 | **Maintenance tasks** (type, priority, status, dueDate, doneAt) | `module-maintenance.tsx` | ✅ |
| 14 | **Météo** (wttr.in, current + 3 jours + storm detection) | `module-weather.tsx`, `api/pool/weather/route.ts`, `src/lib/pool/weather-engine.ts` | ⚠️ hardcoded `Accept-Language: 'fr'` ligne 56 |
| 15 | **Rappels intelligents** (6 sources : weather, test_history, inventory, equipment, schedule, manual) | `module-reminders.tsx`, `api/pool/reminders/route.ts`, `src/lib/pool/reminders.ts` | ✅ |
| 16 | **Guides pédagogiques** (32 guides × 8 catégories : getting_started, problems, products, equipment, weather_seasons, safety, treatments, faq) | `module-guides.tsx`, `src/lib/pool/guides-data.ts` (1115 lignes), `api/guides/route.ts` | ✅ |
| 17 | **Health log** (historique tests) | `module-health-log.tsx` | ✅ |
| 18 | **Emergency mode** (sheet assistance urgente) | `emergency-mode.tsx` | ✅ |
| 19 | **Dashboard agrégé** | `module-dashboard.tsx`, `api/dashboard/route.ts` | ✅ |

### 9.2 Spa support (Premium+)

- `src/lib/pool/spa-data.ts` (216 lignes) : SPA_BRANDS (Jacuzzi, Sundance, Hot Spring, etc.), SPA_TREATMENTS (bromine, active_oxygen, chlorine), SPA_SPECIFICS, calcul drainage frequency
- Onboarding spa flow (étapes spécifiques : siège, température, usage, marque)
- Plan `Premium` débloque `spaSupport: true` ; plan `Free` bloque `spa_support` via `canAccess()`

### 9.3 Cross-cutting

| # | Feature | Statut |
|---|---|---|
| 20 | **Demo account** (`demo@aqwelia.app` / `aqwelia-demo-2026`) | ✅ `api/demo/login/route.ts` |
| 21 | **RGPD export** (JSON download) | ✅ `api/account/export/route.ts` |
| 22 | **RGPD suppression** (cascade) | ✅ `api/account/delete/route.ts` |
| 23 | **Analytics events** (first_scan, first_test, first_plan, paywall_viewed, subscription_activated, guide_opened, video_viewed) | ✅ `api/analytics/route.ts` |
| 24 | **Offline mode** (cache IndexedDB, OfflineBanner, `use-network-status.ts`) | ✅ `src/lib/offline/`, `src/hooks/use-network-status.ts` |
| 25 | **Preferences** (langue, pays, unités °C/°F, kg/lb, m³/gal) | ✅ `src/lib/preferences/store.ts` |
| 26 | **Détection pays** (11 pays : FR, US, GB, DE, ES, IT, NL, PT, CA, AU + detect) | ✅ `src/lib/countries/` |

---

## 10. Système de paiement

### 10.1 Architecture (`src/lib/billing/`)

Abstraction `BillingClient` (`src/lib/billing/types.ts`) avec 2 implémentations :
- `revenueCatClient` (`revenuecat.ts`) — mobile natif (iOS/Android via `@revenuecat/purchases-capacitor`)
- `stripeWebClient` (`stripe-web.ts`) — web (Checkout + Portal)

Sélection runtime : `getBillingClient()` → `isNative() ? revenueCatClient : stripeWebClient`.

### 10.2 Plans & durations (`src/lib/pool/freemium.ts`)

3 plans, 4 durées, 9 FeatureGates :

| Plan | Prix/semaine | Prix/mois | Prix/3 mois | Prix/6 mois | Limits clés |
|---|---|---|---|---|---|
| `free` | 0 | 0 | 0 | 0 | 1 pool, 2 scans/mois, history 14j, pas de spa, pas de PDF |
| `premium` (highlighted) | 4,99 € | 12,99 € | 32,99 € | 57,99 € | 3 pools, scans illimités, history ∞, spa, PDF, mode pro |
| `expert` | 9,99 € | 24,99 € | 59,99 € | 109,99 € | pools ∞, multi-clients, devis, export compta, API |

FeatureGates (`canAccess()`) : `photo_scan`, `weather_advanced`, `smart_reminders`, `guides_premium`, `multi_pool`, `pdf_report`, `pro_mode`, `history_extended`, `spa_support`.

### 10.3 Web (Stripe)

- 4 Price IDs configurés via env : `STRIPE_PRICE_PREMIUM_MONTHLY`, `STRIPE_PRICE_PREMIUM_YEARLY`, `STRIPE_PRICE_EXPERT_MONTHLY`, `STRIPE_PRICE_EXPERT_YEARLY`
- `api/stripe/checkout/route.ts` : `stripe.checkout.sessions.create` (mode subscription, allow_promotion_codes, metadata userId/productId/plan)
- `api/stripe/portal/route.ts` : Customer Portal
- `api/stripe/webhook/route.ts` : 4 events gérés (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`), signature verification via `STRIPE_WEBHOOK_SECRET`, body raw via `req.text()`
- ❗ **Incohérence** : `stripe-web.ts:8` définit les durées comme `monthly`/`yearly` alors que `freemium.ts:172-177` définit `week`/`month`/`quarter`/`halfyear`. Le webhook Stripe route ligne 60 mappe `productId.includes('yearly') ? 'halfyear' : 'month'` — ce qui ne gère pas les durées `week` et `quarter`.

### 10.4 Mobile (RevenueCat)

- 2 clés publiques : `NEXT_PUBLIC_REVENUECAT_IOS_KEY`, `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY`
- `api/revenuecat/webhook/route.ts` : auth Bearer, 3 events : `CANCELLATION`, `EXPIRATION`, `BILLING_ISSUE` (tous désactivent l'abo)
- Mapping `productId.includes('expert'/'premium')` → plan
- Restore purchases implémenté

### 10.5 Manque
- ❌ Pas de **trial period** côté Stripe (seul `trialAvailable: true` est exposé dans `stripe-web.ts:8,10` mais non créé dans la Checkout Session)
- ❌ Pas de **webhook event** Stripe pour `invoice.payment_failed` (gestion des échecs de paiement)
- ❌ Pas de **proration** ou **upgrade/downgrade** entre plans
- ❌ Pas de **coupon** serveur (seul `allow_promotion_codes: true` laisse Stripe gérer)

---

## 11. Analytics

### Backend (`api/analytics/route.ts`)
- **GET** : KPIs user (firstScanAt, firstTestAt, firstPlanAt, paywallViews, conversions, conversionRate, guideOpens) + 200 derniers events
- **POST** : crée un `AnalyticsEvent` (event + props JSON)

### Modèle Prisma (`AnalyticsEvent`)
```prisma
model AnalyticsEvent {
  id        String   @id @default(cuid())
  userId    String
  event     String  // first_scan, first_test, first_plan, guide_opened, video_viewed, paywall_viewed, subscription_activated, ...
  props     String?  // JSON
  createdAt DateTime @default(now())
}
```

### Manques
- ❌ Aucune intégration **PostHog / Mixpanel / Amplitude / Vercel Analytics** — seulement l'API interne
- ❌ Pas de tracking **funnel landing → signup → onboarding → first test → paywall → subscribe** (les events existent mais ne sont pas automatiquement émis par les composants)
- ❌ Pas de page admin analytics réelle (`/admin` onglet analytics affiche 4 KPI cards avec "—" hardcoded)
- ❌ Pas de **cookie consent banner** RGPD (analytics opt-in)

---

## 12. Pages légales (`src/app/legal/`)

| Route | Fichier | Lignes | Dernière MAJ | Contenu |
|---|---|---|---|---|
| `/legal/cgu` | `cgu/page.tsx` | 187 | 2026-01-15 | CGU multilingue via namespace `legal.cgu` (title, eyebrow, articles 1-N) |
| `/legal/privacy` | `privacy/page.tsx` | 195 | 2026-01-15 | Politique RGPD (sections 1-N via `legal.privacy`) |
| `/legal/support` | `support/page.tsx` | 232 | — | Page de contact |

Layout partagé `src/app/legal/layout.tsx` (51 lignes) : header sticky avec logo + back-home + footer AQWELIA. Server component, i18n via `getTranslations()`.

✅ Pages multilingues (namespace `legal.*` complet dans les 7 locales), dates localisées via `Intl.DateTimeFormat(locale, ...)`.

⚠️ Date `LAST_UPDATED_ISO = '2026-01-15'` hardcodée dans `cgu/page.tsx:19` et `privacy/page.tsx:19` — devrait venir d'une config ou être injectée à build time.

---

## 13. Erreurs de build potentielles

**Configuration masquante** : `next.config.ts:14` → `typescript: { ignoreBuildErrors: true }` + `reactStrictMode: false`.

→ Cela fait que `next build` passe même avec des erreurs TS. Le runtime crashera là où le code défaillant s'exécute.

### Erreurs TS détectées via `bunx tsc --noEmit`

| # | Fichier | Ligne | Erreur | Sévérité |
|---|---|---|---|---|
| 1 | `src/lib/native/index.ts` | 72 | `TS2307: Cannot find module './local-notifications' or its corresponding type declarations.` — le fichier `local-notifications.ts` n'existe pas dans `src/lib/native/` mais l'index l'exporte (lignes 65-72). | **🔴 CRITIQUE** — runtime crash si `@/lib/native` est importé |
| 2 | `src/middleware.ts` | 104 | `TS2554: Expected 2 arguments, but got 1.` — `authMiddleware(req as any)` mais `withAuth` middleware attend `(req, ctx)`. | **🔴 CRITIQUE** — l'auth middleware peut ne pas enforce la session |
| 3 | `src/lib/pool/safety-rules.ts` | 47 | `TS2367: This comparison appears to be unintentional because the types '"allowed"' and '"forbidden"' have no overlap.` — dead code, le `if (status !== 'forbidden')` est toujours vrai car `status = 'allowed'` au début de la branche. | **🟡 MOYEN** — logic bug |
| 4 | `src/components/aquamind/module-maintenance.tsx` | 890 | `TS2345: Argument of type 'Record<string, unknown> \| undefined' is not assignable to parameter of type 'Record<string, string \| number \| Date> \| undefined'.` | **🟡 MOYEN** — type mismatch |
| 5 | `skills/image-edit/scripts/image-edit.ts` | 10 | `TS2561: Object literal may only specify known properties, but 'images' does not exist in type 'CreateImageEditBody'.` | 🟢 Faible — script skill auxiliaire hors app |
| 6 | `skills/stock-analysis-skill/src/analyzer.ts` | 253 | `TS2322` type mismatch | 🟢 Faible — script skill auxiliaire hors app |

### Bugs runtime détectés à la lecture du code

| # | Fichier | Bug | Sévérité |
|---|---|---|---|
| 7 | `api/pool/profile/route.ts:42-57` | L'objet `data` n'extrait pas `waterBodyType`, `spaSeats`, `spaTempTarget`, `spaUsageFreq`, `spaBrand` du body. L'onboarding (`onboarding.tsx:221-225`) envoie bien ces champs via `...form` mais ils sont **silencieusement jetés** par l'API. Le PoolProfile spa n'est jamais créé. | **🔴 CRITIQUE** — feature spa cassée côté persistence |
| 8 | `api/account/notifications/route.ts:40,59` | `// TODO (future): read from DB once a NotificationPref model is added.` — GET retourne hardcoded defaults, POST ne persiste pas. | **🟡 MOYEN** — UX trompeuse (l'UI montre des toggles qui ne sauvent pas) |
| 9 | `api/pool/profile/route.ts:66` | `// TODO: i18n — return a translation key for the client to localise.` — erreur 500 renvoie `e.message` brute | **🟢 Faible** — info leak mineur |
| 10 | `app/admin/page.tsx:10` | `const ADMIN_PASSWORD = 'aqwelia-admin-2026' // TODO: move to env` — mot de passe en clair dans le bundle client | **🔴 CRITIQUE** — sécurité |
| 11 | `app/admin/page.tsx` | 3 onglets admin (content, analytics, users) sont des placeholders affichant "Coming Soon" + KPI cards avec "—" hardcoded | **🟡 MOYEN** — feature manquante |
| 12 | `.env` | `DATABASE_URL=file:/home/z/my-project/db/custom.db` — le dossier `db/` n'existe pas à ce chemin (le fichier réel est à `/tmp/my-project/db/custom.db`) | **🔴 CRITIQUE** — dev server crash au 1er appel DB |
| 13 | `prisma/schema.prisma:10` | `provider = "postgresql"` mais `.env` utilise SQLite (`file:`) | **🔴 CRITIQUE** — production cassée |
| 14 | `api/pool/weather/route.ts:56` | `'Accept-Language': 'fr'` hardcodé dans le fetch wttr.in — devrait utiliser `locale` | **🟢 Faible** — i18n |
| 15 | `api/pool/photo-diagnostic/route.ts:73` | `imageUrl: image` — stocke full base64 de la photo en DB. Commentaire `// Store full base64 (for dev/MVP — use S3 in production)` | **🟡 MOYEN** — DB bloat, pas prod-ready |
| 16 | `lib/billing/stripe-web.ts:7-10` vs `freemium.ts:172-177` | Incohérence durées : `monthly`/`yearly` côté Stripe vs `week`/`month`/`quarter`/`halfyear` côté freemium. Webhook Stripe `route.ts:60` ne mappe pas `week` et `quarter`. | **🟡 MOYEN** — abo week/quarter non fonctionnels |

---

## 14. Fonctionnalités partiellement terminées

| Feature | État | Détail |
|---|---|---|
| **Admin panel** | 🟡 Partiel | 2/5 onglets UI (banner, popup) — mais localStorage only, pas de backend. 3/5 (content, analytics, users) sont des placeholders "Coming Soon". |
| **Notifications preferences** | 🟡 Stub | API existe mais ne persiste pas — `// TODO (future): persist on the User model or a dedicated table` |
| **Local notifications mobile** | 🔴 Cassé | `src/lib/native/local-notifications.ts` référencé mais absent — runtime crash à l'import. |
| **Photo diagnostic storage** | 🟡 Dev only | Base64 en DB — commentaire explicite "use S3 in production" |
| **PoolDesign (studio IA)** | 🔴 Inutilisé | Modèle Prisma créé (prompt, imageUrl, style) mais aucun module UI ni API route n'existe |
| **OAuth social** | 🔴 Non implémenté | Modèle `Account` réservé mais aucun provider Google/Apple configuré |
| **Trial period Stripe** | 🔴 Absent | `trialAvailable: true` exposé côté client mais jamais créé dans la Checkout Session |
| **Plan Expert features** | 🟡 UI only | "Multi-clients illimité, Devis et planning visites, Photos avant/après, Notes techniques avancées, Export comptable, API + intégrations" — promis dans `freemium.ts:137-153` mais aucun module ne les implémente |
| **PDF report** | 🔴 Absent | `pdf_report` gate existe, `pdfReport: true` sur Premium/Expert, mais **aucun endpoint ni composant** ne génère de PDF |
| **Pro mode (LSI avancé)** | 🟡 Partiel | LSI calculé dans `water-balance.ts` mais pas de "mode pro" distinct côté UI |
| **Multi-piscines** | 🔴 Incohérent | `freemium.ts:65` limite `maxPools: 1` (free) / `3` (premium) / `999` (expert) mais `api/pool/profile/route.ts:18` utilise `findFirst` (singleton par user) — pas de gestion multi-piscines réelle |
| **Videos guides** | 🔴 Absent | `guidesAccess: 'all_plus_video'` promis Premium/Expert + `videoTitle?` sur `Guide` mais aucune vidéo n'est attachée aux 32 guides |

---

## 15. Données fictives encore présentes

| Emplacement | Donnée fictive | Action requise |
|---|---|---|
| `api/demo/login/route.ts:30-31` | `DEMO_EMAIL = 'demo@aqwelia.app'`, `DEMO_PASSWORD = 'aqwelia-demo-2026'` | Conserver pour App Store review — documenter dans `STORE_READINESS.md` |
| `app/admin/page.tsx:10` | `ADMIN_PASSWORD = 'aqwelia-admin-2026'` | Déplacer vers `process.env.ADMIN_PASSWORD_HASH` (scrypt) |
| `api/pool/photo-diagnostic/route.ts:73` | Commentaire `// use S3 in production` | Brancher S3/R2 avant scaling |
| `app/admin/page.tsx:498,517,554` | 3 sections placeholder "Coming Soon" | Implémenter ou retirer du menu admin |
| `lib/countries/*.ts` (11 fichiers) | `affiliate: 'aqwelia-es-21'`, `'aqwelia-au-22'`, `'aqwelia-uk-21'`, etc. | Remplacer par vrais Amazon Associates IDs |
| `lib/billing/stripe-web.ts:6-11` | Prix hardcodés `12.99`, `99`, `24.99`, `199` | Synchroniser avec Stripe Dashboard via `stripe.products.list()` |
| `landing/sections/international-section.tsx` | `MARKETPLACE_TEASERS` array contient "Amazon.fr", "Leslie's", "Poolstore UK", "Poolshop.de", "Quimipool", "Piscine Center" | Vérifier partenariats / remplacer par vrais liens affiliés |

---

## 16. Incohérences graphiques

- **Logo redondant** : `landing-page.tsx:73` affiche `<img src="/logo-aqwelia-web.png">` + texte "AQWELIA" en gradient à côté. Idem dans `legal/layout.tsx:31`. Le logo contient déjà le mot "AQWELIA" → duplication visuelle.
- **`landing-page.tsx:79`** : `tracking-[0.22em]` (0.22em) — cohérent mais inhabituel vs `tracking-wider` (0.05em) ailleurs.
- **Footer `text-shadow` à outrance** : `[text-shadow:_0_1px_2px_rgb(0_0_0),_0_-1px_2px_rgb(0_0_0),_1px_0_2px_rgb(0_0_0),_-1px_0_2px_rgb(0_0_0)]` répété ~15 fois dans `landing-page.tsx:225-322`. Devrait être une classe utilitaire CSS réutilisable (`.footer-text-shadow`).
- **Image `footer-bg.png` sans overlay** : commentaire `landing-page.tsx:208` "*AQWELIA footer background image — complete, not cut, no overlay*" — choix délibéré mais le contraste texte blanc/image dépend du contexte → certaines langues (DE/IT) avec mots plus longs pourraient overflow.
- **Couleur `--gold` non standardisée** : `globals.css:38` définit `--color-gold` mais les composants utilisent `text-gold`, `border-gold/20`, `bg-gold/10`, `from-gold`, `via-gold` — Tailwind 4 devrait gérer, mais quelques `oklch(0.65_0.11_195)` hardcodés dans `landing-page.tsx:119,165` au lieu d'utiliser le token.
- **Splash mobile vs web** : `page.tsx:80-100` splash utilise un SVG custom alors que `capacitor.config.ts:19-29` configure un `SplashScreen` natif. Les deux designs ne sont pas alignés (le splash web montre un gradient primary→gold, le splash natif est `#003B4A`).

---

## 17. Risques de sécurité

| # | Risque | Sévérité | Fichier | Recommandation |
|---|---|---|---|---|
| 1 | Mot de passe admin en clair dans le bundle JS client | **🔴 CRITIQUE** | `app/admin/page.tsx:10` | Déplacer vers `process.env.ADMIN_PASSWORD_HASH` (scrypt), valider côté serveur |
| 2 | Auth admin uniquement localStorage — bypass possible | **🔴 CRITIQUE** | `app/admin/page.tsx:45-52` | Ajouter une route API `/api/admin/*` protégée par session admin |
| 3 | `ignoreBuildErrors: true` masque 7 erreurs TS dont 2 critiques | **🔴 CRITIQUE** | `next.config.ts:14` | Mettre à `false`, fixer les 7 erreurs |
| 4 | `reactStrictMode: false` | **🟡 MOYEN** | `next.config.ts:15` | Réactiver pour détecter les bugs en dev |
| 5 | Photo diagnostic stocke base64 en DB | **🟡 MOYEN** | `api/pool/photo-diagnostic/route.ts:73` | Migrer vers S3/R2/Cloudinary avec URL signée |
| 6 | Pas de rate limiting sur `api/auth/register` et `api/demo/login` | **🟡 MOYEN** | — | Ajouter `upstash/ratelimit` ou middleware custom |
| 7 | Pas de CAPTCHA sur signin/signup | **🟡 MOYEN** | `auth/signin/page.tsx` | Ajouter hCaptcha/Turnstile |
| 8 | `Account` model OAuth réservé mais aucun provider configuré — risque de Session Fixation si ajouté sans vérif | **🟢 Faible** | `lib/auth.ts` | Documenter la procédure OAuth avant activation |
| 9 | Pas de CSP / headers sécurité (X-Frame-Options, X-Content-Type-Options, Referrer-Policy) | **🟡 MOYEN** | `next.config.ts` | Ajouter `headers()` dans next.config |
| 10 | `NEXTAUTH_SECRET` non set dans `.env` sandbox | **🔴 CRITIQUE** | `.env` | Générer `openssl rand -base64 32` |
| 11 | Webhook RevenueCat : Bearer secret en clair dans env — OK mais pas de replay protection (pas de timestamp check) | **🟢 Faible** | `api/revenuecat/webhook/route.ts` | Ajouter check timestamp < 5min |
| 12 | `STRIPE_WEBHOOK_SECRET` non set dans `.env` sandbox | **🟡 MOYEN** | `.env` | Configurer avant prod |
| 13 | Pas de sanitization des `props` JSON dans `AnalyticsEvent` | **🟢 Faible** | `api/analytics/route.ts:56` | Valider `props` via zod schema |
| 14 | `export` route renvoie tout le contenu utilisateur sans audit log | **🟢 Faible** | `api/account/export/route.ts` | Logger l'export pour audit RGPD |
| 15 | Erreur 500 sur `api/pool/profile` leak `e.message` brute | **🟢 Faible** | `api/pool/profile/route.ts:67` | Logger serveur, retourner message générique |

---

## 18. Configuration Capacitor (`capacitor.config.ts`)

```ts
{
  appId: 'com.aqwelia.app',
  appName: 'Aqwelia',
  webDir: 'out',                    // ← dossier d'export statique (next.config.mobile.ts: output: "export")
  backgroundColor: '#003B4A',
  ios: { contentInset: 'always', scrollEnabled: true, limitsNavigationsToAppBoundDomains: true },
  android: { allowMixedContent: false, backgroundColor: '#003B4A' },
  plugins: {
    SplashScreen: { launchShowDuration: 1500, backgroundColor: '#003B4A', splashFullScreen: true, splashImmersive: true, ... },
    StatusBar: { style: 'LIGHT', backgroundColor: '#003B4A', overlaysWebView: false },
    Keyboard: { resize: KeyboardResize.Body, style: KeyboardStyle.Light, resizeOnFullScreen: true },
    LocalNotifications: { smallIcon: 'ic_stat_icon', iconColor: '#004D5A', sound: 'bell.wav' },
  }
}
```

**Build mobile** : `next.config.mobile.ts` configure `output: "export"`, `images.unoptimized: true`, `trailingSlash: false`. **`ignoreBuildErrors: false`** (contrairement au config web) — donc le build mobile DOIT échouer avec les erreurs TS actuelles. C'est l'indicateur le plus clair que les erreurs §13 sont des vrais bugs à corriger.

---

## 19. Plugins Capacitor installés vs nécessaires

### Installés (10 — via `package.json:25-36`)

| Plugin | Version | Usage réel dans code | Statut |
|---|---|---|---|
| `@capacitor/app` | `^8.1.0` | `src/lib/native/lifecycle.ts` (onAppStateChange) | ✅ |
| `@capacitor/browser` | `^8.0.3` | `src/lib/billing/revenuecat.ts:161` (manageSubscription) | ✅ |
| `@capacitor/camera` | `^8.2.0` | `src/lib/native/camera.ts` (takePhoto, pickFromGallery) | ✅ |
| `@capacitor/cli` | `^8.4.1` | Build/dev tooling | ✅ |
| `@capacitor/core` | `^8.4.1` | Runtime | ✅ |
| `@capacitor/haptics` | `^8.0.2` | `src/lib/native/haptics.ts` | ✅ |
| `@capacitor/keyboard` | `^8.0.5` | `src/lib/native/keyboard.ts` | ✅ |
| `@capacitor/local-notifications` | `^8.2.0` | Configuré dans `capacitor.config.ts:40-44` mais **`src/lib/native/local-notifications.ts` N'EXISTE PAS** — seul l'index l'exporte (ligne 65-72) | **🔴 BUG** |
| `@capacitor/network` | `^8.0.1` | `src/lib/native/network.ts` + `use-network-status.ts` | ✅ |
| `@capacitor/preferences` | `^8.0.1` | `src/lib/native/storage.ts` | ✅ |
| `@capacitor/splash-screen` | `^8.0.1` | Configuré dans `capacitor.config.ts:19-29` | ✅ |
| `@capacitor/status-bar` | `^8.0.2` | `src/lib/native/status-bar.ts` | ✅ |

### Nécessaires mais non installés

| Plugin | Pourquoi |
|---|---|
| `@capacitor/push-notifications` | Push notifications distantes (rappels serveur, marketing) — local-notifications seul ne suffit pas |
| `@capacitor/geolocation` | Géolocalisation native pour météo (actuellement `navigator.geolocation` web fallback) |
| `@capacitor/app-review` | Demander une note App Store/Play Store après X tests |
| `@capacitor/share` | Partage rapport PDF / diag photo |
| `@capacitor/filesystem` | Sauvegarde PDF hors-ligne |
| `@capacitor-community/keep-awake` | Empêcher screen sleep pendant onboarding |

### Plateformes natives

- ❌ `ios/` folder absent — `npx cap add ios` jamais exécuté
- ❌ `android/` folder absent — `npx cap add android` jamais exécuté
- ✅ `@capacitor/ios` + `@capacitor/android` installés en devDeps (`package.json:107-108`)
- ✅ Assets `public/mobile/ios/` (7 icons + 3 splash) et `public/mobile/android/` (7 icons + splash) présents

---

## 20. État i18n

### Locales (7)
`fr` (default), `en`, `es`, `de`, `it`, `pt`, `nl` — voir `src/i18n/config.ts`.

### Compte de clés (méthode Python — leaf keys)

| Locale | Leaf keys |
|---|---|
| fr | 2 937 |
| en | 2 937 |
| es | 2 937 |
| de | 2 937 |
| it | 2 937 |
| pt | 2 937 |
| nl | 2 937 |

**Total : 20 559 traductions** (7 × 2 937). Parité parfaite entre les 7 locales.

### Namespaces (22, dans `fr.json`)
`actionPlan`, `common`, `nav`, `navGroups`, `landing` (359 clés), `plans` (64), `onboarding` (134), `settings`, `auth`, `diagnostic` (140), `weather`, `admin` (71), `spa`, `modules`, `spaData`, `guidesData`, `diagnosticActionPlan`, `mobile`, `metadata`, `legal`, `reminders`, `targets`.

### Architecture
- **Detection** (`src/middleware.ts:19-49`) : cookie `NEXT_LOCALE` → header `Accept-Language` → default `fr`.
- **Server** (`src/i18n/request.ts`) : `getRequestConfig` lit le header `x-next-intl-locale` posé par le middleware.
- **Client** (`src/app/layout.tsx:63`) : `NextIntlClientProvider locale={locale} messages={messages}`.
- **API** (`src/lib/i18n-api.ts`, 77 lignes) : `pickLocale(req)`, `getApiMessages(locale)` (cache par locale), `translate(locale, key, fallback)`. Toutes les routes API utilisent ce helper.
- **Vérification lint** : `scripts/i18n/check-hardcoded-strings.py` — dernière exécution : 0 violation (cf. worklog Task 11-api).

### Outils i18n
- `scripts/i18n/toolkit.py` — extraction / split / merge worksheet
- `scripts/i18n/check-hardcoded-strings.py` — détection chaînes FR codées en dur
- `scripts/translate-i18n.mjs` — script de traduction via LLM
- `scripts/merge-i18n-keys.js` — merge clés nouvelles
- `crowdin.yml` — config Crowdin (intégration traduction externe)
- `public/*-translations.json` (5 fichiers) — exports pour traducteurs

### Manques i18n
- ❌ Pas de gestion **régionale** (fr-CA vs fr-FR, pt-BR vs pt-PT) — uniquement locales 2 lettres
- ❌ Date 2026-01-15 hardcodée dans `cgu/page.tsx:19` et `privacy/page.tsx:19` (ne se met pas à jour avec la locale)

---

## 21. Plan d'exécution priorisé

### 🔴 P0 — Bloquants production (à fixer AVANT tout déploiement)

| # | Action | Fichier(s) | Effort |
|---|---|---|---|
| P0-1 | Créer `src/lib/native/local-notifications.ts` (wrapper `@capacitor/local-notifications`) — exporter `requestNotificationPermission`, `scheduleLocalNotification`, `cancelLocalNotification`, `getPendingNotifications`, `type LocalNotificationPayload` | nouveau fichier | 1h |
| P0-2 | Mettre `next.config.ts: ignoreBuildErrors: false` + `reactStrictMode: true` et fixer les 4 erreurs TS restantes (`safety-rules.ts:47`, `module-maintenance.tsx:890`, `middleware.ts:104`, `skills/*` à exclure via tsconfig) | `next.config.ts`, `tsconfig.json` | 2h |
| P0-3 | Fixer `api/pool/profile/route.ts:42-57` pour extraire `waterBodyType`, `spaSeats`, `spaTempTarget`, `spaUsageFreq`, `spaBrand` du body et les persister | `api/pool/profile/route.ts` | 30min |
| P0-4 | Aligner `provider` Prisma avec l'environnement : soit `provider = "sqlite"` en dev + `provider = "postgresql"` via override env, soit documenter le switch via `scripts/switch-db.sh` | `prisma/schema.prisma` | 1h |
| P0-5 | Corriger `.env` : `DATABASE_URL=file:/tmp/my-project/db/custom.db` (chemin réel) OU créer `/home/z/my-project/db/` et y déplacer le fichier | `.env` | 5min |
| P0-6 | Sécuriser `/admin` : déplacer `ADMIN_PASSWORD` vers `process.env.ADMIN_PASSWORD_HASH` (scrypt), créer `api/admin/auth/route.ts` qui valide le hash et pose un JWT admin en cookie httpOnly, modifier `app/admin/page.tsx` pour appeler cette route au lieu de comparer en client | `app/admin/page.tsx`, nouveau `api/admin/auth/route.ts` | 4h |
| P0-7 | Définir `NEXTAUTH_SECRET`, `STRIPE_WEBHOOK_SECRET`, `REVENUECAT_WEBHOOK_SECRET`, `NVIDIA_API_KEY`, `STRIPE_SECRET_KEY`, 4× `STRIPE_PRICE_*`, `NEXT_PUBLIC_REVENUECAT_IOS_KEY`, `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY` dans `.env` (sandbox + prod) | `.env` | 1h |
| P0-8 | Initialiser projets natifs : `npx cap add ios && npx cap add android` puis `npx cap sync` | `ios/`, `android/` | 30min |

### 🟡 P1 — Corrections majeures (post-déploiement maîtrisé)

| # | Action | Effort |
|---|---|---|
| P1-1 | Implémenter persistence notifications prefs (nouveau modèle `NotificationPref` ou champs sur `User`) | 2h |
| P1-2 | Migrer photos diagnostic vers S3/R2 : `imageUrl` → URL signée, base64 uniquement en transit | 4h |
| P1-3 | Implémenter multi-piscines : `findFirst` → `findMany` dans `api/pool/profile`, ajouter `poolId` aux routes `water-test`, `equipment`, etc. + UI sélecteur de piscine dans `Header` | 8h |
| P1-4 | Implémenter génération PDF rapport : `api/pool/report/route.ts` (react-pdf ou puppeteer), `pdf_report` gate côté UI | 6h |
| P1-5 | Synchroniser durées Stripe vs freemium : unifier sur `week\|month\|quarter\|halfyear`, corriger le webhook `route.ts:60` pour mapper correctement | 2h |
| P1-6 | Ajouter trial period Stripe : `subscription_data: { trial_period_days: 7 }` dans Checkout Session | 1h |
| P1-7 | Implémenter Plan Expert features : module "Clients" (multi-clients pisciniste), module "Devis", export comptable CSV | 16h |
| P1-8 | Implémenter page admin réelle : KPIs users/diagnostics/tests/subs depuis Prisma, content management pour guides | 8h |
| P1-9 | Ajouter `role: 'user' \| 'pro' \| 'admin'` au modèle `User`, middleware RBAC | 4h |
| P1-10 | Localiser `wttr.in` fetch : `'Accept-Language': locale` au lieu de `'fr'` | 5min |

### 🟢 P2 — Améliorations produit (post-MVP)

| # | Action | Effort |
|---|---|---|
| P2-1 | Ajouter tests E2E Playwright (landing, onboarding, water test, paywall, mobile) | 16h |
| P2-2 | Intégrer PostHog ou Vercel Analytics pour funnel réel | 4h |
| P2-3 | Ajouter bannière cookie consent RGPD | 2h |
| P2-4 | Headers sécurité (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) dans `next.config.ts` | 2h |
| P2-5 | Rate limiting sur `api/auth/register` et `api/demo/login` (upstash/ratelimit) | 2h |
| P2-6 | CAPTCHA hCaptcha/Turnstile sur signin/signup | 2h |
| P2-7 | OAuth Google + Apple (provider NextAuth) | 6h |
| P2-8 | Push notifications distantes (`@capacitor/push-notifications` + Firebase Admin) | 8h |
| P2-9 | Geolocation native (`@capacitor/geolocation`) | 2h |
| P2-10 | App review prompt (`@capacitor/app-review`) après 5 tests | 1h |
| P2-11 | Studio IA PoolDesign : endpoint `api/pool/design/route.ts` + module UI (modèle Prisma déjà créé) | 8h |
| P2-12 | Vidéos guides : attacher `videoUrl` aux 32 guides (`Guide.videoTitle` existe déjà dans `guides-data.ts:34`) | 4h |
| P2-13 | Export comptable Expert (CSV/Excel des produits utilisés) | 4h |
| P2-14 | Refactor footer text-shadow en classe utilitaire CSS `.footer-text-shadow` | 30min |
| P2-15 | Refactor `oklch(0.65_0.11_195)` hardcodés → token `--gold` ou `--ocean-light` | 1h |

---

## 22. Décisions techniques

### Decisions déjà prises (à conserver)

| Décision | Raison | Statut |
|---|---|---|
| NextAuth v4 (pas v5) | Stabilité, compatibilité middleware `withAuth`, JWT stateless adapté Capacitor | ⚠️ Migrer vers v5 en P3 (v5 stable depuis 2024) |
| Prisma 6 + PostgreSQL prod / SQLite dev | SQLite pour dev local sans Docker, Postgres pour scaling | ✅ |
| next-intl 4 (7 locales) | Plugin officiel Next.js 16, SSR + RSC | ✅ |
| Tailwind 4 + shadcn/ui | Stack moderne, design system complet (48 composants) | ✅ |
| `crypto.scryptSync` au lieu de bcryptjs | Zéro dépendance externe, CPU/memory-hard | ✅ |
| Stripe web + RevenueCat mobile | Meilleur UX IAP natif, pas de Stripe PaymentSheet mobile | ✅ |
| NVIDIA NIM (GLM-5.2 chat + nemotron-nano VLM) | Free tier 1000 credits, vision + texte | ✅ |
| wttr.in pour météo | Pas de clé API, gratuit, IP geoloc fallback | ✅ |
| Capacitor 8 (vs React Native) | Réutiliser 100% du code web, pas de pont JS natif | ✅ |
| Singleton PoolProfile par user (`findFirst`) | Simplicité MVP | ⚠️ À casser pour multi-piscines (P1-3) |
| `ignoreBuildErrors: true` (web) | Masquer temporairement erreurs TS le temps du dev | 🔴 À retirer P0-2 |

### Décisions à prendre

| Question | Options | Recommandation |
|---|---|---|
| Multi-piscines now or later ? | (a) Maintenir singleton + upgrade plus tard / (b) Casser maintenant en P1 | **(b)** — le plan Premium promet 3 pools, livrer sans c'est du faux-semblant |
| Modèle `NotificationPref` ou champs sur `User` ? | (a) Modèle dédié / (b) Champs JSONB sur User | **(a)** — plus propre, extensible |
| PDF : react-pdf ou puppeteer ? | (a) react-pdf (declarative) / (b) puppeteer (HTML→PDF) | **(a)** — pas de Chrome headless, plus léger |
| OAuth maintenant ou P2 ? | (a) Maintenant / (b) Plus tard | **(b)** — Credentials suffit pour MVP, OAuth ajoute 2-3j |
| Storage photos : S3 / R2 / Cloudinary ? | (a) AWS S3 / (b) Cloudflare R2 / (c) Cloudinary | **(b)** — pas d'egress fees, compatible S3 |
| App Store review : quel compte démo ? | (a) Compte shared `demo@aqwelia.app` / (b) Compte ephemeral par review | **(a)** — déjà implémenté, documenté dans `STORE_READINESS.md` |
| i18n régional (fr-CA, pt-BR) ? | (a) Maintenir 2-letter / (b) Ajouter variantes | **(a)** — MVP suffit, fr-CA comprend fr-FR |

---

## 23. État mobile (Capacitor) — synthèse

### Ce qui marche
- ✅ `capacitor.config.ts` configuré (appId, appName, webDir, splash, status bar, keyboard, local-notifications)
- ✅ 10 plugins Capacitor installés (app, browser, camera, haptics, keyboard, local-notifications, network, preferences, splash-screen, status-bar)
- ✅ `next.config.mobile.ts` (output: "export", images unoptimized, trailingSlash false, **ignoreBuildErrors: false**)
- ✅ Scripts npm : `mobile:build`, `mobile:sync`, `mobile:ios`, `mobile:android`, `mobile:clean`, `mobile:add:ios`, `mobile:add:android`, `mobile:open:ios`, `mobile:open:android`
- ✅ Wrapper natif `src/lib/native/` (11 fichiers : camera, haptics, keyboard, back-button, links, network, lifecycle, storage, status-bar, app-exit, **local-notifications MANQUANT**)
- ✅ Shell mobile dédié `src/components/mobile/` (9 fichiers : mobile-app-shell, mobile-header, bottom-tabs, types, 5 screens)
- ✅ Assets mobile présents (`public/mobile/ios/` 7 icons + 3 splash, `public/mobile/android/` 7 icons + splash)
- ✅ Détection runtime `isNative()` + `isMobile()` via `src/lib/platform.ts`
- ✅ Routing 4-vues : native → MobileAppShell / mobile browser + view=app → MobileAppShell / desktop + view=app → AppShell / sinon → LandingPage
- ✅ Billing RevenueCat intégré (`src/lib/billing/revenuecat.ts`)
- ✅ Webhook RevenueCat (`api/revenuecat/webhook/route.ts`)
- ✅ Deep links `aqwelia://screen?tab=...` (`src/lib/native/links.ts`)
- ✅ Android back button (`src/lib/native/back-button.ts`)
- ✅ Safe areas iOS (safe-area-top, env(safe-area-inset-bottom))
- ✅ Haptics feedback (`src/lib/native/haptics.ts`)
- ✅ Offline mode (IndexedDB cache, OfflineBanner)

### Ce qui manque / casse
- 🔴 `src/lib/native/local-notifications.ts` n'existe pas alors que `index.ts:65-72` l'exporte → import `@/lib/native` casse le runtime
- 🔴 Projets natifs `ios/` et `android/` non initialisés (`npx cap add ios/android`)
- 🔴 `mobile:build` va échouer car `next.config.mobile.ts` a `ignoreBuildErrors: false` (contrairement au config web)
- 🟡 Pas de push notifications distantes (plugin `@capacitor/push-notifications` non installé)
- 🟡 Pas de géoloc native (utilise `navigator.geolocation` web)
- 🟡 Pas de partage natif (pas de `@capacitor/share`)
- 🟡 Pas de `app-review` (pousser note après X tests)
- 🟡 Pas de `filesystem` (sauvegarde PDF hors-ligne)
- 🟡 Splash web vs splash natif non alignés visuellement

---

## 24. Fonctionnalités manquantes (selon plan Pro/Care/nouvelles tarifs)

En croisant `freemium.ts` (promesses produits) avec le code réellement implémenté :

| Feature promise | Plan ciblé | Implémenté ? |
|---|---|---|
| Multi-piscines (3 Premium, ∞ Expert) | Premium+ | ❌ Non — singleton `findFirst` |
| Scans photo illimités | Premium+ | ✅ Oui (gate `photo_scan`) |
| Météo avancée + alertes | Premium+ | ✅ Oui (gate `weather_advanced`) |
| Tous les guides + vidéos | Premium+ | ⚠️ Guides oui (32), vidéos non |
| Rappels intelligents | Premium+ | ✅ Oui (gate `smart_reminders`) |
| Rapport PDF partageable | Premium+ | ❌ Non (gate `pdf_report` sans endpoint) |
| Mode pro (LSI avancé) | Premium+ | ⚠️ LSI calculé mais pas de "mode pro" UI distinct |
| Spa et eau chaude (brome, oxygène actif) | Premium+ | ✅ Oui (gate `spa_support`, spa-data.ts) |
| Historique illimité | Premium+ | ✅ Oui (gate `history_extended`, `historyDays: 9999`) |
| Support prioritaire | Premium+ | ❌ Pas de système de ticket prioritaire |
| Multi-clients illimité | Expert | ❌ Non implémenté |
| Devis et planning visites | Expert | ❌ Non implémenté |
| Photos avant/après | Expert | ❌ Non implémenté (PhotoDiagnostic existe mais pas de paire before/after) |
| Notes techniques avancées | Expert | ❌ Non implémenté |
| Export comptable | Expert | ❌ Non implémenté |
| API + intégrations | Expert | ❌ Pas d'API publique (pas de clé API, pas de rate limit, pas de doc OpenAPI) |

### Fonctionnalités hors-plan à considérer

- **PoolDesign studio IA** : modèle Prisma créé mais aucun endpoint/UI → P2-11
- **Push notifications distantes** : reminders serveur → P2-8
- **OAuth Google/Apple** : friction réduite à l'inscription → P2-7
- **PWA / install web** : manifest.json absent, service worker absent
- **Mode hors-ligne complet** : cache IndexedDB existe mais pas de sync conflict resolution

---

## 25. Conclusion

AQWELIA est **architecturalement solide et ~80% fonctionnel**, mais **n'est pas déployable en l'état** pour 3 raisons principales :

1. **`ignoreBuildErrors: true` masque 7 erreurs TS** dont 2 critiques (module `local-notifications` absent, signature middleware).
2. **Configuration DB incohérente** (Postgres déclaré vs SQLite en env, chemin `.env` invalide).
3. **Sécurité admin théâtrale** (mot de passe en clair côté client).

Une fois les **8 actions P0** (§21) traitées (~10h de travail), l'app devient déployable en MVP web.

Les **10 actions P1** (~53h) amèneront la parité avec les promesses produit Premium (multi-piscines, PDF, persistence notifs, Plan Expert partiel).

Les **15 actions P2** (~60h) mèneront à un produit mature prêt pour scaling et App Store review.

**Total estimation remise à niveau production-ready : ~123h** (3 semaines dev full-time).

---

## Annexe A — Index des fichiers inspectés

- `package.json` (119 lignes)
- `prisma/schema.prisma` (315 lignes, 15 modèles)
- `src/lib/auth.ts` (68 lignes)
- `src/lib/password.ts` (44 lignes)
- `src/lib/stripe.ts` (52 lignes)
- `src/lib/billing/{index,revenuecat,stripe-web,types}.ts`
- `src/lib/pool/freemium.ts` (256 lignes)
- `src/lib/ai/nvidia.ts` (151 lignes)
- `src/lib/i18n-api.ts` (77 lignes)
- `src/lib/platform.ts` (~100 lignes)
- `src/lib/native/index.ts` (87 lignes) + 10 wrappers
- `src/middleware.ts` (115 lignes)
- `src/app/layout.tsx`, `src/app/page.tsx` (120), `src/app/admin/page.tsx` (571), `src/app/auth/signin/page.tsx` (240), `src/app/settings/page.tsx` (1091)
- `src/app/legal/{layout,cgu,privacy,support}/...` (612 lignes total)
- 25 fichiers `src/app/api/**/route.ts`
- `src/components/landing/landing-page.tsx` (328) + 16 sections
- `src/components/aquamind/{app-shell,onboarding,module-*}.tsx` (17 fichiers, ~10 361 lignes)
- `src/components/mobile/{mobile-app-shell,mobile-header,bottom-tabs,types,screens/*}.tsx` (9 fichiers)
- `src/components/ui/` (48 composants shadcn)
- `src/i18n/locales/{fr,en,es,de,it,pt,nl}.json` (7 × 3 541 lignes)
- `src/i18n/config.ts`, `src/i18n/request.ts`
- `capacitor.config.ts`, `next.config.ts`, `next.config.mobile.ts`
- `.env`, `.env.example`, `tsconfig.json`
- `worklog.md` (3 086 lignes, 30+ sections)

**Aucun code modifié.** Audit en lecture seule.

---

*Document généré le 2026-01-15 — Task P0-AUDIT — voir `worklog.md` pour le work record détaillé.*
