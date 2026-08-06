# AQWELIA Wave A3 — Recette sandbox RevenueCat (état de préparation)

> Ce document distingue strictement ce qui a été **vérifié dans le code / par
> compilation** de ce qui **n'a pas encore été vérifié sur un appareil ou un
> émulateur correctement configuré**. Aucune preuve de recette sandbox n'est
> cochéée sans observation réelle.

## Légende

| Statut | Signification |
| --- | --- |
| ✅ Code vérifié | Comportement prouvé par tests unitaires/comportementaux |
| ✅ Compilation native vérifiée | `gradlew assembleDebug` (Android) / `xcodebuild` simulateur (iOS) |
| ⬜ Configuration RevenueCat vérifiée | Console RevenueCat (entitlements/produits) **non** modifiée ici |
| ⬜ Configuration Apple vérifiée | App Store Connect **non** modifié ici |
| ⬜ Configuration Google vérifiée | Google Play Console **non** modifié ici |
| ⬜ Test manuel exécuté | Aucun achat réel ni sandbox simulé dans ce rapport |
| ⬜ Résultat non encore vérifié | À faire sur appareil/émulateur configuré |

---

## 1. Fondation vérifiée

| Élément | Statut |
| --- | --- |
| Projets natifs Capacitor versionnés (`ios/`, `android/`) | ✅ Code vérifié + ✅ Compilation native vérifiée |
| `com.aqwelia.app` (Bundle ID / applicationId), nom « Aqwelia », `webDir: out` | ✅ Code vérifié |
| Android `launchMode="singleTop"` (aucune annulation d'achat au passage bancaire) | ✅ Code vérifié |
| Android `INTERNET` + `allowMixedContent=false` | ✅ Code vérifié |
| iOS capacité **In-App Purchase** + entitlement + Swift 5.0 | ✅ Code vérifié |
| Plugin `@revenuecat/purchases-capacitor` présent (iOS SPM + Android Gradle) | ✅ Code vérifié + ✅ Compilation native vérifiée |
| Aucun secret serveur dans le bundle mobile | ✅ Code vérifié (`check-mobile-bundle.mjs`) |
| Preflight environnement mobile (Release exige clés publiques HTTPS, pas de secret) | ✅ Code vérifié |
| Routes B2C : `/dashboard`, `/pricing`, `/settings`, `/settings/subscription`, `/auth/register`, `/auth/signin` | ✅ Code vérifié |
| Routes Pro conservées : `/pro/app/today`, `/pro/app/report` | ✅ Code vérifié |
| Bridge identité RevenueCat monté dans le layout mobile authentifié | ✅ Code vérifié |
| Achat impossible avant identité SDK + liaison serveur + environnement serveur | ✅ Code vérifié |
| `clearIdentity()` avant la fin de session | ✅ Code vérifié |
| Changement de compte invalide une opération en cours (epoch) | ✅ Code vérifié |
| Projection serveur = seule autorité commerciale | ✅ Code vérifié |
| 12 Product IDs canoniques + 3 entitlements exacts | ✅ Code vérifié |

---

## 2. Matrice de preuves sandbox

Chaque ligne doit être observée **sur un appareil ou un émulateur avec StoreKit
sandbox / Play billing test** avant d'être cochéée.

| Scénario | Statut |
| --- | --- |
| Premier achat (paywall → sandbox → entitlements actifs) | ⬜ Résultat non encore vérifié |
| Achat annulé (pas de message d'échec alarmant, `state='cancelled'`) | ⬜ Résultat non encore vérifié |
| Restauration des achats (convergence serveur requise) | ⬜ Résultat non encore vérifié |
| Déconnexion / reconnexion (identité RevenueCat nettoyée puis rétablie) | ⬜ Résultat non encore vérifié |
| Changement de compte A → B (aucun résultat de A sous B) | ⬜ Résultat non encore vérifié |
| Achat sur un second appareil (restauration cross-device) | ⬜ Résultat non encore vérifié |
| Renouvellement (RENEWAL webhook → statut conservé) | ⬜ Résultat non encore vérifié |
| Expiration (EXPIRATION → droits retirés, l'autre fournisseur conservé) | ⬜ Résultat non encore vérifié |
| Période de grâce (BILLING_ISSUE / grace_period) | ⬜ Résultat non encore vérifié |
| Paiement échoué (past_due, sans perte immédiate de droits) | ⬜ Résultat non encore vérifié |
| Changement de plan (PRODUCT_CHANGE → nouveau plan projeté) | ⬜ Résultat non encore vérifié |
| Webhook dupliqué (idempotence `[source, environment, eventId]`) | ⬜ Résultat non encore vérifié |
| Webhook désordonné (événement plus ancien ignoré) | ⬜ Résultat non encore vérifié |
| Suppression de compte avec abonnement actif (cascade + rejet webhook) | ⬜ Résultat non encore vérifié |

---

## 3. Configuration externe encore nécessaire (hors de ce dépôt)

### RevenueCat
- ⬜ Créer/valider les produits iOS et Android exacts (les 12 IDs de la matrice).
- ⬜ Créer les 3 entitlements `oasis`, `wellness`, `spa365` et mapper les produits.
- ⬜ Configurer le webhook (Bearer `REVENUECAT_WEBHOOK_SECRET`, URL `/api/revenuecat/webhook`).
- ⬜ Activer les URLs `app_user_id` = id AQWELIA côté SDK.

### Apple (App Store Connect)
- ⬜ Créer les 12 IAP du bundle `com.aqwelia.app`, niveau de prix, statut « Prêt à soumettre ».
- ⬜ Activer la capacité In-App Purchase sur l'App ID.
- ⬜ Configurer StoreKit sandbox + comptes de test.
- ⬜ Soumettre pour la recette sandbox (TestFlight).

### Google (Play Console)
- ⬜ Créer les 12 produits (subs) avec `applicationId com.aqwelia.app`.
- ⬜ Ajouter les comptes de test (licence) et l'APK de recette.

### Variables d'environnement du build mobile
- ⬜ `NEXT_PUBLIC_API_BASE_URL` (HTTPS de production/staging).
- ⬜ `NEXT_PUBLIC_REVENUECAT_IOS_KEY` et `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY` (clés publiques).
- ⬜ `REVENUECAT_WEBHOOK_SECRET` (serveur uniquement, jamais dans le bundle).

---

## 4. Preuve de compilation (exécutée localement / CI)

| Build | Résultat |
| --- | --- |
| `bun run mobile:build` (routes B2C + Pro exportées) | ✅ |
| `npx cap sync ios android` | ✅ |
| `cd android && ./gradlew assembleDebug` | ✅ BUILD SUCCESSFUL (APK debug) |
| iOS simulateur (`xcodebuild ... CODE_SIGNING_ALLOWED=NO`) | ⬜ à exécuter sur runner macOS (Xcode non installé sur la machine locale) |
| `node scripts/mobile-env-preflight.mjs` | ✅ |
| `node scripts/check-mobile-bundle.mjs` | ✅ |

---

## 5. Ce que cette Wave ne prétend PAS

- Aucun achat réel ni sandbox n'a été lancé dans le cadre de ce rapport.
- La recette sandbox externe (appareil/émulateur + consoles) **n'est pas terminée** :
  cette Wave rend la recette techniquement possible et documentée, elle ne
  l'exécute pas.
# ci trigger
