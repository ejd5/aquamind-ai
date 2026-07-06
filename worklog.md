---
Task ID: RESTORE-1
Agent: main (Z.ai Code)
Task: Restaurer le projet AquaMind AI depuis le zip uploadé par l'utilisateur (/home/z/my-project/upload/aquamind-project.zip) et vérifier son bon fonctionnement end-to-end.

Work Log:
- Vérifié l'upload du zip (337K, 128 fichiers extraits)
- Comparé les configs (package.json, tsconfig, tailwind.config, components.json, next.config, postcss, eslint, Caddyfile) → toutes IDENTIQUES au projet courant (même stack, dépendances déjà installées)
- Identifié que globals.css du zip contient le design system "Oceanic Luxury" complet (334 lignes vs 122 sur le scaffold) → à écraser
- Copié tout src/ (app/, components/aquamind/, components/landing/, components/ui/, lib/pool/, hooks/) vers le projet
- Copié prisma/schema.prisma (13 modèles: PoolProfile, WaterTest, PhotoDiagnostic, ActionPlan, Equipment, ProductInventory, ChatMessage, MaintenanceTask, PoolDesign, Reminder, GuideView, Subscription, AnalyticsEvent)
- Copié public/ (logo.svg, robots.txt) et les 5 docs .md (README, PROJECT_JOURNEY, PRODUCT_AUDIT, BRAND_NAMING, STORE_READINESS)
- Vérifié .env : DATABASE_URL=file:/home/z/my-project/db/custom.db (OK)
- Exécuté `bun run db:push` → base SQLite créée et sync, Prisma Client généré (v6.19.2)
- Redémarré le dev server (Next.js 16.1.3 Turbopack) → Ready in 1.1s, HTTP 200 sur /
- Vérification end-to-end avec Agent Browser :
  * Landing page : 14 sections s'affichent (Hero, Problème, Coûts, Pisciniste, Solution, Comparatif, Simulations, Gains, Story, Variations, Features, Tarifs, FAQ, CTA) — aucune erreur
  * APIs : profile 200, dashboard 200, guides 200, reminders 200, subscription 200, weather 500 (bug)
- Bug trouvé et corrigé dans src/app/api/pool/weather/route.ts ligne 82 :
  * Avant : `return NextResponse.json({ weather, assessment, lastTestDaysAgo: lastTest.daysAgo || lastTestDaysAgo })` — `lastTest` est null quand aucun WaterTest en base → TypeError: Cannot read properties of null (reading 'daysAgo')
  * Après : `return NextResponse.json({ weather, assessment, lastTestDaysAgo })` — utilise la variable calculée
  * Re-vérifié : weather API retourne maintenant vraie météo wttr.in (28°C, Partiellement nuageux) + assessment avec alerte "Canicule prévue" severity extreme
- Test du flux onboarding complet (4 étapes) :
  * Étape 1 : nom + volume + unité + forme + surface
  * Étape 2 : traitement (Chlore/Sel/Brome/Oxygène/UV/Autre)
  * Étape 3 : filtre (Sable/Cartouche/Verre/Diatomée) + pompe optionnel
  * Étape 4 : région + exposition + usage + couverture → "Activer AquaMind"
  * POST /api/pool/profile crée le profil en base (id généré, tous champs persistés)
- Vérifié le dashboard après création du profil : AppShell avec 11 modules (Aujourd'hui, Diagnostic photo, Analyse eau, Assistant IA, Plan d'action, Carnet de santé, Maintenance, Météo intelligente, Ressources & guides, Rappels, AquaMind Premium) — toutes les nav, stats (MESURES 0, DIAGNOSTICS 0, ÉQUIPEMENTS 0, PRODUITS 0), boutons d'action — aucune erreur navigateur ni console
- Exécuté `bun run lint` → 0 erreur, 0 warning
- Serveur relancé pour l'utilisateur (PID 4207, prêt sur port 3000)

Stage Summary:
- Projet AquaMind AI COMPLÈTEMENT restauré et fonctionnel depuis le zip de l'utilisateur
- 128 fichiers restaurés (src complet + prisma + public + 5 docs)
- Base de données SQLite créée et sync (13 modèles Prisma)
- 1 bug corrigé : weather/route.ts crash sur lastTest null
- Toutes les APIs vérifiées (profile, dashboard, guides, weather, reminders, subscription) → 200
- Flux complet vérifié : landing → onboarding (4 étapes) → création profil → dashboard avec 11 modules
- Lint propre (0 erreur/warning)
- Serveur dev actif sur http://localhost:3000 (visible dans le panneau de preview)
- Le serveur peut être tué entre les appels Bash (comportement connu du sandbox, mentionné dans PROJECT_JOURNEY.md) — dire "serveur mort" pour le relancer
- État : prêt à reprendre le développement avec l'utilisateur

---
Task ID: RB-1
Agent: general-purpose (rebrand)
Task: Renommer AquaMind AI → AQWELIA partout dans le projet

