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
| **Fichiers** | `src/app/api/pool/photo-diagnostic/route.ts` (ligne 48) |
| **Description** | Les images de diagnostic sont stockées en base64 complet dans la DB (`imageUrl: image`). Le stockage fonctionne mais croît rapidement (chaque photo ~1-6 Mo en base64). Le commentaire dans le code note : `// Store full base64 (for dev/MVP — use S3 in production)`. |
| **Impact** | (1) Croissance rapide de la DB (chaque photo ~1-6 Mo), (2) Pas de TTL de suppression, (3) Pas de récupération via URL signée (images inline en DB), (4) Performance dégradée avec beaucoup de photos. |
| **Preuve** | `imageUrl: image` — `src/app/api/pool/photo-diagnostic/route.ts` ligne 79 |
| **Options de stockage objet** | (1) **AWS S3** : mature, coûteux, compliance EU possible, (2) **Cloudflare R2** : moins cher, S3-compatible, compliance EU, (3) **Vercel Blob** : intégré si hébergement Vercel, limité, (4) **Europa** (OVH) : compliance EU stricte, moins documenté. **Ne pas verrouiller S3 sans évaluation** — R2 est souvent préférable pour les petits projets (pas de egress fee). |
| **Résolution** | (1) Choisir un provider de stockage objet, (2) Migrer l'upload vers ce provider, (3) Servir les images via URL signée, (4) TTL de suppression automatique, (5) Mettre à jour le schéma DB |
| **Délai** | Avant tout lancement commercial |

### R-CRIT-02 : EXIF non strippé — données personnelles envoyées au provider IA

