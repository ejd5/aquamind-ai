# AQWELIA — Audit Mobile iOS/Android (Étape 1)

> Rapport d'audit complet du repository AQWELIA avant intégration Capacitor.
> Date : 6 juillet 2026
> Branche cible : `mobile/capacitor-ios-android`

---

## 1. Framework utilisé

| Élément | Valeur |
|---------|--------|
| Framework | **Next.js 16.1.1** (App Router) |
| Runtime | React 19, TypeScript 5 |
| Build | Turbopack (dev), Webpack (prod) |
| `output` config | `"standalone"` (serveur Node autonome, PAS un export statique) |
| Package manager | Bun (avec bun.lock) |
| Scripts | `dev`, `build`, `start`, `lint`, `db:push`, `db:generate`, `db:migrate`, `db:reset` |

**Implication mobile** : `output: "standalone"` produit un serveur Node, **incompatible avec Capacitor**. Il faudra soit :
- (a) Ajouter un `next.config.mobile.ts` avec `output: "export"` pour générer un build statique embarquable
- (b) Construire une seconde config build dédiée mobile (recommandé pour ne pas casser le web)

---

## 2. Système de routing

| Élément | Valeur |
|---------|--------|
| Router | **App Router** (dossier `src/app/`) |
| Route unique visible | `/` (la landing page bascule vers `AppShell` via state React) |
| API routes | 14 routes sous `/api/*` |
| Middleware | Aucun |
| Dynamic routes | Aucune (`[id]`, `[slug]` — non utilisé) |
| `generateStaticParams` | Non utilisé |

**Implication mobile** : Routing 100% client-side (state-based), pas de routes dynamiques serveur. **Compatible export statique**. Le state-toggle landing↔app devra être préservé dans la version mobile.

---

## 3. Système de compilation

| Élément | Valeur |
|---------|--------|
| Config | `next.config.ts` |
| `output` | `"standalone"` |
| `typescript.ignoreBuildErrors` | `true` ⚠️ (à corriger) |
| `reactStrictMode` | `false` |
| Images | `next/image` non utilisé (0 fichier) → pas de config `images` nécessaire |
| Headers/rewrites/redirects | Aucun |

**Implication mobile** : 
- Ajouter un profil de build `output: "export"` dédié mobile (via `MOBILE_BUILD=true` env ou config séparée)
- `images.unoptimized: true` requis pour export statique
- `typescript.ignoreBuildErrors: true` à passer en `false` (sécurité)

---

## 4. Fonctionnalités nécessitant un serveur

| Fonctionnalité | Localisation | Serveur requis ? |
|----------------|--------------|------------------|
| **VLM analyse photo** (z-ai-web-dev-sdk) | `src/app/api/pool/photo-diagnostic/route.ts` | ✅ OUI (SDK serveur) |
| **LLM chat assistant** (z-ai-web-dev-sdk) | `src/app/api/chat/route.ts` | ✅ OUI (SDK serveur) |
| **Météo wttr.in** (fetch externe) | `src/app/api/pool/weather/route.ts` | ⚠️ Proxy recommandé (CORS) |
| **Prisma CRUD** (13 routes) | `src/app/api/**` | ✅ OUI (DB) |
| **Pages rendues** | `src/app/page.tsx` | ❌ Non (client component) |

**Implication mobile** : Le frontend mobile embarqué fera des appels HTTPS vers le backend Aqwelia distant. Les routes API restent sur le serveur déployé (Vercel/Render/Railway). Aucune logique métier à dupliquer.

---

## 5. API routes, Server Actions et fonctions backend

### API Routes (14)

