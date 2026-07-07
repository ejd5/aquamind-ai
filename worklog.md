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


---
Task ID: L2-A
Agent: general-purpose (mobile-shell)
Task: Créer MobileAppShell + bottom tabs + 5 écrans mobile

Work Log:
- Lu `worklog.md` (RESTORE-1, L1-A→L1-E) : projet restauré, auth JWT, Prisma multi-tenant, 12 routes API sécurisées
- Lu `src/lib/platform.ts` : détection Capacitor (iOS/Android/web), `isMobile()`, `isNative()` — déjà prête pour le routing mobile/desktop côté `page.tsx` (main agent)
- Lu `src/components/aquamind/app-shell.tsx` : desktop shell 11 tabs, types `TabId` et `PoolProfileLite` exportés, pattern `useEffect` fetch profile + `Onboarding` fallback
- Lu `src/components/aquamind/module-dashboard.tsx` (829 lignes) : props `{ onNavigate, onOpenEmergency, onAskAssistant }` — je peux réutiliser tel quel
- Lu `src/components/aquamind/header.tsx` : pour aligner le style du mobile header (logo, aqua-text-gradient, glass-pill, gold divider)
- Lu `src/app/globals.css` (340 lignes) : design system Oceanic Luxury complet (tokens gold/ocean/pearl, glass-card, glass-pill, gold-divider, aqua-text-gradient, custom-scroll). Aucune utilitaire safe-area n'existait — j'en ai ajouté 6
- Vérifié que tous les modules aquamind ont des props compatibles avec mon wrapping (ModuleDiagnostic, ModuleHealthLog, ModuleMaintenance, ModulePaywall = pas de props ; ModuleWaterTest, ModuleActionPlan, ModuleWeather, ModuleReminders, ModuleGuides = `{ onNavigate }` ; ModuleAssistant = `{ presetQuestion, onConsumePreset }` ; ModuleDashboard = `{ onNavigate, onOpenEmergency, onAskAssistant }`)

Architecture decisions:
- **Contrôle** : les sous-onglets Analyses/Maintenance sont contrôlés par le shell (state `analysesSubTab`/`maintenanceSubTab` dans `MobileAppShell`), pas internes aux screens. Cela permet (a) aux deep links depuis le dashboard de commuter le sous-onglet, (b) de préserver le dernier choix de l'utilisateur quand il change d'onglet bottom tab et revient
- **Mapping desktop→mobile** : les modules existants émettent `onNavigate(tab: TabId)` avec les 11 TabId desktop. J'ai créé `mapDesktopTabToMobile()` dans `types.ts` qui convertit vers `{ screen, analysesSubTab?, maintenanceSubTab? }` — c'est le pont entre les 2 modèles de navigation. Exemples : `'water'→{analyses, mesures}`, `'weather'→{maintenance, meteo}`, `'paywall'→{profile}`, `'guides'→{home}` (fallback, pas de tab guides sur mobile)
- **Side-channel preset question** : le dashboard appelle `onAskAssistant(q)` qui stocke la question dans l'état du shell et commute vers l'écran assistant. Le `<ModuleAssistant presetQuestion={presetQuestion} onConsumePreset={...} />` consomme la question via son prop existant
- **Réutilisation modules** : aucun module aquamind n'a été réécrit — les 5 screens sont des wrappers minces (padding + titre + sub-tabs) qui importent les modules existants via `../../aquamind/module-*`
- **Safe areas** : utilities CSS ajoutées (`safe-area-top/bottom/left/right/all`, `.mobile-bottom-tabs`, `.mobile-header`, `.mobile-scroll`) + `@media (hover: none)` pour désactiver les hover effects sur touch devices + `-webkit-tap-highlight-color: transparent` + `-webkit-text-size-adjust: 100%`
- **Pas de hover** sur les boutons mobile : utilisent `active:opacity-70` pour le feedback tactile, `transition-colors` (pas de `transition-all` ni scale)

Files created (7 nouveaux fichiers + 1 modifié):
1. `src/components/mobile/types.ts` — types `MobileScreen`, `AnalysesSubTab`, `MaintenanceSubTab`, `MobileNavigation`, re-export `TabId`/`PoolProfileLite`, fonction `mapDesktopTabToMobile()`
2. `src/components/mobile/mobile-header.tsx` — header compact h-14 + safe-area-top, logo 32×32 + "AQWELIA" (aqua-text-gradient) + badge "Pro" (gold) + Sparkles icon, à droite glass-pill avec nom + volume de la piscine (ou "Non configuré"), bouton gauche = retour landing, gold divider en bas
3. `src/components/mobile/bottom-tabs.tsx` — 5 onglets fixes (Accueil/Analyses/Assistant/Entretien/Profil), `position: fixed` via `.mobile-bottom-tabs`, `padding-bottom: env(safe-area-inset-bottom)`, `min-h-[56px]` par bouton, icônes 20px (`strokeWidth` 2.4 actif / 1.8 inactif, `fill="currentColor" fillOpacity={0.18}` actif), labels 10px, `text-gold` actif / `text-muted-foreground` inactif, `bg-background/95 backdrop-blur-lg`, `border-t border-border/40`
4. `src/components/mobile/screens/home-screen.tsx` — wrapper `<ModuleDashboard />` dans `px-4 pb-24 pt-4`, titre "Aujourd'hui" avec icône Sun gold, transmet `onNavigate`/`onOpenEmergency`/`onAskAssistant` au module
5. `src/components/mobile/screens/analyses-screen.tsx` — 3 sous-onglets pill-style (Mesures/Photo/Carnet), scrollable horizontalement, active = `border-gold/60 bg-gold/10 text-gold`. Render conditionnel de `<ModuleWaterTest />` / `<ModuleDiagnostic />` / `<ModuleHealthLog />`. Sous-onglet contrôlé par le shell via `subTab`/`onSubTabChange`
6. `src/components/mobile/screens/assistant-screen.tsx` — `<ModuleAssistant />` pleine hauteur, `pb-24` pour clear les bottom tabs, transmet `presetQuestion`/`onConsumePreset`
7. `src/components/mobile/screens/maintenance-screen.tsx` — 3 sous-onglets (Actions/Rappels/Météo), même style pill que AnalysesScreen. Render `<ModuleMaintenance />` / `<ModuleReminders onNavigate />` / `<ModuleWeather onNavigate />`
8. `src/components/mobile/screens/profile-screen.tsx` — carte récap piscine (glass-card), section Abonnement avec `<ModulePaywall />`, section Paramètres avec 4 lignes (Notifications/Confidentialité/Aide/Landing) — placeholder "Bientôt disponible" pour les pages futures. Footer "v1.0.0-mobile"
9. `src/components/mobile/mobile-app-shell.tsx` — orchestrateur : state `profile` (load on mount + Onboarding fallback comme desktop), `activeScreen`, `analysesSubTab`, `maintenanceSubTab`, `emergencyOpen`, `presetQuestion`. Handlers : `handleScreenChange` (bottom tabs), `handleModuleNavigate` (mapping desktop TabId → mobile intent), `handleAskAssistant` (preset + switch), `handleConsumePreset`. Loading state identique au desktop (Waves pulse). `<EmergencyMode />` réutilisé avec `onAskAssistant` + `onNavigate` bridge
10. `src/app/globals.css` (modifié, +65 lignes) — ajout du bloc "AQWELIA — Mobile safe areas + native adaptations" après le bloc reduced-motion : 6 classes safe-area, `.mobile-bottom-tabs`, `.mobile-header`, `@media (hover: none)` désactive `hover:scale-105/110` et `hover:bg-secondary`, `html { -webkit-text-size-adjust: 100% }`, `* { -webkit-tap-highlight-color: transparent }`, `.mobile-scroll { -webkit-overflow-scrolling: touch; overscroll-behavior-y: contain }`

Vérifications finales:
- `bunx tsc --noEmit 2>&1 | grep "src/components/mobile"` → **0 erreur** dans tous les fichiers mobile ✅
- `bunx tsc --noEmit 2>&1 | grep -vE "^examples/|^skills/"` → 1 erreur résiduelle pré-existante `src/lib/pool/safety-rules.ts(28,9)` (comparaison '"allowed"' vs '"forbidden"' — HORS scope L2-A, mentionnée dans L1-E comme pré-existante)
- `bun run lint` → **0 erreur, 0 warning** ✅ (exit code 0)

Stage Summary:
- ✅ 9 nouveaux fichiers créés (1 types + 1 header + 1 bottom-tabs + 5 screens + 1 shell) + 1 fichier CSS modifié
- ✅ Architecture en couches : `MobileAppShell` (orchestrateur) → `MobileHeader` + `BottomTabs` + 5 screens (wrappers) → modules aquamind existants (réutilisés tels quels, jamais modifiés)
- ✅ Pattern de navigation hybride : 5 écrans mobile (bottom tabs) avec 2 sous-onglets pilules (Analyses: Mesures/Photo/Carnet ; Maintenance: Actions/Rappels/Météo), mapping bidirectionnel desktop TabId ↔ MobileScreen via `mapDesktopTabToMobile()`
- ✅ Safe areas iOS/Android via `env(safe-area-inset-*)` (notch, home indicator, gesture edges) — header padding-top, bottom tabs padding-bottom, utilitaires réutilisables `.safe-area-{top,bottom,left,right,all}`
- ✅ Touch-friendly : `min-h-[44px]` sur pills de sous-onglets, `min-h-[56px]` sur bottom tabs, `active:opacity-70` au lieu de `:hover`, `-webkit-tap-highlight-color: transparent`, `@media (hover: none)` désactive les hover effects
- ✅ Design system cohérent : tokens AQWELIA (gold, primary, ocean-light, pearl), classes existantes réutilisées (`glass-pill`, `glass-card`, `aqua-text-gradient`, `gold-divider`, `section-label`, `custom-scroll`, `font-display`, `backdrop-blur-xl`), aucune nouvelle couleur introduite
- ✅ Composants desktop `src/components/aquamind/*` INTACTS (aucune modification) — règle respectée
- ✅ `src/app/page.tsx` NON touché — la main agent branchera `MobileAppShell` vs `AppShell` selon `isMobile()`/`isNative()` depuis `src/lib/platform.ts`
- ✅ `prisma/schema.prisma`, `src/lib/auth.ts`, `src/middleware.ts` NON touchés
- ✅ `'use client'` sur tous les 8 composants mobile (header, tabs, 5 screens, shell) — utilise hooks/state
- ✅ 0 erreur TypeScript, 0 erreur/0 warning ESLint sur le scope mobile
- ✅ Icons lucide-react valides : Home, Droplets, MessageCircle, Wrench, User, Sparkles, Sun, Camera, BookOpen, FlaskConical, Bell, CloudSun, Crown, Settings, ChevronRight, Shield, HelpCircle, Waves

Points d'attention pour la main agent / prochains lots:
- Le routing desktop vs mobile devra être fait dans `src/app/page.tsx` en utilisant `isMobile()` de `@/lib/platform`. Une approche recommandée est un guard client-side (`useEffect` + `useState`) pour éviter le flash SSR, OU détecter via user-agent server-side et rendre conditionnellement
- Si la main agent veut brancher un deep-link `?tab=analyses&sub=photo`, ajouter un `useEffect` dans `MobileAppShell` qui parse `window.location.search` et appelle `handleModuleNavigate()` avec le TabId desktop correspondant
- Les 4 lignes "Paramètres" du ProfileScreen sont des placeholders — il faudra créer `src/app/settings/notifications`, `privacy`, `help` dans un lot ultérieur (L3 ou plus)
- Le composant `Onboarding` est réutilisé tel quel (desktop) — il est responsive et fonctionne sur mobile, mais un audit UX mobile dédié pourrait être pertinent dans un lot L2-B

---
Task ID: L3-D
Agent: general-purpose (stripe)
Task: Stripe Checkout web + webhooks Stripe

Work Log:
- Lu `worklog.md` (RESTORE-1, L1-A→L1-E, L2-A) : projet restauré, auth JWT, 13 routes API sécurisées userId, mobile shell créé. 1 erreur TS résiduelle pré-existante dans `safety-rules.ts(28,9)` (hors scope).
- Lu `src/app/api/subscription/route.ts` : route existante GET/POST, plan/duration, startedAt/expiresAt/active — modèle de données à synchroniser depuis Stripe.
- Lu `src/lib/pool/freemium.ts` : 3 plans `free|premium|expert`, 4 durations `week|month|quarter|halfyear`. `getPlanFromProductId` mappe `expert_*` → 'expert', `premium_*` → 'premium'.
- Lu `prisma/schema.prisma` : `Subscription { id, userId, plan String default 'free', duration String?, startedAt, expiresAt?, active Boolean default false }` — champ `plan` est string libre, `duration` nullable. Stripe doit écrire `premium|expert` dans `plan`, `month|halfyear` dans `duration`.
- Lu `src/lib/auth.ts` : `authOptions` exporté, `getServerSession(authOptions)` pattern standard, `session.user.id` peuplé via callback `session`.
- Lu `src/lib/db.ts` : singleton Prisma `db` exporté.
- Lu `.env.example` : placeholders `STRIPE_SECRET_KEY=` et `STRIPE_WEBHOOK_SECRET=` déjà présents mais vides — à compléter avec 4 Price IDs.
- Lu `package.json` : Next 16.1.1, next-auth 4.24.11, Prisma 6.11.1, React 19. Pas de stripe installé.
- Vérifié les types Stripe SDK installés (`node_modules/stripe/esm/`) :
  * Version 22.3.0 installée
  * `LatestApiVersion = "2026-06-24.dahlia"` (apiVersion.ts) — diffère du spec `'2025-06-30.basil'`, donc cast `as any` nécessaire
  * `StripeConfig.apiVersion?: LatestApiVersion` (lib.d.ts) — d'où le cast `as any` requis
  * `Event` est une union discriminée sur `event.type` (Events.d.ts) — `event.data.object` est typé fortement selon le variant, le switch narrow automatiquement

Étapes d'implémentation:

1. Installation du package Stripe
   - `bun add stripe` → stripe@22.3.0 installé, lockfile mis à jour

2. `src/lib/stripe.ts` (nouveau, 51 lignes)
   - Singleton `_stripe` créé paresseusement via `getStripe()`
   - Throw si `STRIPE_SECRET_KEY` manquant (fail-fast)
   - `new Stripe(key, { apiVersion: '2025-06-30.basil' as any, typescript: true })`
   * Note: `as any` requis car le SDK installé pin à `"2026-06-24.dahlia"` (valeur string littérale)
   - `STRIPE_PRICES` map: 4 clés `premium_monthly|premium_yearly|expert_monthly|expert_yearly` → env vars
   - Type `StripeProductId` dérivé
   - `isValidProductId(id): id is StripeProductId` (type guard)
   - `getPlanFromProductId(id): 'premium' | 'expert'` (extrait 'expert' du productId, sinon 'premium')
   - Commentaire en tête: "server-side only, never expose to client" + mention RevenueCat pour mobile

3. `src/app/api/stripe/checkout/route.ts` (nouveau, 64 lignes)
   - `export const runtime = 'nodejs'`
   - POST handler:
     * Auth: `getServerSession(authOptions)` → 401 si pas de `session.user.id`
     * Parse JSON body: `{ productId }` → 400 si invalide (`isValidProductId` type guard)
     * Récupère `STRIPE_PRICES[productId]` → 500 si non configuré (env var vide)
     * `stripe.checkout.sessions.create()`:
       - `mode: 'subscription'`
       - `payment_method_types: ['card']`
       - `line_items: [{ price: priceId, quantity: 1 }]`
       - `customer_email: session.user.email || undefined`
       - `client_reference_id: session.user.id`
       - `metadata: { userId, productId, plan }` (sur la session)
       - `success_url: ${NEXTAUTH_URL}/?subscription=success`
       - `cancel_url: ${NEXTAUTH_URL}/?subscription=cancelled`
       - `allow_promotion_codes: true`
       - `subscription_data: { metadata: { userId, productId, plan } }` (sur la souscription Stripe — repris dans les webhooks `customer.subscription.*`)
     * Retourne `{ url: checkoutSession.url }` (client redirige vers Stripe Checkout)
   - Catch global: log + 500 générique

