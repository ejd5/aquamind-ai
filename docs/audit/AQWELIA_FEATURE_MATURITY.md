# AQWELIA — Matrice de Maturité des Fonctionnalités

> Phase 0 Audit — Étape 2: Inventaire Fonctionnel
> Date : 2026-07-23 | SHA : f85db85

---

## Légende des statuts

| Statut | Définition |
|--------|-----------|
| **PRODUCTION_READY** | Fonctionnel, testé, déployé en production, monitoré |
| **STAGING_READY** | Fonctionnel, testé, déployé en staging, pas encore en prod |
| **FUNCTIONAL_INCOMPLETE** | Logique métier présente mais fonctionnalité incomplète |
| **UI_ONLY** | Interface utilisateur présente mais logique backend manquante ou simulée |
| **MOCKED** | Données simulées, stubs, ou réponses fictives |
| **MARKETING_ONLY** | Copie commerciale existante mais aucune implémentation technique |
| **ABSENT** | Aucune trace dans le code |
| **BLOCKED** | Dépend d'un blocage externe non résolu |

---

## 1. AUTHENTIFICATION

| Champ | Détail |
|-------|--------|
| **Statut** | **PRODUCTION_READY** |
| **Fichiers** | `src/lib/auth.ts`, `src/lib/password.ts`, `src/lib/apple-secret.ts`, `src/middleware.ts`, `src/lib/rate-limit.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/api/auth/register/route.ts`, `src/app/api/auth/me/route.ts` |
| **Routes** | `POST /api/auth/callback/credentials`, `POST /api/auth/register`, `GET /api/auth/session`, `GET /api/auth/csrf`, `GET /api/auth/me` |
| **Tables** | `User`, `Account` |
| **Tests** | `tests/billing.test.ts` (login flow), `tests/billing-db.test.ts` (login + admin), `tests/rate-limit.test.ts` |
| **Dépendances** | NextAuth.js v4, crypto (scrypt), Prisma |
| **Preuve** | Session JWT 30j, scrypt + timingSafeEqual, 3 providers (Credentials, Google, Apple), rate limiting 10/h sur inscription, middleware 401 JSON pour routes API protégées |
| **Risques** | `allowDangerousEmailAccountLinking: true` sur Google/Apple — risque de takeover OAuth. Pas de CAPTCHA sur inscription. |
| **Travail restant** | Ajouter CAPTCHA, vérifier account linking security |

---

## 2. PROFILS ET COMPTES

| Champ | Détail |
|-------|--------|
| **Statut** | **PRODUCTION_READY** |
| **Fichiers** | `prisma/schema.prisma` (User model, lignes 25-76), `src/app/api/account/` |
| **Routes** | `GET /api/account`, `PATCH /api/account`, `DELETE /api/account`, `GET /api/account/export`, `GET /api/account/notifications`, `PATCH /api/account/notifications` |
| **Tables** | `User` (email, name, phone, role, locale, country, timezone, consent flags) |
| **Tests** | Couvert par les tests auth |
| **Dépendances** | Auth (NextAuth), Prisma |
| **Preuve** | Modèle User complet avec 3 consentements GDPR, gestion de compte, export de données, suppression |
| **Risques** | Champ `role` existe mais n'est pas uniformément vérifié (admin utilise `ADMIN_EMAILS` pas la colonne role) |
| **Travail restant** | Aligner la vérification du rôle avec la colonne `role` |

---

## 3. ABONNEMENTS

| Champ | Détail |
|-------|--------|
| **Statut** | **PRODUCTION_READY** |
| **Fichiers** | `src/lib/billing/plans.ts`, `src/lib/billing/gate.ts`, `src/lib/billing/transition.ts`, `src/lib/billing/idempotency.ts`, `src/lib/billing/index.ts`, `src/lib/billing/types.ts`, `src/app/api/subscription/route.ts` |
| **Routes** | `GET /api/subscription` |
| **Tables** | `Subscription`, `BillingEvent` |
| **Tests** | `tests/billing.test.ts`, `tests/billing-db.test.ts`, `tests/billing-concurrency.test.ts`, `tests/b2c-pricing.test.ts` |
| **Dépendances** | Stripe SDK, RevenueCat SDK, Prisma |
| **Preuve** | 4 plans B2C (Free 0€, Pool 6.99€, Complete 10.99€, Spa 4.99€), 9 feature gates, POST bloqué (403), engine de transition atomique, idempotence webhook |
| **Risques** | Limite `decouverte` autorise 999999 scans/tests (contrairement au marketing "2/mois") |
| **Travail restant** | Aligner limites `decouverte` avec marketing, ajouter cron retry pour webhooks échoués |

---

## 4. REVENUECAT

