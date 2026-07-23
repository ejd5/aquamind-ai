# AQWELIA — Registre des Risques

> Phase 0 Audit — Étape 5: Risques Techniques et Fonctionnels
> Date : 2026-07-23 | SHA : f85db85

---

## Légende de gravité

| Niveau | Définition |
|--------|-----------|
| **CRITIQUE** | Impacte la sécurité, la conformité RGPD, ou la viabilité du produit |
| **MAJEUR** | Impacte l'expérience utilisateur ou la fiabilité |
| **MODÉRÉ** | Impacte la maintenabilité ou la performance |
| **MINEUR** | Amélioration souhaitable |

---

## RISQUES CRITIQUES

### R-CRIT-01 : Images stockées en base64 dans la DB

| Champ | Détail |
|-------|--------|
| **Zone** | Diagnostic Photo |
| **Fichier** | `src/app/api/pool/photo-diagnostic/route.ts` (ligne 79) |
| **Description** | Les images de diagnostic sont stockées en base64 complet dans la colonne `PhotoDiagnostic.imageUrl`. Un seul diagnostic peut générer 2-10 Mo de base64 en ligne de DB. |
| **Impact** | Bombardement de la DB (croissance linéaire), lenteur des requêtes, coût de stockage, impossibilité de purger efficacement. |
| **Preuve** | `imageUrl: image // Store full base64 (for dev/MVP — use S3 in production)` — commentaire dans le code |
| **Résolution** | Migrer vers S3 (ou équivalent) avec TTL de suppression automatique |
| **Délai** | Avant tout lancement commercial |

### R-CRIT-02 : EXIF non strippé — données personnelles envoyées à NVIDIA

| Champ | Détail |
|-------|--------|
| **Zone** | Diagnostic Photo + Strip Scan |
| **Fichiers** | `src/app/api/pool/photo-diagnostic/route.ts`, `src/app/api/pool/strip-scan/route.ts` |
| **Description** | Les photos envoyées à NVIDIA NIM contiennent les métadonnées EXIF (coordonnées GPS, appareil photo, date/heure). Aucun strippage n'est effectué. |
| **Impact** | Risque RGPD : données de localisation envoyées à un tiers sans consentement explicite pour cette finalité. |
| **Preuve** | Aucun import de sharp/piexif/jimp dans les routes photo. Le package sharp est dans package.json mais pas utilisé. |
| **Résolution** | Installer sharp, stripper EXIF avant envoi à NVIDIA. Documenter dans la politique de confidentialité. |
| **Délai** | Avant tout lancement commercial |

### R-CRIT-03 : Pas de DPA documenté avec NVIDIA

| Champ | Détail |
|-------|--------|
| **Zone** | AI Integration |
| **Fichiers** | `src/lib/ai/nvidia.ts` |
| **Description** | Les photos et données pool sont envoyées à NVIDIA NIM (API cloud). Aucun Data Processing Agreement (DPA) n'est documenté ou référencé dans le code. |
| **Impact** | Risque RGPD : transfert de données personnelles vers un tiers sans base légale documentée. |
| **Preuve** | Aucune mention de DPA dans le code, la documentation, ou les fichiers de config. |
| **Résolution** | Vérifier/exécuter un DPA avec NVIDIA. Ajouter la mention dans la politique de confidentialité. |
| **Délai** | Avant tout lancement commercial |

### R-CRIT-04 : Affirmations commerciales fausses

| Champ | Détail |
|-------|--------|
| **Zone** | Marketing / Landing pages |
| **Description** | 5 affirmations commerciales n'ont aucune preuve technique : QuickBooks intégré, Xero intégré, routage optimisé, facturation conforme, synchronisation comptable. |
| **Impact** | Risque juridique (pratique trompeuse), perte de confiance utilisateur. |
| **Preuve** | Aucun fichier QuickBooks, Xero, Factur-X, ou routage dans le code. |
| **Résolution** | Supprimer ces affirmations des pages marketing. Voir CLAIMS_REGISTRY. |
| **Délai** | Immédiat |

