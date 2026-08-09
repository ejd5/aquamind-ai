# PR n°2 — Offres de lancement AQWELIA : lancement Web réel (plan détaillé)

> Statut : **PLAN EN ATTENTE DE VALIDATION** — aucun code écrit.
> Fondation : PR #88 (backend quotas/réservations/admin, verte, en Draft).
> Portée : **Web uniquement (Stripe)**. iOS/Android restent bloqués (comptes
> RevenueCat/Apple/Google non ouverts).

---

## 1. Objectif

Rendre les deux offres de lancement **visibles et achetables sur Web** via
Stripe Checkout, avec éligibilité et prix calculés **exclusivement côté serveur**,
activation de l'abonnement **seulement après vérification cryptographique du
webhook Stripe**, idempotence complète, emails de confirmation, affichage des
quotas réels, et désactivation instantanée de la campagne.

Offres (déjà implémentées en backend, PR #88) :
- `LAUNCH50_MONTHLY` — quota 300, −50 % la 1re fois puis tarif mensuel (oasis 6,99 € → 3,50 € puis 6,99 €/mois).
- `LAUNCH3FOR2_QUARTERLY` — quota 200, 3 mois au prix de 2 (oasis 13,98 € puis 19,99 €/trimestre).

Distinction explicite avec « Découverte » : Découverte est le **forfait gratuit
permanent** (0 €), PAS une offre de lancement.

---

## 2. Affichage des deux offres sur `/tarifs`

### 2.1 Composant serveur
- Nouveau composant `src/app/(public)/tarifs/launch-offers.tsx` (Server Component), rendu **au-dessus** de la section plans payants existante (au-dessus de Découverte et des plans standard).
- Section encadrée visuellement distincte : badge « Offre de lancement · édition limitée », compteur de places restantes, étiquettes marketing (« −50 % la 1re fois » / « 3 mois au prix de 2 ») **uniquement si** `marketingConsistency()` le permet (déjà en backend).
- Affichage des montants uniquement depuis `checkEligibility` (serveur) : jamais de montant codé côté client.

### 2.2 Appel éligibilité serveur
- La page `/tarifs` appelle `checkEligibility` (backend) par offre + forfait cible (`oasis` par défaut) **via le serveur**, pas via le navigateur.
- L'utilisateur connecté : éligibilité réelle (pays serveur, abonnement antérieur, offre déjà consommée, réservation active, quotas).
- Visiteur non connecté : affichage marketing générique (« connectez-vous pour voir votre éligibilité ») — aucune éligibilité calculée côté client.

### 2.3 Distinction Découverte
- Découverte reste affiché dans la grille existante avec son étiquette « Gratuit ».
- Aucune offre de lancement ne peut être confondue avec Découverte : les offres ont leur propre section, prix ≠ 0 €, CTA distinct (« Profiter de l'offre »), et l'offre n'est jamais listée dans les plans standard.

---

## 3. Éligibilité calculée exclusivement côté serveur

- Réutilise `checkEligibility` de `src/lib/launch-offers/service.ts` (PR #88) : pays = `User.country` serveur, abonnement payant antérieur, offre déjà consommée (`@@unique([campaignId, userId])`), réservation active, formule, plateforme, quotas.
- **Aucune logique d'éligibilité côté client.** Le navigateur ne reçoit que le résultat (`eligible` + prix) depuis la route API.

---

## 4. Prix et produits Stripe configurés côté serveur

- **Nouveau mapping serveur** dans `src/lib/launch-offers/stripe.ts` :
  - `LAUNCH_OFFER_STRIPE_PRICES` : `offerCode + planId` → `{ priceId, dueNowMinor, renewalMinor, renewalPeriod }`.
  - Les `priceId` viennent de `STRIPE_PRICES` (déjà dans `src/lib/stripe.ts`) ou de variables d'environnement dédiées (`AQWELIA_LAUNCH_STRIPE_PRICE_*`).
- **Jamais fournis par le navigateur** : le client envoie seulement `{ offerCode, planId, idempotencyKey }` ; le serveur résout le prix et crée la session Checkout.
- Vérification `computeLaunchPricing` + `marketingConsistency` avant toute création de session (les montants affichés doivent correspondre aux montants Stripe).
- Si le prix n'est pas configuré ou que la campagne est inactive → la route retourne l'état inerte (aucune session créée).

---

## 5. Création sécurisée de Stripe Checkout

- **Nouvelle route** `POST /api/promotions/launch/checkout` :
  1. Vérifie `launchOffersEnabled()` (sinon 403 inerte).
  2. Session authentifiée (`getServerSession`).
  3. Résout éligibilité côté serveur (`checkEligibility`) → si non éligible : 409 avec `reasonCode`.
  4. **Crée la réservation** (30 min, atomique) avec `createReservation` (idempotence par `idempotencyKey` UUID validé).
  5. Résout `priceId` serveur + `client_reference_id` = userId + `metadata` = `{ campaignCode, offerCode, planId, platform: 'WEB', reservationId, idempotencyKey }`.
  6. `stripe.checkout.sessions.create({ mode: 'subscription', line_items: [{ price: priceId, quantity: 1 }], success_url / cancel_url avec réservationId, locale })`.
  7. Retourne `{ sessionId, reservationId, expiresAt }`.
- La réservation est créée **avant** la redirection Checkout ; elle expire à 30 min si le paiement n'aboutit pas (`expireDueReservations` job ou lazy).
- **Double protection anti double-clic** : verrou synchrone côté client (déjà dans `use-stripe-checkout`) + idempotence serveur sur `idempotencyKey`.

---

## 6. Vérification cryptographique du webhook Stripe

- **Réutilise la route existante** `src/app/api/stripe/webhook/route.ts` :
  - `stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)` — rejette les signatures invalides (400).
  - `processEventIdempotently` (`src/lib/billing/idempotency.ts`) : déduplication par `(source, environment, eventId)`.
- **Détection des événements de la campagne** : présence de `metadata.campaignCode`/`offerCode` sur `checkout.session.completed` (ou `metadata` propagé à la Subscription via `subscription_data.metadata`).
- Aucune route de webhook "promotion" séparée : un seul point d'entrée Stripe, le dispatch se fait par `metadata`.

---

## 7. Idempotence des paiements et webhooks

- Webhook : `processEventIdempotently` (déjà en place) → un même `event.id` n'est traité qu'une fois.
- Paiement/transaction : `providerTransactionId @unique` sur `PromotionRedemption` + `@@unique([campaignId, userId])` (PR #88) → un même paiement ne consomme jamais deux places.
- Réservation : `idempotencyKey @unique` + vérification appartenance utilisateur/offre/formule/plateforme (PR #88).
- `confirmRedemption` : idempotent — second webhook du même `providerTransactionId` → `alreadyProcessed: true` sans nouvel effet.

---

## 8. Traitement des webhooks dupliqués ou désordonnés

- L'ordre est géré par la **route webhook existante** (`processEventIdempotently`) + `applyTransition` (`src/lib/billing/transition.ts`) qui ignore les événements plus anciens que l'état courant (`WHERE lastProviderEventAt < new`).
- Pour la campagne : `confirmRedemption` est appelé **après** `applyTransition` de l'abonnement (checkout confirmé). Les événements dupliqués retournent `alreadyProcessed`.
- Scénarios couverts :
  - Même webhook reçu deux fois → traité une fois.
  - `invoice.paid` reçu avant `checkout.session.completed` → pas de double consommation (l'activation de la campagne est déclenchée uniquement par `checkout.session.completed` avec `payment_status === 'paid'`, ou par le premier événement qui a la transaction).
  - Webhook arrivant après expiration de la réservation → confirmation tardive (`lateConfirmation`) honorée, quota global + allocation appliqués atomiquement.

---

## 9. Activation de l'abonnement seulement après confirmation Stripe

- Séquence dans le handler webhook (`handleStripeEvent` étendu) :
  1. `checkout.session.completed` avec `payment_status === 'paid'` (exigence existante).
  2. `applyTransition` active l'abonnement (plan oasis, statut actif, store web, provider stripe).
  3. **Ensuite seulement** : `confirmRedemption` (consomme quota global + allocation atomiquement) avec les montants du pricing serveur.
- Aucune activation si `payment_status !== 'paid'` (ignoré). Aucun accès accordé si le `priceId` est inconnu (`unknown_price` → ignoré).
- Retour d'échec webhook : jetable/rejouable — jamais `acknowledged` sans traitement effectif.

---

## 10. Gestion des échecs, expirations et remboursements

- **Échec de paiement / annulation Checkout** : la réservation expire à 30 min (slot libéré) ; l'utilisateur peut recommencer.
- **Expiration de session Checkout** : `expireDueReservations` (job/lazy) libère le slot.
- **Remboursement / annulation** (spec §3) :
  - Une annulation à la demande du client **ne remet pas** la place automatiquement (anti-abus).
  - Doublon technique / capture double / annulation imputable à AQWELIA : remise de place **après validation administrative** (audit dans `PromotionAuditLog`).
  - Chargeback ou fraude confirmée : pas de remise automatique.
- **Route admin** à étendre : vue des redemptions + action de remise de place (auditée), et statut `REFUNDED`/`CHARGEBACK`/`TECHNICAL_CANCEL` géré sur `PromotionRedemption.status`.

---

## 11. Emails de confirmation

- **Nouveau template** dans `src/lib/email` : email de confirmation d'activation de l'offre (montant payé, renouvellement, plan, période).
- Déclenché après `confirmRedemption` réussi (fire-and-forget, comme les emails existants).
- Contenu : rappel des droits activés, montant, date de renouvellement, lien vers le compte. Aucune information sensible de paiement.

---

## 12. Affichage des quotas réellement disponibles

- La route `/api/promotions/launch/eligibility` (PR #88) retourne `availability.state` + `remaining` (masqué si au-dessus du seuil, `showExactRemaining`).
- Sur `/tarifs` : affiche « Plus que X places » quand `showExactRemaining` est vrai, sinon « Édition limitée ».
- Les compteurs sont lus depuis le backend à chaque chargement de page (Server Component) — jamais de cache client qui afficherait des places déjà prises.
- `QUOTA_EXHAUSTED` / `ALLOCATION_EXHAUSTED` → l'offre s'affiche épuisée sans bouton d'achat.

---

## 13. Campagne désactivable immédiatement

- `AQWELIA_LAUNCH_OFFERS_ENABLED !== 'true'` → routes inertes (403/état vide), aucun CTA rendu.
- `setCampaignStatus` (admin) : `PAUSED`/`ENDED`/`EXHAUSTED` → `checkEligibility`/`createReservation` refusent immédiatement (déjà en place).
- Bouton admin : « Désactiver la campagne » (audité via `PromotionAuditLog`).
- **Pause ≠ perte de quota** : une pause ne consomme pas et ne libère pas les réservations en cours.

---

## 14. Tests staging de bout en bout

### 14.1 Tests unitaires/integration (extension)
- `tests/aqwelia-launch-offers-web.test.ts` :
  - route checkout : refus si campagne inactive / non authentifié / non éligible / prix non configuré ;
  - réservation créée avant session Checkout, idempotence sur `idempotencyKey` ;
  - webhook : signature invalide → 400 ; `payment_status !== paid` → ignoré ; `priceId` inconnu → ignoré ;
  - activation : abonnement actif + `confirmRedemption` (quota global + allocation) après `checkout.session.completed paid` ;
  - webhook dupliqué → `alreadyProcessed` ; désordonné (invoice avant checkout) → pas de double consommation ;
  - remboursement → pas de remise automatique ; remise manuelle auditée.
- Mocks Stripe via `src/lib/stripe` injectable (comme les tests billing existants).

### 14.2 Recette staging manuelle (checklist)
1. Créer produits + prix Stripe réels (sandbox) pour `LAUNCH50_MONTHLY` / `LAUNCH3FOR2_QUARTERLY` (oasis).
2. Configurer `STRIPE_WEBHOOK_SECRET` + endpoint webhook → `STRIPE_SECRET_KEY` en secrets staging.
3. Activer `AQWELIA_LAUNCH_OFFERS_ENABLED=true` en staging **seulement**.
4. Parcours : visiteur → login → voir offres + quotas → réserver → Checkout → payer (carte test `4242...`) → webhook → abonnement actif + email → quota décrémenté.
5. Vérifier : second paiement même user → refusé ; webhook rejoué → `alreadyProcessed` ; réservation expirée → late confirmation ; désactivation campagne → routes inertes.
6. Vérifier sur `tests/run-smoke-tests.sh` que la suite complète reste verte.

---

## 15. Découpage en étapes (ordre)

1. Mapping prix Stripe serveur + config `AQWELIA_LAUNCH_STRIPE_PRICE_*` dans `.env.example`.
2. Route `POST /api/promotions/launch/checkout` (éligibilité + réservation + session).
3. Composant `/tarifs` (section offres + quotas + CTA) ; distinction Découverte.
4. Handler webhook Stripe étendu (détection campagne + `applyTransition` + `confirmRedemption`).
5. Gestion remboursements/annulations + route admin (remise de place auditée).
6. Email de confirmation.
7. Tests unitaires/integration.
8. Recette staging manuelle.

---

## 16. Non couvert (hors périmètre Web)

- iOS/Android (RevenueCat/Apple/Google) : bloqué — comptes non ouverts.
- Offres sur d'autres forfaits que `oasis` par défaut : paramétrable mais validé sur oasis.
- Aucune modification de la PR #88 après fusion de celle-ci.

---

## 17. Critères d'acceptation

- Les deux offres s'affichent sur `/tarifs` avec prix serveur et quotas réels.
- Aucun montant ni décision d'éligibilité ne provient du navigateur.
- L'abonnement n'est activé qu'après webhook Stripe vérifié (`payment_status === 'paid'`).
- Un même paiement/webhook ne consomme jamais deux places.
- Remboursements/annulations conformes à la spec (pas de remise automatique sauf validation admin).
- Email de confirmation envoyé à l'activation.
- Désactivation de la campagne immédiate et réversible.
- Suite complète verte via `run-smoke-tests.sh` ; P0/P1 Product/P1 Mobile verts.