| Champ | Détail |
|-------|--------|
| **Statut** | **PRODUCTION_READY** |
| **Fichiers** | `src/lib/billing/revenuecat.ts`, `src/app/api/revenuecat/webhook/route.ts` |
| **Routes** | `POST /api/revenuecat/webhook` |
| **Tables** | `Subscription` (via transition engine) |
| **Tests** | `tests/billing.test.ts` (bearer auth), `tests/billing-db.test.ts` (TEST event, duplicate skip) |
| **Dépendances** | `@revenuecat/purchases-capacitor` |
| **Preuve** | Webhook handler avec bearer timingSafeEqual, gestion des 6 types d'événements, idempotence |
| **Risques** | Dépend à RevenueCat pour les achats mobile |
| **Travail restant** | Aucun — fonctionnel |

---

## 5. STRIPE

| Champ | Détail |
|-------|--------|
| **Statut** | **PRODUCTION_READY** |
| **Fichiers** | `src/lib/stripe.ts`, `src/lib/billing/stripe-web.ts`, `src/app/api/stripe/checkout/route.ts`, `src/app/api/stripe/portal/route.ts`, `src/app/api/stripe/webhook/route.ts`, `src/hooks/use-stripe-checkout.ts` |
| **Routes** | `POST /api/stripe/checkout`, `POST /api/stripe/portal`, `POST /api/stripe/webhook` |
| **Tables** | `Subscription` (via transition engine), `BillingEvent` |
| **Tests** | `tests/billing.test.ts` (signature validation), `tests/billing-db.test.ts` (webhook + DB), `tests/billing-concurrency.test.ts` (atomicité) |
| **Dépendances** | Stripe SDK, Prisma |
| **Preuve** | Checkout session, Customer Portal, 6 événements webhook, protection par signature, redirection double-clic |
| **Risques** | Portal résout par email (pas par stripeCustomerId) — peut échouer si email modifié |
| **Travail restant** | Utiliser `stripeCustomerId` au lieu de l'email pour le portal |

---

## 6. MULTI-PISCINE

| Champ | Détail |
|-------|--------|
| **Statut** | **STAGING_READY** |
| **Fichiers** | `src/app/api/pool/profile/route.ts`, `src/app/api/pool/share/route.ts` |
| **Routes** | `GET/POST/PATCH/DELETE /api/pool/profile`, `GET/POST/DELETE /api/pool/share` |
| **Tables** | `PoolProfile`, `PoolShare` |
| **Tests** | `tests/b2c-pricing.test.ts` (vérifie maxPools) — pas de test d'intégration multi-piscine |
| **Dépendances** | Auth, Plans, Feature Gates |
| **Preuve** | CRUD complet, vérification `multi_pool` gate (wellness uniquement), PoolShare Family avec rôles co_manager/viewer |
| **Risques** | Pas de tests d'intégration pour la limite multi-piscine. PoolShare ne vérifie pas le gate `multi_pool`. |
| **Travail restant** | Tests d'intégration pour les limites de plan |

---

## 7. TESTS D'EAU

| Champ | Détail |
|-------|--------|
| **Statut** | **PRODUCTION_READY** |
| **Fichiers** | `src/app/api/pool/water-test/route.ts`, `src/components/aquamind/module-water-test.tsx` |
| **Routes** | `GET/POST/DELETE /api/pool/water-test` |
| **Tables** | `WaterTest` (ph requis, 10 paramètres optionnels, computed: clearWaterIndex, swimSafety, lsi, status) |
| **Tests** | `tests/dosing-safety.test.ts` (间接通过 action plan) |
| **Dépendances** | water-balance.ts, targets.ts, safety-rules.ts, dosing-engine.ts |
| **Preuve** | CRUD complet, calcul CWI/LSI/safety à chaque sauvegarde, génération auto action plan |
| **Risques** | Pas de tests unitaires dédiés pour LSI et CWI |
| **Travail restant** | Tests unitaires pour LSI et CWI |

---

## 8. MOTEUR LSI

| Champ | Détail |
|-------|--------|
| **Statut** | **STAGING_READY** |
| **Fichiers** | `src/lib/pool/water-balance.ts` (151 lignes) |
| **Routes** | Utilisé par `/api/pool/water-test` (indirectement) |
| **Tables** | `WaterTest.lsi` |
| **Tests** | **Aucun test unitaire dédié** |
| **Dépendances** | Aucune (fonctions pures) |
| **Preuve** | Formule LSI simplifiée: pH + tempFactor + calciumFactor + alkalinityFactor - 12.1. Interprétation en 5 niveaux. |
| **Risques** | Approximation step-function au lieu de formules continues. Aucun test. CWI est un index custom (pas standard industrie). |
| **Travail restant** | Tests unitaires, validation contre calculateurs LSI standards |

---

## 9. MOTEUR DE DOSAGE

| Champ | Détail |
|-------|--------|
| **Statut** | **PRODUCTION_READY** |
| **Fichiers** | `src/lib/pool/dosing-engine.ts` (308 lignes) |
| **Routes** | Utilisé par `/api/pool/water-test` et `/api/pool/action-plan` |
| **Tables** | `ActionPlan.chemicalDosages` (JSON) |
| **Tests** | `tests/dosing-safety.test.ts` (5 tests: invalides, pH cap, gallon, CYA ceiling, ordre) |
| **Dépendances** | Aucune (fonctions pures) |
| **Preuve** | Explicitement marqué "DETERMINISTE (non-IA)". 10 paramètres supportés. Coefficients documentés. Safety caps: pH delta ≤ 0.3, CYA ≤ 50 mg/L. |
| **Risques** | Coefficients basés sur "standards piscine" sans référence produit spécifique. confidence=0.9 hardcodée. |
| **Travail restant** | Valider coefficients contre produits spécifiques, documenter la constante confidence |