4. `src/app/api/stripe/portal/route.ts` (nouveau, 41 lignes)
   - `export const runtime = 'nodejs'`
   - POST handler (paramètre préfixé `_req` car non utilisé, évite warning eslint `no-unused-vars`):
     * Auth: `getServerSession(authOptions)` → 401 si pas de session
     * `stripe.customers.list({ email: session.user.email, limit: 1 })` → 404 si aucun client
     * `stripe.billingPortal.sessions.create({ customer, return_url: ${NEXTAUTH_URL}/ })`
     * Retourne `{ url: portalSession.url }`
   - Import `db` NON inclus (présent dans le spec mais inutilisé → supprimé pour lint propre)
   - Catch global: log + 500 générique

5. `src/app/api/stripe/webhook/route.ts` (nouveau, 127 lignes)
   - `export const runtime = 'nodejs'`
   - `export const dynamic = 'force-dynamic'` (route dynamique, jamais cached)
   - POST handler **sans auth session** (Stripe → serveur, secret remplace l'auth):
     * `const body = await req.text()` — **raw body obligatoire** pour vérification signature Stripe
     * `const signature = (await headers()).get('stripe-signature')` — adaptation Next.js 16: `headers()` est async (retourne `Promise<ReadonlyHeaders>`)
     * 400 si pas de signature
     * 500 si `STRIPE_WEBHOOK_SECRET` non configuré
     * `stripe.webhooks.constructEvent(body, signature, webhookSecret)` — vérifie signature + parse event
     * Catch: 400 si signature invalide
   - Switch sur `event.type` (discriminated union — `event.data.object` est typé automatiquement):
     * `checkout.session.completed`:
       - Extrait `userId` depuis `cs.metadata?.userId || cs.client_reference_id` (double source de sécurité)
       - Extrait `productId` et `plan` depuis `cs.metadata`
       - Si userId + plan présents: `updateMany` désactive les anciennes souscriptions actives, `create` nouvelle avec `duration` mappée (`yearly` → `halfyear`, sinon `month`), `expiresAt: null` (mis à jour par la suite via `invoice.paid` ou `customer.subscription.updated`)
     * `customer.subscription.updated` | `customer.subscription.deleted` (cases combinés):
       - Extrait `userId` depuis `sub.metadata?.userId`
       - Si deleted: `updateMany` désactive
       - Si updated: `updateMany` met à jour `expiresAt` depuis `sub.current_period_end * 1000` (Stripe timestamp → Date JS)
     * `invoice.paid`:
       - Extrait `userId` depuis `invoice.metadata?.userId`
       - `updateMany` met à jour `expiresAt` depuis `invoice.lines?.data?.[0]?.period?.end * 1000`
     * `default`: ignore (les autres event types ne sont pas subscription-relevant)
   - Retourne `{ received: true }` (200) en cas de succès
   - Catch: log + 500 générique

6. `.env.example` (modifié)
   - Ancien bloc: `STRIPE_SECRET_KEY=` + `STRIPE_WEBHOOK_SECRET=` (placeholders vides)
   - Nouveau bloc commenté + 6 vars avec valeurs placeholder:
     ```
     # Stripe (web subscriptions)
     # Dashboard: https://dashboard.stripe.com/products → create 4 recurring prices
     # (premium_monthly, premium_yearly, expert_monthly, expert_yearly)
     STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
     STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
     STRIPE_PRICE_PREMIUM_MONTHLY=price_xxxxxxxxxxxxx
     STRIPE_PRICE_PREMIUM_YEARLY=price_xxxxxxxxxxxxx
     STRIPE_PRICE_EXPERT_MONTHLY=price_xxxxxxxxxxxxx
     STRIPE_PRICE_EXPERT_YEARLY=price_xxxxxxxxxxxxx
     ```

Décisions de conception:
- **`as any` sur apiVersion**: le SDK stripe@22.3.0 pin `LatestApiVersion = "2026-06-24.dahlia"`. La spec demandait `'2025-06-30.basil'`. Sans cast, TS échouerait (le type est une string littérale, pas `string`). Le cast `as any` évite ce friction au runtime (Stripe accepte n'importe quelle version d'API active côté compte). Note: en production il faudra aligner la version d'API Stripe Dashboard avec la valeur passée au SDK.
- **`await headers()` au lieu de `headers().get()`**: la spec du brief utilisait `headers().get(...)` mais Next.js 16 a rendu `headers()` asynchrone (retourne `Promise<ReadonlyHeaders>`). Sans `await`, `.get()` n'existerait pas sur le Promise → erreur TS. Adaptation nécessaire.
- **Import `db` supprimé du portal route**: la spec originale importait `db` mais ne l'utilisait pas. Supprimé pour maintenir lint à 0 warning.
- **Paramètre `_req` dans le portal route**: la spec utilisait `req` non utilisé. Préfixé `_req` pour satisfaire `@typescript-eslint/no-unused-vars` (convention ESLint standard).
- **Import `getPlanFromProductId` supprimé du webhook**: la spec l'importait mais ne l'utilisait pas (le `plan` est lu directement depuis metadata). Supprimé pour lint propre.
- **Webhook sans auth session**: la spec le précisait explicitement, et c'est correct — Stripe est server-to-server, le `STRIPE_WEBHOOK_SECRET` remplace l'auth. `constructEvent` vérifie cryptographiquement que la requête vient bien de Stripe.
- **Raw body via `req.text()`**: critique pour Stripe. `req.json()` buffer le body et expose un objet parsé, ce qui casserait la signature. `req.text()` donne le raw string envoyé par Stripe. Le webhook route n'est PAS passé par `bodyParser`.
- **`force-dynamic`**: empêche Next.js de cache la route webhook (chaque requête doit être traitée fraîche).
- **`runtime = 'nodejs'`**: Stripe SDK utilise `crypto` Node natif pour HMAC, pas disponible en `edge` runtime. Obligatoire sur les 3 routes.
- **Mapping `yearly` → `halfyear`**: le schéma Prisma ne définit que 4 durations (`week|month|quarter|halfyear`), pas `yearly`. Choix: `yearly` Stripe (12 mois) → `halfyear` (6 mois) côté DB. Pas parfait mais évite de modifier le schéma. L'`expiresAt` réel est calculé depuis `current_period_end` Stripe — donc la durée factuelle est correcte, seul le label `duration` est imparfait.

Vérifications finales:
- `bun run lint` → **0 erreur, 0 warning, exit code 0** ✅
- `bunx tsc --noEmit 2>&1 | grep -E "src/lib/stripe|src/app/api/stripe"` → **0 erreur** dans les 4 nouveaux fichiers ✅
- `bunx tsc --noEmit 2>&1 | grep -vE "^examples/|^skills/"` → **1 erreur résiduelle pré-existante**: `src/lib/pool/safety-rules.ts(28,9)` (comparaison '"allowed"' vs '"forbidden"' — mentionnée L1-E comme hors scope, NON causée par L3-D)

Stage Summary:
- ✅ Package `stripe@22.3.0` installé (`bun add stripe`)
- ✅ 4 fichiers créés:
  1. `src/lib/stripe.ts` — singleton client, 4 Price IDs, type guards, plan mapping
  2. `src/app/api/stripe/checkout/route.ts` — Checkout Session (auth requise, mode subscription)
  3. `src/app/api/stripe/portal/route.ts` — Customer Portal (auth requise, resolve customer by email)
  4. `src/app/api/stripe/webhook/route.ts` — webhook handler (PAS d'auth, raw body, signature verification, 4 event types: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.paid)
- ✅ `.env.example` mis à jour avec 6 vars Stripe (1 secret + 1 webhook + 4 prices) + commentaire Dashboard
- ✅ Lint: 0 erreur, 0 warning (exit 0)
- ✅ TypeScript: 0 erreur sur le scope `src/lib/stripe*` + `src/app/api/stripe*`
- ✅ 1 erreur TS résiduelle pré-existante (`safety-rules.ts:28`) — hors scope, documentée L1-E
- ✅ Contraintes respectées: `prisma/schema.prisma` NON touché, `src/lib/pool/freemium.ts` NON touché, routes API existantes NON touchées (15 routes intactes: 13 routes user-owned + /api/ + /api/auth/*)
- ✅ Toutes les routes Stripe: `runtime = 'nodejs'` (Stripe SDK utilise crypto Node)
- ✅ Webhook: raw body via `req.text()`, signature verification via `stripe.webhooks.constructEvent`, headers() awaited (Next.js 16 async)
- ✅ Checkout + Portal: `getServerSession(authOptions)` + 401 si pas de session
- ✅ Webhook: PAS de session (server-to-server, secret remplace l'auth)
- ✅ Code stub-ready: les fonctionnalités Stripe réelles nécessitent des clés API Stripe valides (sk_test_*, whsec_*, price_*) configurées dans `.env`. Le code se compile, passe lint, et est prêt à recevoir les vraies clés sans modification.
- ⚠️ Note production: créer les 4 Price IDs dans Stripe Dashboard (premium_monthly $12.99/mo, premium_yearly ~$57.99/6mo, expert_monthly $24.99/mo, expert_yearly ~$109.99/6mo — voir `freemium.ts` PLANS[].price). Configurer l'endpoint webhook dans Stripe Dashboard → Developers → Webhooks → Add endpoint → URL `${NEXTAUTH_URL}/api/stripe/webhook` → events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`. Le `STRIPE_WEBHOOK_SECRET` est affiché sur la page de l'endpoint après création.

Prochaines étapes recommandées:
1. Brancher le bouton "S'abonner" du `ModulePaywall` (desktop) et `ProfileScreen` (mobile) sur `POST /api/stripe/checkout` avec `{ productId: 'premium_monthly' | 'premium_yearly' | 'expert_monthly' | 'expert_yearly' }` et rediriger vers l'`url` retournée (`window.location.href = url`)
2. Ajouter un lien "Gérer mon abonnement" qui appelle `POST /api/stripe/portal` et redirige vers le Customer Portal Stripe
3. Configurer le webhook endpoint Stripe en production (et tester avec `stripe listen --forward-to localhost:3000/api/stripe/webhook` en dev local)
4. Lot 3-E (RevenueCat mobile) — schéma symétrique pour iOS/Android, doit écrire dans le même modèle `Subscription` Prisma via webhook RevenueCat
5. Optionnel: ajouter un job cron ou un endpoint `/api/stripe/sync` qui rafraîchit `expiresAt` pour toutes les souscriptions actives (au cas où un webhook serait manqué)

---
Task ID: L3-A
Agent: general-purpose (native-layer)
Task: Créer couche native src/lib/native/ (caméra, haptics, keyboard, etc.)

Work Log:
- Lu `worklog.md` (RESTORE-1, RB-1, L1-A→L1-E, L2-A) : projet restauré, auth JWT, 13 routes API sécurisées userId, MobileAppShell + 5 écrans mobile créés par L2-A (architecture desktop/mobile en place, modules aquamind réutilisés)
- Lu `src/lib/platform.ts` : détection Capacitor centralisée — `isNative()` / `isIOS()` / `isAndroid()` / `isWeb()` / `isMobile()` SSR-safe (retournent false sur server). Cette fonction est le pivot de toute la couche native : chaque module l'appelle avant d'invoquer un plugin Capacitor
- Lu `capacitor.config.ts` : appId `com.aqwelia.app`, webDir `out`, plugins configurés (SplashScreen, StatusBar `#003B4A`, Keyboard `resize: body style: LIGHT`, LocalNotifications `smallIcon: ic_stat_icon, iconColor: #004D5A, sound: bell.wav`). Couleur de marque `#003B4A` réutilisée dans `status-bar.ts`
- Lu `package.json` : 11 plugins Capacitor déjà installés en Lot 2 (`@capacitor/app@8.1`, `browser@8.0`, `camera@8.2`, `cli@8.4`, `core@8.4`, `haptics@8.0`, `keyboard@8.0`, `local-notifications@8.2`, `network@8.0`, `preferences@8.0`, `splash-screen@8.0`, `status-bar@8.0`) — aucun package à installer
- Vérifié les types des plugins dans `node_modules/@capacitor/*/dist/esm/definitions.d.ts` :
  * `local-notifications` : `Schedule` n'a QUE `{ at?, repeats?, allowWhileIdle?, on?, every?, count? }` — pas de `in` (la spec L3-A proposait `{ in seconds: 1 }` qui est syntaxe invalide + propriété inexistante). Corrigé en `{ at: new Date(Date.now() + 1000) }` pour "immédiat"
  * `app.getLaunchUrl()` retourne `Promise<AppLaunchUrl | undefined>` — la spec déstructurait `({ url }) => ...` ce qui aurait jeté si `undefined`. Corrigé en `(result) => { if (result?.url) handler(result.url) }`
  * `keyboard.KeyboardStyle` : enum a `Light = "LIGHT"` (membre PascalCase, valeur SCREAMING_SNAKE). La spec utilisait `KeyboardStyle.LIGHT` (membre inexistant). Corrigé en `KeyboardStyle.Light`
  * `app.exitApp()`, `getState()`, `addListener('appStateChange'|'backButton'|'appUrlOpen')`, `Browser.open({ url, presentationStyle })` — tous vérifiés conformes à la spec
- Lu `eslint.config.mjs` : règles permissives (`no-empty: off`, `no-unused-vars: off`, `@typescript-eslint/no-explicit-any: off`, etc.) — empty catch blocks OK, imports inutilisés OK
- Lu `tsconfig.json` : `strict: true`, `target: ES2017`, paths `@/*` → `./src/*` — `@/lib/platform` résoud correctement

Architecture decisions:
- **SSR-safety en 2 couches** : (1) `isNative()` court-circuite tous les appels Capacitor (retourne `false` sur le serveur car `window` undefined), (2) les fallbacks web gardent aussi `typeof document/window/navigator/localStorage !== 'undefined'` car `isNative() === false` ne distingue pas web browser vs Node SSR. Sans cette 2e garde, `localStorage.getItem` sur serveur ferait crasher le render
- **Graceful degradation systématique** : tous les appels `await Capacitor.xxx()` wrappés dans `try/catch {}` — un plugin défaillant (permissions refusées, plugin absent, erreur native) ne crash jamais l'UI, retourne `null` / `false` / valeur par défaut
- **Web fallbacks complets** : chaque feature a un équivalent navigateur — Camera → `<input type="file" accept="image/*" capture="environment">`, Haptics → no-op (pas d'équivalent web), Keyboard → no-op (pas d'équivalent web), BackButton → no-op (Android-only), Links → `window.open(..., '_blank', 'noopener,noreferrer')`, Network → `navigator.onLine` + `window.online/offline`, Lifecycle → `document.visibilitychange`, LocalNotifications → `Notification` API (avec `setTimeout` pour simuler `scheduleAt`), Storage → `localStorage`, StatusBar → no-op, AppExit → no-op (Android-only)
- **Fan-out single-listener pour Network** : `onNetworkChange()` peut être appelée par N composants mais n'enregistre qu'UN seul `Network.addListener('networkStatusChange')` natif — tracké via `_nativeListenerCleanup`. Le dernier unsubscribe déclenche `listener.remove()` et libère le handle. Évite les fuites de listeners sur les mounts/unmounts répétés
- **Cleanup functions everywhere** : toutes les fonctions `setup*()` et `on*Change()` retournent `() => void` pour usage direct dans `useEffect(() => setupX(), [])` React. Les listeners Capacitor (qui retournent `Promise<PluginListenerHandle>`) sont nettoyés via `.then(l => l.remove())`
- **Pas de `as any` sur Schedule** : la spec utilisait `schedule: schedule as any` à cause du `{ in seconds: 1 }` invalide. En utilisant `{ at: Date }` qui est un champ valide du type `Schedule`, plus besoin de cast — code strictement typé
- **Camera web fallback** : amélioré par rapport à la spec — input hidden hors écran (`position: fixed; left: -9999px`), nettoyage DOM systématique (`input.remove()` après change/cancel), détection best-effort du cancel via `focus` event (sinon le Promise reste pending indéfiniment si l'utilisateur ferme le picker sans choisir), `reader.onerror` pour ne jamais bloquer

Files created (12 nouveaux fichiers dans `src/lib/native/`):
1. `index.ts` (~80 lignes) — Barrel export : re-exporte toutes les fonctions + types (`PhotoResult`, `BackButtonHandler`, `DeepLinkHandler`, `NetworkState`, `AppLifecycleState`, `LocalNotificationPayload`). Pattern d'import : `import { takePhoto, hapticSuccess, setupKeyboard, onAppStateChange } from '@/lib/native'`
2. `camera.ts` (~140 lignes) — `takePhoto()`, `pickFromGallery()`, `requestCameraPermission()`, `PhotoResult` interface. Native: `Camera.getPhoto({ quality: 85, resultType: DataUrl, source: Camera|Photos, correctOrientation: true })`. Web: `<input type="file" accept="image/*" capture="environment">` + `FileReader.readAsDataURL`
3. `haptics.ts` (~75 lignes) — `hapticLight/Medium/Heavy()` (ImpactStyle), `hapticSuccess/Error/Warning()` (NotificationType). Toutes async, no-op sur web/server
4. `keyboard.ts` (~70 lignes) — `setupKeyboard()` (retourne cleanup) : `Keyboard.setStyle(Light)` + `setResizeMode(Body)` + listeners `keyboardWillShow/Hide` qui posent `--keyboard-height` CSS var et toggle `.keyboard-open` sur `<body>`. `hideKeyboard()`
5. `back-button.ts` (~45 lignes) — `setupBackButton(handler)` : Android-only. Handler contract : `return true` = handled (stop), `return false|void` = webview back si `canGoBack`, sinon `App.exitApp()`. `BackButtonHandler` type
6. `links.ts` (~75 lignes) — `openExternalLink(url)` : native `Browser.open({ url, presentationStyle: 'fullscreen' })`, fallback `window.open(..., '_blank', 'noopener,noreferrer')`. `setupDeepLinks(handler)` : `appUrlOpen` listener + cold-start via `getLaunchUrl()` (avec guard `result?.url` car peut être `undefined`). Parse le `path` via `new URL(url).pathname` si l'URL est valide
7. `network.ts` (~105 lignes) — `getNetworkState()` (native `Network.getStatus()`, web `navigator.onLine`, server `'online'`). `onNetworkChange(cb)` : single native listener fan-out à N callbacks via `_listeners[]`, cleanup libère le listener natif quand le dernier subscriber part. `NetworkState = 'online' | 'offline'`
8. `lifecycle.ts` (~75 lignes) — `onAppStateChange(cb)` (native `appStateChange { isActive }`, web `visibilitychange` + `document.hidden`). `getCurrentAppState()` (native `App.getState()`, web `document.hidden`). `AppLifecycleState = 'active' | 'inactive' | 'background'`
9. `local-notifications.ts` (~135 lignes) — `requestNotificationPermission()` (native `requestPermissions().display === 'granted'`, web `true`). `scheduleLocalNotification({ id, title, body, scheduleAt?, sound? })` : native `LocalNotifications.schedule({ notifications: [{ id, title, body, schedule: { at: scheduleAt ?? now+1s }, sound }] })`, web `new Notification(title, { body })` avec `setTimeout(delay)` si `scheduleAt` futur. `cancelLocalNotification(id)` (no-op web). `getPendingNotifications()` (`[]` sur web). `LocalNotificationPayload` interface
10. `storage.ts` (~105 lignes) — `setPref/getPref/removePref/clearPrefs` : native `Preferences.set/get/remove/clear` (UserDefaults iOS / SharedPreferences Android), web `localStorage`, server no-op/null. Wrappé try/catch pour quota / private mode
11. `status-bar.ts` (~70 lignes) — `setStatusBarDark()` (`Style.Dark` + `setBackgroundColor(#003B4A)` sur iOS), `setStatusBarLight()` (`Style.Light` + `setBackgroundColor(#003B4A)`), `showStatusBar()`, `hideStatusBar()`. Constante `AQWELIA_BG = '#003B4A'` alignée sur `capacitor.config.ts`
12. `app-exit.ts` (~25 lignes) — `exitApp()` : `App.exitApp()` Android-only (no-op iOS/web/server). Utilisé par `back-button.ts` comme escape hatch

Vérifications finales:
- `bunx tsc --noEmit 2>&1 | grep "src/lib/native"` → **0 erreur** dans tous les 12 fichiers ✅
- `bunx tsc --noEmit 2>&1 | grep -c "error TS"` → 7 erreurs résiduelles dans le projet, AUCUNE dans `src/lib/native/` :
  * `capacitor.config.ts(35,7)` + `(36,7)` : `resize: 'body'` et `style: 'LIGHT'` assignés comme string literals au lieu des enums (pré-existant Lot 2, HORS scope L3-A — n'impacte pas l'exécution car Capacitor parse ces strings au runtime)
  * `examples/websocket/frontend.tsx` + `server.ts` : `socket.io-client` / `socket.io` non installés (pré-existant, HORS scope)
  * `skills/image-edit/scripts/image-edit.ts` + `skills/stock-analysis-skill/src/analyzer.ts` : erreurs dans les skills (pré-existant, HORS scope)
  * `src/lib/pool/safety-rules.ts(28,9)` : comparaison `'allowed'` vs `'forbidden'` (pré-existant L1-E, HORS scope)
- `bun run lint` → exit code 0, **0 erreur, 0 warning** ✅

Stage Summary:
- ✅ 12 nouveaux fichiers créés dans `src/lib/native/` (1 barrel `index.ts` + 11 modules métier : camera, haptics, keyboard, back-button, links, network, lifecycle, local-notifications, storage, status-bar, app-exit)
- ✅ Tous les 11 plugins Capacitor installés en Lot 2 sont wrappés : `@capacitor/app` (back-button, lifecycle, links, app-exit), `@capacitor/browser` (links), `@capacitor/camera` (camera), `@capacitor/haptics` (haptics), `@capacitor/keyboard` (keyboard), `@capacitor/local-notifications` (local-notifications), `@capacitor/network` (network), `@capacitor/preferences` (storage), `@capacitor/status-bar` (status-bar). (`@capacitor/core` et `@capacitor/cli` sont infra, `@capacitor/splash-screen` est géré par config seule — pas de wrapper runtime requis)
- ✅ SSR-safety en 2 couches : (1) `isNative()` court-circuite tous les appels Capacitor (false sur serveur), (2) fallbacks web gardent aussi `typeof document/window/navigator/localStorage !== 'undefined'` car `isNative() === false` ne distingue pas web browser vs Node SSR
- ✅ Graceful degradation systématique : 100% des appels `await Capacitor.xxx()` wrappés dans `try/catch` — un plugin défaillant retourne `null`/`false`/no-op plutôt que de crasher l'UI
- ✅ Web fallbacks complets pour 7/11 modules : Camera (FileReader + `<input type="file">`), Links (window.open), Network (navigator.onLine + window.online/offline), Lifecycle (document.visibilitychange), LocalNotifications (Notification API + setTimeout pour scheduleAt), Storage (localStorage), Haptics/Keyboard/StatusBar/BackButton/AppExit (no-op — pas d'équivalent web)
- ✅ Pattern React-friendly : toutes les fonctions `setup*()` et `on*Change()` retournent une cleanup `() => void` directement utilisable dans `useEffect(() => setupX(), [])` sans wrapper
- ✅ Anti-fuite listeners : `network.ts` utilise un fan-out single-listener (1 listener Capacitor partagé par N subscribers, libéré quand le dernier part) — évite les leaks sur mounts/unmounts répétés
- ✅ Couleur de marque `#003B4A` (depuis `capacitor.config.ts`) centralisée dans `status-bar.ts` via `AQWELIA_BG`
- ✅ Bugs de spec corrigés :
  * `local-notifications.ts` : `{ in seconds: 1 }` (syntaxe invalide + propriété inexistante) → `{ at: new Date(Date.now() + 1000) }` (champ valide du type `Schedule`), suppression du cast `as any`
  * `links.ts` : `getLaunchUrl().then(({ url }) => ...)` aurait jeté si `undefined` → `.then((result) => { if (result?.url) handler(result.url) })`
  * `keyboard.ts` : `KeyboardStyle.LIGHT` (membre enum inexistant) → `KeyboardStyle.Light` (membre PascalCase correct, valeur `"LIGHT"`)
- ✅ TypeScript strict : 0 erreur dans `src/lib/native/` (les 7 erreurs résiduelles du projet sont toutes pré-existantes et hors scope — capacitor.config.ts, examples/, skills/, src/lib/pool/safety-rules.ts)
- ✅ ESLint : 0 erreur, 0 warning (exit code 0)
- ✅ Contraintes respectées : AUCUN package installé (plugins déjà présents Lot 2), AUCUN fichier hors `src/lib/native/` modifié, AUCUN fichier existant modifié, `capacitor.config.ts` non touché (les 2 erreurs TS sont pré-existantes et seront traitées par un autre lot si besoin), `src/lib/platform.ts` non touché (uniquement importé)

Points d'attention pour la main agent / prochains lots:
- **Intégration React** : pour exploiter la couche native, créer un hook `useNativeFeatures()` (L3-B?) qui mount les setups dans un `useEffect` :
  ```ts
  useEffect(() => {
    const cleanups = [
      setupKeyboard(),
      setupBackButton(() => handleBack()),
      setupDeepLinks((url) => router.push(url)),
      onAppStateChange((s) => { if (s === 'background') flushAnalytics() }),
      onNetworkChange((s) => setOffline(s === 'offline')),
    ]
    return () => cleanups.forEach(fn => fn())
  }, [])
  ```
- **Splash screen** : `@capacitor/splash-screen` est configuré via `capacitor.config.ts` seul (show 1500ms, hide auto) — pas de wrapper runtime requis. Si on veut un hide/show programmatique (e.g. après fetch initial), créer `splash.ts` avec `hideSplash()` / `showSplash()`
- **Status bar au boot** : `capacitor.config.ts` déjà configure `StatusBar.style: 'LIGHT'` + `backgroundColor: #003B4A` + `overlaysWebView: false`. Les helpers `setStatusBarDark/Light()` sont pour des changements runtime (e.g. dark mode toggle)
- **`capacitor.config.ts` erreurs TS** : 2 erreurs pré-existantes (`resize: 'body'` et `style: 'LIGHT'` devraient utiliser `KeyboardResize.Body` et `KeyboardStyle.Light`). Non-bloquantes (Capacitor parse les strings au runtime) mais à corriger dans un lot L3-C pour propre TypeScript. Solution :
  ```ts
  import { KeyboardStyle, KeyboardResize } from '@capacitor/keyboard'
  Keyboard: { resize: KeyboardResize.Body, style: KeyboardStyle.Light, resizeOnFullScreen: true }
  ```
- **Routing deep-link** : `setupDeepLinks` parse `url` et extrait `path` via `new URL(url).pathname`. La main agent devra mapper ce path vers les écrans mobile (`?tab=analyses&sub=photo` → `MobileScreen.analyses + subTab.photo`), comme suggéré par L2-A
- **Local-notifications web** : la web `Notification` API ne supporte pas le scheduling natif — on simule avec `setTimeout`. Si l'app n'est pas ouverte, la notif ne se déclenche pas (web limitation). Pour iOS/Android natif, `schedule.at` déclenche même app fermée — c'est l'usage prévu pour les rappels Aqwelia
- **Sensibilité storage** : `storage.ts` est pour données NON-sensibles uniquement (theme, last-tab, onboarding). Pour tokens/sessions, continuer à utiliser NextAuth + httpOnly cookies (déjà en place L1-B). NE PAS y stocker de JWT ou userId

---
Task ID: L3-B
Agent: general-purpose (offline)
Task: Mode hors connexion (cache + state management)

Work Log:
- Lu `worklog.md` (RESTORE-1, L1-A→L1-E, L2-A, L2-B) : projet restauré, auth JWT multi-tenant, mobile shell + native bridges déjà en place
- Lu `src/lib/platform.ts` : détection Capacitor (iOS/Android/web), `isMobile()`, `isNative()` — fallbacks SSR OK
- Lu `src/lib/api-client.ts` : wrapper fetch unique web+mobile, `api.get/post/patch/delete`, `ApiError` class — base parfaite pour le cache layer
- Lu `src/app/api/dashboard/route.ts` : shape de réponse complexe (profile, latestTest, latestPlan, trend, counts) — aucune adaptation nécessaire côté offline (le cache est agnostique au shape)
- Lu `src/app/api/pool/profile/route.ts` : GET + POST, return `{ profile }` — idem
- Vérifié `package.json` : `zustand@5.0.6` + `@capacitor/network@8.0.1` déjà installés, `lucide-react@0.525.0` (icônes CloudOff, RefreshCw disponibles — CloudUp existe mais inutilisé, retiré de l'import)
- Vérifié l'ESLINT config : règles `@typescript-eslint/no-explicit-any`, `no-unused-vars`, `no-empty` OFF — mais `react-hooks/set-state-in-effect` ON (piège détecté tôt, voir ci-dessous)
- Vérifié `tsconfig.json` : `strict: true`, `noImplicitAny: false`, paths `@/*` → `./src/*`
- Vérifié que `src/lib/native/network.ts` n'existe PAS (le worklog L2-B mentionne `capacitor.config.ts` + helpers `splash/status-bar/deep-links/notifications/storage` mais pas de wrapper `@capacitor/network`). Décision : utiliser directement `navigator.onLine` + window events (voir "Decision: native bridge" ci-dessous) plutôt que créer `src/lib/native/network.ts` hors scope

Architecture decisions:
- **Cache strategy : network-first, cache-fallback** : `apiGetCached()` essaie le réseau d'abord, cache la réponse si succès, fallback sur cache si échec. Retourne toujours `{ data, stale, error? }` — jamais de throw. Cela permet aux composants d'utiliser une seule code path sans try/catch
- **Cache key = request path** : `'/api/dashboard'` est la clé, pas de hash. Simple, lisible, et les paths API sont déjà uniques par endpoint. TTL différencié par catégorie (5 min pour dashboard, 1h pour profile, 24h pour guides — cf. `CACHE_TTL`)
- **Lazy expiration** : `getCached()` vérifie `expiresAt` à la lecture et supprime l'entrée si expirée (pas de timer en arrière-plan). Plus simple, pas de fuite mémoire, et l'UX reste acceptable (le cache est lu seulement quand on en a besoin)
- **SSR-safety** : tous les accès IndexedDB sont wrappés dans `try/catch` qui résolvent à `null`/no-op si `typeof indexedDB === 'undefined'` (SSR, old browsers, private mode). Le store Zustand utilise `createSafeStorage()` qui retourne `localStorage` sur client et stubs no-op sur serveur
- **Decision: native bridge** : la spec mentionne `import { getNetworkState, onNetworkChange } from '@/lib/native/network'`. Ce module n'existe pas (hors scope L3-B — probablement un autre lot L3). J'ai implémenté `useNetworkStatus()` avec `useSyncExternalStore` sur `navigator.onLine` + window events, qui fonctionne sur web ET native (Capacitor WebView forward les events online/offline). Commentaire ajouté dans le hook pour documenter l'intégration future du bridge natif
- **Lint pitfall : `react-hooks/set-state-in-effect`** : le pattern `setMounted(true)` dans `useEffect` (utilisé dans la spec du banner pour éviter le hydration mismatch) déclenche cette règle. Solution : remplacer par `useSyncExternalStore(() => () => {}, () => true, () => false)` qui retourne `false` en SSR et `true` après hydration — pattern React officiel pour "isHydrated" sans setState-in-effect
- **Idem pour `useNetworkStatus`** : la spec faisait `applyState(navigator.onLine)` synchronously dans `useEffect` → même erreur lint. Solution : `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` pour `isOnline`, puis un `useEffect` minimal qui sync vers le store Zustand (l'appel à `setStoreOnline` est OK car c'est un setter externe Zustand, pas un setter React — ne déclenche pas la règle)
- **Promesse non awaited** : `flushPending()` retourne une Promise. Dans le banner, wrappé dans `handleSync` qui `.catch(() => {})` pour éviter unhandled rejection. Idem dans le hook
- **Zustand persist SSR** : `createJSONStorage(() => createSafeStorage())` au lieu de `createJSONStorage(() => localStorage)` direct — évite crash SSR car `localStorage` n'existe pas sur serveur. La spec avait déjà un guard `typeof window !== 'undefined'` mais retournait des stubs incomplets (pas de `clear`/`key`/`length`) — corrigé avec un objet `Storage` complet
- **Cache async ergonomics** : `tx.objectStore(STORE_NAME).put(entry)` est fire-and-forget dans la spec d'origine, mais le `await new Promise(resolve => tx.oncomplete = ...)` assure que l'écriture est durable avant de résoudre. Important pour ne pas perdre des données si le tab se ferme juste après

Files created (6 nouveaux fichiers, 0 fichier modifié) :
1. `src/lib/offline/cache.ts` (172 lignes) — wrapper IndexedDB : `openDB()`, `CacheEntry<T>`, `setCached<T>(key, data, ttlMs=24h)`, `getCached<T>(key)` (lazy expiration via `deleteCached`), `deleteCached(key)`, `clearAllCache()`. DB name `aqwelia-cache`, store `responses`, keyPath `key`. Toutes les fonctions sont async et never-throw (try/catch résout à null/no-op)
2. `src/lib/offline/api-cache.ts` (88 lignes) — `CACHE_TTL` (9 endpoints : dashboard 5min, profile 1h, waterTests 5min, guides 24h, weather 30min, reminders 5min, equipment 1h, inventory 1h, subscription 1h), `CachedResult<T>` interface (`{ data, stale, error? }`), `apiGetCached<T>(path, ttlKey?)` (network-first, cache-fallback), `offlineApi` objet avec 9 méthodes de convenance
3. `src/lib/offline/offline-store.ts` (122 lignes) — store Zustand persisté : `isOnline`, `lastOnlineAt`, `pendingActions: PendingAction[]`, actions `setOnline`, `queueAction` (génère id+createdAt), `flushPending` (replay POST/PATCH/DELETE via `api.*`, garde les failed dans la queue), `clearPending`. Persist vers `localStorage` sous `aqwelia-offline` via `createSafeStorage()` (SSR-safe)
4. `src/lib/offline/index.ts` (11 lignes) — barrel `export * from './cache' | './api-cache' | './offline-store'`
5. `src/components/offline-banner.tsx` (96 lignes) — banner `position: fixed top-0 z-[60]` bg-amber-500, affiche "Hors connexion — données en cache" + bouton "Synchroniser (N)" si `pendingActions.length > 0`. `useIsClient()` via `useSyncExternalStore` (SSR-safe, évite le lint `set-state-in-effect`). Auto-hide quand `isOnline === true`. Icônes lucide `CloudOff` + `RefreshCw`. Classe `safe-area-top` (déjà définie par L2-A dans globals.css). `role="status"` + `aria-live="polite"` pour a11y
6. `src/hooks/use-network-status.ts` (104 lignes) — hook `useNetworkStatus(): { isOnline, isOffline }`. `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` sur `navigator.onLine` + window online/offline events. `useEffect` sync vers `useOfflineStore.setOnline` + déclenche `flushPending()` quand online retourne. Commentaire JSDoc documente l'intégration future du bridge `@capacitor/network`

Vérifications finales:
- `bun run lint` → **0 erreur, 0 warning** (exit 0) ✅
- `bunx tsc --noEmit 2>&1 | grep -E "src/lib/offline|src/components/offline-banner|src/hooks/use-network"` → **0 erreur** dans les 6 nouveaux fichiers ✅
- `bunx tsc --noEmit` (full) → 5 erreurs résiduelles, toutes hors scope L3-B :
  * `examples/websocket/*` (2 erreurs) — modules socket.io manquants (pré-existant, exemples)
  * `skills/image-edit/scripts/image-edit.ts` (1 erreur) — `images` vs `image` dans `CreateImageEditBody` (pré-existant, skills)
  * `skills/stock-analysis-skill/src/analyzer.ts` (1 erreur) — type mismatch (pré-existant, skills)
  * `src/lib/pool/safety-rules.ts(28,9)` (1 erreur) — comparaison `'"allowed"'` vs `'"forbidden"'` (pré-existant, mentionné dans L1-E et L2-A comme hors scope)
- Contraintes respectées :
  * ✅ Aucun fichier existant modifié (6 nouveaux fichiers uniquement)
  * ✅ Aucun package installé (Zustand 5.0.6 déjà présent)
  * ✅ Tous les fichiers SSR-safe (`typeof window/indexedDB !== 'undefined'` guards partout)
  * ✅ TypeScript strict (types explicites sur tous les generics, `CacheEntry<T>`, `CachedResult<T>`, `PendingAction`, `OfflineState`, `NetworkStatus`)
  * ✅ Toutes les fonctions async ont try/catch (cache.ts, offline-store.ts `flushPending`)
  * ✅ Règle `react-hooks/set-state-in-effect` respectée (utilisation de `useSyncExternalStore` au lieu de `setState` dans `useEffect`)

Stage Summary:
- ✅ 6 nouveaux fichiers créés, 0 fichier modifié, 0 package installé
- ✅ Architecture offline en 3 couches :
  1. **Cache layer** (`cache.ts`) — IndexedDB wrapper SSR-safe, lazy expiration, never-throw
  2. **API layer** (`api-cache.ts`) — `offlineApi.{dashboard,profile,waterTests,weather,reminders,guides,equipment,inventory,subscription}` avec TTL différencié par endpoint, retourne toujours `{ data, stale, error? }`
  3. **State layer** (`offline-store.ts`) — Zustand+persist pour `isOnline` + `pendingActions` (write queue replayed on reconnect)
- ✅ UX : banner amber en haut quand offline, bouton "Synchroniser (N)" pour replayer manuellement les writes en attente, auto-hide quand online
- ✅ Hook `useNetworkStatus()` utilisable partout dans l'app (mount une fois dans `AppShell` desktop + `MobileAppShell` mobile), sync vers le store, déclenche `flushPending()` automatiquement au retour du réseau
- ✅ 0 erreur TypeScript, 0 erreur/warning ESLint sur le scope offline
- ✅ Lint pitfall `react-hooks/set-state-in-effect` détecté et résolu proprement avec `useSyncExternalStore` (pattern React officiel pour "isHydrated" et pour souscrire à `navigator.onLine`)

Points d'attention pour la main agent / prochains lots:
- **Brancher le hook** : `useNetworkStatus()` doit être mount une fois dans `src/components/aquamind/app-shell.tsx` ET dans `src/components/mobile/mobile-app-shell.tsx` (un `useNetworkStatus()` call suffit, le state remonte au store Zustand partagé). Sans cela, le banner ne saura jamais qu'on est offline
- **Brancher le banner** : `<OfflineBanner />` à ajouter en haut du layout desktop et mobile (après le header, avant le content). Le banner est `position: fixed top-0 z-[60]` donc n'affecte pas le layout, mais il faut prévoir `padding-top` sur le content quand offline pour ne pas masquer le header (ou utiliser `safe-area-top` + height dynamique)
- **Brancher le cache** : remplacer les `api.get('/api/dashboard')` par `offlineApi.dashboard()` dans les modules aquamind (L3-C ou lot ultérieur). Le retour `{ data, stale, error? }` nécessite une adaptation : si `stale === true`, afficher un indicateur "données en cache" dans le module. Si `data === null` (jamais caché + offline), afficher un état vide "Aucune donnée — connectez-vous"
- **Queue writes** : pour les modules qui font des POST/PATCH/DELETE (water-test, action-plan, equipment, inventory, reminders, chat), ajouter une logique "if offline, queueAction() + optimistically update UI". Plus complexe que le cache read — à spécifier dans un lot L3-D potentiel
- **Native bridge** : quand `src/lib/native/network.ts` sera créé (autre lot L3), le hook `useNetworkStatus` peut être étendu pour utiliser `@capacitor/network` (plus précis que `navigator.onLine` sur native — détecte le type de connexion cell/wifi/none, et les changements de type). Pour l'instant, `navigator.onLine` + window events fonctionne sur les deux plateformes (WebView forward les events)
- **Storage natif** : `createSafeStorage()` utilise `localStorage`. Sur Capacitor native, `localStorage` fonctionne mais est volatile (clear au cache clear). Pour persistence native durable, remplacer par `@capacitor/preferences` (déjà installé) — wrap dans un adapter async-compatible avec `createJSONStorage`. À faire dans un lot L3-C/D
- **Cache size** : IndexedDB n'a pas de limite stricte côté navigateur (au-delà de ~50MB le navigateur peut prompter l'utilisateur). Pour l'instant, on ne prune jamais les entries expirées non lues — un `clearAllCache()` manuel est exposé pour reset. À terme, ajouter un prune périodique (e.g. au démarrage de l'app, delete toutes les entries `expiresAt < now`)

---
Task ID: L35-MOD
Agent: general-purpose (modules-offline)
Task: Migrer fetch direct vers offlineApi dans 10 modules

Work Log:
- Lu `worklog.md` (RESTORE-1, L1-A→L1-E, L2-A, L2-B, L3-B, L3.5) — contexte offline (cache IndexedDB + Zustand store + queue POST/PATCH/DELETE) déjà en place côté `src/lib/offline/`
- Lu `src/lib/offline/api-cache.ts` — `offlineApi.{dashboard,profile,waterTests,weather,reminders,guides,equipment,inventory,subscription}` + `apiGetCached<T>(path, ttlKey?)` générique, retourne toujours `{ data, stale, error? }`, jamais de throw
- Lu `src/lib/offline/offline-store.ts` — store Zustand persisté : `isOnline`, `pendingActions`, `queueAction({method, path, body})`, `flushPending()`. La queue est replayée au retour du réseau via le hook `useNetworkStatus`
- Lu `src/lib/api-client.ts` — `api.get/post/patch/delete<T>(path, body?)` lance `ApiError` sur !res.ok, sinon retourne le JSON parsé directement (pas de Response fetch). C'est le wrapper utilisé en interne par `offlineApi`
- Lu les 10 modules aquamind ciblés (8 à migrer + paywall/diagnostic exclus). Pour chacun, identifié chaque `fetch('/api/...')` et mappé vers la méthode offlineApi correspondante (ou `apiGetCached` pour les URLs avec query strings, ex. `/api/guides?recommend=1`)
- Pour les modules avec writes (POST/PATCH/DELETE), ajouté le pattern `if (!isOnline) { queueAction(...); toast('Sera synchronisé...'); return }` avant l'appel `api.*`, conformément à la spec
- Pour les modules read-only (dashboard, guides), pas d'import `useOfflineStore` (règle "Import useOfflineStore only in modules that have write operations" respectée). Health-log a un DELETE → import useOfflineStore ajouté (la spec table disait 0 writes mais le code avait un removeTest DELETE)
- Pour chaque module migré, ajout d'un indicateur "données en cache" discret (italic, text-muted-foreground, text-[10px]) qui apparaît quand `stale === true` :
  * action-plan : à côté du bouton "Régénérer"
  * dashboard : à côté du bouton "Actualiser"
  * guides : sous le Header
  * health-log : à côté du bouton "Actualiser"
  * maintenance (EquipmentPanel / InventoryPanel / RemindersPanel) : dans le CardTitle de chaque panel
  * reminders : à côté du compteur "urgent / aujourd'hui" dans le Header
  * water-test : dans le CardTitle "Mesures récentes"
  * assistant : pas d'indicateur stale (le GET sert juste à vérifier `contextReady`, pas d'affichage de données)

Détail des migrations par module (8 modules, 31 fetch calls migrés au total — la spec annonçait 29 ; l'écart vient de fetches supplémentaires non listés dans le tableau : 2 fetches bonus dans maintenance (PATCH + DELETE), 1 DELETE bonus dans health-log, 1 DELETE bonus dans water-test, 1 GET bonus dans guides) :

1. **module-action-plan.tsx** (2 calls) :
   - GET `/api/dashboard` → `offlineApi.dashboard()` + destructuration `{ data, stale }`, extraction `data.latestPlan`
   - POST `/api/pool/action-plan` → `api.post('/api/pool/action-plan', payload)` + queueAction offline
   - Ajout état `stale` + indicateur à côté du bouton "Régénérer"

2. **module-assistant.tsx** (3 calls) :
   - GET `/api/dashboard` (contextReady check) → `offlineApi.dashboard()` puis `setContextReady(!!data?.profile)`, avec cleanup `cancelled` flag
   - POST `/api/chat` → `api.post<{reply?: string}>('/api/chat', {message})` + queueAction offline + message "hors ligne" dans le chat
   - DELETE `/api/chat` → `api.delete('/api/chat')` + queueAction offline
   - Pas d'indicateur stale (contexte booléen, pas de données à afficher)

3. **module-dashboard.tsx** (3 calls) :
   - GET `/api/dashboard` + `/api/pool/weather` + `/api/pool/reminders` → `Promise.all([offlineApi.dashboard(), offlineApi.weather(), offlineApi.reminders()])`
   - Conversion `Promise.allSettled` → `Promise.all` (offlineApi ne throw jamais, donc allSettled inutile)
   - Ajout état `stale` global (OR des 3 stale flags) + indicateur à côté du bouton "Actualiser"

4. **module-guides.tsx** (4 calls) :
   - GET `/api/guides` → `offlineApi.guides()`
   - GET `/api/guides?recommend=1&new=1&salt=1` → `apiGetCached('/api/guides?recommend=1&new=1&salt=1', 'guides')` (URL avec query string non couverte par les méthodes convenience)
   - GET `/api/subscription` → `offlineApi.subscription()`
   - GET `/api/guides?id=...` → `apiGetCached('/api/guides?id=...', 'guides')` dans `openGuide`
   - Ajout état `stale` + indicateur sous le Header

5. **module-health-log.tsx** (3 calls) :
   - GET `/api/pool/water-test` → `offlineApi.waterTests()`
   - GET `/api/pool/photo-diagnostic` → `apiGetCached('/api/pool/photo-diagnostic')` (pas de méthode convenience, TTL par défaut 5 min)
   - DELETE `/api/pool/water-test?id=...` (removeTest) → `api.delete(...)` + queueAction offline
   - Ajout état `stale` + indicateur à côté du bouton "Actualiser"

6. **module-maintenance.tsx** (8 calls, 3 sous-composants) :
   - **EquipmentPanel** : GET `/api/pool/equipment` → `offlineApi.equipment()` ; POST `/api/pool/equipment` (add) → `api.post(...)` + queueAction ; PATCH `/api/pool/equipment` (markMaintained) → `api.patch(...)` + queueAction ; DELETE `/api/pool/equipment?id=` (remove) → `api.delete(...)` + queueAction
   - **InventoryPanel** : GET `/api/pool/inventory` → `offlineApi.inventory()` ; POST `/api/pool/inventory` (add) → `api.post(...)` + queueAction ; DELETE `/api/pool/inventory?id=` (remove) → `api.delete(...)` + queueAction
   - **RemindersPanel** : GET `/api/pool/equipment` (lecture seule pour dériver les rappels) → `offlineApi.equipment()`
   - Chaque panel a son propre état `stale` + indicateur dans le CardTitle
   - Chaque panel instancie ses propres hooks `useOfflineStore` (partage via Zustand singleton)

7. **module-reminders.tsx** (5 calls) :
   - GET `/api/pool/reminders` + `/api/subscription` → `Promise.all([offlineApi.reminders(), offlineApi.subscription()])`
   - PATCH `/api/pool/reminders` (patchReminder done/snoozed) → `api.patch(...)` + queueAction + remove from local state
   - DELETE `/api/pool/reminders?id=` (deleteReminder) → `api.delete(...)` + queueAction + remove from local state
   - POST `/api/pool/reminders` (addManual) → `api.post<{reminder?: {id: string}}>('/api/pool/reminders', body)` + queueAction + ajout optimiste local avec id `local-${Date.now()}`
   - Ajout état `stale` + indicateur dans le Header (à côté du compteur urgent/aujourd'hui)
   - Prop `stale?: boolean` ajoutée au composant `Header` (pur présentation)

8. **module-water-test.tsx** (3 calls) :
   - GET `/api/pool/water-test` (loadHistory) → `offlineApi.waterTests()`
   - POST `/api/pool/water-test` (submit) → `api.post<{actionPlan?: ActionPlanResult}>('/api/pool/water-test', body)` + queueAction offline (pas de plan retourné dans ce cas, toast "Sera synchronisé")
   - DELETE `/api/pool/water-test?id=` (removeTest) → `api.delete(...)` + queueAction + remove from local state
   - Ajout état `stale` + indicateur dans le CardTitle "Mesures récentes"

Vérifications finales :
- `bun run lint` → **0 erreur, 0 warning dans les 8 modules migrés** ✅ (1 warning pré-existant dans `src/components/mobile/mobile-app-shell.tsx:102` hors scope)
- `bunx tsc --noEmit 2>&1 | grep "src/components/aquamind/module-"` → **0 erreur TypeScript** dans les 8 modules migrés ✅
- `bunx tsc --noEmit` (full) → 5 erreurs résiduelles, toutes pré-existantes et hors scope :
  * `examples/websocket/*` (2 erreurs, modules socket.io manquants)
  * `skills/image-edit/scripts/image-edit.ts` (1 erreur, pré-existant)
  * `skills/stock-analysis-skill/src/analyzer.ts` (1 erreur, pré-existant)
  * `src/lib/pool/safety-rules.ts` (1 erreur, pré-existant — mentionné dans L1-E et L2-A comme hors scope)
- Vérification `grep "fetch('/api/" src/components/aquamind/` : 0 résultat dans les 8 modules migrés. Les fetches restants sont dans `onboarding.tsx`, `app-shell.tsx`, `module-weather.tsx` (URL externe, pas /api), `module-paywall.tsx` (exclu par la spec — main agent gère le billing) et `module-diagnostic.tsx` (exclu par la spec — main agent gère les permissions caméra)

Stage Summary:
- ✅ 8 modules migrés (sur 10 — paywall et diagnostic exclus comme demandé)
- ✅ 31 `fetch('/api/...')` calls migrés vers `offlineApi.*` / `apiGetCached` (GET) ou `api.*` + `queueAction` (POST/PATCH/DELETE) — spec table annonçait 29, écart expliqué par des writes bonus (DELETE dans health-log et water-test, PATCH+DELETE dans maintenance) non listés dans le tableau
- ✅ Pattern offline cohérent :
  - GET → `offlineApi.<method>()` ou `apiGetCached(path, ttlKey)` → destructuration `{ data, stale, error? }`, `data` peut être `null` (offline + uncached) → fallback vers état vide (`[]` ou `null`) sans crash
  - POST/PATCH/DELETE → check `isOnline` ; si offline, `queueAction({method, path, body})` + toast informatif + return ; si online, `api.post/patch/delete(path, body)` + gestion erreur `ApiError`
- ✅ Indicateur "données en cache" ajouté dans 7 modules sur 8 (assistant sans indicateur car GET purement booléen)
- ✅ `useOfflineStore` importé seulement dans les modules avec writes (action-plan, assistant, health-log, maintenance, reminders, water-test) — pas dans dashboard ni guides (read-only)
- ✅ Tous les `'use client'` directives préservés
- ✅ Aucun fichier hors scope modifié (`src/lib/offline/`, `src/lib/api-client.ts`, `src/lib/api-routes.ts`, `src/middleware.ts`, `src/lib/auth.ts`, `module-paywall.tsx`, `module-diagnostic.tsx` intacts)
- ✅ UI, logique métier, types, state management préservés — seule la couche data fetching a changé
- ✅ 0 erreur TypeScript, 0 erreur/warning ESLint sur les 8 modules migrés

Points d'attention pour la main agent / prochains lots :
- **Module onboarding & app-shell** : ces fichiers contiennent encore des `fetch('/api/pool/profile')` directs. Pas dans le scope L35-MOD mais seraient à migrer dans un lot ultérieur (le pattern `offlineApi.profile()` s'applique directement)
- **module-weather.tsx** : utilise `fetch(url)` avec une URL météo externe (pas /api). Hors scope du offlineApi (le cache IndexedDB n'est prévu que pour /api/*). Si on veut le mettre offline, créer une méthode `offlineApi.weatherExternal()` ou wrapper spécifique
- **Flux offline en cas d'erreur `api.*`** : actuellement si `api.post/patch/delete` throw (e.g. 500 serveur), l'erreur remonte au user via toast. On ne re-queue PAS l'action automatiquement — choix délibéré (les erreurs serveur ne sont pas des erreurs réseau). Si on veut du retry sur 5xx, étendre `flushPending()` ou wrapper `api.*` dans un helper qui re-queue sur 5xx
- **Action optimistic pour les POST qui retournent une ressource** : pour `addManual` (reminders) et `add` (equipment/inventory), en mode offline on génère un `id` local (`local-${Date.now()}`). Quand `flushPending` rejoue le POST, le serveur retourne un vrai id mais on ne met pas à jour l'UI (l'id local reste). Si ça pose problème (e.g. user essaie de PATCH/DELETE l'item juste après), ajouter un map `localId → serverId` mis à jour après flush, ou forcer un `load()` au retour du réseau
- **Indicateur "données en cache"** : actuellement l'indicateur est purement informatif. Si on veut une UX plus prononcée (e.g. bannière amber en haut du module), factoriser dans un composant `<StaleBadge />` réutilisable
- **`/api/pool/action-plan` POST** : cet endpoint n'a pas de méthode convenience dans `offlineApi` (seuls les GET en ont). Le POST passe par `api.post` direct. Si on veut centraliser, ajouter `offlineApi.regenerateActionPlan(testId)` qui wrappe POST + queue — mais ce n'était pas demandé dans la spec
- **Type safety** : les retours d'`offlineApi` sont typés via cast `data as { ... } | null` car les méthodes convenience sont non-génériques. Un lot ultérieur pourrait ajouter des génériques : `offlineApi.dashboard<DashboardData>()` pour éliminer les casts

---
Task ID: L4-B
Agent: general-purpose (documentation)
Task: Rédiger MOBILE_IOS_ANDROID.md (18 sections)

Work Log:
- Lu `worklog.md` (993 lignes, RESTORE-1 + L1-A→L1-E + L2-A + L2-B + L3-B + L35-MOD) pour le contexte complet du projet et la stack mobile mise en place
- Lu `capacitor.config.ts` (48 lignes) : appId `com.aqwelia.app`, webDir `out`, plugins SplashScreen/StatusBar/Keyboard/LocalNotifications configurés, backgroundColor `#003B4A`
- Lu `next.config.mobile.ts` (35 lignes) : `output: 'export'`, `images.unoptimized: true`, `trailingSlash: false`, commenté pour expliquer la différence avec le build web standalone
- Lu `package.json` (119 lignes) : 11 scripts mobile:* identifiés (mobile:build, mobile:sync, mobile:ios, mobile:android, mobile:open:ios, mobile:open:android, mobile:add:ios, mobile:add:android, mobile:clean), dépendances Capacitor 8 + RevenueCat 13 + Stripe 22 + Prisma 6
- Lu `.env.example` (47 lignes) : 15 variables inventoriées (DATABASE_URL, NEXTAUTH_*, NEXT_PUBLIC_API_BASE_URL, STRIPE_*, NEXT_PUBLIC_REVENUECAT_*, REVENUECAT_*, WTTR_IN_BASE_URL)
- Lu `src/lib/platform.ts` (118 lignes) : `isNative()`, `isWeb()`, `isIOS()`, `isAndroid()`, `isMobile()` — base de la détection plateforme
- Lu `src/lib/native/index.ts` + 10 modules (camera, haptics, keyboard, back-button, links, network, lifecycle, storage, status-bar, app-exit) : tous SSR-safe, fallbacks web documentés, patterns d'usage identifiés
- Lu `src/lib/billing/` (4 fichiers) : `revenuecat.ts` (mobile IAP), `stripe-web.ts` (web checkout/portal), `index.ts` (factory `getBillingClient()`), `types.ts` (PlanId, Product, Entitlement, BillingClient) — abstraction multi-plateforme complète
- Lu `src/lib/offline/` (4 fichiers) : `cache.ts` (IndexedDB), `api-cache.ts` (CACHE_TTL 9 endpoints), `offline-store.ts` (Zustand persist + pendingActions + flushPending), `index.ts` (barrel)
- Lu `src/components/mobile/` (9 fichiers) : `mobile-app-shell.tsx` (shell principal + setupKeyboard/setupBackButton/setupDeepLinks), `mobile-header.tsx`, `bottom-tabs.tsx` (5 tabs), `types.ts` (MobileScreen, AnalysesSubTab, MaintenanceSubTab), `screens/` (home, analyses, assistant, maintenance, profile)
- Lu `src/app/api/revenuecat/webhook/route.ts` (57 lignes) : vérifie Bearer secret, mappe product_id → plan, met à jour Subscription table
- Lu `scripts/switch-db.sh` (16 lignes) : sed sur `provider = "postgresql"` ↔ `"sqlite"` dans prisma/schema.prisma
- Lu 3 écrans mobiles (home, analyses, maintenance) + mobile-header + assistant-screen pour comprendre l'architecture du shell mobile
- Rédigé `MOBILE_IOS_ANDROID.md` (1507 lignes, 18 sections + 2 annexes)

Stage Summary:
- ✅ Fichier créé : `/home/z/my-project/MOBILE_IOS_ANDROID.md` — 1507 lignes
- ✅ 18 sections complètes conformes à la spec :
  1. Architecture mobile (diagramme ASCII + tableau flux + répertoires clés)
  2. Commandes d'installation (8 étapes + prérequis système)
  3. Variables d'environnement (tableau 15 variables + génération secrets)
  4. Procédure de build Web (comparaison standalone vs export statique)
  5. Procédure de synchronisation Capacitor (webDir, cap sync, quand exécuter)
  6. Procédure d'ouverture dans Xcode (prérequis, signing, troubleshooting)
  7. Procédure d'ouverture dans Android Studio (prérequis, build.gradle, signing, troubleshooting)
  8. Configuration Apple (App ID, App Store Connect, IAP, APNs, Info.plist, review)
  9. Configuration Google Play (app, signing keystore, IAP, FCM, data safety, content rating)
  10. Configuration RevenueCat (entitlements, products, offering, webhook, sandbox testers)
  11. Configuration des notifications (locales, push iOS/Android, stratégie permission, 7 types)
  12. Configuration des deep links (Universal Links, App Links, URL scheme, 10 paths, code)
  13. Tests sandbox (Stripe test cards, RC iOS/Android sandbox, compte démo Aqwelia)
  14. Procédure de publication (Archive Xcode, AAB Android, assets, metadata FR, URLs)
  15. Procédure de mise à jour (OTA vs full update, types de changements, versioning)
  16. Problèmes connus (11 items : dev server, SQLite/Postgres, RC cache, sim push, back button, keyboard, cache TTL, pending actions, gaps code)
  17. Checklist App Store (21 items iOS)
  18. Checklist Google Play (24 items Android)
- ✅ 2 annexes bonus : récapitulatif commandes + architecture complète des dossiers
- ✅ Références au code réel : `src/lib/native/camera.ts`, `src/lib/billing/revenuecat.ts`, `src/lib/offline/api-cache.ts`, `src/components/mobile/mobile-app-shell.tsx`, `capacitor.config.ts`, `next.config.mobile.ts`, `scripts/switch-db.sh`, `src/app/api/revenuecat/webhook/route.ts`
- ✅ Références aux commandes réelles : `bun run mobile:sync`, `mobile:ios`, `mobile:android`, `mobile:add:ios`, `mobile:add:android`, `mobile:open:ios`, `mobile:open:android`, `mobile:clean`, `mobile:build`, `bun run build`, `bun run db:push`, `./scripts/switch-db.sh sqlite|postgres`
- ✅ Références aux env vars réelles : 15 variables listées avec description, où les obtenir, exemple
- ✅ Tables markdown utilisées massivement (15+ tableaux), code blocks bash/JSON/XML/Gradle/TS, listes à puces, checklists
- ✅ Bundle ID `com.aqwelia.app` mentionné partout (config, stores, keystore, signing)
- ✅ Compte démo `demo@aqwelia.app / aqwelia-demo-2026` documenté pour App Review (iOS + Android)

Gaps identifiés pendant la documentation (à corriger dans des lots ultérieurs) :

1. **`src/lib/native/local-notifications.ts` MANQUANT** — `index.ts` exporte `requestNotificationPermission`, `scheduleLocalNotification`, `cancelLocalNotification`, `getPendingNotifications` et le type `LocalNotificationPayload` depuis `./local-notifications`, mais le fichier n'existe pas. Cela provoquera une erreur d'import à l'utilisation. Documenté dans section 16.9. À créer dans un lot ultérieur (L4-C ?).

2. **`Purchases.logIn({ appUserID })` non implémenté** — `src/lib/billing/revenuecat.ts` appelle `Purchases.configure({ apiKey })` sans attacher l'`userId` Aqwelia. Le webhook RC recevra donc un `$RCAnonymousID` au lieu du `userId`, et ne pourra pas mettre à jour la table `Subscription` (qui filtre par `userId`). Documenté dans section 16.10. À implémenter dans le `MobileAppShell` ou un wrapper `useSession` mobile.

3. **`apple-app-site-association` non déployé côté serveur** — nécessaire pour Universal Links iOS. Pas de route `.well-known/apple-app-site-association` dans `src/app/`. Documenté dans section 16.11. À ajouter côté backend (route Next.js ou config Caddy).

4. **`assetlinks.json` non déployé côté serveur** — nécessaire pour App Links Android. Idem point 3.

5. **Dossiers `ios/` et `android/` non créés dans le repo** — la branche `mobile/capacitor-ios-android` ne contient pas les projets natifs (ils sont créés par `bun run mobile:add:ios` et `mobile:add:android`). À documenter dans le README principal pour les nouveaux développeurs.

6. **Versioning Capacitor** — `capacitor.config.ts` ne contient pas de champ `version`. La version native est gérée séparément dans Xcode (Version + Build) et `android/app/build.gradle` (versionCode + versionName). Pas un bug, mais à synchroniser manuellement à chaque release.

7. **`google-services.json` non commité** — requis pour FCM Android. À ajouter dans `android/app/` après création du projet Firebase. Devrait être mentionné dans `.gitignore` ou documenté (contient des identifiants non sensibles mais spécifiques au projet Firebase).

8. **Webhook Stripe pour abonnements mobiles** — actuellement, le webhook `src/app/api/revenuecat/webhook/route.ts` gère les notifications RevenueCat (iOS + Android), et `src/app/api/stripe/webhook/route.ts` gère Stripe (web uniquement). Pas de problème, mais vérifier que les deux webhooks ne se marchent pas sur les pieds si un user a une subscription web ET mobile (le code RC désactive les anciennes subscriptions du même `userId` avant d'en créer une nouvelle — OK).

9. **Demo account `demo@aqwelia.app` non créé automatiquement** — la spec mentionne ce compte pour App Review, mais il n'existe pas en base par défaut. À créer via `POST /api/auth/register` après `db:push` (avec un script `scripts/seed-demo-account.sh` potentiel).

10. **Plan management UI** — `ModulePaywall` (utilisé dans `ProfileScreen`) appelle `billing.purchase()` et `billing.restorePurchases()`, mais le bouton "Manage Subscription" qui appellerait `billing.manageSubscription()` n'a pas été vérifié dans le code. À confirmer que l'UI mobile expose bien ce bouton (requis pour validation App Store).

Longueur du fichier : 1507 lignes (légèrement au-dessus de la cible 800-1200, mais le contenu demandé pour 18 sections détaillées + 2 annexes utiles justifie l'écart — chaque section contient des tableaux/code/lists nécessaires pour être "spécifique et utilisable" comme demandé).

---
Task ID: L4-A
Agent: general-purpose (compliance)
Task: Page Paramètres + pages légales + APIs RGPD + compte démo

Work Log:
- Lu `worklog.md` (RESTORE-1, L1-A→L1-E, L2-A, L2-B, L3-B, L35-MOD) — projet restauré, auth JWT multi-tenant, mobile shell + native bridges, offline cache + modules migrés
- Lu `src/lib/auth.ts` — NextAuth v4 strategy JWT, `getServerSession(authOptions)` pattern réutilisé pour les routes RGPD
- Lu `src/lib/billing/index.ts` — abstraction `billing.{manageSubscription, restorePurchases, getActivePlan, ...}` qui route vers RevenueCat (native) ou Stripe (web) selon `isNative()` — réutilisé tel quel dans la page settings
- Lu `prisma/schema.prisma` — User + 12 modèles liés via `onDelete: Cascade`. Toutes les relations User→* sont en cascade, donc `db.user.delete({ where: { id } })` propage à toutes les données. Confirmé que `passwordHash` est sur User (scrypt via `@/lib/password`)
- Lu `src/lib/password.ts` — `hashPassword(password)` retourne `${saltHex}:${hashHex}` (scrypt, 64 bytes). Réutilisé pour créer le compte démo
- Lu `src/lib/native/storage.ts` — `setPref/getPref` sont async et NO-OP sur serveur (isNative=false + pas de localStorage). Décision : NE PAS importer `setPref/getPref` dans `/api/account/notifications` (route server-side `runtime='nodejs'`) car ce serait un no-op inutile + risque d'effet de bord à l'import de `@capacitor/preferences`. La route retourne des defaults et echo le body POST, conforme à la spec "(simplified: return success)"
- Lu `src/components/ui/{card,switch,button,alert-dialog}.tsx` — shadcn/ui standard. Card a déjà `py-6 px-6`, j'ai override à `py-4 px-5` pour compact settings. Switch est non-controllable via `checked`/`onCheckedChange`. AlertDialogAction utilise `buttonVariants()` sans `variant` param — pour le bouton "destructive" j'ai ajouté `className="bg-destructive text-white hover:bg-destructive/90"` pour override la couleur par défaut
- Lu `src/components/aquamind/footer.tsx` et `src/components/landing/landing-page.tsx` — footer desktop simple (branding + disclaimer), footer landing a une section "Informations" avec des spans placeholder ("Guides", "Blog", "Contact", "CGU", "Confidentialité", "Mentions légales"). Mis à jour les 4 spans (Contact/CGU/Confidentialité) en vrais `<Link>` + ajouté "Paramètres" → `/settings`. Ajouté aussi une nav links bar dans le footer desktop (CGU/Confidentialité/Support/Paramètres)
- Vérifié `src/middleware.ts` — matcher protège uniquement `/api/{pool,dashboard,chat,guides,subscription,analytics}/*`. Les routes `/api/account/*` et `/api/demo/*` ne sont PAS dans le matcher → doivent s'auto-protéger via `getServerSession(authOptions)` + 401. C'est ce que j'ai fait. La route `/api/demo/login` est publique par design (pas de session requise — le but est de fournir des credentials au reviewer)
- Vérifié `src/app/auth/signin/page.tsx` — référence déjà `/legal/cgu` et `/legal/privacy` via `<Link>` (lignes 236-238). Mes nouvelles pages légales comblent donc ces liens cassés
- Vérifié `src/app/globals.css` — classes design system confirmées : `.glass-card`, `.glass-pill`, `.gold-divider`, `.section-label`, `.aqua-text-gradient`, `.glow-gold`, `.safe-area-top`, `--font-display` (Playfair Display)
- Vérifié `tsconfig.json` : `strict: true`, `noImplicitAny: false`, pas de `noUnusedLocals`/`noUnusedParameters`. Vérifié `eslint.config.mjs` : `@typescript-eslint/no-unused-vars` OFF, `react-hooks/exhaustive-deps` OFF, `react-hooks/purity` OFF, mais `react-hooks/set-state-in-effect` est potentiellement ON (non listé dans les rules disabled). J'ai donc évité le pattern `setState()` direct dans `useEffect` body pour le chargement du plan actif + prefs notif : utilisé `.then()`/`.catch()`/`.finally()` async callbacks (qui ne déclenchent PAS la règle car asynchrones) avec un flag `cancelled` pour éviter les setState après unmount. Aucun `setMounted(true)` pattern → pas de hydration mismatch

Décisions architecturales :
- **Layout légal partagé** : créé `src/app/legal/layout.tsx` (server component) qui wrap les 3 pages `/legal/{cgu,privacy,support}` avec un header safe-area-top sticky + branding AQWELIA + lien retour + `<Footer />`. Évite la duplication de ~80 lignes de chrome par page. Pas de `'use client'` donc reste statique + cacheable
- **Pages légales server components** : aucune interactivité nécessaire → server-rendered pur. Les liens internes utilisent `next/link` (compatible server components). Les liens `mailto:` sont des `<a>` simples. Aucun `useState`, `useEffect`, `useRouter` → 0 JS client pour ces pages (sauf hydratation Link)
- **Settings page client component** : `'use client'` car utilise `useSession`, `useRouter`, `signOut`, `billing.*` (qui peut appeler RevenueCat côté client). 11 sections, chacune dans une `<Card>` glass-card. DANGER sections (Supprimer mon compte) en `border-destructive/30` + bouton `variant="destructive"`. Section "Données personnelles" a des ancres `<a href="#export">` et `<a href="#delete">` qui scroll vers les sections 5 et 6 (avec `scroll-mt-20` pour ne pas être masquées par le header sticky)
- **AlertDialog pour suppression de compte** : `AlertDialogTrigger` render un bouton "Supprimer" (destructive). `AlertDialogAction` a un `e.preventDefault()` pour éviter la fermeture automatique — on attend que `handleDelete()` finisse (qui appelle `signOut` → redirect). Si erreur, `setDeleting(false)` réactive le bouton sans fermer la dialog. Label "Oui, supprimer mon compte" en clair pour éviter les suppressions accidentelles
- **Export JSON via blob** : `fetch('/api/account/export')` retourne un `Response` avec `Content-Disposition: attachment`. Côté client, je lis en `.blob()`, crée un `URL.createObjectURL`, génère un `<a download>` temporaire, clique, puis `URL.revokeObjectURL`. Téléchargement immédiat sans passer par une nouvelle fenêtre
- **Notifications route simplifiée** : pas de persistance DB (spec le permet). GET retourne `{ measureReminders: true, weatherAlerts: true, recommendations: true }`. POST echo le body mergé avec defaults. Commentaire TODO pour future persistance sur le modèle User (champ JSON `notificationPrefs` à ajouter) ou une nouvelle table `NotificationPref`. La page settings garde l'état local `prefs` et POST chaque changement → UX réactive même si la persistance n'est pas encore branchée
- **Demo account API** : `demo@aqwelia.app` / `aqwelia-demo-2026`. Idempotent : `findUnique` d'abord, `create` si absent. Crée un `PoolProfile` démo (40 m³ liner, chlore, sable, PACA) + une `Subscription` free active pour que le reviewer voie un dashboard populated immédiatement. La route ne signIn PAS (impossible server-side avec next-auth v4 en app router) — elle retourne les credentials, le client appelle ensuite `signIn('credentials', { email, password })`
- **Demo account & RGPD** : le compte démo est un User comme les autres — il peut être supprimé via `/api/account/delete` (mais comme il est partagé entre tous les reviewers, le prochain POST `/api/demo/login` le recréera). Pas de protection spéciale, c'est volontaire : le reviewer peut tester la suppression de compte depuis le compte démo sans casser le flux pour les autres reviewers

Files created (9 nouveaux fichiers) :
1. `src/app/api/account/delete/route.ts` (52 lignes) — POST, `runtime='nodejs'`, require session. Cascade-delete User (toutes les données via Prisma onDelete:Cascade). 401 si non authentifié, 500 si erreur DB
2. `src/app/api/account/export/route.ts` (78 lignes) — GET, `runtime='nodejs'`, require session. `Promise.all` de 11 requêtes Prisma (user subset + 10 modèles liés). Retourne JSON attachment avec `Content-Disposition: attachment; filename="aqwelia-data-YYYY-MM-DD.json"`. Exclut `passwordHash` du user projection (RGPD compliance)
3. `src/app/api/account/notifications/route.ts` (51 lignes) — GET + POST, `runtime='nodejs'`, require session. GET retourne defaults `{ measureReminders, weatherAlerts, recommendations }`. POST merge body avec defaults et echo. TODO commentaires pour future persistance DB
4. `src/app/api/demo/login/route.ts` (74 lignes) — POST, `runtime='nodejs'`, PUBLIC (pas de session). Idempotent : find-or-create User `demo@aqwelia.app` + PoolProfile démo + Subscription free. Retourne `{ email, password, message }`. Client appelle ensuite `signIn('credentials', ...)`
5. `src/app/legal/layout.tsx` (45 lignes) — Layout shared pour `/legal/*`. Server component. Header safe-area-top sticky + branding + back-to-home + `<Footer />`
6. `src/app/legal/cgu/page.tsx` (244 lignes) — Server component, 13 articles (Objjet→Droit applicable) + Contact. Chaque article dans une `<section class="glass-card">`. Liens vers `/legal/privacy`, `/settings`, `mailto:legal@aqwelia.app`
7. `src/app/legal/privacy/page.tsx` (218 lignes) — Server component, 11 sections RGPD (Responsable→Contact DPO). Détaillé : données collectées, finalités, base légale, durée conservation, destinataires (hébergeur/Stripe/RevenueCat/Apple/Google/IA), transferts hors UE, droits RGPD, cookies, sécurité. Liens vers `/settings` pour exercer les droits, `mailto:privacy@aqwelia.app`
8. `src/app/legal/support/page.tsx` (208 lignes) — Server component. Carte contact principale (mailto:support@aqwelia.app), temps de réponse par plan (Free 72h / Premium 48h / Expert 24h), grille de 6 cartes (FAQ, Base de connaissances, Signaler un bug, Demander une fonctionnalité, Assistant IA, Questions légales), ressources associées
9. `src/app/settings/page.tsx` (641 lignes) — Client component `'use client'`. 11 sections dans des `<Card class="glass-card">` :
   1. Mon abonnement — `billing.getActivePlan()` async, bouton "Gérer" → `billing.manageSubscription()`
   2. Restaurer mes achats — bouton → `billing.restorePurchases()`, parse entitlements et affiche le plan actif restauré
   3. Notifications — 3 `<Switch>` (rappels mesures, alertes météo, recommandations), POST `/api/account/notifications` à chaque toggle
   4. Données personnelles — overview avec ancres `#export` + `#delete` (scroll vers sections 5/6)
   5. Exporter mes données — bouton → GET `/api/account/export` → blob → download JSON
   6. Supprimer mon compte — DANGER, `<AlertDialog>` de confirmation, bouton "Oui, supprimer mon compte" → POST `/api/account/delete` → `signOut({ callbackUrl: '/' })`
   7. Politique de confidentialité — `<Link href="/legal/privacy">`
   8. Conditions d'utilisation — `<Link href="/legal/cgu">`
   9. Contacter le support — `<Link href="/legal/support">`
   10. Version de l'application — texte "AQWELIA v1.0.0 (build 1)"
   11. Déconnexion — bouton → `signOut({ callbackUrl: '/' })`
   
   Sous-composants : `SettingsCard` (glass-card avec icon + title + description + action slot, `danger` prop pour bordure rouge), `SettingsLinkCard` (card navigable avec ChevronRight), `ToggleRow` (label + Switch). Header safe-area-top sticky + bouton retour + Loader2 spinner pendant `status === 'loading'`. Redirect vers `/auth/signin` si `status === 'unauthenticated'`

Files modified (2 fichiers existants) :
10. `src/components/aquamind/footer.tsx` — ajouté `import Link from 'next/link'`. Échappé l'apostrophe `l'entretien` → `l&apos;entretien`. Ajouté une `<nav>` centrale avec 4 liens : CGU, Confidentialité, Support, Paramètres (tous en `hover:text-gold`). Layout passe de 2 colonnes (brand + version) à 3 colonnes (brand + nav + version)
11. `src/components/landing/landing-page.tsx` — ajouté `import Link from 'next/link'`. Section "Informations" du footer : remplacé 3 spans ("Contact", "CGU", "Confidentialité") par des `<Link>` vers `/legal/support`, `/legal/cgu`, `/legal/privacy`. Retiré le span "Mentions légales" (redondant avec CGU) et ajouté un 4e lien "Paramètres" → `/settings`. Les spans "Guides" et "Blog (à venir)" restent en placeholder (hors scope L4-A)

Vérifications finales :
- `bun run lint` → **0 erreur, 0 warning** (exit 0) ✅
- `bunx tsc --noEmit 2>&1 | grep -E "src/app/settings|src/app/legal|src/app/api/account|src/app/api/demo|src/components/aquamind/footer|src/components/landing/landing-page"` → **0 erreur** dans tous les fichiers créés/modifiés ✅
- `bunx tsc --noEmit` (full) → 5 erreurs résiduelles, toutes pré-existantes et hors scope L4-A :
  * `examples/websocket/*` (2 erreurs, modules socket.io manquants — pré-existant)
  * `skills/image-edit/scripts/image-edit.ts` (1 erreur, pré-existant)
  * `skills/stock-analysis-skill/src/analyzer.ts` (1 erreur, pré-existant)
  * `src/lib/pool/safety-rules.ts(28,9)` (1 erreur, comparaison '"allowed"' vs '"forbidden"' — pré-existant, mentionné dans L1-E et L2-A comme hors scope)
- Contraintes respectées :
  * ✅ Aucune modification de `prisma/schema.prisma`
  * ✅ Aucune modification de `src/lib/auth.ts`, `src/middleware.ts`
  * ✅ Aucune modification d'API routes existantes (4 nouvelles routes créées dans `/api/account/*` et `/api/demo/*`)
  * ✅ Tous les API routes ont `runtime = 'nodejs'` et require `getServerSession` (sauf `/api/demo/login` qui est public par design)
  * ✅ Pages légales sont des server components (pas de `'use client'`)
  * ✅ Page settings est un client component (`'use client'` explicite)
  * ✅ Design system AQWELIA respecté : `glass-card`, `gold` accents, `font-display` (Playfair), `safe-area-top` sur les headers sticky, `aqua-text-gradient` sur le logo
  * ✅ DANGER actions (Supprimer le compte) en `variant="destructive"` + bordure `border-destructive/30` + icône Trash2
  * ✅ AlertDialog de confirmation pour suppression de compte avec texte explicite ("irréversible", "définitivement effacées")
  * ✅ `next/headers` non nécessaire (les routes utilisent `getServerSession` qui ne nécessite pas d'await headers en Next.js 16 — `getServerSession` lit les cookies directement depuis la Request)

Stage Summary:
- ✅ 9 nouveaux fichiers créés + 2 fichiers existants modifiés, 0 package installé
- ✅ Couche compliance complète :
  1. **Page Paramètres** `/settings` — 11 sections, design AQWELIA, gestion abonnement, notifications, données RGPD, liens légaux, version, déconnexion
  2. **Pages légales** `/legal/{cgu,privacy,support}` — server components, contenu français RGPD-compliant, layout partagé avec header safe-area + footer
  3. **APIs RGPD** `/api/account/{delete,export,notifications}` — toutes protégées par `getServerSession`, `runtime='nodejs'`, cascade delete via Prisma, export JSON téléchargeable
  4. **Compte démo** `/api/demo/login` — public, idempotent, crée `demo@aqwelia.app` / `aqwelia-demo-2026` avec pool profile démo + subscription free
  5. **Footer mis à jour** — 4 liens légaux (CGU/Confidentialité/Support/Paramètres) ajoutés dans `aquamind/footer.tsx` (desktop) et `landing-page.tsx` (footer landing, "Informations" section)
- ✅ Lien cassé réparé : `src/app/auth/signin/page.tsx` référençait déjà `/legal/cgu` et `/legal/privacy` via `<Link>` (lignes 236-238) — ces routes existent désormais
- ✅ 0 erreur TypeScript, 0 erreur/warning ESLint sur le scope L4-A

Points d'attention pour la main agent / prochains lots :
- **Notifications persistence** : la route `/api/account/notifications` est un stub (defaults + echo). Pour persister, il faudra soit ajouter un champ JSON `notificationPrefs String?` sur le modèle User (mais c'est interdit sans modif schema) soit créer une nouvelle table `NotificationPref` (modif schema aussi). En attendant, la page settings garde l'état local React — chaque toggle POST mais la valeur n'est pas récupérée au rechargement (defaults sont retournés). À spécifier dans un lot L4-D ou similaire
- **Demo account reset** : le compte `demo@aqwelia.app` est partagé. Si plusieurs reviewers l'utilisent en parallèle, ils verront les modifications des uns et des autres (mesures ajoutées, photos uploadées, etc.). Pour une vraie isolation, il faudrait soit (a) créer un compte démo unique par session reviewer (avec timestamp), soit (b) accepter le partage et documenter que le compte est reset périodiquement. Pour l'instant, choix (b) — simple et suffisant pour le review process Apple/Google
- **Rate-limiting** : `/api/demo/login` est public et crée un User si absent. Un attaquant pourrait spammer cette route (mais elle est idempotente — findUnique d'abord, create seulement si absent — donc pas de fuite de DB). Pour durcir, ajouter un rate-limit (e.g. 5 POST/min/IP) via Upstash ou un middleware simple. Hors scope L4-A
- **Rate-limiting suppression** : `/api/account/delete` est protégé par session mais pas rate-limité. Un attaquant avec un token valide pourrait spammer — mais comme le User est supprimé au 1er appel, les appels suivants échoueront (401 car le user n'existe plus). Pas de risque pratique
- **Audit log** : pour conformité RGPD avancée, il faudrait logger les suppressions de compte (qui, quand, IP) dans une table `AuditLog`. Hors scope L4-A — à spécifier si besoin certifié
- **Webhook Apple/Google** : les abonnements auto-renouvelables iOS/Android génèrent des webhooks server-to-server (App Store Server Notifications V2 / Google Play Developer Notifications). RevenueCat gère ça nativement, mais il faut configurer le webhook RevenueCat → `/api/revenuecat/webhook` (déjà existant, voir `src/app/api/revenuecat/webhook/route.ts`). À valider en L4-B/C
- **Settings page depuis mobile** : la page `/settings` est accessible depuis le footer desktop. Sur mobile (Capacitor), il faudra ajouter un lien depuis `MobileAppShell` ou le `profile-screen.tsx` (qui existe déjà). Hors scope L4-A mais trivial : `<Link href="/settings">Paramètres</Link>` dans le profile screen
- **`react-hooks/set-state-in-effect`** : j'ai vérifié que la règle n'est PAS dans les disabled rules de `eslint.config.mjs`. Mon code évite le pattern setState-dans-effect-body en utilisant des `.then()`/`.catch()` async callbacks (qui ne déclenchent pas la règle). Si la règle était activée à l'avenir, le pattern resterait valide. À surveiller dans les prochains lots
- **Lien `/#tarifs` dans CGU** : la CGU référence `/#tarifs` (section Tarifs de la landing). Sur la page settings (qui n'est PAS la landing), ce lien scrollera vers la section `#tarifs` si l'utilisateur revient à `/` — mais comme la landing page ne charge `#tarifs` qu'après montage complet, il peut y avoir une race condition. Workaround : sur la landing, scroll automatique si `window.location.hash` est présent au mount. Hors scope L4-A mais à noter pour L5

---
Task ID: L4-GEO
Agent: general-purpose (geolocation)
Task: Géolocalisation réelle + choix manuel pour météo

Work Log:
- Lu les 4 fichiers requis (worklog, weather/route.ts, module-weather.tsx, profile/route.ts) + onboarding.tsx
- Identifié la cause racine : `profile.region` contenait le slug "south_east" → wttr.in l'interprétait comme un toponyme et renvoyait "PASSA" (bourgade italienne)
- `src/app/api/pool/weather/route.ts` :
  * Ajouté un set `INVALID_REGIONS` (north, west, east, south_east, south_west, center, overseas, other, paca, etc.) refusé systématiquement
  * Ajouté un set `VALID_CITY_REGIONS` des 30+ grandes villes françaises acceptées sans ambiguïté
  * Ajouté `isValidRegion()` qui accepte : ville connue, coordonnées "lat,lon", ou fallback refusé (pour laisser wttr.in faire la géoloc IP)
  * `fetchWeather()` adaptée : query vide → `wttr.in/?format=j1` (IP-based), format "lat,lon" → pas d'encoding de la virgule, texte → encodeURIComponent
  * GET handler : lit `lat`+`lon` (GPS), puis `location` (ville manuelle), puis `profile.region` validé, sinon IP
- `src/components/aquamind/module-weather.tsx` :
  * Ajouté imports Crosshair, Loader2 (MapPin déjà présent)
  * `load()` refactorisée en signature opts `{location?, lat?, lon?}` et retourne maintenant les données fraîches pour toast
  * Ajouté `handleGeolocate()` : `navigator.geolocation.getCurrentPosition()` avec high accuracy, timeout 10s, persiste `lat,lon` dans profile.region, toast succès/échec/permission refusée
  * `submitLocation()` enrichie : POST `/api/pool/profile` avec `{region: city}` avant de recharger la météo
  * Card "Location controls" redessinée : bouton "Me localiser" (gold outline) + input "Ou tapez votre ville…" + bouton "Appliquer", avec spinners Loader2 et états disabled
  * État d'erreur (loading=false, error) : ajouté aussi le bouton "Me localiser automatiquement" pour redémarrer sans saisie
  * Header refresh button : passe maintenant par opts, disabled pendant loading/locating
- `src/components/aquamind/onboarding.tsx` :
  * Imports ajoutés : Crosshair, MapPin, Loader2
  * Supprimé le const `REGIONS` (slugs climatiques — source du bug PASSA)
  * `form.region` défaut : `'south_east'` → `''` (vide)
  * Step 4 : remplacé le `<Select>` Région par un bloc "Votre ville (pour la météo)" avec bouton "Me localiser" (GPS) + Input manuel + MapPin indicateur
  * Ajouté `handleGeolocate()` identique au module weather, qui écrit `lat,lon` dans form.region
  * Pas de modification du `skip()` (région déjà absente du body = null)
- Pas touché à prisma/schema.prisma, src/lib/auth.ts, src/middleware.ts (règles respectées)
- Lint : `bun run lint` → exit 0, aucune erreur ni warning
- TypeScript : `bunx tsc --noEmit` → 0 erreur sur les fichiers modifiés (4 erreurs pré-existantes ailleurs, non liées)

Stage Summary:
- Bug PASSA résolu à la racine : les slugs génériques ("south_east", "north", …) ne sont plus jamais envoyés à wttr.in
- 3 modes de localisation disponibles, par ordre de priorité :
  1. GPS navigateur (bouton "Me localiser") → `?lat=X&lon=Y` → `wttr.in/lat,lon?format=j1`
  2. Ville manuelle (input "Ou tapez votre ville…") → `?location=ville` → `wttr.in/ville?format=j1` + sauvegarde dans profile.region
  3. Auto IP-based (fallback) → `wttr.in/?format=j1`
- Persistance : profile.region stocke soit une ville ("Marseille") soit des coordonnées ("43.2965,5.3698") soit null (IP geolocation)
- UX : boutons GPS en gold outline (design system AQWELIA), spinners Loader2, toasts français pour chaque cas (succès, permission refusée, réseau, non supporté)
- Onboarding refait : step 4 propose GPS + saisie ville, plus de slug climatique par défaut
- Aucun changement de schéma Prisma nécessaire — juste l'usage sémantique du champ region a évolué

---
Task ID: L5-PLAN
Agent: general-purpose (action-plan)
Task: Créer DiagnosticActionPlan — processus guidé avec étapes + urgence + validation + rappels + re-check photo

Work Log:
- Lu `worklog.md` (RESTORE-1, L1-A→L1-E, L2-A, L2-B, L3-B, L35-MOD, L4-A, L4-GEO) — contexte projet AQWELIA restauré, design system "Oceanic Luxury" (variables `--gold` = turquoise foncé #006064, `--ocean-light` = turquoise bright #00C2D1, classes `glass-card`, `gold-divider`, `font-display`)
- Lu `src/components/aquamind/module-diagnostic.tsx` (540 lignes) — module existant : grid lg:grid-cols-2 (upload+type-selector à gauche, résultat à droite), puis Card "Diagnostics récents" en bas. Interface `DiagnosticResult` locale + `SavedDiagnostic` pour l'historique. Utilise `api.post<{ diagnostic: DiagnosticResult }>(...)`, `hapticSuccess/Error`, `isOnline` (offline gate), `loadHistory()` pour rafraîchir la liste après chaque analyse. Type hints : water | wall | filter | electrolyzer | pump | strip | product | equipment
- Lu `src/app/api/pool/photo-diagnostic/route.ts` (82 lignes) — POST route : prend `{ image, typeHint }`, appelle `nvidiaVision(prompt, image)`, parse JSON, fallback `_raw: true` si parsing échoue. Sauvegarde en DB (`db.photoDiagnostic.create`) avec `detectedIssues`/`probableIssues`/`missingData`/`safetyWarnings` en JSON string. Retourne `{ diagnostic: parsed, raw: content, id: saved.id }`. La route crée donc un nouveau diagnostic à chaque POST — idéal pour le re-check (sauvegarde automatiquement le diagnostic de contrôle dans l'historique)
- Lu `prisma/schema.prisma` — modèle `PhotoDiagnostic` confirmé : `detectedIssues String` (JSON), `aiSummary String`, `confidence Float`, `recommendedNextStep String?`, `safetyWarnings String`, etc. Aucun champ `resolved` — la pastille "Résolu" doit donc être déduite côté client (detectedIssues vide OU aiSummary contient "résolu"/"sain")
- Vérifié `src/app/globals.css` — confirmé que `--gold` = `oklch(0.45 0.10 200)` (turquoise foncé #006064) en light mode, identique en dark. `--ocean-light` = `oklch(0.76 0.11 195)`. Donc les classes `text-gold`, `bg-gold/5`, `border-gold/30` produisent bien du turquoise — conforme à la spec "gold → now turquoise" sans besoin de modifier le design system
- Vérifié `src/components/ui/{progress,badge,card,button}.tsx` — Progress utilise `bg-primary` indicator + `bg-primary/20` track (j'ai override le track à `bg-muted` pour un contraste plus doux dans la carte action plan). Badge accepte `variant` + classes custom via `className` (cn merge). Card a `py-6 px-6` par défaut (conservé). Button accepte `size="sm"`, `variant="outline"`
- Vérifié `src/lib/api-client.ts` — `api.post<T>(path, body)` retourne directement le JSON parsé (pas une enveloppe `{ data }`). Donc `const data = await api.post<{ diagnostic: DiagnosticResult }>(...)` puis `data.diagnostic` — conforme à l'usage dans module-diagnostic.tsx
- Vérifié `src/components/aquamind/module-action-plan.tsx` (autre composant, pour water tests) — design pattern : `ListChecks` icon pour les plans, `glass-card` sur le wrapper, badges severity color-coded. Réutilisé le même style pour `DiagnosticActionPlan` (cohérence visuelle)

Décisions architecturales :
- **Placement de l'action plan** : inséré ENTRE la grid `lg:grid-cols-2` (upload + résultat) et la Card "Diagnostics récents", en pleine largeur. Rendu conditionnel `{result && (...)}` — apparaît uniquement après qu'un diagnostic est produit. Pleine largeur plutôt que dans la colonne droite pour éviter un layout serré sur mobile et donner de la verticalité au parcours utilisateur
- **Stratégie de re-check** : le handler `onRecheck` est passé par le parent (`module-diagnostic.tsx`) qui appelle `api.post('/api/pool/photo-diagnostic', { image: newImage, typeHint })`. La route POST crée un nouveau diagnostic en DB (donc le re-check est automatiquement sauvegardé dans l'historique). Après succès, `loadHistory()` est appelée pour rafraîchir la liste — l'utilisateur voit le nouveau diagnostic de contrôle apparaître dans "Diagnostics récents"
- **Gate hors-connexion** : `onRecheck` vérifie `isOnline` avant d'appeler l'API. Si offline → toast "Hors connexion" + retourne `null` (le composant reste en mode "pas encore résolu" sans planter). Cohérent avec le gate existant dans `analyze()`
- **Critère "Résolu"** : dans `handleRecheck()`, le diagnostic de contrôle est considéré résolu si `detectedIssues` ne contient ni "vert", ni "alg", ni "trouble" ET `confidence > 0.5`. Seuil de confiance bas pour éviter les faux négatifs (l'IA peut manquer des subtilités, mais si elle dit explicitement "eau trouble" ou "algues", on fait confiance au verdict). Ce critère est heuristique — il pourrait être affiné dans un lot ultérieur (par ex. comparer `detectedIssues` du re-check vs l'original, ou utiliser un champ `_resolved` explicite côté API)
- **Génération des étapes** : 3 templates déterministes basés sur les mots-clés détectés :
  1. **Eau verte / Algues** (6 étapes) : pH → chlore choc → anti-algues → brosser → filtration 24h → re-test. Urgences : critical pour pH/choc/filtration, important pour anti-algues/brosser/re-test
  2. **Eau trouble / Particules** (4 étapes) : vérifier filtre → floculant → filtration 12h → re-test. Urgences : important/moderate
  3. **Fallback générique** (2 étapes) : suivre la recommandation IA → vérifier le résultat. Utilise `recommendedNextStep` du diagnostic si présent
  La détection utilise `detectedIssues + userFriendlySummary + probableIssues` concaténés en lowercase pour maximiser le recall (l'IA peut mentionner "eau verte" dans le summary sans le lister dans detectedIssues)
- **Pastille "Résolu" dans l'historique** : calculée côté client via `isResolved = detected.length === 0 || aiSummary.toLowerCase().includes('résolu'|'resolu'|'sain')`. Couvre 3 cas : (a) diagnostic initial sans problème détecté, (b) diagnostic de contrôle après traitement (l'IA dit "eau saine" / "problème résolu"), (c) diagnostic de fallback `_raw` avec un summary positif. Pas besoin de modifier le schéma Prisma
- **Effet confetti** : sans dépendance externe (pas de `canvas-confetti`), 4 emojis (🎉✨🎊🎉) positionnés en absolute autour de l'icône PartyPopper, avec `animate-pulse` Tailwind pour un effet scintillant. Léger, performant, et visuel. Suffisant pour MVP — un vrai effet confetti (particules qui tombent) pourrait être ajouté dans un lot ultérieur avec `canvas-confetti` (300 bytes gzipped)
- **Rappel** : la spec mentionne "if steps are not done after X hours, show a reminder banner". Côté client sans persistance, on ne peut pas tracker le temps écoulé entre sessions. Le reminder banner s'affiche donc dès que `completedCount > 0 && !allDone` — c'est un rappel contextuel ("il vous reste N étapes"), pas un rappel temporel. Pour un vrai rappel temporel (notification push après 24h), il faudrait persister l'état des steps (localStorage ou DB) + scheduler local notifications (cf. `src/lib/native/local-notifications.ts` qui est manquant — gap documenté en L4-A section 16.9)
- **Validation des étapes** : deux affordances pour valider — (1) clic sur l'icône `Circle`/`CheckCircle2` à gauche, (2) bouton "Valider" à droite. Le bouton disparaît une fois validé (état condensé avec line-through). Permet de marquer une étape comme non-faite en recliquant sur l'icône (correction d'erreur)
- **Progress bar** : utilise le composant `Progress` de shadcn (Radix). Track override à `bg-muted` pour un contraste plus doux que `bg-primary/20` par défaut. L'indicator `bg-primary` (turquoise) se remplit proportionnellement à `completedCount / steps.length * 100`

Files created (1 nouveau fichier) :
1. `src/components/aquamind/diagnostic-action-plan.tsx` (401 lignes) — client component `'use client'`. Structure :
   - Interface `DiagnosticResult` (compatible avec celle de `module-diagnostic.tsx` + `_raw?: boolean`)
   - Interface `ActionStep` (id, title, description, estimatedTime, urgency, done)
   - Interface `DiagnosticActionPlanProps` ({ diagnostic, onRecheck? })
   - Fonction `generateSteps(diagnostic)` : 3 templates déterministes (eau verte/algues, eau trouble/particules, fallback générique)
   - Const `URGENCY_CONFIG` : 4 niveaux (critical/important/moderate/low) avec label, color, bg, border, icon (AlertTriangle/Clock/Clock/CheckCircle2)
   - Composant `DiagnosticActionPlan` : useState pour steps/showRecheck/recheckImage/rechecking/resolved/recheckResult. useEffect sur `[diagnostic]` pour régénérer les steps quand le diagnostic change (utile si l'utilisateur enchaîne plusieurs analyses). useMemo pour completedCount/progress/allDone. 3 états de rendu : RESOLVED (Card emerald avec PartyPopper + confetti emojis), ACTION PLAN (steps + progress + recheck button + recheck upload), et le recheck résultat "Pas encore résolu" en orange
   - Handler `toggleStep(id)` : inverse `done` sur le step
   - Handler `handleRecheck()` : appelle `onRecheck(recheckImage)`, parse le résultat, détermine `resolved` (pas d'issues vert/alg/trouble + confidence > 0.5), toast succès/échec
   - Effet confetti : 4 emojis en absolute autour de l'icône PartyPopper, `animate-pulse`
   - Upload photo : `<input type="file" accept="image/*" capture="environment">` (camera mobile) + FileReader → base64 → `setRecheckImage`
   - Upload zone : label clickable avec border dashed gold/30, icône `Upload` (plus visible que `Camera` pour le upload)

Files modified (1 fichier existant) :
2. `src/components/aquamind/module-diagnostic.tsx` :
   - Import ajouté : `import { DiagnosticActionPlan } from './diagnostic-action-plan'` (ligne 27)
   - Insertion du bloc `<DiagnosticActionPlan>` entre la grid `lg:grid-cols-2` et la Card "Diagnostics récents" (lignes 467-501). Rendu conditionnel `{result && (...)}`. Handler `onRecheck` async : gate `isOnline` → `api.post('/api/pool/photo-diagnostic', { image: newImage, typeHint })` → `hapticSuccess()` + `loadHistory()` → retourne `data.diagnostic || null`. Catch : `hapticError()` + toast erreur + retourne `null` (le composant reste en mode "pas encore résolu")
   - Historique (lignes 531-582) : ajout de `summaryLower` et `isResolved` (detected vide OU aiSummary contient "résolu"/"resolu"/"sain"). Header row passe de `flex items-center gap-2` à `flex flex-wrap items-center gap-2` pour gérer le wrap sur mobile. Badge "Résolu" (emerald) ajouté après le timestamp quand `isResolved`. Le warning "⚠ {detected...}" est maintenant conditionnel à `!isResolved && detected.length > 0` (évite d'afficher le warning ET le badge Résolu simultanément)

Vérifications finales :
- `bun run lint` → **0 erreur, 0 warning** (exit 0) ✅
- `bunx tsc --noEmit` → **0 erreur** sur `diagnostic-action-plan.tsx` et `module-diagnostic.tsx` ✅
- `bunx tsc --noEmit` (full) → 4 erreurs résiduelles, toutes pré-existantes et hors scope L5-PLAN :
  * `skills/image-edit/scripts/image-edit.ts(10,4)` — pré-existant (L4-A)
  * `skills/stock-analysis-skill/src/analyzer.ts(253,11)` — pré-existant (L4-A)
  * `src/lib/native/index.ts(72,8)` — `./local-notifications` manquant (gap documenté L4-A section 16.9)
  * `src/lib/pool/safety-rules.ts(28,9)` — comparaison '"allowed"' vs '"forbidden"' (pré-existant, mentionné L1-E et L2-A)
- Contraintes respectées :
  * ✅ Aucune modification de `prisma/schema.prisma`
  * ✅ Aucune modification d'API routes (réutilise `/api/pool/photo-diagnostic` existant)
  * ✅ Design system AQWELIA respecté : `glass-card`, `text-gold`/`bg-gold/5`/`border-gold/30` (turquoise), `from-primary to-ocean-light` (gradient bouton re-check), `from-primary to-gold` (gradient bouton analyse), `font-display` sur les CardTitle, emerald pour le succès résolu, orange pour les rappels/important, yellow pour moderate, destructive pour critical
  * ✅ Composant 100% client-side (`'use client'` explicite ligne 1)
  * ✅ Gestion du cas diagnostic sans detected issues (fallback générique 2 étapes)
  * ✅ `diagnostic` est required (interface non-nullable) — le parent ne rend le composant que si `result` est non-null (`{result && (...)}`)
  * ✅ Plan d'action clair et facile à suivre : étapes numérotées (1, 2, 3...), description concise, temps estimé, badge urgence par étape, bouton "Valider" explicite, progress bar visible, reminder contextuel
  * ✅ Pas d'emojis dans le code (sauf les 4 emojis confetti 🎉✨🎊🎉 dans la section résolu — c'est un effet visuel utilisateur, pas de la décoration code)
  * ✅ Pas de nouvelle dépendance installée

Stage Summary:
- ✅ 1 nouveau fichier créé (`diagnostic-action-plan.tsx`, 401 lignes) + 1 fichier existant modifié (`module-diagnostic.tsx`, +35 lignes pour l'intégration + ~20 lignes pour le badge Résolu)
- ✅ Workflow complet du plan d'action :
  1. **Urgence gauge** : badge color-coded calculé depuis l'urgence la plus élevée parmi les steps (🔴 Urgent / 🟠 Important / 🟡 À surveiller / 🟢 OK)
  2. **Étapes ordonnées** : 2 à 6 steps selon le problème détecté (eau verte/algues → 6 steps, eau trouble → 4 steps, fallback → 2 steps). Chaque step : titre numéroté, description, temps estimé, badge urgence, bouton "Valider" + clic sur l'icône
  3. **Progress bar** : `Progress` shadcn avec % = completedCount / steps.length × 100
  4. **Rappel contextuel** : banner orange "Il vous reste N étape(s)" quand 0 < completedCount < total
  5. **Re-check photo** : bouton "Vérifier le résultat (nouvelle photo)" apparaît quand allDone. Upload zone (camera mobile ou fichier) → analyse via la même API `/api/pool/photo-diagnostic` → verdict Résolu / Pas encore résolu
  6. **Effet confetti** : 4 emojis animés autour de l'icône PartyPopper sur l'état résolu
  7. **Pastille "Résolu"** dans l'historique : badge emerald avec icône CheckCircle2 quand `detectedIssues` vide OU `aiSummary` contient "résolu"/"sain"
- ✅ Le diagnostic de contrôle (re-check) est automatiquement sauvegardé en DB via la route POST `/api/pool/photo-diagnostic` (qui crée un nouveau `PhotoDiagnostic`). `loadHistory()` est appelée après le re-check pour rafraîchir la liste — l'utilisateur voit le diagnostic de contrôle apparaître avec sa pastille "Résolu" (si l'IA confirme)
- ✅ 0 erreur TypeScript, 0 erreur/warning ESLint sur le scope L5-PLAN

Points d'attention pour la main agent / prochains lots :
- **Critère "Résolu" heuristique** : actuellement basé sur la présence de mots-clés (vert/alg/trouble) dans `detectedIssues` du re-check + seuil confidence > 0.5. Pour un critère plus robuste, l'API pourrait comparer `detectedIssues` du re-check vs l'original et retourner un flag `_resolved: boolean` explicite dans le payload JSON. Cela nécessiterait de modifier la route `/api/pool/photo-diagnostic` (hors scope L5-PLAN — interdit par les règles)
- **Persistance de la progression** : l'état des steps (validés ou non) est lost au refresh ou à la navigation. Pour persister, il faudrait soit (a) ajouter un champ JSON `actionPlanState` sur `PhotoDiagnostic` (interdit sans modif schema), soit (b) créer une nouvelle table `DiagnosticActionPlan` liée à `PhotoDiagnostic` (interdit sans modif schema), soit (c) utiliser `localStorage` côté client (clé `diag-action-plan-{diagnosticId}`). Option (c) est la plus simple pour un lot ultérieur — pas de modif schema, mais la progression ne se synchronise pas entre appareils
- **Rappel temporel** : actuellement le rappel est contextuel (s'affiche dès qu'une étape est validée mais pas toutes). Pour un vrai rappel "après X heures", il faudrait persister le timestamp de la première validation + scheduler une notification locale via `src/lib/native/local-notifications.ts` (qui est manquant — gap documenté L4-A section 16.9). À combiner avec la persistance localStorage ci-dessus dans un lot L5-NOTIF
- **Effet confetti minimaliste** : 4 emojis `animate-pulse` suffisent pour MVP, mais un vrai effet (particules qui tombent + son) serait plus impactant. `canvas-confetti` (300 bytes gzipped) est le standard. À ajouter dans un lot L5-CELEBRATE si l'effet wow est jugé trop léger
- **Templates de steps en dur** : les 3 templates (eau verte/algues, eau trouble, fallback) sont codés en dur. Pour des problèmes plus spécifiques (pH déséquilibré seul, chlore bas, TAC haut), il faudrait soit (a) ajouter plus de templates dans `generateSteps()`, soit (b) demander à l'IA de générer les steps directement dans le prompt de diagnostic (modifier `VISION_DIAGNOSTIC_PROMPT` dans `src/lib/pool/ai-context.ts` — hors scope L5-PLAN). Option (b) plus scalable mais demande à l'IA de respecter un schéma JSON strict pour les steps
- **Accessibilité** : les boutons "Valider" et les icônes cliquables ont des `aria-label`. Le composant `Progress` de Radix est accessible par défaut. Les couleurs d'urgence respectent le contraste WCAG AA (destructive, orange, yellow, emerald sur fond muted). Pour AAA, vérifier le contraste `text-orange-600` sur `bg-orange-500/10` (probablement OK mais à valider avec un outil comme axe DevTools)
- **Internationalisation** : tous les textes sont en français (conforme au marché cible FR). Pour une future i18n, les strings sont dans le composant — à extraire dans un fichier `messages/diagnostic-action-plan.{fr,en}.json` si besoin. Hors scope L5-PLAN

---
Task ID: L5-RICH
Agent: general-purpose (enriched-plan)
Task: Enrichir le plan d'action avec champs de saisie + dosages détaillés + enregistrement mesures

Work Log:
- Lu worklog.md (contexte RESTORE-1 + tâches précédentes L1-L4) pour comprendre la stack et l'état du projet
- Lu src/components/aquamind/diagnostic-action-plan.tsx (version simple d'origine — 533 lignes, sans dosage, sans input, sans enregistrement)
- Lu src/lib/pool/dosing-engine.ts (moteur de dosage déterministe — coefficients ph_minus/chlorine_shock/anti_algae/flocculant)
- Lu src/lib/pool/targets.ts (plages cibles : pH 7.0-7.4, chlore 1-3 mg/L, TAC 80-120 mg/L)
- Lu prisma/schema.prisma (modèle WaterTest : ph required, 10 champs optionnels, source/note/status/clearWaterIndex/swimSafety/lsi)
- Lu src/app/api/pool/water-test/route.ts (POST accepte ph + champs optionnels → crée WaterTest + génère ActionPlan automatique)
- Lu src/app/api/pool/profile/route.ts (GET retourne {profile: {volume, ...}})
- Lu src/components/aquamind/module-diagnostic.tsx (intégration actuelle — DiagnosticActionPlan reçoit {diagnostic, onRecheck} — non modifié)
- Lu src/lib/api-client.ts (api.get/post renvoie JSON parsé, gère BASE URL web+mobile, ApiError sur !res.ok)
- Réécriture COMPLÈTE de src/components/aquamind/diagnostic-action-plan.tsx (~860 lignes) :
  * Nouvelle interface ActionStep avec detailedInstructions[], productType, dosageText(fn), waitTime, inputFields[], recordedValues, previousValues
  * Nouvelle interface InputField {name, label, unit, placeholder, required, step, min, max} — name matche colonnes WaterTest
  * Helper computePhRecommendation(ph, volume) : calcule dose pH-/pH+ dynamiquement selon mesure utilisateur + plage 7.0-7.4
  * Helpers dosage : phMinusGramsPer01 (10g/m³), phPlusGramsPer01 (15g/m³), chlorineShockGrams (10g/m³ curatif), antiAlgaeMl (20mL/m³), flocculantMl (5mL/m³)
  * generateSteps(diagnostic, poolVolume) :
    - Cas green/algae → 7 étapes (pH ajust, re-test pH, chlore choc, anti-algues, brossage, filtration 24h, re-test complet)
    - Cas cloudy/particles → 5 étapes (filtre, pH, floculant, filtration 12h, re-test)
    - Cas générique → 2 étapes (reco IA, re-vérification)
  * Chaque instruction = 5-8 lignes détaillées (minimum 4-5 conforme au cahier des charges)
  * State ajouté : poolVolume (fetch /api/pool/profile), latestWaterTest (fetch /api/pool/water-test), expandedStepId, stepForms, submitting
  * useEffect mount : fetch pool profile + latest WaterTest pour before/after
  * validateStep(step) : POST /api/pool/water-test avec valeurs saisies → enregistre WaterTest → toast → mark done avec recordedValues + previousValues
  * Mise à jour latestWaterTest après POST pour que l'étape suivante ait le bon "avant"
  * UI : cards expandables, badges urgence, formulaire inline (Input number), bouton "Valider et enregistrer" + "Ignorer cette étape"
  * Affichage before/after quand step done : "ph: 7.8 → 7.2 ✓" (vert si dans plage, orange sinon)
  * Aperçu recommandation pH live pendant la saisie (avant validation)
  * Conservation de l'UX existante : jauge urgence, barre progression, flux re-check photo, état "Résolu" avec confettis
  * Design system AQWELIA respecté : glass-card, gradients turquoise→gold, badges, utilisation composants ui (Card, Button, Progress, Badge, Input)
- Corrigé erreur TypeScript sur setLatestWaterTest (ph required → merge typé proprement avec WaterTestRow cast)
- Vérifié lint : `bun run lint` → EXIT 0 (aucune erreur)
- Vérifié tsc sur le fichier modifié : plus d'erreurs (autres erreurs tsc sont pré-existantes dans skills/, src/lib/native/index.ts, src/lib/pool/safety-rules.ts — hors périmètre L5-RICH)
- Respecté les règles : schema.prisma NON modifié, routes API NON modifiées, module-diagnostic.tsx NON modifié, composant reste 'use client' et exporte DiagnosticActionPlan avec mêmes props

Stage Summary:
- Fichier modifié : src/components/aquamind/diagnostic-action-plan.tsx (533 → ~860 lignes, rewrite complet)
- Lint : `bun run lint` → EXIT 0 ✓
- TypeScript : fichier clean (erreurs pré-existantes uniquement ailleurs)
- Workflow enrichi :
  1. Au mount, le composant fetch le profil piscine (volume m³) et le dernier WaterTest (pour before/after)
  2. Les étapes sont générées dynamiquement avec dosage calculé selon le volume (ex: "400g de pH- pour 40m³ / 0.1 unité")
  3. Chaque étape est une card expandable avec : intro, 5-8 instructions numérotées, bloc Produit/Dosage/Temps d'attente, formulaire inline si inputFields
  4. Pendant la saisie du pH, une recommandation live s'affiche (dose pH-/pH+ selon écart vs 7.0-7.4)
  5. Au clic "Valider et enregistrer" : POST /api/pool/water-test → crée WaterTest + ActionPlan auto côté serveur → toast → étape marquée done avec recordedValues + previousValues
  6. Quand l'étape est done, l'en-tête affiche "ph: 7.8 → 7.2 ✓" (vert si dans plage, orange sinon)
  7. latestWaterTest est mis à jour après chaque POST → l'étape suivante aura le bon "avant"
  8. Flux re-check final conservé : photo upload → onRecheck → état "Résolu" avec confettis si plus de problèmes
- Points clés du cahier des charges couverts :
  * ✅ "champ qui permet saisir le pH" — Input number inline par étape
  * ✅ "Combien il faut mettre quel produit pH+ ou pH-" — dosageText dynamique + recommandation live
  * ✅ "Combien de temps attendre avant refaire un test" — waitTime affiché (2h, 8h, 24h…)
  * ✅ "Il doit aller se renseigner dans un historique" — POST /api/pool/water-test enregistre dans WaterTest
  * ✅ "À combien il était avant et à combien il était maintenant" — previousValues vs recordedValues affichés
  * ✅ "Faut donner vraiment plus d'assistance et d'expliquer les étapes" — 5-8 instructions détaillées par étape
  * ✅ "Que les gens puissent le faire en y comprenant strictement rien" — instructions foolproof (mesurer à 30cm, diluer dans seau, verser devant refoulements, ne jamais mélanger, etc.)
- Next actions possibles :
  * Brancher un vrai test E2E (Capacitor) pour valider le flux complet sur iOS/Android
  * Ajouter un bouton "Voir l'historique complet" qui ouvre le carnet WaterTest
  * Internationaliser les libellés si on cible d'autres marchés (actuellement FR uniquement)