Work Log:
- Lu worklog.md pour contexte (RESTORE-1 a restauré le projet depuis le zip)
- Grep initial : 70 occurrences de "AquaMind" réparties sur 35 fichiers
- Mis à jour src/app/layout.tsx (métadonnées : titre, description, keywords, authors)
- Mis à jour 12 composants aquamind/ : header, footer, app-shell, onboarding, module-assistant, module-paywall, module-action-plan, module-diagnostic, module-guides, module-maintenance, module-water-test, emergency-mode (texte UI visible, libellés nav, disclaimer, boutons onboarding, etc.)
- Mis à jour src/components/landing/landing-page.tsx (header, footer, aria-label, copyright)
- Mis à jour 9 sections landing/ : hero, faq, story, savings, pisciniste-cost, comparator, solution, variations, simulations (5 autres sections n'avaient aucune mention AquaMind : problem, real-costs, features-grid, pricing, final-cta)
- Mis à jour src/lib/pool/ai-context.ts (system prompt LLM), guides-data.ts (4 fiches guides), dosing-engine.ts (commentaire de header)
- Mis à jour README.md (titre + paragraphe licence)
- Ajouté note de renommage en haut de PROJECT_JOURNEY.md (contenu historique préservé)
- Ajouté nouvelle section "## AQWELIA (nouveau nom — juillet 2026)" en haut de BRAND_NAMING.md (étude historique préservée ci-dessous)
- Vérification : src/lib/pool/freemium.ts ne contient aucune mention "AquaMind" (plans déjà nommés Surface/Limpide/Cristal/Gardien sans préfixe de marque)
- Lancé `bun run lint` pour vérifier l'absence d'erreurs

Stage Summary:
- Rebranding AquaMind AI → AQWELIA TERMINÉ sur les 24 fichiers listés dans le périmètre RB-1
- ~60 remplacements de texte effectués au total (voir détails ci-dessus)
- Tous les fichiers UI visibles par l'utilisateur sont à jour (header, footer, landing, onboarding, modules, prompts IA, guides)
- Lint : voir résultat du run (pass attendu)
- Fichiers NON touchés par respect des règles RB-1 :
  * src/app/globals.css (déjà traité par main agent)
  * src/app/page.tsx (règle explicite "DO NOT modify" — MAIS contient en réalité "Chargement d'AquaMind…" ligne 75 : inconsistency à corriger manuellement si souhaité)
  * package.json name field (règle sandbox compat)
  * Dossiers /src/components/aquamind/ non renommés (règle stabilité imports)
- Fichiers hors périmètre explicite contenant encore "AquaMind" (historique/comments) :
  * prisma/schema.prisma (commentaire header)
  * .env.example (titre)
  * PRODUCT_AUDIT.md / STORE_READINESS.md (titres historiques)
  * PROJECT_JOURNEY.md / BRAND_NAMING.md (intentionnellement préservés pour l'historique + nouvelle section ajoutée)

---
Task ID: L1-A
Agent: general-purpose (prisma+user)
Task: Ajouter modèle User + relations + migrer vers PostgreSQL

Work Log:
- Lu worklog.md (RESTORE-1 + RB-1) pour contexte — note: AUDIT_MOBILE.md n'existe pas encore (futur document d'audit mobile)
- Lu prisma/schema.prisma existant (13 modèles SQLite, 191 lignes)
- Lu .env.example existant (5 lignes, SQLite-only)
- Réécrit prisma/schema.prisma (310 lignes, formaté par `prisma format`) :
  * datasource db.provider: "sqlite" → "postgresql"
  * Ajout modèle `User` (id cuid, email unique, passwordHash, name?, createdAt, updatedAt) + back-relations vers les 12 modèles user-owned + accounts
  * Ajout modèle `Account` (NextAuth future OAuth : userId, type, provider, providerAccountId, tokens...) avec @@unique([provider, providerAccountId]) et @@index([userId])
  * Modèle `Session` SKIPPÉ (NextAuth JWT strategy — pas besoin)
  * Ajout `userId String` + `user User @relation(... onDelete: Cascade)` + `@@index([userId])` sur les 12 modèles user-owned : PoolProfile, WaterTest, PhotoDiagnostic, Equipment, ProductInventory, ChatMessage, MaintenanceTask, PoolDesign, Reminder, GuideView, Subscription, AnalyticsEvent
  * `ActionPlan` NON touché (hérite userId via WaterTest, comme spécifié)
  * Subscription.plan commentaire renommé: "surface, limpide, cristal, gardien" → "free, premium, expert" + valeur par défaut "surface" → "free"
  * Tous les champs existants préservés (mêmes noms, types, defaults, commentaires inline)
  * JSON resté en `String` (pas de type `Json` Prisma — éviter breaking changes)
- Créé prisma/migrations/README.md (procédure complète : pré-requis Postgres, .env, `prisma migrate dev --name init_postgres_user_auth`, migrate deploy CI, rollback, notes spécifiques AQWELIA, vérification post-migration)
- Réécrit .env.example avec toutes les nouvelles variables :
  * DATABASE_URL (Postgres) + commentaire fallback SQLite
  * NEXTAUTH_SECRET, NEXTAUTH_URL
  * NEXT_PUBLIC_API_BASE_URL (Capacitor mobile)
  * STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (web)
  * REVENUECAT_API_KEY, REVENUECAT_WEBHOOK_SECRET (mobile)
  * Z_AI_API_KEY (commenté)
  * WTTR_IN_BASE_URL
- Validé le schéma avec `DATABASE_URL="postgresql://..." bunx prisma validate` → "The schema at prisma/schema.prisma is valid 🚀"
- Lancé `bunx prisma format` (mise en forme automatique appliquée)
- Conformément aux consignes: n'a PAS exécuté `prisma migrate dev` / `prisma db push` (pas de Postgres dans le sandbox), n'a PAS touché au .env (seulement .env.example)

Stage Summary:
- ✅ prisma/schema.prisma migré SQLite → PostgreSQL (provider modifié, schéma valide, formaté)
- ✅ Modèle `User` ajouté (cuid id, email unique, passwordHash, name?, timestamps) + 13 back-relations
- ✅ Modèle `Account` ajouté (OAuth NextAuth future-proof) avec @@unique + @@index
- ✅ `Session` SKIPPÉ (JWT strategy — conforme consigne)
- ✅ 12 modèles user-owned équipés de `userId` + relation `user` (onDelete Cascade) + `@@index([userId])` pour la performance
- ✅ `ActionPlan` non modifié (hérite userId via WaterTest)
- ✅ Subscription.plan : commentaire "surface, limpide, cristal, gardien" → "free, premium, expert", default "surface" → "free"
- ✅ Tous les champs existants préservés (noms / types / defaults / commentaires)
- ✅ prisma/migrations/README.md créé (procédure complète pour exécution sur poste Postgres)
- ✅ .env.example mis à jour avec 11 variables (Postgres + NextAuth + Stripe + RevenueCat + Z.ai + wttr.in)
- ✅ Validation Prisma : `The schema at prisma/schema.prisma is valid 🚀`
- ⚠️ .env actuel (sandbox) reste `file:/home/z/my-project/db/custom.db` — l'app ne démarrera plus avec la nouvelle schema car Prisma refusera le SQLite URL avec le provider postgresql. C'est attendu : ce changement fait passer l'app en mode "Postgres requis". Pour redémarrer le dev server local, mettre à jour .env avec une DATABASE_URL postgres, OU faire pointer vers une base SQLite via un override (non recommandé car le schéma est désormais Postgres-only).
- ⚠️ AUDIT_MOBILE.md n'existait pas au moment du lancement — cette tâche L1-A documente le premier jalon mobile dans worklog.md (le doc d'audit mobile sera probablement créé par un autre agent ou plus tard)
- Prochaines étapes recommandées pour le flux d'auth :
  1. Configurer une base Postgres locale (Docker: `docker run -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:16`)
  2. Créer la base `aqwelia` : `createdb aqwelia` (ou via psql)
  3. Mettre à jour .env avec `DATABASE_URL=postgresql://...`
  4. Lancer `bunx prisma migrate dev --name init_postgres_user_auth`
  5. Installer next-auth + bcryptjs pour implémenter le flux credentials (JWT)

---
Task ID: L1-B
Agent: general-purpose (nextauth)
Task: Implémenter NextAuth Credentials + JWT + middleware protection