---

## 10. SÉCURITÉ DE BAINADE

| Champ | Détail |
|-------|--------|
| **Statut** | **PRODUCTION_READY** |
| **Fichiers** | `src/lib/pool/safety-rules.ts` (166 lignes) |
| **Routes** | Utilisé par `/api/pool/water-test` et action plans |
| **Tables** | `WaterTest.swimSafety`, `ActionPlan.swimSafety` |
| **Tests** | `tests/dosing-safety.test.ts` (3 tests: forbidden, chlorine missing, escalation) |
| **Dépendances** | targets.ts (evaluateParam) |
| **Preuve** | 4 statuts (allowed/avoid/forbidden/unknown), règles pH < 6.5 ou > 8.2 → forbidden, Cl < 0.5 → forbidden, CC > 0.4 → forbidden, 7 règles FORBIDDEN_ACTIONS |
| **Risques** | Pas de vérification calcium extrem (TH < 150 + pH < 7.0 = corrosif) dans assessSwimSafety |
| **Travail restant** | Ajouter vérification calcium/pH combo |

---

## 11. PLANS D'ACTION

| Champ | Détail |
|-------|--------|
| **Statut** | **PRODUCTION_READY** |
| **Fichiers** | `src/lib/pool/action-plan.ts` (459 lignes), `src/components/aquamind/module-action-plan.tsx` (502 lignes), `src/components/aquamind/diagnostic-action-plan.tsx` (1500+ lignes), `src/app/api/pool/action-plan/route.ts` |
| **Routes** | `POST /api/pool/action-plan` (regenerate) |
| **Tables** | `ActionPlan` |
| **Tests** | `tests/dosing-safety.test.ts` (1 test: ordonnancement TAC→pH→Cl) |
| **Dépendances** | dosing-engine.ts, safety-rules.ts, water-balance.ts, predict-engine.ts |
| **Preuve** | Explicitement marqué "DETERMINISTE". Ordonnancement: TAC→pH→Cl→CYA→Salt→Phosphates→Filtration→Retest. Intègre safety, CWI, LSI, coût. |
| **Risques** | diagnostic-action-plan.tsx duplique la logique dosage avec coefficients différents (10 g/m3 vs 7.5 ml/m3). |
| **Travail restant** | Unifier la logique dosage, ajouter tests |

---

## 12. AQWELIA BRAIN

| Champ | Détail |
|-------|--------|
| **Statut** | **STAGING_READY** |
| **Fichiers** | `src/app/api/brain/timeline/route.ts`, `src/app/api/brain/executions/route.ts`, `src/app/api/brain/outcomes/route.ts`, `src/app/api/brain/knowledge/route.ts`, `src/app/api/brain/feedback/route.ts`, `src/lib/brain/outcome.ts`, `src/lib/brain/access.ts`, `src/lib/brain/record-followup.ts`, `src/components/brain/module-brain.tsx`, `src/components/brain/brain-action-tracker.tsx` |
| **Routes** | `GET /api/brain/timeline`, `GET/POST /api/brain/executions`, `GET/POST /api/brain/outcomes`, `GET/POST /api/brain/knowledge`, `POST /api/brain/feedback` |
| **Tables** | `RecommendationExecution`, `RecommendationOutcome`, `BrainFeedback`, `KnowledgeArticle`, `KnowledgeRevision`, `BrainEventOutbox` |
| **Tests** | `tests/aqwelia-brain.test.ts` (unit), `tests/aqwelia-brain-contract.test.ts` (contract) |
| **Dépendances** | Auth, Prisma, Action Plans |
| **Preuve** | Boucle de rétroaction déterministe : exécution → outcome (CWI delta ±5) → knowledge. Outbox événementielle pour retests fiables. |
| **Risques** | Brain n'est PAS un système IA — c'est un tracker de résultats. Le marketing suggère une IA autonome. |
| **Travail restant** | Clarifier le positionnement marketing vs réalité technique |

---

## 13. FEEDBACK

| Champ | Détail |
|-------|--------|
| **Statut** | **PRODUCTION_READY** |
| **Fichiers** | `src/app/api/brain/feedback/route.ts`, `src/components/brain/brain-action-tracker.tsx` |
| **Routes** | `POST /api/brain/feedback` |
| **Tables** | `BrainFeedback` (rating 1-5, helpful, message) |
| **Tests** | `tests/aqwelia-brain.test.ts` (clampRating) |
| **Dépendances** | Auth, Prisma |
| **Preuve** | CRUD feedback, clampRating(1-5), vérification ownership |
| **Risques** | Aucun |
| **Travail restant** | Aucun |

---

## 14. DIAGNOSTIC PHOTO