---

## RISQUES MAJEURS

### R-MAJ-01 : 62 tests échouent (intégration)

| Champ | Détail |
|-------|--------|
| **Zone** | Tests |
| **Description** | 62 tests sur 735 échouent car ils nécessitent un serveur lancé ou une DB PostgreSQL. |
| **Impact** | Impossibilité de valider les fonctionnalités critiques sans environnement complet. |
| **Preuve** | `npx vitest run` → 9 failed, 22 passed |
| **Résolution** | Lancer le serveur avant les tests, ou isoler les tests unitaires des tests d'intégration |
| **Délai** | Phase 1 |

### R-MAJ-02 : Pas d'idempotence sur les écritures offline

| Champ | Détail |
|-------|--------|
| **Zone** | Offline / Cache |
| **Fichiers** | `src/lib/offline/offline-store.ts` |
| **Description** | L'outbox offline n'utilise pas de clés d'idempotence. Un retry de `flushPending()` peut créer des doublons (water tests, reminders, etc.). |
| **Impact** | Données dupliquées après reconnexion, surtout en mode instable réseau. |
| **Preuve** | `Date.now() + random` comme ID de queue, pas envoyé au serveur |
| **Résolution** | Ajouter des clés d'idempotence dans le header des requêtes replays, vérification côté serveur |
| **Délai** | Phase 2 |

### R-MAJ-03 : Diagnostic action plan duplique la logique dosage

| Champ | Détail |
|-------|--------|
| **Zone** | Diagnostic Photo |
| **Fichiers** | `src/components/aquamind/diagnostic-action-plan.tsx` (lignes 116-141) |
| **Description** | `diagnostic-action-plan.tsx` contient des fonctions de dosage simplifiées avec des coefficients différents de `dosing-engine.ts` (ex: 10 g/m3 vs 7.5 ml/m3 pour pH-). |
| **Impact** | Incohérence dans les recommandations de dosage selon le parcours utilisé. |
| **Preuve** | `phMinusGramsPer01 = 10` dans diagnostic vs `ph_minus_per_01_per_m3 = 7.5` dans dosing-engine |
| **Résolution** | Unifier en important `dosing-engine.ts` dans diagnostic-action-plan |
| **Délai** | Phase 2 |

### R-MAJ-04 : confidence=0.9 hardcodée dans les action plans

| Champ | Détail |
|-------|--------|
| **Zone** | Action Plans |
| **Fichiers** | `src/lib/pool/action-plan.ts` (ligne 354) |
| **Description** | La confiance du plan d'action est toujours 0.9, quel que soit le nombre de paramètres mesurés. Un test avec seulement pH retourne 90% de confiance. |
| **Impact** | L'utilisateur surévalue la fiabilité du plan. |
| **Preuve** | `confidence: 0.9 // deterministe donc confiance elevee` |
| **Résolution** | Calculer la confiance en fonction du nombre de paramètres mesurés vs requis |
| **Délai** | Phase 2 |

### R-MAJ-05 : LSI utilise des approximations step-function

| Champ | Détail |
|-------|--------|
| **Zone** | Chimie |
| **Fichiers** | `src/lib/pool/water-balance.ts` (lignes 10-34) |
| **Description** | Les facteurs température et calcium sont des step-functions discrètes au lieu de formules logarithmiques continues (standard Langelier). |
| **Impact** | Valeurs LSI potentiellement imprécises aux frontières des paliers. |
| **Preuve** | `tempFactor`: 0.3 à 2.0 en 8 paliers discrets. `calciumFactor`: 1.5 à 3.1 en 8 paliers. |
| **Résolution** | Implémenter les formules LSI standard continues, valider contre un calculateur reconnu |
| **Délai** | Phase 2 |

### R-MAJ-06 : Limite decouverte incohérente