| Route | Méthodes | Rôle | Server-only ? |
|-------|----------|------|---------------|
| `/api/dashboard` | GET | Agrège profil + derniers tests + plans | ✅ Prisma |
| `/api/pool/profile` | GET, POST | CRUD profil piscine | ✅ Prisma |
| `/api/pool/water-test` | GET, POST, DELETE | Mesures eau + calculs | ✅ Prisma |
| `/api/pool/action-plan` | POST | Génère plan d'action | ✅ Moteur déterministe |
| `/api/pool/photo-diagnostic` | GET, POST | VLM analyse photo | ✅ z-ai SDK |
| `/api/pool/equipment` | GET, POST, PATCH, DELETE | Équipements | ✅ Prisma |
| `/api/pool/inventory` | GET, POST, DELETE | Produits | ✅ Prisma |
| `/api/pool/reminders` | GET, POST, PATCH, DELETE | Rappels | ✅ Prisma |
| `/api/pool/weather` | GET | Météo wttr.in + risk engine | ✅ Fetch externe |
| `/api/chat` | POST, DELETE | Assistant IA (LLM) | ✅ z-ai SDK |
| `/api/guides` | GET | Catalogue 20 guides + reco | ✅ Prisma |
| `/api/subscription` | GET, POST | Freemium | ✅ Prisma |
| `/api/analytics` | GET, POST | Events funnel | ✅ Prisma |
| `/api/` | GET | Health check | ❌ Non |

### Server Actions
**Aucune** (`'use server'` non présent dans le code). Tout passe par fetch API.

**Implication mobile** : Toutes les routes API sont consommables via fetch HTTPS depuis Capacitor. Il faut configurer `NEXT_PUBLIC_API_BASE_URL` pour pointer vers le backend déployé.

---

## 6. Système d'authentification

### État actuel
| Élément | Valeur |
|---------|--------|
| NextAuth.js | Installé (`next-auth@^4.24.11`) mais **NON utilisé** |
| Session/cookies | **Aucun** |
| Modèle User en DB | **AUCUN** |
| Routes `/api/auth/*` | **Aucune** |
| Middleware d'auth | **Aucun** |

### Verdict
**L'application est actuellement single-user, sans authentification.** Toutes les routes API sont ouvertes. La DB SQLite est locale au serveur.

**Implication mobile CRITIQUE** : 
- Pour publier sur stores avec multi-utilisateurs, il **FAUT créer** :
  - Un modèle `User` (email, password hash, createdAt)
  - Une couche d'auth (NextAuth avec Credentials + JWT, ou Better Auth, ou Supabase Auth)
  - Un middleware de protection des routes API
  - Relier `PoolProfile`, `WaterTest`, etc. à `userId`
- Pour un MVP mobile sans multi-user : on peut garder single-user en mode "1 device = 1 profil distant"

---

## 7. Base de données et modèle utilisateur

### Configuration
| Élément | Valeur |
|---------|--------|
| ORM | **Prisma 6.11** |
| DB | **SQLite** (fichier local `db/custom.db`) |
| URL | `DATABASE_URL=file:/home/z/my-project/db/custom.db` |

### 13 modèles existants
`PoolProfile`, `WaterTest`, `PhotoDiagnostic`, `ActionPlan`, `Equipment`, `ProductInventory`, `ChatMessage`, `MaintenanceTask`, `PoolDesign`, `Reminder`, `GuideView`, `Subscription`, `AnalyticsEvent`

### ❌ Modèle User : ABSENT
Aucun modèle utilisateur. L'app est 100% single-user locale.

**Implication mobile CRITIQUE** :
- SQLite local ne convient pas pour un backend multi-user distant
- **Migration vers PostgreSQL ou MySQL requise** pour la version déployée
- Ajouter un modèle `User` + clé étrangère `userId` sur tous les modèles
- Plan de migration : 
  1. Changer `datasource db { provider = "sqlite" }` → `"postgresql"`
  2. Ajouter `model User { id String @id @default(cuid()) email String @unique passwordHash String createdAt DateTime @default(now()) ... }`
  3. Ajouter `userId String` + relation sur `PoolProfile`, `WaterTest`, etc.
  4. `prisma migrate dev --name add_users_and_postgres`

---

## 8. Système d'abonnement et de paiement