| Champ | Détail |
|-------|--------|
| **Statut** | **FUNCTIONAL_INCOMPLETE** |
| **Fichiers** | `src/app/api/pool/photo-diagnostic/route.ts`, `src/components/aquamind/module-diagnostic.tsx`, `src/components/aquamind/diagnostic-action-plan.tsx` |
| **Routes** | `GET/POST/DELETE /api/pool/photo-diagnostic` |
| **Tables** | `PhotoDiagnostic` |
| **Tests** | **Aucun test** |
| **Dépendances** | NVIDIA VLM (Nemotron Nano 12B VL), Prisma |
| **Preuve** | Upload photo → VLM analyse → JSON structuré (detectedIssues, probableIssues, confidence) → plan d'action par pattern matching |
| **Risques** | **CRITIQUE** : Images stockées en base64 dans la DB (pas S3). EXIF non strippé (GPS, device). Pas de DPA documenté avec NVIDIA. Pas de TTL de suppression. |
| **Travail restant** | S3 pour photos, strippage EXIF, DPA NVIDIA, tests, TTL suppression |

---

## 15. MÉTÉO

| Champ | Détail |
|-------|--------|
| **Statut** | **PRODUCTION_READY** |
| **Fichiers** | `src/app/api/pool/weather/route.ts`, `src/lib/pool/weather-engine.ts`, `src/lib/pool/climate-engine.ts` |
| **Routes** | `GET /api/pool/weather` |
| **Tables** | Aucune (calculé à la volée) |
| **Tests** | `tests/fixtures/weather-server.mjs` (fixture CI) |
| **Dépendances** | wttr.in (gratuit, pas de clé API) |
| **Preuve** | Météo actuelle + prévisions 3j, alertes (orage, UV, gel, vent), filtrage recommandé, gate `weather_advanced` pour fonctionnalités premium |
| **Risques** | Dépend de wttr.in (service gratuit, pas de SLA) |
| **Travail restant** | Tests unitaires pour weather-engine |

---

## 16. RAPPELS

| Champ | Détail |
|-------|--------|
| **Statut** | **FUNCTIONAL_INCOMPLETE** |
| **Fichiers** | `src/app/api/pool/reminders/route.ts`, `src/lib/pool/reminders.ts`, `src/components/aquamind/module-reminders.tsx` |
| **Routes** | `GET/POST/PATCH/DELETE /api/pool/reminders` |
| **Tables** | `Reminder` |
| **Tests** | **Aucun test** |
| **Dépendances** | Auth, Prisma, Weather Engine, Equipment |
| **Preuve** | 10 sources de génération (historique, météo, équipement, inventaire, saison). Smart reminders derrière paywall. Support offline (queue). |
| **Risques** | Smart reminders générés à chaque GET (pas persistés). Pas de notifications push sur mobile (capacitor local-notifications existe mais pas branché aux smart reminders). |
| **Travail restant** | Brancher smart reminders aux local notifications, ajouter tests |

---

## 17. ÉQUIPEMENTS

| Champ | Détail |
|-------|--------|
| **Statut** | **STAGING_READY** |
| **Fichiers** | `src/app/api/pool/equipment/route.ts` |
| **Routes** | `GET/POST/PATCH/DELETE /api/pool/equipment` |
| **Tables** | `Equipment` |
| **Tests** | **Aucun test** |
| **Dépendances** | Auth, Prisma |
| **Preuve** | CRUD complet avec ownership, 9 types d'équipements, maintenance tracking |
| **Risques** | Pas de tests |
| **Travail restant** | Tests d'intégration |

---

## 18. INVENTAIRE

| Champ | Détail |
|-------|--------|
| **Statut** | **FUNCTIONAL_INCOMPLETE** |
| **Fichiers** | `src/app/api/pool/inventory/route.ts`, `src/lib/pool/restock-engine.ts`, `src/app/api/pool/restock/route.ts` |
| **Routes** | `GET/POST/DELETE /api/pool/inventory`, `GET /api/pool/restock` |
| **Tables** | `ProductInventory` |
| **Tests** | **Aucun test** |
| **Dépendances** | Auth, Prisma |
| **Preuve** | CRUD inventaire, restock engine (heuristique conso hebdo × multipliers), intégration Care marketplace (deeplinks) |
| **Risques** | Restock engine non testé. Deeplinks Care marketplace = liens externes (pas une intégration réelle). |
| **Travail restant** | Tests restock engine |

---

## 19. CACHE OFFLINE

| Champ | Détail |
|-------|--------|
| **Statut** | **FUNCTIONAL_INCOMPLETE** |
| **Fichiers** | `src/lib/offline/cache.ts`, `src/lib/offline/api-cache.ts`, `src/lib/offline/offline-store.ts`, `src/hooks/use-network-status.ts`, `src/components/offline-banner.tsx` |
| **Routes** | Toutes les routes GET sont mises en cache |
| **Tables** | Aucune (IndexedDB côté client) |
| **Tests** | **Aucun test** |
| **Dépendances** | IndexedDB, Zustand |
| **Preuve** | Cache IndexedDB avec TTL (5min-24h), network-first + cache-fallback, 15+ endpoints cachés |
| **Risques** | Pas de service worker, pas de Cache API, pas de PWA manifest |
| **Travail restant** | Service worker, PWA manifest, tests |