| Champ | Détail |
|-------|--------|
| **Zone** | Billing |
| **Fichiers** | `src/lib/billing/plans.ts` |
| **Description** | Le plan Free a `maxPhotoScansPerMonth: 999999` et `maxTestsPerMonth: 999999` (illimité), alors que le marketing dit « 2 scans/mois, 2 tests/mois ». |
| **Impact** | Les utilisateurs Free ont un accès illimité au lieu de 2/mois. Perte de revenue potentielle. |
| **Preuve** | Limite 999999 vs features array « 2 tests/mois » |
| **Résolution** | Aligner les limites avec le marketing ou mettre à jour le marketing |
| **Délai** | Phase 1 |

---

## RISQUES MODÉRÉS

### R-MOD-01 : Pas de service worker ni PWA

| Champ | Détail |
|-------|--------|
| **Zone** | Offline |
| **Description** | Aucun service worker, aucun manifest PWA, aucune utilisation de la Cache API. |
| **Impact** | Pas d'installabilité « Add to Home Screen », pas de cache-first pour les assets statiques. |
| **Résolution** | Ajouter service worker + manifest (next-pwa ou équivalent) |
| **Délai** | Phase 3 |

### R-MOD-02 : Agent diagnostic = regex, pas VLM

| Champ | Détail |
|-------|--------|
| **Zone** | Growth OS |
| **Fichiers** | `src/lib/growth/agents.ts` (diagnostic function) |
| **Description** | L'agent diagnostic de Growth OS utilise du regex keyword-matching, pas le VLM. Le commentaire dit « would be VLM-augmented in production ». |
| **Impact** | Diagnostic limité aux problèmes textuels, pas de photo. |
| **Résolution** | Intégrer le VLM existant (photo-diagnostic) dans le flow Growth |
| **Délai** | Phase 3 |

### R-MOD-03 : Nurturing = templates, pas d'envoi email

| Champ | Détail |
|-------|--------|
| **Zone** | Growth OS |
| **Fichiers** | `src/lib/growth/agents.ts` (nurturing function) |
| **Description** | L'agent nurturing retourne des séquences email mais ne les envoie pas. C'est un intent logger. |
| **Impact** | Les séquences de relance ne sont jamais envoyées. |
| **Résolution** | Intégrer un provider email (Resend, SendGrid, etc.) |
| **Délai** | Phase 3 |

### R-MOD-04 : IoT tous stubbed

| Champ | Détail |
|-------|--------|
| **Zone** | IoT |
| **Fichiers** | `src/lib/pool/iot-integration.ts` |
| **Description** | Les 3 providers IoT (ICO, iopool, ESPHome) retournent des données fictives. |
| **Impact** | L'intégration IoT est non fonctionnelle. |
| **Résolution** | Implémenter les vrais SDK ou documenter comme « bientôt disponible » |
| **Délai** | Phase 4 |

### R-MOD-05 : Pas de tests pour LSI, CWI, predict-engine, reminders

| Champ | Détail |
|-------|--------|
| **Zone** | Chimie / Prédiction / Rappels |
| **Description** | Aucun test unitaire pour `calculateLSI`, `calculateClearWaterIndex`, `predictProblems`, `generateReminders`. |
| **Impact** | Régressions silencieuses possibles sur les calculs critiques. |
| **Résolution** | Ajouter tests unitaires pour chaque fonction pure |
| **Délai** | Phase 2 |

### R-MOD-06 : Portal Stripe résout par email

| Champ | Détail |
|-------|--------|
| **Zone** | Billing |
| **Fichiers** | `src/app/api/stripe/portal/route.ts` |
| **Description** | Le Customer Portal Stripe résout le client par email au lieu du `stripeCustomerId`. Si l'utilisateur change son email sur AQWELIA mais pas sur Stripe, le lookup échoue. |
| **Impact** | L'utilisateur ne peut pas accéder à son portail d'abonnement. |
| **Résolution** | Utiliser `Subscription.stripeCustomerId` pour la résolution |
| **Délai** | Phase 2 |

