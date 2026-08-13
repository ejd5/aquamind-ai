# PR n°2 — Offres de lancement Web : recette staging (checklist)

> Complément opérationnel de `AQWELIA_LAUNCH_OFFERS_PLAN_P2.md`. À exécuter sur
> l'environnement de staging UNIQUEMENT, avec des identifiants Stripe réels
> (mode test). Ne jamais activer en production avant validation complète.

## Pré-requis

- Stripe : produit + prix mensuel et trimestriel `oasis` (déjà référencés par
  `STRIPE_PRICE_OASIS_MONTHLY` / `STRIPE_PRICE_OASIS_QUARTERLY`).
- Stripe : deux coupons de première période :
  - `AQWELIA_LAUNCH_STRIPE_COUPON_LAUNCH50_MONTHLY` → coupon « −50 % once » ;
  - `AQWELIA_LAUNCH_STRIPE_COUPON_LAUNCH3FOR2_QUARTERLY` → coupon « montant
    = Q − 2P once » (ex. oasis : 1999 − 1398 = 601 centimes).
- Stripe : endpoint webhook configuré vers `https://<staging>/api/stripe/webhook`
  avec `STRIPE_WEBHOOK_SECRET` en secret staging.
- Secrets staging (GitHub) : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PRICE_OASIS_MONTHLY`, `STRIPE_PRICE_OASIS_QUARTERLY`,
  `AQWELIA_LAUNCH_*` (coupons), `AQWELIA_LAUNCH_TOKEN_SECRET`.

## Checklist

### 1. Configuration
- [ ] `AQWELIA_LAUNCH_OFFERS_ENABLED=true` en staging uniquement.
- [ ] Coupons Stripe créés et variables posées.
- [ ] `bun run db:generate:all` + `bun run test:postgresql` verts.

### 2. Parcours utilisateur Web
- [ ] Visiteur → `/tarifs` : la section « Offre de lancement » s'affiche avec CTA
  « Se connecter » (aucune éligibilité calculée).
- [ ] User connecté (FR, jamais abonné payant) → offres visibles avec prix serveur
  (« −50 % » 3,50 € puis 6,99 €/mois ; « 3 mois au prix de 2 » 13,98 € puis
  19,99 €/trimestre) + places restantes.
- [ ] Clic « Profiter de l'offre » → réservation 30 min → redirection Stripe
  Checkout (carte test `4242 4242 4242 4242`).
- [ ] Paiement → webhook → abonnement `oasis` actif + email de confirmation →
  quota global + allocation décrémentés.

### 3. Sécurité et idempotence
- [ ] Double-clic → une seule session Checkout (idempotencyKey).
- [ ] Webhook rejoué (même `event.id`) → traité une fois.
- [ ] Second webhook `checkout.session.completed` même `payment_intent` →
  `alreadyProcessed`, aucune double consommation.
- [ ] `invoice.paid` reçu avant `checkout.session.completed` → pas de double
  consommation.
- [ ] Webhook arrivant après expiration de la réservation → confirmation tardive
  honorée (`lateConfirmation`) + quotas appliqués atomiquement.
- [ ] Montant encaissé ≠ pricing serveur → webhook ignoré, aucun quota consommé.

### 4. Éligibilité et anti-abus
- [ ] User déjà consommé (même campagne) → `OFFER_ALREADY_REDEEMED`, pas de CTA.
- [ ] User avec abonnement payant antérieur → `ALREADY_SUBSCRIBED`.
- [ ] User `country != FR` (en base) → `COUNTRY_NOT_ELIGIBLE` (le paramètre
  client ne décide jamais).
- [ ] Quota global épuisé → `QUOTA_EXHAUSTED`, offre « épuisée » sans bouton.
- [ ] Réservation active → `ACTIVE_RESERVATION_EXISTS`.

### 5. Remboursements / annulations / désactivation
- [ ] Remboursement intégral Stripe → redemption `REFUNDED`, la place N'EST PAS
  remise automatiquement.
- [ ] Remise de place admin (`PATCH /api/admin/promotions` action `restore_slot`)
  → place restituée + `PromotionAuditLog`.
- [ ] Désactivation campagne (`setCampaignStatus` PAUSED) → routes inertes,
  désactivable immédiatement, pause ne consomme pas de quota.

### 6. Recette complète staging (bout en bout)
1. Config Stripe réelle (produits, prix, coupons, webhook).
2. Activer la campagne en staging.
3. Parcours complet user FR éligible (réservation → Checkout → paiement →
   abonnement actif + email → quotas).
4. Rejouer webhooks (dupliqué + désordonné) → aucune double consommation.
5. Remboursement → REFUNDED sans remise auto ; remise admin auditée.
6. Désactiver la campagne → inertie immédiate.
7. `tests/run-smoke-tests.sh` vert + P0/P1 Product/P1 Mobile verts.

## Critères d'acceptation
- Les deux offres s'affichent sur `/tarifs` avec prix serveur + quotas réels.
- Aucun montant/décision d'éligibilité ne vient du navigateur.
- L'abonnement n'est activé qu'après webhook Stripe vérifié (`paid`).
- Aucune double consommation (paiement/webhook/réservation idempotents).
- Remboursements/annulations conformes à la spec (pas de remise auto sauf admin).
- Email de confirmation à l'activation.
- Désactivation immédiate et réversible.
- Suite complète verte.