---

## 20. ÉCRITURES OFFLINE

| Champ | Détail |
|-------|--------|
| **Statut** | **FUNCTIONAL_INCOMPLETE** |
| **Fichiers** | `src/lib/offline/offline-store.ts` |
| **Routes** | POST/PATCH/DELETE pour 7 modules |
| **Tables** | N/A (localStorage outbox) |
| **Tests** | **Aucun test** |
| **Dépendances** | Zustand, localStorage |
| **Preuve** | Outbox pattern complet : file d'attente persistée en localStorage, flush automatique à la reconnexion, 7 modules connectés (water-test, reminders, equipment, inventory, action-plan, health-log, assistant) |
| **Risques** | **Pas de clés d'idempotence** — les retries peuvent créer des doublons. Pas de résolution de conflits. Pas de backoff. |
| **Travail restant** | Clés d'idempotence, backoff, tests |

---

## 21. SYNCHRONISATION

| Champ | Détail |
|-------|--------|
| **Statut** | **FUNCTIONAL_INCOMPLETE** |
| **Fichiers** | `src/lib/offline/offline-store.ts`, `src/hooks/use-network-status.ts` |
| **Routes** | N/A |
| **Tables** | N/A |
| **Tests** | **Aucun test** |
| **Dépendances** | Navigator.onLine, Capacitor Network |
| **Preuve** | Détection online/offline, flush auto à la reconnexion, bouton sync manuel dans banner |
| **Risques** | Pas de résolution de conflits, pas de versioning, last-write-wins implicite |
| **Travail restant** | Résolution de conflits, tests |

---

## 22. APPLICATION CAPACITOR

| Champ | Détail |
|-------|--------|
| **Statut** | **FUNCTIONAL_INCOMPLETE** |
| **Fichiers** | `capacitor.config.ts`, `src/lib/native/` (17 wrappers), `next.config.mobile.ts` |
| **Routes** | N/A (mobile app) |
| **Tables** | N/A |
| **Tests** | **Aucun test** |
| **Dépendances** | 14 plugins Capacitor (camera, haptics, keyboard, local-notifications, network, preferences, geolocation, share, filesystem, app, status-bar, splash-screen, browser, RevenueCat) |
| **Preuve** | 17 wrappers SSR-safe avec fallbacks web, config iOS/Android, deep links |
| **Risques** | Dossiers `ios/` et `android/` pas dans le repo. Pas de PWA manifest. |
| **Travail restant** | Générer projets natifs, ajouter PWA manifest |

---

## 23. NOTIFICATIONS

| Champ | Détail |
|-------|--------|
| **Statut** | **FUNCTIONAL_INCOMPLETE** |
| **Fichiers** | `src/lib/native/local-notifications.ts` |
| **Routes** | N/A (client-side) |
| **Tables** | N/A |
| **Tests** | **Aucun test** |
| **Dépendances** | `@capacitor/local-notifications` |
| **Preuve** | Wrapper pour planifier/annuler des notifications locales |
| **Risques** | Pas branché aux smart reminders. Pas de notifications push serveur. |
| **Travail restant** | Connecter aux smart reminders, tests |

---

## 24. AQWELIA PRO

| Champ | Détail |
|-------|--------|
| **Statut** | **FUNCTIONAL_INCOMPLETE** |
| **Fichiers** | `src/app/pro/` (13 routes), `src/lib/pro/` (access, pdf-reports), `src/app/api/pro/` (13 routes), `src/components/pro/add-intervention-modal.tsx`, `src/components/pro/add-pool-modal.tsx` |
| **Routes** | `/api/pro/clients`, `/api/pro/pools`, `/api/pro/interventions`, `/api/pro/dashboard`, `/api/pro/water-tests`, `/api/pro/export`, `/api/pro/settings`, `/api/pro/interventions/[id]/report`, `/api/pro/pools/[id]/report` |
| **Tables** | `ProOrganization`, `ProClient`, `ProPool`, `ProIntervention`, `ProWaterTest`, `ProReport` |
| **Tests** | **Aucun test** |
| **Dépendances** | Auth, Prisma |
| **Preuve** | CRUD complet clients/piscines/interventions, rapports PDF, export CSV, dashboard agrégé |
| **Risques** | **Zéro tests**. Pas de facturation Pro. Pas de QuickBooks/Xero. Pas de routage optimisé. |
| **Travail restant** | Tests, facturation, intégrations comptables |

---

## 25. CRM (PRO)