### R-MOD-07 : allowDangerousEmailAccountLinking

| Champ | Détail |
|-------|--------|
| **Zone** | Auth |
| **Fichiers** | `src/lib/auth.ts` |
| **Description** | `allowDangerousEmailAccountLinking: true` sur Google et Apple OAuth. Permet à un attaquant contrôlant un email OAuth de takeover un compte. |
| **Impact** | Risque de prise de compte par liaison OAuth. |
| **Résolution** | Désactiver ou implémenter une vérification d'email avant liaison |
| **Délai** | Phase 2 |

---

## RISQUES MINEURS

### R-MIN-01 : EN 8.5% plus petit que FR

| Champ | Détail |
|-------|--------|
| **Zone** | i18n |
| **Description** | Le fichier EN fait 374KB vs 407KB pour FR — potentiellement des clés manquantes. |
| **Résolution** | Comparer les clés FR vs EN |

### R-MIN-02 : Growth page en anglais hardcoded

| Champ | Détail |
|-------|--------|
| **Zone** | Growth OS |
| **Fichiers** | `src/app/growth/page.tsx` |
| **Description** | La page marketing Growth est en anglais, pas utilisant les clés i18n. |
| **Résolution** | internationaliser |

### R-MIN-03 : Aucun retry cron pour webhooks échoués

| Champ | Détail |
|-------|--------|
| **Zone** | Billing |
| **Description** | Les webhooks échoués ont un `nextRetryAt` mais aucun cron/worker ne les traite. |
| **Résolution** | Ajouter un cron job ou un worker |

### R-MIN-04 : Pas de CAPTCHA sur inscription

| Champ | Détail |
|-------|--------|
| **Zone** | Auth |
| **Description** | L'inscription n'a que le rate limiting (10/h) comme protection anti-bot. |
| **Résolution** | Ajouter reCAPTCHA ou équivalent |

---

## MATRICE DE RISQUE

| ID | Gravité | Zone | Délai cible |
|----|---------|------|-------------|
| R-CRIT-01 | CRITIQUE | Photo storage | Avant lancement |
| R-CRIT-02 | CRITIQUE | Photo EXIF | Avant lancement |
| R-CRIT-03 | CRITIQUE | NVIDIA DPA | Avant lancement |
| R-CRIT-04 | CRITIQUE | Marketing claims | Immédiat |
| R-MAJ-01 | MAJEUR | Tests | Phase 1 |
| R-MAJ-02 | MAJEUR | Offline idempotence | Phase 2 |
| R-MAJ-03 | MAJEUR | Dosage duplication | Phase 2 |
| R-MAJ-04 | MAJEUR | Confidence hardcoded | Phase 2 |
| R-MAJ-05 | MAJEUR | LSI approximations | Phase 2 |
| R-MAJ-06 | MAJEUR | Plan limit mismatch | Phase 1 |
| R-MOD-01 | MODÉRÉ | PWA | Phase 3 |
| R-MOD-02 | MODÉRÉ | Growth diagnostic | Phase 3 |
| R-MOD-03 | MODÉRÉ | Email nurturing | Phase 3 |
| R-MOD-04 | MODÉRÉ | IoT stubbed | Phase 4 |
| R-MOD-05 | MODÉRÉ | Test coverage | Phase 2 |
| R-MOD-06 | MODÉRÉ | Stripe portal | Phase 2 |
| R-MOD-07 | MODÉRÉ | OAuth linking | Phase 2 |
| R-MIN-01 | MINEUR | i18n EN | Phase 2 |
| R-MIN-02 | MINEUR | Growth i18n | Phase 3 |
| R-MIN-03 | MINEUR | Webhook retry | Phase 2 |
| R-MIN-04 | MINEUR | CAPTCHA | Phase 3 |