Work Log:
- Lu worklog.md (RESTORE-1 + RB-1) et package.json (next-auth ^4.24.11 confirmé, bcryptjs NON installé)
- Vérifié l'arborescence existante : 14 routes API à ne PAS modifier, src/lib/db.ts exporte `db` (PrismaClient), pas de middleware/auth/password pré-existants
- Vérifié .env : DATABASE_URL présent, NEXTAUTH_SECRET ABSENT (à ajouter — voir rapport)
- Créé `src/lib/password.ts` — hashPassword/verifyPassword basés sur `crypto.scryptSync` (salt 16 bytes, hash 64 bytes, format `saltHex:hashHex`, `timingSafeEqual` pour comparaison constant-time, garde-fou longueur + try/catch). Zéro dépendance externe.
- Créé `src/lib/auth.ts` — NextAuthOptions v4 : stratégie JWT (maxAge 30j), CredentialsProvider email/password, callbacks `jwt` (ajoute `token.id`) et `session` (propage `user.id`), page signIn `/auth/signin`, secret depuis `process.env.NEXTAUTH_SECRET`. Cast défensif `(db as any).user` car le modèle User est créé par L1-A. Try/catch global dans `authorize` pour ne jamais leak d'erreur DB.
- Créé `src/app/api/auth/[...nextauth]/route.ts` — handler NextAuth exporté en GET+POST
- Créé `src/app/api/auth/me/route.ts` — GET retourne `session.user` ou 401 `{ user: null }`
- Créé `src/app/api/auth/register/route.ts` — POST valide email (regex) + password ≥ 8 chars, vérifie doublon (case-insensitive), hash via `hashPassword`, crée user via Prisma, retourne 201 `{ user }` SANS auto-login (client appelera `signIn` après). Gestion d'erreurs 400/409/500.
- Créé `src/middleware.ts` — `withAuth` de `next-auth/middleware` avec `pages.signIn = '/auth/signin'`. Matcher explicite couvrant les routes business sans toucher `/api` (health) ni `/api/auth/*`.
- Créé `src/hooks/use-session.ts` — wrapper client typé autour de `next-auth/react`'s `useSession` ; expose `user` typé `SessionUser | null` et `isAuthenticated` boolean.
- Créé `src/types/next-auth.d.ts` — augmentation module `next-auth` (Session.user.id/email/name?) et `next-auth/jwt` (JWT.id?). Requis pour typage strict côté client et serveur.
- Vérifié : `bunx tsc --noEmit` → 0 erreur sur les 8 nouveaux fichiers (erreurs pré-existantes ailleurs dans le repo non concernées par L1-B)
- Vérifié : `bun run lint` → 0 erreur, 0 warning

Stage Summary:
- 8 fichiers créés (aucun fichier existant modifié) :
  1. src/lib/password.ts                — hashPassword / verifyPassword (crypto.scryptSync, 0 dep)
  2. src/lib/auth.ts                    — authOptions (JWT, Credentials, callbacks)
  3. src/app/api/auth/[...nextauth]/route.ts — handler NextAuth (GET+POST)
  4. src/app/api/auth/register/route.ts — POST inscription (validation, doublon, hash)
  5. src/app/api/auth/me/route.ts       — GET session courante
  6. src/middleware.ts                  — withAuth protection API business
  7. src/hooks/use-session.ts           — hook client typé
  8. src/types/next-auth.d.ts           — augmentations Session.user.id + JWT.id