| Champ | Détail |
|-------|--------|
| **Statut** | **STAGING_READY** |
| **Fichiers** | `src/app/api/pro/clients/route.ts`, `src/app/api/pro/clients/[id]/route.ts` |
| **Routes** | `GET/POST /api/pro/clients`, `GET/PATCH/DELETE /api/pro/clients/[id]` |
| **Tables** | `ProClient` |
| **Tests** | **Aucun test** |
| **Dépendances** | Auth, ProOrganization |
| **Preuve** | CRUD complet, recherche/pagination, validation, cascade delete, isolation par org |
| **Risques** | Pas de tests, pas d'import bulk, pas de tags |
| **Travail restant** | Tests, import bulk, tags |

---

## 26. PLANNING (PRO)

| Champ | Détail |
|-------|--------|
| **Statut** | **UI_ONLY** |
| **Fichiers** | `src/app/pro/app/planning/page.tsx` |
| **Routes** | Aucune API dédiée planning |
| **Tables** | N/A |
| **Tests** | **Aucun test** |
| **Dépendances** | Interventions API |
| **Preuve** | Vue semaine avec grille colorée. Les interventions sont la source de données. |
| **Risques** | Pas de drag-and-drop, pas de vue jour/mois, pas d'intégration calendrier |
| **Travail restant** | API planning dédiée, drag-and-drop, vues jour/mois |

---

## 27. INTERVENTIONS (PRO)

| Champ | Détail |
|-------|--------|
| **Statut** | **STAGING_READY** |
| **Fichiers** | `src/app/api/pro/interventions/route.ts`, `src/app/api/pro/interventions/[id]/route.ts`, `src/app/api/pro/interventions/[id]/report/route.tsx`, `src/components/pro/add-intervention-modal.tsx` |
| **Routes** | `GET/POST /api/pro/interventions`, `GET/PATCH/DELETE /api/pro/interventions/[id]`, `GET /api/pro/interventions/[id]/report` |
| **Tables** | `ProIntervention` |
| **Tests** | **Aucun test** |
| **Dépendances** | Auth, ProClient, ProPool, WaterTest |
| **Preuve** | Cycle de vie complet (scheduled→in_progress→completed/cancelled), récurrence, rapport terrain, capture photo, tests d'eau, rapport PDF |
| **Risques** | Pas de routage/tournées optimisé |
| **Travail restant** | Routage optimisé, tests |

---

## 28. TOURNÉES (PRO)

| Champ | Détail |
|-------|--------|
| **Statut** | **MARKETING_ONLY** |
| **Fichiers** | Copie marketing dans pages Pro (tarifs, features) |
| **Routes** | Aucune |
| **Tables** | Aucune |
| **Tests** | N/A |
| **Dépendances** | N/A |
| **Preuve** | Aucune. Le routage optimisé n'existe pas dans le code. |
| **Risques** | Affirmation commerciale sans implémentation |
| **Travail restant** | Tout à construire |

---

## 29. DEVIS (PRO)

| Champ | Détail |
|-------|--------|
| **Statut** | **ABSENT** |
| **Fichiers** | Aucun fichier Pro devis dédié |
| **Routes** | Aucune |
| **Tables** | Aucune |
| **Tests** | N/A |
| **Dépendances** | N/A |
| **Preuve** | Aucune |
| **Risques** | Growth OS a des devis, mais Pro n'en a pas |
| **Travail restant** | Tout à construire |

---

## 30. FACTURES (PRO)

| Champ | Détail |
|-------|--------|
| **Statut** | **ABSENT** |
| **Fichiers** | Aucun |
| **Routes** | Aucune |
| **Tables** | Aucune |
| **Tests** | N/A |
| **Dépendances** | N/A |
| **Preuve** | Aucune. L'export CSV existe mais ce n'est pas de la facturation. |
| **Risques** | Affirmation commerciale sans implémentation |
| **Travail restant** | Tout à construire |

---

## 31. PAIEMENTS (PRO)

| Champ | Détail |
|-------|--------|
| **Statut** | **ABSENT** |
| **Fichiers** | Aucun |
| **Routes** | Aucune |
| **Tables** | Aucune |
| **Tests** | N/A |
| **Dépendances** | N/A |
| **Preuve** | Le Pro est en Early Access gratuit. Aucun paiement Pro. |
| **Risques** | N/A — le Pro n'est pas encore monétisé |
| **Travail restant** | Définir la stratégie de monétisation Pro |

---

## 32. GROWTH OS

| Champ | Détail |
|-------|--------|
| **Statut** | **FUNCTIONAL_INCOMPLETE** |
| **Fichiers** | `src/app/growth/` (16 routes), `src/lib/growth/agents.ts` (1445 lignes), `src/lib/growth/access.ts`, `src/components/growth/pipeline-workspace.tsx`, `src/app/api/growth/` (12 routes) |
| **Routes** | `/api/growth/leads`, `/api/growth/leads/[id]`, `/api/growth/leads/[id]/match`, `/api/growth/leads/[id]/qualify`, `/api/growth/agents/run`, `/api/growth/appointments`, `/api/growth/appointments/[id]`, `/api/growth/quotes`, `/api/growth/quotes/[id]`, `/api/growth/dashboard`, `/api/growth/audit`, `/api/growth/settings` |
| **Tables** | `Organization`, `OrganizationMember`, `Lead`, `LeadEvent`, `Appointment`, `Quote`, `Commission`, `AgentRun`, `AgentAction` |
| **Tests** | `tests/growth-access.test.ts`, `tests/growth-delete-lead.test.ts` |
| **Dépendances** | Auth, Prisma |
| **Preuve** | CRM complet, 10 agents déterministes, qualification, matching, RDV, devis, dashboard, audit trail, conformité RGPD |
| **Risques** | **"10 agents" = marketing** — ce sont des fonctions déterministes, pas des IA. Pas d'envoi d'emails. Pas de PDF devis. Pas d'intégration calendrier. |
| **Travail restant** | Envoi emails nurturing, PDF devis, tests complets |

