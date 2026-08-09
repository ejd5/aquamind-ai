# AQWELIA — Campagne « Offres de lancement » (ops & activation)

Document d'exploitation pour la branche `feat/aqwelia-launch-offers`
(spec v1.0). Décrit l'activation, les garde-fous, les actions manuelles
fournisseurs et la recette de vérification.

## État au 2026-08-09

- **Statut : BLOCKED** côté fournisseurs (aucun compte RevenueCat / Apple /
  Google réel). La campagne est **inerte** tant que `AQWELIA_LAUNCH_OFFERS_ENABLED`
  n'est pas `true`.
- Code applicatif, schéma, migrations et tests sont **prêts** (15/15 tests verts).

## Contrôles d'ingénierie appliqués

| Règle | Implémentation |
|---|---|
| Campagne inerte par défaut | `launchOffersEnabled()` lit `AQWELIA_LAUNCH_OFFERS_ENABLED !== 'true'` → tout endpoint retourne `CAMPAIGN_NOT_STARTED` |
| Aucune valeur monétaire en dur | Prix dérivés de `src/lib/billing/plans.ts` via `computeLaunchPricing` ; montants en cents |
| Backend autorité unique | `src/lib/launch-offers/service.ts` ; réservation par UPDATE conditionnel atomique + contrainte unique |
| Quota consommé après vérification serveur | `confirmRedemption` ne consomme qu'après passage du paiement ; idempotence `(provider, providerTransactionId)` |
| Unicité interplateforme | `@@unique([campaignId, userId])` sur `PromotionRedemption` |
| Réservation 30 min | `expiresAt = now + AQWELIA_LAUNCH_RESERVATION_TTL` (défaut 1800s) ; confirmation tardive honorée + marquée |
| Admin audité | Toutes les actions écrivent `PromotionAuditLog` ; réallocation bornée par `confirmed + reserved` et quota global |
| Pays vérifié serveur | L'éligibilité pays lit **uniquement `User.country`** (valeur enregistrée côté serveur, non modifiable par l'utilisateur). Le paramètre `country` client (query/body) est ignoré pour la décision ; il ne sert jamais à décider seul l'éligibilité commerciale |
| Idempotence paiement | `@@unique([provider, providerTransactionId])` : un même paiement/webhook/identifiant ne consomme jamais deux places ; doublon → `alreadyProcessed` |
| Idempotence réservation | Une `idempotencyKey` existante n'est réutilisée que si elle appartient au même utilisateur ET correspond à la même offre/formule/plateforme ; sinon `IDEMPOTENCY_KEY_CONFLICT` sans exposer la réservation |
| Éligibilité complète | `createReservation` applique toutes les règles (compte vérifié, pays serveur, ancien abonnement payant, offre déjà consommée, réservation active, formule, plateforme, quotas) |
| Échec sécurisé sans secret | Campagne active sans `AQWELIA_LAUNCH_TOKEN_SECRET`/`NEXTAUTH_SECRET` → `SIGNING_SECRET_MISSING` (aucun fallback en clair) |
| Montants serveur | `confirmRedemption` valide les montants contre le pricing serveur (plans.ts) ; valeur différente → `PRICE_CONFIGURATION_INVALID` |
| Quota global atomique | Confirmation (y compris tardive) applique atomiquement le quota **global** (`campaign.confirmedCount` vs `totalQuota`) ET **par allocation** (`allocation.confirmedCount` vs `quota`) ; dépassement annulé dans la même transaction |

## Activation (propriétaire)

1. Créer le projet RevenueCat + produits/entitlements (`oasis`, `wellness`,
   `spa365`), les offres App Store / Google Play et les coupons Stripe.
2. Renvoyer les identifiants réels (pas de valeurs inventées) :
   - `NEXT_PUBLIC_REVENUECAT_IOS_KEY`, `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY`,
     `REVENUECAT_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`
   - `AQWELIA_LAUNCH_STRIPE_COUPON_LAUNCH50_MONTHLY`,
     `AQWELIA_LAUNCH_STRIPE_COUPON_LAUNCH3FOR2_QUARTERLY`
   - `AQWELIA_LAUNCH_APPLE_OFFER_*`, `AQWELIA_LAUNCH_GOOGLE_OFFER_*`
3. Ajouter les clés en **secrets GitHub staging** (avec
   `STAGING_DATABASE_URL` / `STAGING_DIRECT_URL`), puis relancer le job
   « Android Staging sandbox APK » (celui-ci échoue actuellement : variables
   vides dans les logs → aucun APK sandbox réel).
4. Mettre `AQWELIA_LAUNCH_OFFERS_ENABLED=true` seulement après vérification
   sandbox réelle (achat, webhook, restore).

## Recette de vérification

```bash
# 1. Migrations (SQLite local / PostgreSQL prod)
DATABASE_URL="file:./db/test.db" bunx prisma migrate deploy
bun run db:generate:all

# 2. Tests campagne (base SQLite dédiée + isolée, client Prisma injecté)
DATABASE_URL="file:./db/test.db" bunx vitest run tests/aqwelia-launch-offers.test.ts

# 3. Garde-fous globaux
bun run test:postgresql && bun run lint && bun run typecheck
```

Smoke de bout en bout : `tests/run-smoke-tests.sh` (démarre serveur + seed +
mock météo). Les tests `billing-*` / `smoke` nécessitent ce harnais (serveur
lancé) — ce ne sont pas des pannes dues à la campagne.

## Actions manuelles restantes (bloquants propriétaire)

- [ ] Créer comptes RevenueCat / Apple Developer / Google Play
- [ ] Produits + entitlements (`oasis`, `wellness`, `spa365`)
- [ ] Stripe coupons / Apple offer codes / Google offers réels
- [ ] Ajouter les clés aux secrets GitHub `staging`
- [ ] Relancer « Android Staging sandbox APK » et recette sandbox réelle
- [ ] Vérifier achat sandbox, webhook réel, restore, late confirmation

## Fichiers livrés

- `prisma/schema.prisma` + `prisma/postgresql/schema.prisma` : 6 modèles
  `Promotion*` + relations `User`
- `prisma/migrations/20260809203018_aqwelia_launch_offers/` + PG : migrations
- `src/lib/launch-offers/{config,pricing,service,admin}.ts`
- `src/app/api/promotions/launch/{eligibility,reservations,reservations/[id]}/route.ts`
- `src/app/api/admin/promotions/route.ts`
- `tests/aqwelia-launch-offers.test.ts`
- `src/lib/db.ts` : `transactionOptions` SQLite (maxWait 8s / timeout 30s)
  pour les tests concurrents