| Champ | Détail |
|-------|--------|
| **Zone** | Diagnostic Photo + Strip Scan |
| **Fichiers** | `src/app/api/pool/photo-diagnostic/route.ts`, `src/app/api/pool/strip-scan/route.ts` |
| **Description** | Aucun handling EXIF n'existe nulle part dans le codebase. Zéro import de sharp/piexif/jimp dans les routes photo. `sharp` est dans `package.json` mais jamais utilisé. Le flow photo complet est : (1) Client : `FileReader.readAsDataURL(file)` → base64 avec EXIF intact, (2) POST JSON avec base64 complet, (3) API route reçoit base64, appelle `nvidiaVision(prompt, image)` depuis `@/lib/ai/nvidia` — l'image est envoyée telle quelle, (4) DB : `imageUrl: image` (base64 complet stocké). AQWELIA ne garantit actuellement aucune suppression des métadonnées. Selon l'appareil, le navigateur et le fichier sélectionné, des métadonnées telles que la localisation GPS, la date, le modèle de l'appareil ou une miniature intégrée peuvent donc être transmises au fournisseur IA. |
| **Flux inspectés** | (1) Photo diagnostic (`module-diagnostic.tsx` → `/api/pool/photo-diagnostic`), (2) Strip scan (`/api/pool/strip-scan`), (3) Equipment photo (champ `photoUrl` existe mais pas d'upload UI), (4) PoolDesign (modèle existe mais jamais utilisé), (5) Health log (affiche les photos stockées). Seuls les flux 1 et 2 envoient des données au provider IA. |
| **Métadonnées à risque** | GPS (coordonnées piscine), timestamps, appareil photo (make/model), paramètres caméra, thumbnail intégré, commentaires utilisateur |
| **Impact** | Risque RGPD : données de localisation envoyées à un tiers sans consentement explicite pour cette finalité. |
| **Preuve** | Aucun import sharp/piexif/jimp dans les routes photo. `sharp` est dans `package.json` mais JAMAIS importé/utilisé dans `src/`. |
| **Résolution** | (1) Utiliser `sharp` pour stripper EXIF côté serveur avant envoi au provider IA, (2) Documenter dans la politique de confidentialité, (3) Ajouter un consentement explicite pour l'envoi de métadonnées. |
| **Délai** | Avant tout lancement commercial |

### R-CRIT-03 : Pas de DPA documenté avec le provider IA

| Champ | Détail |
|-------|--------|
| **Zone** | AI Integration |
| **Fichiers** | `src/app/api/pool/photo-diagnostic/route.ts`, `src/app/api/chat/route.ts` |
| **Description** | Les photos et données pool sont envoyées à NVIDIA NIM via `@/lib/ai/nvidia` (client NVIDIA NIM, base URL `https://integrate.api.nvidia.com/v1`). Les modèles utilisés : vision `nvidia/nemotron-nano-12b-v2-vl`, chat `z-ai/glm-5.2` (servi via NVIDIA NIM). Aucun Data Processing Agreement n'est documenté avec NVIDIA. |
| **Données envoyées au provider IA** | (1) Photo diagnostic : base64 complet (jusqu'à 6 Mo) envoyé à NVIDIA NIM vision model, (2) Strip scan : base64 complet envoyé à NVIDIA NIM vision model, (3) Chat : profil piscine complet + dernière mesure d'eau + 10 derniers messages + prompt système envoyés à NVIDIA NIM chat model |
| **PII transmise** | Nom de la piscine (potentiellement identifiable), région/localisation implicite via EXIF. Pas de noms, emails, ni données de paiement envoyés au provider IA. |
| **Aspect technique (code)** | (1) Données envoyées : base64 images + contexte pool + chat history, (2) Chiffrement HTTPS pour tous les appels, (3) Aucune rétention côté serveur documentée, (4) Aucune politique de suppression, (5) Le npm dep `z-ai-web-dev-sdk` existe mais n'est PAS utilisé par les routes AI (photo-diagnostic, strip-scan, chat) — celles-ci utilisent directement `@/lib/ai/nvidia` |
| **Aspect juridique (hors code)** | (1) Aucun DPA signé ou référencé avec NVIDIA, (2) Aucune politique de confidentialité créée, (3) Aucune base légale RGPD documentée pour le transfert, (4) TODO list dans `STORE_READINESS.md` mentionne "politique de confidentialité" comme à créer |
| **Impact** | Risque RGPD : transfert de données personnelles vers NVIDIA sans base légale documentée. Le npm dep `z-ai-web-dev-sdk` doit être audité séparément (il n'est pas utilisé par les routes AI actuelles). |
| **Résolution** | **Technique** : (1) Documenter exactement quelles données sont envoyées à NVIDIA NIM et où, (2) Évaluer si des données PII sont nécessaires, (3) Auditer le npm dep `z-ai-web-dev-sdk` séparément. **Juridique** : (1) Signer un DPA avec NVIDIA, (2) Créer la politique de confidentialité, (3) Ajouter la mention dans les CGU. |
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

### R-MAJ-01 : Tests d'intégration nécessitent serveur lancé

| Champ | Détail |
|-------|--------|
| **Zone** | Tests |
| **Description** | 50 tests d'intégration (3 fichiers) nécessitent un serveur lancé sur port 3099. 77 tests DB utilisent SQLite locale. Les 295 tests unitaires tournent sans serveur. Au total 422/422 passent quand l'environnement est correctement configuré. |
| **Impact** | Les tests d'intégration ne peuvent pas tourner sans serveur — pas automatisable sur CI sans setup supplémentaire. |
| **Preuve** | Campagne complète : 19 fichiers, 422 tests, tous passent avec serveur |
| **Résolution** | Documenter le setup de test, ajouter un script CI avec serveur, ou isoler les tests |
| **Délai** | Phase 2 |

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

### R-MAJ-05 : LSI simplifié — documentation et validation manquantes

| Champ | Détail |
|-------|--------|
| **Zone** | Chimie |
| **Fichiers** | `src/lib/pool/water-balance.ts` (lignes 5-44) |
| **Description** | Le LSI utilise des step-functions (lookup tables 8 paliers) au lieu des formules logarithmiques standard. La formule est `pH + tempFactor + calciumFactor + alkalinityFactor - 12.1`. Omet TDS. Le code ne documente pas que c'est une approximation. |
| **Impact** | Valeurs potentiellement imprécises aux frontières des paliers. Les utilisateurs avancés pourraient s'attendre à la formule standard. |
| **Preuve** | `tempFactor`: 0.3 à 2.0 en 8 paliers discrets. `calciumFactor`: 1.5 à 3.1 en 8 paliers. `alkalinityFactor`: log10(TAC)×0.1+1.0. Constante -12.1. |
| **Résolution** | (1) Documenter l'approximation en haut de fichier, (2) Valider contre 3 cas de test LSI standard, (3) Ajouter tests unitaires. Ne PAS remplacer par les formules standard — le simplifié est adapté au cas d'usage (pas de TDS disponible). |
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

### R-MIN-05 : Hébergement non documenté — pas de Vercel

| Champ | Détail |
|-------|--------|
| **Zone** | Infrastructure |
| **Description** | Le projet utilise un modèle d'hébergement auto-géré (Caddy reverse proxy + Next.js standalone + bun + SQLite). Aucun `vercel.json`, aucune config Vercel, aucune variable `NEXT_PUBLIC_*` ou `VERCEL_*`. Le `next.config.ts` utilise `output: "standalone"` (typique Docker/self-hosted, pas Vercel). La PR #31 a échoué au check Vercel car le projet n'est pas configuré pour Vercel. |
| **Impact** | Le check Vercel sur la PR est un faux négatif — le projet n'est pas déployé sur Vercel. |
| **Résolution** | (1) Documenter le modèle d'hébergement dans les docs d'architecture, (2) Désactiver les checks Vercel sur les PR si le projet n'utilise pas Vercel, ou (3) Configurer Vercel si c'est l'hébergement cible. |
| **Délai** | Phase 2 |

---

## MATRICE DE RISQUE

| ID | Gravité | Zone | Délai cible |
|----|---------|------|-------------|
| R-CRIT-01 | CRITIQUE | Photo storage (base64 complet en DB) | Avant lancement |
| R-CRIT-02 | CRITIQUE | Photo EXIF | Avant lancement |
| R-CRIT-03 | CRITIQUE | NVIDIA DPA | Avant lancement |
| R-CRIT-04 | CRITIQUE | Marketing claims | Immédiat |
| R-MAJ-01 | MAJEUR | Tests intégration | Phase 2 |
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
| R-MIN-05 | MINEUR | Infrastructure | Phase 2 |