---

## 33. LEADS

| Champ | Détail |
|-------|--------|
| **Statut** | **STAGING_READY** |
| **Fichiers** | `src/app/api/growth/leads/route.ts`, `src/app/api/growth/leads/[id]/route.ts`, `src/app/api/growth/leads/[id]/match/route.ts`, `src/app/api/growth/leads/[id]/qualify/route.ts` |
| **Routes** | `GET/POST /api/growth/leads`, `GET/PATCH/DELETE /api/growth/leads/[id]`, `POST /api/growth/leads/[id]/match`, `POST /api/growth/leads/[id]/qualify` |
| **Tables** | `Lead`, `LeadEvent` |
| **Tests** | `tests/growth-delete-lead.test.ts` (RGPD), `tests/growth-access.test.ts` |
| **Dépendances** | Auth, Organization |
| **Preuve** | Cycle de vie 9 états, consentement RGPD obligatoire, scoring, qualification, matching, suppression cascade |
| **Risques** | Matching toujours escaladé (jamais auto-assigné) |
| **Travail restant** | Auto-assignment optionnel, tests complémentaires |

---

## 34. QUALIFICATION

| Champ | Détail |
|-------|--------|
| **Statut** | **STAGING_READY** |
| **Fichiers** | `src/lib/growth/agents.ts` (qualification function), `src/app/api/growth/leads/[id]/qualify/route.ts` |
| **Routes** | `POST /api/growth/leads/[id]/qualify` |
| **Tables** | `Lead` (status, score) |
| **Tests** | Aucun test dédié |
| **Dépendances** | Lead model |
| **Preuve** | Algorithme de scoring pondéré, 7 questions standard, 4 paliers (cold/warm/hot/qualified) |
| **Risques** | Score basé sur des poids fixes — pas d'apprentissage |
| **Travail restant** | Tests, calibration des poids |

---

## 35. MATCHING

| Champ | Détail |
|-------|--------|
| **Statut** | **STAGING_READY** |
| **Fichiers** | `src/lib/growth/agents.ts` (matching function), `src/app/api/growth/leads/[id]/match/route.ts` |
| **Routes** | `POST /api/growth/leads/[id]/match` |
| **Tables** | `Lead` (assignedTo, status) |
| **Tests** | Aucun test dédié |
| **Dépendances** | Lead, Organization |
| **Preuve** | Scoring 4 dimensions (spécialité 50pts, capacité 20pts, rating 15pts, distance 15pts), toujours escaladé au dispatcher |
| **Risques** | Auto-discovery sans données de spécialité → score 0 |
| **Travail restant** | Tests, données de spécialité complètes |

---

## 36. 10 AGENTS