### État actuel
| Élément | Valeur |
|---------|--------|
| Modèle `Subscription` | ✅ Présent (plan, duration, startedAt, expiresAt, active) |
| Plans | `surface` (gratuit), `limpide` (7,99€), `cristal` (12,99€), `gardien` (24,99€) |
| Moteur freemium | ✅ `src/lib/pool/freemium.ts` (gating 8 features) |
| **Stripe** | ❌ **NON implémenté** |
| **Paiement réel** | ❌ **Aucun** — POST `/api/subscription` crée juste un record en DB sans paiement |
| Webhook Stripe | ❌ Aucun |
| Paywall UI | ✅ `module-paywall.tsx` (UI sans paiement réel) |

### Verdict
Le système d'abonnement est **fictif** — l'utilisateur peut "s'abonner" gratuitement en POST. Aucun paiement réel.

**Implication mobile** :
- **Web** : implémenter Stripe Checkout + webhooks (à faire)
- **iOS/Android** : implémenter RevenueCat avec Apple IAP / Google Play Billing
- **Source de vérité commune** : backend AQWELIA doit stocker le statut (`plan`, `expiresAt`) et le valider côté serveur
- Webhook RevenueCat → met à jour `Subscription` en DB
- Webhook Stripe → met à jour `Subscription` en DB
- **Renommer les plans** : actuellement `surface/limpide/cristal/gardien` → l'utilisateur demande `free/premium/expert` pour RevenueCat. Migration nécessaire.

---

## 9. Dépendances incompatibles iOS ou Android

### 🔒 Server-only (NE PAS embarquer dans le bundle mobile)

| Package | Raison | Action |
|---------|--------|--------|
| `sharp` ^0.34.3 | Native binary (image processing) | Retirer du bundle mobile (server-only) |
| `z-ai-web-dev-sdk` ^0.0.18 | SDK backend Z.ai (LLM, VLM, TTS...) | Retirer du bundle mobile (server-only) |
| `@prisma/client` ^6.11.1 | Client DB binaire | Retirer du bundle mobile (server-only) |
| `prisma` ^6.11.1 | CLI | Retirer du bundle mobile (devDep) |
| `next` ^16.1.1 | Framework serveur | Garder en devDep pour build, pas dans le bundle runtime |

### ⚠️ Potentiellement problématiques

| Package | Risque | Action |
|---------|--------|--------|
| `@mdxeditor/editor` ^3.39.1 | Lourd, peu utile en mobile | Vérifier usage, lazy-load ou retirer |
| `react-syntax-highlighter` ^15.6.1 | Lourd, peu utile en mobile | Vérifier usage |
| `next-auth` ^4.24.11 | Inutilisé actuellement | À implémenter ou retirer |
| `@dnd-kit/*` ^6/10/3 | Drag-and-drop desktop | Désactiver sur mobile |
| `@tanstack/react-table` ^8.21.3 | Tableaux avancés (desktop) | Adapter en cartes mobile |

### ✅ Compatibles mobile