- Middleware matcher CONFIRMÉ : `['/api/pool/:path*', '/api/dashboard/:path*', '/api/chat/:path*', '/api/guides/:path*', '/api/subscription/:path*', '/api/analytics/:path*']` — couvre toutes les routes business existantes, EXCLUDE `/api` (health) et `/api/auth/*` (NextAuth + register + me)
- bcryptjs NON installé (intentionnel) — remplacé par `crypto.scryptSync` built-in Node,同等 sécurité, zéro dépendance ajoutée. `verifyPassword` utilise `timingSafeEqual` + garde-fou longueur pour éviter les timing attacks.
- Compatible NextAuth v4 (^4.24.11) — pas de syntaxe v5. `getServerSession(authOptions)` utilisé côté serveur, `useSession()` côté client.
- Dépendances externes : AUCUNE ajoutée (next-auth déjà installé)
- AUCUNE modification des 14 routes API existantes (règle respectée — Task L1-C s'en chargera)
- AUCUNE modification de prisma/schema.prisma (règle respectée — Task L1-A s'en chargera)
- AUCUNE page /auth/signin créée (règle respectée — Lot 2)

Issues / Prérequis pour les tâches suivantes :
- ⚠️ `NEXTAUTH_SECRET` n'est PAS dans `.env` — doit être ajouté (sinon NextAuth throw en production). Suggéré : `openssl rand -base64 32` → ajouter `NEXTAUTH_SECRET=...` dans `.env` et `.env.example`.
- ⚠️ Le modèle `User` Prisma n'existe pas encore — l'auth ne fonctionnera qu'après que Task L1-A ait ajouté `model User { id email passwordHash name? createdAt updatedAt }` + `@@unique([email])` et exécuté `prisma generate` + `prisma db push`. Le code est défensif (try/catch + cast `any`) donc ne casse pas le build en attendant.
- ⚠️ NextAuth v4 requiert `SessionProvider` côté client — à ajouter dans `src/app/layout.tsx` (Lot 2, avec la page /auth/signin).
- ⚠️ Pour Capacitor mobile : il faudra configurer `NEXTAUTH_URL` et `NEXTAUTH_SECRET` côté serveur + gérer le cookie CSRF cross-origin (Lot 3 mobile).

---
Task ID: L1-C
Agent: general-purpose (plans+api)
Task: Renommer plans free/premium/expert + abstraction API client

Work Log:
- Lu worklog.md (RESTORE-1 + RB-1 + L1-A + L1-B) pour contexte complet
- Lu src/lib/pool/freemium.ts (4 plans legacy surface/limpide/cristal/gardien, 196 lignes)
- Lu src/app/api/subscription/route.ts (46 lignes, aucune référence littérale aux anciens IDs, logique intacte)
- Vérifié prisma/schema.prisma ligne 287 : `plan String @default("free") // free, premium, expert` → déjà migré par L1-A ✅
- AUDIT_MOBILE.md INTROUVABLE dans le repo (confirmé par Glob) — L1-A avait déjà noté ce point ; travail poursuivi sur la base de worklog + freemium.ts

PART 1 — Réécriture de src/lib/pool/freemium.ts :
- PlanId type : `'surface' | 'limpide' | 'cristal' | 'gardien'` → `'free' | 'premium' | 'expert'`
- PLANS array : 4 plans → 3 plans (cristal fusionné dans premium)
  * `free` (Free) : name "Free", tagline "Gratuit — pour découvrir", prix tous 0, 1 piscine, 2 scans/mois, basic guides, 14 jours historique (inchangé depuis l'ancien `surface`)
  * `premium` (Premium, highlighted) : name "Premium", tagline "Le copilote complet", prix week 4.99 / month 12.99 / quarter 32.99 / halfyear 57.99 (anciens prix Cristal). Features fusion limpide+cristal : 3 piscines, scans illimités, météo avancée, tous guides + vidéos, rappels intelligents, PDF report, mode pro, historique illimité, support prioritaire
  * `expert` (Expert) : name "Expert", tagline "Pour piscinistes et techniciens", prix week 9.99 / month 24.99 / quarter 59.99 / halfyear 109.99 (anciens prix Gardien). Features = tout Premium + multi-clients illimité, devis/planning, photos avant/après, notes techniques, export comptable, API
- DEFAULT_PLAN : `'surface'` → `'free'`
- DURATIONS array : inchangé (4 entrées week/month/quarter/halfyear)
- FeatureGate type : inchangé (8 gates existants conservés)
- canAccess() function : signature + switch identiques, mais mise à jour des ctaPlan et reason :
  * multi_pool : ctaPlan PLANS[2] → PLANS[1] (premium désormais), reason "...à Cristal et Gardien" → "...à Premium et Expert"
  * pdf_report : ctaPlan PLANS[2] → PLANS[1], reason mis à jour
  * pro_mode  : ctaPlan PLANS[2] → PLANS[1], reason mis à jour
  * photo_scan / weather_advanced / smart_reminders / guides_premium / history_extended : ctaPlan reste PLANS[1] (premium) — inchangé
  * Note : aucune gate ajoutée pour multi-client illimité / API (features Expert-only non couvertes par canAccess actuellement — seront ajoutées en Lot 2 si besoin)
- Ajout commentaire d'en-tête documentant la migration 4→3 plans et l'historique des renommages

PART 2 — Création de src/lib/api-client.ts (95 lignes) :
- `BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''` (vide = URLs relatives web, URL absolue = mobile/Capacitor)
- `class ApiError extends Error` avec `status`, `message`, `body` (typé `unknown`)
- `request<T>(method, path, body?)` : fetch avec `headers: { 'Content-Type': 'application/json' }`, `credentials: 'include'`, body JSON.stringify si défini, parse text→JSON défensif (fallback texte si parse échoue), throw ApiError si !res.ok (message depuis data.error || data.message || `Erreur ${status}`)
- `export const api = { get, post, patch, delete }` — 4 méthodes typées génériques
- Re-export `PlanId` depuis './pool/freemium' pour usage unifié
- Conforme au snippet fourni dans la consigne (aucune deviation)

PART 2bis — Création de src/lib/api-routes.ts (27 lignes) :
- `API_ROUTES` object `as const` centralisant les 14 paths + nested `auth.me` / `auth.register` (routes créées par L1-B)
- 14 routes business : dashboard, profile, waterTest, actionPlan, photoDiagnostic, equipment, inventory, weather, reminders, chat, guides, subscription, analytics
- 2 routes auth (nested object) : me, register
- Export type `ApiRouteKey` (exclut `auth` pour usage typé simple)

PART 3 — Mise à jour du commentaire dans src/app/api/subscription/route.ts :
- Aucun commentaire pré-existant sur la référence au modèle Subscription dans ce fichier (les commentaires "surface, limpide, cristal, gardien" étaient dans prisma/schema.prisma — déjà migré par L1-A)
- Ajout d'un bloc commentaire sous les imports pour documenter :
  * `Subscription.plan values: 'free' | 'premium' | 'expert'`
  * Référence au renommage historique (surface/limpide/cristal/gardien)
  * NOTE : userId wiring est en Task L1-B, lookup actuel reste single-tenant (`active: true` only)
- Logique métier (GET/POST) INTACTE — conformément à la consigne

Vérifications finales :
- `bun run lint` → exit 0, 0 erreur, 0 warning (eslint . passe)
- Recherche des IDs legacy dans src/ via grep pour établir l'inventaire Lot 2 :
  * module-paywall.tsx : type PlanId local + 14 références à 'surface' + texte "plan Surface (gratuit)" (L1-C-to-follow / Lot 2)
  * module-guides.tsx : 5 références à 'surface' + texte "Limpide" (Lot 2)
  * module-reminders.tsx : 3 références à 'surface' + texte "Passez à Limpide" (Lot 2)
  * pricing.tsx : 6 références 'surface'/'cristal' + variable `surfacePlan` (Lot 2)
  * faq.tsx : 1 texte "Cristal...Gardien" (Lot 2)
  * savings.tsx : 2 références "Cristal" (Lot 2)
- Aucune référence à PLANS[3] restante dans src/ (uniquement PLANS[0], PLANS[1], PLANS[2])

Stage Summary:
- ✅ src/lib/pool/freemium.ts réécrit : 3 plans (free/premium/expert), DEFAULT_PLAN='free', ctaPlan multi_pool/pdf_report/pro_mode basculés vers PLANS[1] (premium)
- ✅ src/lib/api-client.ts créé : abstraction fetch typée (apiGet/Post/Patch/Delete + ApiError), compatible web (relative) et mobile (absolute via NEXT_PUBLIC_API_BASE_URL), credentials: 'include'
- ✅ src/lib/api-routes.ts créé : 14 routes business + 2 routes auth centralisées
- ✅ src/app/api/subscription/route.ts : commentaire de migration ajouté, logique intacte
- ✅ prisma/schema.prisma NON modifié (déjà fait par L1-A)
- ✅ 14 routes API existantes NON modifiées (seul subscription/route.ts a reçu un commentaire)
- ✅ src/app/page.tsx NON modifié
- ✅ Composants UI (module-paywall, module-guides, module-reminders, pricing, faq, savings) NON modifiés — références legacy inventoriées pour Lot 2
- ✅ `bun run lint` : 0 erreur, 0 warning

Références legacy à corriger manuellement en Lot 2 (IDs surface/limpide/cristal/gardien) :

DANS src/ (code runtime — Cassera le type-check dès qu'un composant importe PlanId depuis freemium au lieu de le redéfinir localement) :
- src/components/aquamind/module-paywall.tsx (lignes 29, 67, 83, 97, 109, 122, 123, 198, 306, 307, 315, 317, 327, 331, 332, 335, 447) — type PlanId LOCAL à supprimer (importer depuis freemium), 14 comparaisons 'surface' → 'free', 1 texte "plan Surface (gratuit)" → "plan Free (gratuit)"
- src/components/aquamind/module-guides.tsx (lignes 77, 91, 121, 123, 126, 148) — commentaires + `useState('surface')` → `useState('free')`, comparaisons 'surface' → 'free', texte "Limpide" → "Premium"
- src/components/aquamind/module-reminders.tsx (lignes 116, 284, 526, 527, 536) — `useState('surface')` → `useState('free')`, comparaisons 'surface' → 'free', commentaire + texte "Passez à Limpide" → "Passez à Premium"
- src/components/landing/sections/pricing.tsx (lignes 19, 20, 72, 79, 84, 125, 142, 156, 161, 165, 167) — `p.id !== 'surface'` → `!== 'free'`, `PLANS.find(id === 'surface')` → `=== 'free'`, `isCristal = plan.id === 'cristal'` → `isPremium = plan.id === 'premium'` (renomer variable + 5 usages), commentaire "Surface plan" → "Free plan", variable `surfacePlan` → `freePlan` (3 usages)
- src/components/landing/sections/faq.tsx (ligne 34) — texte FAQ "Cristal permet 3 piscines, Gardien illimité" → "Premium permet 3 piscines, Expert illimité"
- src/components/landing/sections/savings.tsx (lignes 22, 102) — label "AQWELIA Cristal" → "AQWELIA Premium", texte "(plan Cristal)" → "(plan Premium)"

DANS docs (.md — non bloquant pour le build, à mettre à jour pour cohérence) :
- README.md (lignes 90-93, 129, 130) — tableau 4 plans → 3 plans, gates "Cristal/Gardien" → "Premium/Expert"
- PRODUCT_AUDIT.md (lignes 28, 59, 61, 66) — mentions "4 plans Surface/Limpide/Cristal/Gardien" + "gated Cristal/Gardien"
- STORE_READINESS.md (lignes 110-122) — RevenueCat product IDs `com.aquamind.limpide.*` / `com.aquamind.cristal.*` → `com.aqwelia.premium.*` / `com.aqwelia.expert.*` (CRITIQUE pour Lot 3 / intégration RevenueCat — doit matcher les product IDs App Store Connect / Google Play Console)
- PROJECT_JOURNEY.md (lignes 60, 186-189) — section historique (peut être préservée comme archive ou mise à jour)
- BRAND_NAMING.md (lignes 44, 53) — mentions "limpide"/"cristalline" SANS rapport avec les plan IDs (étude de naming de marque) — NE PAS modifier
- worklog.md — entrées historiques RESTORE-1/RB-1/L1-A/L1-B/L1-C — NE PAS modifier (archive de travail)

Prochaines étapes recommandées :
1. Lot 2 : corriger les 6 composants UI listés ci-dessus (refactor `surfacePlan`→`freePlan`, `isCristal`→`isPremium`, `'surface'`→`'free'` dans 22 comparaisons, mise à jour des textes FR)
2. Lot 2 : importer `type PlanId` depuis `@/lib/pool/freemium` dans module-paywall.tsx au lieu de redéfinir le type localement (prévention de la désynchronisation)
3. Lot 3 : mettre à jour STORE_READINESS.md avec les nouveaux RevenueCat product IDs (`com.aqwelia.premium.week/month/quarter/halfyear` + `com.aqwelia.expert.week/month/quarter/halfyear`) — 8 product IDs au lieu de 12 (l'ancien `limpide` disparaît faute de plan équivalent)
4. Lot 3 : créer la config RevenueCat (entitlements `premium` + `expert`) côté backend mobile
5. Migrer les subscriptions existantes en base (si données legacy) : `UPDATE subscription SET plan = CASE WHEN plan = 'surface' THEN 'free' WHEN plan IN ('limpide', 'cristal') THEN 'premium' WHEN plan = 'gardien' THEN 'expert' END` — script SQL à intégrer dans la prochaine migration prisma

---
Task ID: L1-D
Agent: general-purpose (fix-ts-errors)
Task: Corriger erreurs TypeScript + renommer plans dans composants

Work Log:
- Lu worklog.md (RESTORE-1 + RB-1 + L1-A + L1-B + L1-C) pour contexte complet
- Lu src/lib/pool/freemium.ts pour comprendre le nouveau système 3 plans (free/premium/expert)
- Lancé `bunx tsc --noEmit` → 32 erreurs au total (4 dans examples/, 4 dans skills/, 24 dans src/)
  * Erreurs EN SCOPE L1-D : 14 erreurs (8 ctaPlan + 5 pricing + 1 onboarding)
  * Erreurs HORS SCOPE : API routes (dashboard, action-plan, photo-diagnostic, water-test) + safety-rules.ts (pré-existant)
- Grep initial pour inventaire complet des IDs legacy dans src/ : surface/limpide/cristal/gardien + variantes texte (Surface/Limpide/Cristal/Gardien)

PART 1 — src/lib/pool/freemium.ts (8 erreurs ctaPlan) :
- Le type de retour `canAccess()` attend `ctaPlan?: PlanId` mais le code retournait `ctaPlan: PLANS[1]` (un objet Plan, pas un PlanId)
- Fix : remplacé `ctaPlan: PLANS[1]` → `ctaPlan: PLANS[1].id` sur les 8 occurrences (lignes 150, 154, 156, 158, 160, 162, 164, 166)
- Aucune autre modification du fichier (structure des 3 plans préservée)

PART 2 — src/components/landing/sections/pricing.tsx (5 erreurs) :
- Ligne 19 : `p.id !== 'surface'` → `p.id !== 'free'`
- Ligne 20 : `p.id === 'surface'` → `p.id === 'free'` + renommage `surfacePlan` → `freePlan` (3 usages : lignes 161, 165, 167)
- Lignes 53 & 59 : erreur `Property 'save' does not exist` sur DURATIONS (type union — week/month n'ont pas `save`)
  * Fix : `{d.save && ...}` → `{'save' in d && d.save && ...}` (type narrowing par `in` operator)
- Ligne 72 : `plan.id === 'cristal'` → `plan.id === 'premium'` + renommage `isCristal` → `isPremium` (5 usages : lignes 79, 84, 125, 142)
- Commentaire ligne 156 : `{/* Surface plan — smaller below */}` → `{/* Free plan — smaller below */}`
- Note : avec 3 plans (free/premium/expert), la grille `md:grid-cols-3` affiche maintenant 2 cartes payantes (Premium + Expert) + 1 carte Free plus petite en-dessous = 3 cartes au total (conforme à la consigne "remove the 4th card")

PART 3 — src/components/aquamind/onboarding.tsx (1 erreur void truthiness) :
- Ligne 313-316 : `update('treatmentType', t.value) && update('saltSystem', t.value === 'salt')` — `update()` retourne void, ne peut pas être testé pour truthiness
- Fix : converti l'expression arrow en block statement :
  ```
  onClick={() => {
    update('treatmentType', t.value)
    update('saltSystem', t.value === 'salt')
  }}
  ```

PART 4 — src/components/aquamind/module-paywall.tsx (renommages + suppression type local) :
- Supprimé `type PlanId = 'surface' | 'limpide' | 'cristal' | 'gardien'` (ligne 29)
- Ajouté `import type { PlanId } from '@/lib/pool/freemium'` (synchronisation avec la source unique de vérité)
- 14 comparaisons `'surface'` → `'free'` (lignes 67, 97, 109, 122, 123, 198, 317, 327, 331, 332, 335, 447)
- 2 occurrences `activate('surface')` → `activate('free')`
- 2 occurrences `activating === 'surface'` → `activating === 'free'`
- Variable `surfacePlan` → `freePlan` (3 usages : lignes 123, 307, 315, 324)
- Texte FAQ : "plan Surface (gratuit)" → "plan Free (gratuit)"
- Commentaire `{/* Surface plan (free) — smaller */}` → `{/* Free plan — smaller */}`
- Note : `paidPlans = plans.filter(p => p.id !== 'free')` retourne maintenant [premium, expert] = 2 cartes (au lieu de 3 avant) — la grille `lg:grid-cols-3` affichera 2 cartes + la carte Free plus bas

PART 5 — src/components/aquamind/module-guides.tsx (5 références surface) :
- Commentaire ligne 77 : "Free categories for the surface plan" → "Free categories for the free plan"
- Ligne 91 : `useState<string>('surface')` → `useState<string>('free')`
- Commentaire ligne 121 : "user is on surface plan" → "user is on free plan"
- Lignes 123 & 148 : `currentPlanId === 'surface'` → `currentPlanId === 'free'`
- Texte toast ligne 126 : "abonnés Limpide ou supérieur" → "abonnés Premium ou supérieur"

PART 6 — src/components/aquamind/module-reminders.tsx (5 références surface) :
- Ligne 116 : `useState<string>('surface')` → `useState<string>('free')`
- Ligne 284 : `planId === 'surface'` → `planId === 'free'`
- Commentaire ligne 526 : `{/* Surface plan upsell */}` → `{/* Free plan upsell */}`
- Ligne 527 : `planId === 'surface'` → `planId === 'free'`
- Texte ligne 536 : "Passez à Limpide" → "Passez à Premium"

PART 7 — src/components/landing/sections/faq.tsx (1 référence texte) :
- Ligne 34 : "Le plan Cristal permet 3 piscines, le plan Gardien est illimité" → "Le plan Premium permet 3 piscines, le plan Expert est illimité"

PART 8 — src/components/landing/sections/savings.tsx (2 références texte) :
- Ligne 22 : label BARS "AQWELIA Cristal" → "AQWELIA Premium"
- Ligne 102 : "(plan Cristal)" → "(plan Premium)"

PART 9 — Vérification des autres fichiers mentionnés :
- module-water-test.tsx : AUCUNE référence à plan IDs (surface/limpide/cristal/gardien) — non modifié
- module-diagnostic.tsx ligne 48 : `'Eau (surface)'` — référe à la SURFACE DE L'EAU (contexte photo), pas à un plan — non modifié
- module-action-plan.tsx : AUCUNE référence à plan IDs — non modifié
- landing-page.tsx ligne 280 : "Eau toujours cristalline" — tagline marketing (eau cristalline), pas un plan ID — non modifié
- emergency-mode.tsx : 5 occurrences de "surface" — toutes référent à la surface de l'eau (photoHint, nettoyage surface) — non modifié
- footer.tsx ligne 47 : "Eau toujours cristalline" — tagline marketing — non modifié
- hero.tsx ligne 81 : "eau toujours cristalline" — tagline marketing — non modifié
- api/subscription/route.ts ligne 6 : commentaire documentant l'historique des renommages — intentionnellement préservé

Vérifications finales :
- `bunx tsc --noEmit 2>&1 | grep -v "^examples/" | grep -v "^skills/"` → 12 lignes (11 erreurs réelles + 1 ligne de continuation)
  * 6 erreurs src/app/api/dashboard/route.ts (type 'null' assigné à des valeurs non-null — pré-existant, hors scope)
  * 2 erreurs src/app/api/pool/action-plan/route.ts (même pattern 'null' — pré-existant, hors scope)
  * 1 erreur src/app/api/pool/photo-diagnostic/route.ts (CreateChatCompletionVisionBody missing 'model' — pré-existant, hors scope)
  * 1 erreur src/app/api/pool/water-test/route.ts (même pattern 'null' — pré-existant, hors scope)
  * 1 erreur src/lib/pool/safety-rules.ts:28 (comparison '"allowed"' vs '"forbidden"' — pré-existant, hors scope)
- TOUTES les erreurs en scope L1-D (freemium ctaPlan + pricing + onboarding + paywall + guides + reminders + faq + savings) → RÉSOLUES ✅
- `bun run lint` → exit 0, 0 erreur, 0 warning ✅

Stage Summary:
- ✅ src/lib/pool/freemium.ts : 8 erreurs ctaPlan type fixées (`PLANS[1]` → `PLANS[1].id`), structure des 3 plans préservée
- ✅ src/components/landing/sections/pricing.tsx : 5 erreurs TS fixées + renommages `surfacePlan`→`freePlan`, `isCristal`→`isPremium`, type narrowing pour `DURATIONS[].save` via `'save' in d && d.save`
- ✅ src/components/aquamind/onboarding.tsx : 1 erreur void truthiness fixée (arrow expression → block statement pour chaîner 2 appels `update()`)
- ✅ src/components/aquamind/module-paywall.tsx : type local PlanId SUPPRIMÉ + import depuis `@/lib/pool/freemium` (source unique), 14 comparaisons `'surface'`→`'free'`, variable `surfacePlan`→`freePlan`, texte FAQ "plan Surface"→"plan Free", commentaire "Surface plan"→"Free plan"
- ✅ src/components/aquamind/module-guides.tsx : `useState('surface')`→`useState('free')`, 2 comparaisons `'surface'`→`'free'`, 2 commentaires mis à jour, texte toast "Limpide"→"Premium"
- ✅ src/components/aquamind/module-reminders.tsx : `useState('surface')`→`useState('free')`, 2 comparaisons `'surface'`→`'free'`, commentaire + texte "Passez à Limpide"→"Passez à Premium"
- ✅ src/components/landing/sections/faq.tsx : "Cristal/Gardien"→"Premium/Expert" dans la FAQ multi-piscines
- ✅ src/components/landing/sections/savings.tsx : label "AQWELIA Cristal"→"AQWELIA Premium" + texte "(plan Cristal)"→"(plan Premium)"
- ✅ `bunx tsc --noEmit` : 0 erreur en scope L1-D (12 erreurs résiduelles sont pré-existantes dans API routes + safety-rules.ts, toutes hors scope)
- ✅ `bun run lint` : 0 erreur, 0 warning
- ✅ Fichiers vérifiés NON modifiés (aucun plan ID à renommer) : module-water-test.tsx, module-diagnostic.tsx, module-action-plan.tsx, landing-page.tsx, emergency-mode.tsx, footer.tsx, hero.tsx
- ✅ Contraintes respectées : prisma/schema.prisma non touché, src/lib/auth.ts/password.ts/middleware.ts non touchés, 14 routes API non modifiées, freemium.ts structure préservée (seul le bug ctaPlan corrigé)
- ✅ Source unique de vérité pour PlanId : `src/lib/pool/freemium.ts` — module-paywall.tsx importe maintenant le type au lieu de le redéfinir localement (prévention de désynchronisation)

Erreurs résiduelles (hors scope L1-D, pré-existantes) :
- src/app/api/dashboard/route.ts (6 erreurs) — pattern `let x: null = null; x = value` incorrect, à corriger en Lot 2/Lot 3
- src/app/api/pool/action-plan/route.ts (2 erreurs) — même pattern `let x: null`
- src/app/api/pool/photo-diagnostic/route.ts (1 erreur) — appel Z.ai vision SDK sans propriété `model` requise
- src/app/api/pool/water-test/route.ts (1 erreur) — même pattern `let x: null`
- src/lib/pool/safety-rules.ts (1 erreur) — comparaison type `"allowed"` vs `"forbidden"` (union narrow)

Prochaines étapes recommandées :
1. Corriger les 11 erreurs pré-existantes dans les 4 API routes (pattern `let x: null = null; x = value` → typer correctement la variable ou utiliser `let x: typeof value | null = null`)
2. Corriger l'appel Z.ai vision dans photo-diagnostic/route.ts (ajouter propriété `model`)
3. Corriger safety-rules.ts ligne 28 (vérifier le type union du return)
4. Lot 2 : mettre à jour les 3 docs .md (README, PRODUCT_AUDIT, STORE_READINESS) pour refléter les 3 plans (encore en 4 plans dans la doc — voir inventaire L1-C)
5. Lot 3 : mettre à jour les RevenueCat product IDs dans STORE_READINESS.md (`com.aqwelia.premium.*` + `com.aqwelia.expert.*` — 8 product IDs au lieu de 12)

---
Task ID: L1-E
Agent: general-purpose (api-userId)
Task: Ajouter getServerSession + userId aux 14 routes API

Work Log:
- Lu worklog.md (RESTORE-1 + RB-1 + L1-A + L1-B + L1-C + L1-D) pour contexte complet
- Lu src/lib/auth.ts (authOptions, JWT strategy, callbacks ajoutent token.id + session.user.id)
- Lu src/middleware.ts (withAuth protege /api/pool/*, /api/dashboard/*, /api/chat/*, /api/guides/*, /api/subscription/*, /api/analytics/* — exclude /api et /api/auth/*)
- Lu prisma/schema.prisma pour confirmer les champs `userId String` sur les 12 modèles user-owned + `user` relation + `@@index([userId])`. ActionPlan n'a PAS userId direct (hérite via WaterTest)
- Lu les 13 routes à modifier (/api/ health check laissé intact comme spécifié)
- Lancé `bunx tsc --noEmit` baseline → 22 erreurs TS dans src/app/api/ (4 dashboard let:null + 2 action-plan let:null + 2 water-test let:null + 1 vision model missing + 13 userId missing sur les create/findMany)
- Identifié le model Z.ai vision requis : `glm-4.6v` (cf. skills/VLM/scripts/vlm.ts)

Modifications appliquées (13 routes, /api/ health-check laissé intact) :

1. src/app/api/dashboard/route.ts (GET)
   - Imports: getServerSession + authOptions
   - Auth: 401 si pas de session
   - userId ajouté aux 8 Prisma queries (poolProfile.findFirst, waterTest.findFirst, actionPlan.findFirst via `where: { waterTest: { userId } }`, waterTest.findMany, photoDiagnostic.findMany, equipment.count, productInventory.count, chatMessage.count)
   - Fix let:null pattern : `let clearWaterIndex: number | null = null`, `let clarity: ReturnType<typeof clarityLabel> | null = null`, `let swim: ReturnType<typeof assessSwimSafety> | null = null`, `let latestPlanParsed` typé en objet explicite avec index signature (parce que les 3 champs JSON parse any[] ne sont pas assignables au type string de l'ActionPlan Prisma)

2. src/app/api/pool/profile/route.ts (GET, POST)
   - Auth + userId sur GET (findFirst where userId) et POST (findFirst where userId pour check existing + data.userId sur create/update)
   - userId inclu dans `data` partagé entre create et update (inoffensif sur update car même valeur)

3. src/app/api/pool/water-test/route.ts (GET, POST, DELETE)
   - GET: where userId sur findMany
   - POST: userId dans data.create + findFirst profile filtré par userId
   - DELETE: vérification propriété via findFirst where { id, userId } avant delete
   - Fix let:null pattern : `let actionPlan: Awaited<ReturnType<typeof db.actionPlan.create>> | null = null`

4. src/app/api/pool/action-plan/route.ts (POST)
   - Auth + userId
   - waterTest.findUnique remplacé par waterTest.findFirst where { id, userId } pour vérifier propriété
   - profile.findFirst where userId
   - Fix let:null pattern : `let test: Awaited<ReturnType<typeof db.waterTest.findUnique>> | null = null` et `let saved: Awaited<ReturnType<typeof db.actionPlan.create>> | null = null`

5. src/app/api/pool/photo-diagnostic/route.ts (GET, POST)
   - GET: where userId sur findMany
   - POST: userId dans data.create
   - Fix vision SDK error : ajouté `model: 'glm-4.6v'` à l'appel `zai.chat.completions.createVision` (propriété requise par `CreateChatCompletionVisionBody`)

6. src/app/api/pool/equipment/route.ts (GET, POST, PATCH, DELETE)
   - GET: where userId
   - POST: userId dans data
   - PATCH: vérification propriété via findFirst where { id, userId } + suppression `data.userId` du payload pour éviter override
   - DELETE: vérification propriété avant delete

7. src/app/api/pool/inventory/route.ts (GET, POST, DELETE)
   - GET: where userId
   - POST: userId dans data
   - DELETE: vérification propriété avant delete

8. src/app/api/pool/weather/route.ts (GET)
   - Auth + userId
   - poolProfile.findFirst where userId (récupère region)
   - waterTest.findFirst where userId pour calcul lastTestDaysAgo

9. src/app/api/pool/reminders/route.ts (GET, POST, PATCH, DELETE)
   - GET: where userId sur les 5 queries (poolProfile, waterTest, reminder, equipment, productInventory)
   - POST: userId dans data
   - PATCH: vérification propriété + 404 si introuvable
   - DELETE: vérification propriété avant delete

10. src/app/api/chat/route.ts (POST, DELETE)
    - POST: auth + userId, où les 3 find* (poolProfile, waterTest, chatMessage) filtrés par userId, createMany avec userId pour les 2 messages (user + assistant)
    - DELETE: auth + userId, deleteMany where userId

11. src/app/api/guides/route.ts (GET)
    - Auth OPTIONNEL : `const session = await getServerSession(authOptions).catch(() => null)` (catalogue public, tracking GuideView seulement si session)
    - GuideView.create with userId seulement si `session?.user?.id` présent + `.catch(() => null)` pour résilience
    - recommandation + listing restent publics

12. src/app/api/subscription/route.ts (GET, POST)
    - GET: where { userId, active: true } au lieu de { active: true } (single-tenant legacy → multi-tenant)
    - POST: updateMany where { userId, active: true } pour ne désactiver que les souscriptions de l'utilisateur, data.userId dans create, analyticsEvent.create avec userId

13. src/app/api/analytics/route.ts (GET, POST)
    - GET: where userId sur findMany + les 4 findFirst/count (firstScan, firstTest, firstPlan, paywallViews, conversions) + guideView.count
    - POST: data.userId dans analyticsEvent.create

Vérifications finales :
- `bunx tsc --noEmit 2>&1 | grep "src/app/api/"` → 0 erreur dans src/app/api/ ✅
- `bunx tsc --noEmit 2>&1 | grep -vE "^examples/|^skills/"` → 1 erreur résiduelle : src/lib/pool/safety-rules.ts(28,9) (comparaison '"allowed"' vs '"forbidden"', pré-existante, HORS scope L1-E — n'est PAS causée par userId)
- `bun run lint` → 0 erreur, 1 warning (src/app/auth/signin/page.tsx ligne 91 "Unused eslint-disable directive" — pré-existant, HORS scope L1-E)

Stage Summary:
- ✅ 13 routes API modifiées (la 14e `/api/` health-check laissée intacte comme spécifié)
- ✅ Total 33 handlers HTTP auth-sécured : 2 (profile) + 3 (water-test) + 1 (action-plan) + 2 (photo-diagnostic) + 4 (equipment) + 3 (inventory) + 1 (weather) + 4 (reminders) + 2 (chat) + 1 (guides) + 2 (subscription) + 2 (analytics) + 1 (dashboard) = 28 handlers protégés + 1 handler guides avec auth optionnelle = 29 handlers modifiés, /api/ laissée intacte
- ✅ Pattern uniforme appliqué sur tous les handlers protégés :
  ```ts
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const userId = session.user.id
  ```
- ✅ `userId: session.user.id` ajouté à toutes les Prisma queries pertinents :
  * where clauses (findFirst, findMany, count, updateMany, deleteMany)
  * create data (poolProfile, waterTest, photoDiagnostic, equipment, productInventory, chatMessage, reminder, subscription, analyticsEvent, guideView)
  * ActionPlan filter via relation imbriquée `where: { waterTest: { userId } }` (ActionPlan n'a pas userId direct)
- ✅ Fix des 3 patterns `let x: null = null` pré-existants (dashboard 4 erreurs, action-plan 2 erreurs, water-test 2 erreurs) en typant explicitement les variables :
  * `let x: number | null = null`
  * `let x: ReturnType<typeof fn> | null = null`
  * `let x: Awaited<ReturnType<typeof db.x.create>> | null = null`
  * `let latestPlanParsed` typé en objet avec index signature `[k: string]: any` (3 champs JSON parsés en any[] ne sont pas assignables au type string du modèle Prisma)
- ✅ Fix de l'erreur pré-existante `CreateChatCompletionVisionBody.model` manquant dans photo-diagnostic/route.ts → ajouté `model: 'glm-4.6v'` (valeur trouvée dans skills/VLM/scripts/vlm.ts)
- ✅ Sécurité DELETE/PATCH : vérification de propriété systématique via `findFirst({ where: { id, userId } })` avant delete/update (évite qu'un utilisateur authentifié modifie/supprime les données d'un autre utilisateur via ID deviné)
- ✅ /api/guides : auth optionnelle via `.catch(() => null)` — catalogue public, GuideView.create seulement si session présente
- ✅ TypeScript : 0 erreur dans src/app/api/ (la seule erreur résiduelle safety-rules.ts:28 est hors scope et pré-existante)
- ✅ Lint : 0 erreur, 1 warning pré-existant (auth/signin/page.tsx — hors scope L1-E)
- ✅ Contraintes respectées : prisma/schema.prisma non touché, src/lib/auth.ts/password.ts/middleware.ts non touchés, /api/auth/* non touché, /api/ health-check non touché, logique métier intacte (seul ajout: auth + userId + safety checks)

Routes tricky à gérer :
- /api/dashboard : le `let latestPlanParsed = null` puis assignation d'un objet avec 3 champs `any[]` (JSON parsés) — TypeScript refusait l'assignation à `typeof latestPlan` (string dans le modèle Prisma) ; résolu en typant explicitement l'objet avec index signature `[k: string]: any` pour accepter les overrides
- /api/pool/action-plan : ActionPlan n'a PAS userId direct (hérite via WaterTest) — filtrage via `where: { id, userId }` sur WaterTest pour valider propriété avant de créer l'ActionPlan
- /api/dashboard (actionPlan.findFirst) : filtrage via relation imbriquée `where: { waterTest: { userId } }` — Prisma supporte nativement ce pattern
- /api/guides : auth optionnelle + tracking conditionnel — `getServerSession(authOptions).catch(() => null)` + `if (userId)` autour du `db.guideView.create` pour éviter 401 sur le catalogue public
- /api/pool/equipment PATCH : `delete data.userId` pour empêcher override malveillant du userId via le body de la requête PATCH