| Champ | Détail |
|-------|--------|
| **Statut** | **FUNCTIONAL_INCOMPLETE** |
| **Fichiers** | `src/lib/growth/agents.ts` (1445 lignes, 10 fonctions), `src/app/api/growth/agents/run/route.ts` |
| **Routes** | `POST /api/growth/agents/run` |
| **Tables** | `AgentRun`, `AgentAction` |
| **Tests** | `tests/growth-access.test.ts` (indirect) |
| **Dépendances** | Auth, Organization, Lead |
| **Preuve** | 10 agents : offer_builder, lead_capture, qualification, diagnostic, matching, appointment, nurturing, quote, attribution, compliance. Tous déterministes. |
| **Risques** | **Pas des agents IA autonomes** — fonctions déterministes avec vocabulaire marketing trompeur. Diagnostic = regex. Nurturing = templates (pas d'envoi email). |
| **Travail restant** | Clarifier positionnement, ajouter LLM au diagnostic, implémenter envoi emails |

---

## 37. QUICKBOOKS

| Champ | Détail |
|-------|--------|
| **Statut** | **ABSENT** |
| **Fichiers** | Aucun |
| **Routes** | Aucune |
| **Tables** | Aucune |
| **Tests** | N/A |
| **Dépendances** | N/A |
| **Preuve** | Aucune occurrence de "QuickBooks" dans le code |
| **Risques** | Affirmation commerciale sans aucune implémentation |
| **Travail restant** | Tout à construire si nécessaire |

---

## 38. XERO

| Champ | Détail |
|-------|--------|
| **Statut** | **ABSENT** |
| **Fichiers** | Aucun |
| **Routes** | Aucune |
| **Tables** | Aucune |
| **Tests** | N/A |
| **Dépendances** | N/A |
| **Preuve** | Aucune occurrence de "Xero" dans le code |
| **Risques** | Affirmation commerciale sans aucune implémentation |
| **Travail restant** | Tout à construire si nécessaire |

---

## 39. FACTURATION ÉLECTRONIQUE

| Champ | Détail |
|-------|--------|
| **Statut** | **ABSENT** |
| **Fichiers** | Aucun |
| **Routes** | Aucune |
| **Tables** | Aucune |
| **Tests** | N/A |
| **Dépendances** | N/A |
| **Preuve** | Aucune occurrence de "Factur-X" ou "facturation électronique" dans le code |
| **Risques** | Affirmation commerciale sans implémentation |
| **Travail restant** | Tout à construire si nécessaire |

---

## 40. EXPORT FACTUR-X

| Champ | Détail |
|-------|--------|
| **Statut** | **ABSENT** |
| **Fichiers** | Aucun |
| **Routes** | Aucune |
| **Tables** | Aucune |
| **Tests** | N/A |
| **Dépendances** | N/A |
| **Preuve** | L'export CSV Pro existe (`/api/pro/export`) mais ce n'est pas du Factur-X |
| **Risques** | N/A |
| **Travail restant** | Tout à construire |

---

## 41. TRADUCTIONS (7 LANGUES)

| Champ | Détail |
|-------|--------|
| **Statut** | **FUNCTIONAL_INCOMPLETE** |
| **Fichiers** | `src/i18n/locales/fr.json` (407KB), `en.json` (374KB), `es.json`, `de.json`, `it.json`, `pt.json`, `nl.json` |
| **Routes** | Toutes (middleware locale detection) |
| **Tables** | N/A |
| **Tests** | `tests/p0-k-pricing-copy-consistency.test.ts` |
| **Dépendances** | next-intl |
| **Preuve** | 7 langues supportées, middleware de détection automatique, clés i18n dans les composants |
| **Risques** | **EN 8.5% plus petit que FR** — clés potentiellement manquantes. Growth OS page en anglais hardcoded (pas i18n). |
| **Travail restant** | Vérifier complétude EN, i18n Growth OS, tests complémentaires |

---

## 42. PAGES PUBLIQUES

| Champ | Détail |
|-------|--------|
| **Statut** | **STAGING_READY** |
| **Fichiers** | `src/app/(public)/` (18 pages), `src/components/landing/` (20 sections) |
| **Routes** | `/`, `/tarifs`, `/fonctionnalites`, `/technologie`, `/a-propos`, `/comment-ca-marche`, `/analyse-eau`, `/diagnostic-ia`, `/spa`, `/hivernage`, `/winter-guardie`, `/rappels-entretien`, `/remise-en-route`, `/contact`, `/faq`, `/pro/`, `/growth/`, `/store` |
| **Tables** | N/A |
| **Tests** | `tests/entry-flow.test.ts` |
| **Dépendances** | next-intl, Framer Motion, Lucide |
| **Preuve** | 18 pages publiques, 20 sections landing, animations, responsive |
| **Risques** | Affirmations commerciales non vérifiées (voir Claims Registry) |
| **Travail restant** | Vérifier les claims, i18n Growth |

---

## 43. STATISTIQUES COMMERCIALES

| Champ | Détail |
|-------|--------|
| **Statut** | **FUNCTIONAL_INCOMPLETE** |
| **Fichiers** | `src/app/api/growth/dashboard/route.ts`, `src/app/api/dashboard/route.ts` |
| **Routes** | `GET /api/growth/dashboard`, `GET /api/dashboard` |
| **Tables** | Agrégation de Lead, Appointment, Quote, Commission, AgentRun |
| **Tests** | Aucun test |
| **Dépendances** | Prisma |
| **Preuve** | Dashboard B2C (piscines, tests, CWI moyen) et B2B (leads, conversion, revenus, commissions) |
| **Risques** | Pas de tests d'agrégation |
| **Travail restant** | Tests, export PDF |

---

## SYNTHÈSE

| Statut | Nombre | Fonctionnalités |
|--------|--------|-----------------|
| **PRODUCTION_READY** | 10 | Auth, Profils, Abonnements, RevenueCat, Stripe, Tests d'eau, Dosage, Sécurité bain, Plans d'action, Feedback |
| **STAGING_READY** | 8 | Multi-piscine, LSI, Brain, Météo, Équipements, CRM Pro, Leads, Qualification, Matching, Pages publiques |
| **FUNCTIONAL_INCOMPLETE** | 11 | Diagnostic photo, Rappels, Inventaire, Cache offline, Écritures offline, Sync, Capacitor, Notifications, Pro, Growth OS, 10 agents, Traductions, Stats |
| **UI_ONLY** | 1 | Planning Pro |
| **MARKETING_ONLY** | 1 | Tournées Pro |
| **ABSENT** | 5 | Devis Pro, Factures Pro, Paiements Pro, QuickBooks, Xero, Factur-X |
| **MOCKED** | 0 | — |
| **BLOCKED** | 0 | — |