`framer-motion`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`, `date-fns`, `zod`, `zustand`, `recharts`, `react-markdown`, `embla-carousel-react`, `cmdk`, `react-hook-form`, `@hookform/resolvers`, `react-day-picker`, `react-resizable-panels`, `react-otp-input`, tous les `@radix-ui/*`.

**Total** : 66 dependencies + 9 devDependencies.

---

## 10. Problèmes d'interface responsive

### Métriques Tailwind
| Breakpoint | Occurrences | Statut |
|------------|-------------|--------|
| `sm:` (640px) | 173 | ✅ Mobile-first correct |
| `md:` (768px) | 26 | ✅ Tablette |
| `lg:` (1024px) | 36 | ⚠️ Desktop-specific |
| `xl:` (1280px) | 0 | ✅ Aucun |

### Problèmes identifiés
1. **`hover:` utilisé dans 38 fichiers** → sans alternative `active:` sur mobile
2. **Header desktop** (`src/components/aquamind/header.tsx`) : nav horizontale avec 6 onglets cachée en `lg:flex` → sur mobile, pas de nav claire
3. **`AppShell` tabs** : navigation tabbed latérale desktop, non adaptée bottom-tabs mobile
4. **Grands tableaux** dans `real-costs.tsx` et `comparator.tsx` → overflow horizontal sur mobile
5. **Carrousel embla** dans `simulations.tsx` → OK mobile mais à tester
6. **Hero phone mockup** : décoratif desktop, superflu sur mobile

### Hook existant
✅ `src/hooks/use-mobile.ts` existe déjà (hook `useIsMobile()` basé sur `matchMedia`).

---

## 11. Pages utilisant des comportements uniquement desktop

| Composant | Comportement desktop | Adaptation mobile requise |
|-----------|----------------------|---------------------------|
| `app-shell.tsx` | Tabs latérales + header sticky | Bottom tabs + header compact |
| `header.tsx` | Nav horizontale 6 items `lg:flex` | Header minimal + menu hamburger |
| `module-water-test.tsx` | Grand formulaire multi-colonnes | Step-by-step (1 mesure/écran) |
| `module-health-log.tsx` | Tableau + graphique large | Timeline verticale + graphique compact |
| `module-maintenance.tsx` | Tableau équipements | Cartes empilées |
| `landing/sections/real-costs.tsx` | Tableau 4 colonnes | Cartes ou accordion |
| `landing/sections/comparator.tsx` | Tableau 6 colonnes | Cartes ou toggle |
| `module-dashboard.tsx` | Grille 4 colonnes stats | Grille 2 colonnes |

---

## 12. Risques de sécurité

| Risque | Sévérité | Détail |
|--------|----------|--------|
| **Aucune authentification** | 🔴 Critique | Toutes les routes API sont ouvertes |
| **DB SQLite locale** | 🔴 Critique | Pas de multi-user, pas de séparation des données |
| **`ignoreBuildErrors: true`** | 🟡 Élevé | Erreurs TypeScript silencieuses |
| **`reactStrictMode: false`** | 🟡 Moyen | Masque des bugs potentiels |
| **Aucun rate limiting** | 🟡 Moyen | Routes API exposées à l'abus |
| **Aucune validation côté serveur** | 🟡 Moyen | Some routes trustent le body JSON |
| **`z-ai-web-dev-sdk` sans clé visible** | 🟢 Faible | Vérifier que la clé n'est pas dans le bundle |
| **Aucun CSRF token** | 🟡 Moyen | Si auth ajoutée, prévoir CSRF |
| **Pas de HTTPS forcé** | 🟢 Faible | À configurer sur le domaine de prod |

---

## 13. Variables d'environnement nécessaires

### Actuelles
| Variable | Usage | Mobile ? |
|----------|-------|----------|
| `DATABASE_URL` | SQLite locale | À migrer vers Postgres distant |
| `NODE_ENV` | Standard | ✅ |

### Manquantes (à créer pour mobile)
| Variable | Usage |
|----------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | URL backend pour client mobile (ex: `https://api.aqwelia.app`) |
| `NEXTAUTH_SECRET` | Secret sessions |
| `NEXTAUTH_URL` | URL callback |
| `STRIPE_SECRET_KEY` | Stripe web |
| `STRIPE_WEBHOOK_SECRET` | Webhook Stripe |
| `REVENUECAT_API_KEY` | RevenueCat server |
| `REVENUECAT_WEBHOOK_SECRET` | Webhook RevenueCat |
| `APPLE_IAP_SHARED_SECRET` | Validation reçus App Store |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | Validation achats Play |
| `Z_AI_API_KEY` | Si clé requise par z-ai-web-dev-sdk |
| `WTTR_IN_BASE_URL` | Configurable pour proxy météo |

---

## 14. Modifications indispensables AVANT l'intégration Capacitor

### 🔴 Bloquants (sans ça, pas de mobile)

1. **Créer un système d'authentification**
   - Modèle `User` en DB (email, passwordHash, createdAt)
   - NextAuth.js ou Better Auth avec Credentials provider + JWT
   - Middleware de protection des routes API
   - Clé `userId` sur tous les modèles métier

2. **Migrer SQLite → PostgreSQL**
   - Changer `provider` dans `schema.prisma`
   - Déployer une instance Postgres (Neon, Supabase, Railway)
   - `prisma migrate dev --name init_postgres`
   - Seeder un compte démo

3. **Ajouter `NEXT_PUBLIC_API_BASE_URL`**
   - Toutes les routes `fetch('/api/...')` deviennent `fetch(\`${API_BASE}/api/...\`)`
   - Abstraction dans `src/lib/api-client.ts`

4. **Créer un build statique pour mobile**
   - `next.config.mobile.ts` avec `output: "export"`, `images.unoptimized: true`
   - Script `mobile:build` : `MOBILE_BUILD=true next build -c next.config.mobile.ts`
   - `webDir` Capacitor → `out/` (output statique)

### 🟡 Importants (sans ça, rejet store quasi certain)

5. **Renommer les plans pour RevenueCat**
   - `surface/limpide/cristal/gardien` → `free/premium/expert` (3 plans au lieu de 4)
   - Produits : `aqwelia_premium_monthly`, `aqwelia_premium_yearly`, `aqwelia_expert_monthly`, `aqwelia_expert_yearly`
   - Migration DB + mise à jour `freemium.ts`

6. **Implémenter Stripe Checkout (web)**
   - Checkout Session pour `limpide`/`cristal`/`gardien` mensuel/annuel
   - Webhook `/api/stripe/webhook` pour synchroniser `Subscription`

7. **Implémenter RevenueCat (mobile)**
   - SDK Capacitor `@revenuecat/purchases-capacitor`
   - Abstraction `src/lib/billing/` (web vs mobile auto)
   - Webhook `/api/revenuecat/webhook` pour sync `Subscription`

8. **Page "Paramètres et confidentialité"**
   - Mon abonnement, Restaurer, Gérer, Supprimer compte, RGPD, etc.

### 🟢 Souhaitables (qualité premium)

9. **Safe areas CSS** (`env(safe-area-inset-*)`) sur tous les écrans mobiles
10. **Navigation mobile dédiée** (bottom tabs 5 entrées)
11. **Gestion offline** (cache localStorage +IndexedDB pour derniers tests)
12. **Couche native abstraite** (`src/lib/native/`) pour caméra, push, haptics, etc.
13. **Splash screen + icônes** (déjà le logo AQWELIA, formats à générer)

---

## 📊 Synthèse rapide

| Dimension | État actuel | Effort mobile |
|-----------|-------------|---------------|
| Framework | Next.js 16 ✅ | Export statique à configurer |
| Auth | ❌ Aucune | 🔴 À créer (4-5 jours) |
| DB | SQLite single-user | 🔴 Migrer Postgres multi-user (2-3 jours) |
| API | 14 routes ✅ | ✅ Réutilisable, ajouter auth middleware |
| Paiement | ❌ Fictif | 🔴 Stripe + RevenueCat (5-7 jours) |
| UI responsive | Partiel | 🟡 Adaptation mobile (5-7 jours) |
| Offline | ❌ | 🟡 Cache + state (2-3 jours) |
| Native | ❌ | 🟡 Capacitor + plugins (3-4 jours) |
| Conformité stores | ❌ | 🟡 Pages légales + compte démo (2 jours) |
| Doc | ✅ PROJECT_JOURNEY | 🟡 MOBILE_IOS_ANDROID.md (1 jour) |

**Effort total estimé** : 25-35 jours-homme pour une mise en production stores complète et premium.

---

## ✅ Points forts à conserver

- ✅ **Logique métier 100% isolée** dans `src/lib/pool/` (moteur déterministe, LSI, safety, weather, reminders, guides) — **réutilisable telle quelle**
- ✅ **Aucune Server Action** (tout passe par fetch API → compatible mobile)
- ✅ **Aucun `next/image` / `next/link`** (pas de friction optimisation)
- ✅ **Aucune dynamic route** (pas de friction export statique)
- ✅ **Hook `use-mobile` déjà présent**
- ✅ **Design system "Oceanic Luxury"** déjà premium et adaptable
- ✅ **14 routes API** prêtes à être consommées via HTTPS
- ✅ **Logo AQWELIA + icône** déjà créés (formats favicon + apple-touch-icon)

---

*Rédigé par l'audit mobile AQWELIA — Étape 1 du plan Capacitor iOS/Android.*
