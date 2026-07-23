# AQWELIA — Backlog d'Exécution

> Phase 0 Audit — Étape 8: Backlog Priorisé
> Date : 2026-07-23 | SHA : f85db85

---

## Légende de priorité

| Priorité | Définition |
|----------|-----------|
| **P0 BLOCKER** | Bloque le lancement ou la conformité. Doit être résolu AVANT tout déploiement. |
| **P0 HIGH** | Impact majeur sur la fiabilité ou l'expérience. Résoudre dans la première itération. |
| **P1** | Important mais pas bloquant. Résoudre dans les 2-4 semaines. |
| **P2** | Amélioration souhaitable. Résoudre dans le mois. |
| **P3** | Nice-to-have. Quand les ressources le permettent. |

---

## P0 BLOCKER

### AUDIT-001 : Supprimer les affirmations commerciales fausses

| Champ | Détail |
|-------|--------|
| **Problème** | 5 affirmations n'ont aucune preuve technique : QuickBooks, Xero, routage optimisé, facturation conforme, synchronisation comptable |
| **Preuve** | Aucun fichier dans le code. Voir CLAIMS_REGISTRY. |
| **Fichiers probables** | Pages Pro (`src/app/pro/`), pages features, composants landing |
| **Dépendances** | Aucune |
| **Tests attendus** | Vérification que les mentions sont supprimées |
| **Critères d'acceptation** | Aucune mention de QuickBooks, Xero, routage, facturation, sync comptable dans les pages publiques |
| **Risque** | Affirmation mensongère = risque juridique |
| **Ordre recommandé** | 1 |

### AUDIT-002 : Supprimer ou sourcer « +38% de conversion »

| Champ | Détail |
|-------|--------|
| **Problème** | Affirmation non vérifiable sans source |
| **Preuve** | `src/app/growth/page.tsx:67` |
| **Fichiers probables** | `src/app/growth/page.tsx` |
| **Dépendances** | Aucune |
| **Tests attendus** | Vérification que l'affirmation est supprimée ou sourcée |
| **Critères d'acceptation** | Soit supprimée, soit sourcée avec une étude vérifiable |
| **Risque** | Tromperie commerciale |
| **Ordre recommandé** | 2 |

### AUDIT-003 : Choisir et implémenter le stockage objet pour les photos

| Champ | Détail |
|-------|--------|
| **Problème** | Les images sont tronquées à 500 chars en DB (inutilisables). Le base64 complet est envoyé au provider IA mais pas persisté. Pas de récupération possible des photos. |
| **Preuve** | `src/app/api/pool/photo-diagnostic/route.ts:48` — `image.substring(0, 500)` |
| **Fichiers probables** | `src/app/api/pool/photo-diagnostic/route.ts`, nouveau service stockage, schéma DB |
| **Dépendances** | Choix du provider de stockage (S3/R2/Blob/EU — voir matrice ci-dessous) |
| **Tests attendus** | Upload, retrieval, TTL suppression |
| **Critères d'acceptation** | Photos persistées, thumbnails fonctionnels, TTL automatique |
| **Risque** | Photos perdues, RGPD, coût de stockage |
| **Ordre recommandé** | 3 |
| **Note** | **Choix du provider requis avant d'écrire du code** |
| | |
| **Matrice de comparaison** | |
| | **AWS S3** : Mature, écosystème riche, coûteux (0.023$/GB), compliance EU possible (eu-west-1), egress fees |
| | **Cloudflare R2** : S3-compatible, pas de egress fees, moins cher, compliance EU, moins d'écosystème |
| | **Vercel Blob** : Intégré si Vercel, limité, pas de TTL natif, pas de EU region |
| | **Europa (OVH)** : EU-only, compliance stricte, moins documenté, coût compétitif |

### AUDIT-004 : Strpper les métadonnées EXIF des photos

| Champ | Détail |
|-------|--------|
| **Problème** | Les photos envoyées à NVIDIA contiennent GPS, appareil, date |
| **Preuve** | Aucun import sharp/piexif dans les routes photo |
| **Fichiers probables** | `src/app/api/pool/photo-diagnostic/route.ts`, `src/app/api/pool/strip-scan/route.ts` |
| **Dépendances** | sharp (déjà dans package.json) |
| **Tests attendus** | Vérifier que les images envoyées n'ont plus d'EXIF |
| **Critères d'acceptation** | Aucune métadonnée EXIF dans les images envoyées à NVIDIA |
| **Risque** | RGPD — données de localisation envoyées à un tiers |
| **Ordre recommandé** | 4 |

### AUDIT-005 : Documenter le DPA (technique + juridique)

| Champ | Détail |
|-------|--------|
| **Problème** | Pas de Data Processing Agreement documenté avec le provider IA. Le provider est inconnu (le SDK `z-ai-web-dev-sdk` masque le backend). |
| **Preuve** | Aucune mention dans le code ou la documentation |
| **Fichiers probables** | Documentation architecture, politique de confidentialité |
| **Dépendances** | Identification du provider réel derrière `z-ai-web-dev-sdk` |
| **Tests attendus** | Document technique + document juridique |
| **Critères d'acceptation** | Les deux aspects documentés |
| **Risque** | RGPD — transfert illégal de données |
| **Ordre recommandé** | 5 |
| | |
| **Aspect technique (dans le code)** | |
| - Action | Documenter quelles données sont envoyées, où, comment, combien de temps |
| - Données envoyées | (1) Photos : base64 complet + typeHint, (2) Chat : profil pool + mesure eau + 10 messages + system prompt |
| - Fichier cible | README technique ou section dans ARCHITECTURE.md |
| | |
| **Aspect juridique (hors code)** | |
| - Action | Signer un DPA avec le provider identifié, créer la politique de confidentialité |
| - Délai | Avant tout lancement commercial |
| - Fichier cible | docs/legal/privacy-policy.md (à créer) |

---

## P0 HIGH

### AUDIT-006 : Résoudre l'incohérence limites Free (Options A / B)

| Champ | Détail |
|-------|--------|
| **Problème** | `maxPhotoScansPerMonth: 999999` et `maxTestsPerMonth: 999999` (illimité) alors que le marketing dit « 2 scans/mois, 2 tests/mois » |
| **Preuve** | `src/lib/billing/plans.ts` — limites 999999 vs marketing « 2/mois » |
| **Fichiers probables** | `src/lib/billing/plans.ts` (code), pages marketing (copy) |
| **Dépendances** | Décision business requise |
| **Tests attendus** | Selon l'option choisie |
| **Critères d'acceptation** | Alignement entre code et marketing |
| **Risque** | Perte de revenue (Option B) ou expérience dégradée (Option A) |
| **Ordre recommandé** | 6 |
| **Note** | **DECISION BUSINESS REQUISE — Pas de code tant que l'option n'est pas validée** |
| | |
| **Option A : Enforce 2/mois côté serveur** | |
| - Action | Modifier `plans.ts` : `maxPhotoScansPerMonth: 2`, `maxTestsPerMonth: 2` |
| - Impact | Les utilisateurs Free seront limités à 2 scans et 2 tests par mois |
| - Risque | frustration utilisateur si le free trial est trop restrictif |
| - Tests | Vérifier que le gate bloque au-delà de la limite |
| | |
| **Option B : Modifier le marketing** | |
| - Action | Mettre à jour les pages marketing pour refléter l'illimité |
| - Impact | Le free plan devient plus attractif, moins d'incitation à upgrader |
| - Risque | Perte de conversion Free → Payant |
| - Tests | Vérifier la cohérence du copy marketing |

### AUDIT-007 : Reformuler « 10 agents autonomes »

| Champ | Détail |
|-------|--------|
| **Problème** | Les « agents » sont des fonctions déterministes, pas des IA autonomes |
| **Preuve** | `src/lib/growth/agents.ts` — zéro appel LLM |
| **Fichiers probables** | `src/app/growth/page.tsx`, pages marketing Growth |
| **Dépendances** | Aucune |
| **Tests attendus** | Vérification que le terme « agent autonome » n'apparaît plus |
| **Critères d'acceptation** | Reformulation en « moteurs de traitement » ou « outils d'automatisation » |
| **Risque** | AI Act, attentes utilisateur |
| **Ordre recommandé** | 7 |

### AUDIT-008 : Qualifier l'offline en marketing

| Champ | Détail |
|-------|--------|
| **Problème** | « Offline complet » est trompeur (pas de photo offline, pas de PWA) |
| **Preuve** | FAQ, pages features |
| **Fichiers probables** | Pages FAQ, composants landing |
| **Dépendances** | Aucune |
| **Tests attendus** | Vérification de la reformulation |
| **Critères d'acceptation** | « Mode déconnecté pour les données de base : consultation, tests d'eau, rappels, équipements » |
| **Risque** | Attentes utilisateur non satisfaites |
| **Ordre recommandé** | 8 |

### AUDIT-009 : Ajouter des clés d'idempotence aux écritures offline

| Champ | Détail |
|-------|--------|
| **Problème** | Les retries de flushPending() peuvent créer des doublons — risque de données corrompues en production |
| **Preuve** | `src/lib/offline/offline-store.ts` — `Date.now() + random` comme ID de queue, pas envoyé au serveur |
| **Fichiers probables** | `src/lib/offline/offline-store.ts`, routes API concernées (7 modules) |
| **Dépendances** | Coopération côté serveur (header `idempotency-key`) |
| **Tests attendus** | Test de double POST avec même clé → 1 seul enregistrement |
| **Critères d'acceptation** | Chaque écriture offline porte une clé unique, le serveur rejette les doublons |
| **Risque** | Données dupliquées en production, corruption de données utilisateur |
| **Ordre recommandé** | 9 |

### AUDIT-010 : Unifier la logique dosage (diagnostic vs dosing-engine)

| Champ | Détail |
|-------|--------|
| **Problème** | `diagnostic-action-plan.tsx` duplique la logique dosage avec coefficients différents — risque de surdosage/underdosage |
| **Preuve** | `phMinusGramsPer01 = 10` (diagnostic) vs `ph_minus_per_01_per_m3 = 7.5` (dosing-engine) |
| **Fichiers probables** | `src/components/aquamind/diagnostic-action-plan.tsx` |
| **Dépendances** | `src/lib/pool/dosing-engine.ts` |
| **Tests attendus** | Même entrée → même recommandation dans les deux flows |
| **Critères d'acceptation** | Plus de code dupliqué, import depuis dosing-engine |
| **Risque** | Incohérence de dosage = risque pour la sécurité baignade |
| **Ordre recommandé** | 10 |

---

## P1

### AUDIT-011 : Rendre la confidence dynamique dans les action plans

| Champ | Détail |
|-------|--------|
| **Problème** | `confidence: 0.9` hardcodée |
| **Preuve** | `src/lib/pool/action-plan.ts:354` |
| **Fichiers probables** | `src/lib/pool/action-plan.ts` |
| **Dépendances** | Aucune |
| **Tests attendus** | 1 paramètre mesuré → confidence basse, 10 paramètres → confidence haute |
| **Critères d'acceptation** | Confidence proportionnelle au nombre de paramètres mesurés |
| **Risque** | Surévaluation de la fiabilité |
| **Ordre recommandé** | 11 |

### AUDIT-012 : Documenter et valider le LSI simplifié

| Champ | Détail |
|-------|--------|
| **Problème** | Le LSI utilise des step-functions (lookup tables) au lieu des formules logarithmiques standard. La documentation ne précise pas que c'est une approximation. |
| **Preuve** | `src/lib/pool/water-balance.ts:5-44` — `tempFactor`, `calciumFactor`, `alkalinityFactor` sont des paliers discrets |
| **Formule implémentée** | `LSI = pH + tempFactor(temp) + calciumFactor(TH) + alkalinityFactor(TAC) - 12.1` |
| **Formule standard** | `LSI = pH - (9.3 + A + B - C - D)` avec A=log10(TDS), B=f(temp), C=log10(TH), D=log10(TAC) |
| **Différences clés** | (1) Pas de TDS, (2) tempFactor = step-function 8 paliers vs formule continue, (3) calciumFactor = step-function 8 paliers vs log, (4) alkalinityFactor = `log10(TAC)*0.1+1.0` (approximation), (5) constante -12.1 vs combinée |
| **Fichiers probables** | `src/lib/pool/water-balance.ts` (documentation uniquement) |
| **Dépendances** | Validation contre un calculateur LSI reconnu |
| **Tests attendus** | Comparaison avec un calculateur LSI standard (erreur < 0.1) |
| **Critères d'acceptation** | (1) Commentaire en haut de fichier documentant que c'est une approximation simplifiée pour propriétaires de piscines, (2) Thresholds documentés (-0.3 à +0.3 = équilibré), (3) Comparaison avec 3 cas de test standard |
| **Risque** | Valeurs imprécises aux frontières des paliers — acceptable pour un usage piscine grand public |
| **Ordre recommandé** | 12 |
| **Note** | Ne PAS remplacer par les formules standard — le simplifié est adapté au cas d'usage (pas de TDS disponible côté utilisateur) |

### AUDIT-013 : Ajouter tests unitaires pour LSI, CWI, predict-engine, reminders

| Champ | Détail |
|-------|--------|
| **Problème** | 4 fonctions pures sans tests |
| **Preuve** | Aucun fichier de test pour ces fonctions |
| **Fichiers probables** | Nouveaux fichiers tests |
| **Dépendances** | Aucune |
| **Tests attendus** | Au moins 5 tests par fonction |
| **Critères d'acceptation** | Couverture de tests pour toutes les fonctions pures critiques |
| **Risque** | Régressions silencieuses |
| **Ordre recommandé** | 13 |

### AUDIT-014 : Utiliser stripeCustomerId pour le Portal

| Champ | Détail |
|-------|--------|
| **Problème** | Portal résout par email — peut échouer si email modifié |
| **Preuve** | `src/app/api/stripe/portal/route.ts` |
| **Fichiers probables** | `src/app/api/stripe/portal/route.ts` |
| **Dépendances** | Subscription.stripeCustomerId |
| **Tests attendus** | Test avec email modifié → portal fonctionne |
| **Critères d'acceptation** | Résolution par stripeCustomerId |
| **Risque** | Utilisateur bloqué |
| **Ordre recommandé** | 14 |

### AUDIT-015 : Renforcer la liaison OAuth

| Champ | Détail |
|-------|--------|
| **Problème** | `allowDangerousEmailAccountLinking: true` |
| **Preuve** | `src/lib/auth.ts` |
| **Fichiers probables** | `src/lib/auth.ts` |
| **Dépendances** | UX de vérification d'email |
| **Tests attendus** | Test de takeover OAuth bloqué |
| **Critères d'acceptation** | Liaison OAuth avec vérification d'email |
| **Risque** | Takeover de compte |
| **Ordre recommandé** | 15 |

---

## P2

### AUDIT-016 : Ajouter service worker + manifest PWA

| Champ | Détail |
|-------|--------|
| **Problème** | Pas d'installabilité, pas de cache-first pour assets |
| **Fichiers probables** | `public/manifest.json`, service worker config |
| **Dépendances** | next-pwa ou équivalent |
| **Tests attendus** | Installabilité vérifiée |
| **Critères d'acceptation** | PWA installable, assets cachés |
| **Ordre recommandé** | 16 |

### AUDIT-017 : Corriger complété EN vs FR

| Champ | Détail |
|-------|--------|
| **Problème** | EN 8.5% plus petit que FR |
| **Fichiers probables** | `src/i18n/locales/en.json` |
| **Dépendances** | Crowdin ou traduction manuelle |
| **Tests attendus** | Nombre de clés FR = nombre de clés EN |
| **Critères d'acceptation** | Parité de clés |
| **Ordre recommandé** | 17 |

### AUDIT-018 : Internationaliser la page Growth

| Champ | Détail |
|-------|--------|
| **Problème** | Page Growth en anglais hardcoded |
| **Fichiers probables** | `src/app/growth/page.tsx` |
| **Dépendances** | Système i18n existant |
| **Tests attendus** | Page affichée dans la langue de l'utilisateur |
| **Critères d'acceptation** | Utilisation des clés i18n |
| **Ordre recommandé** | 18 |

### AUDIT-019 : Ajouter cron retry pour webhooks échoués

| Champ | Détail |
|-------|--------|
| **Problème** | nextRetryAt existe mais aucun worker ne traite les retries |
| **Fichiers probables** | Nouveau cron job ou Vercel cron |
| **Dépendances** | Vercel Cron ou worker externe |
| **Tests attendus** | Webhook échoué → retry exécuté |
| **Critères d'acceptation** | Les webhooks échoués sont automatiquement retentés |
| **Ordre recommandé** | 19 |

### AUDIT-020 : Intégrer le VLM dans le flow Growth diagnostic

| Champ | Détail |
|-------|--------|
| **Problème** | L'agent diagnostic Growth utilise du regex, pas le VLM |
| **Fichiers probables** | `src/lib/growth/agents.ts` (diagnostic function) |
| **Dépendances** | photo-diagnostic route existante |
| **Tests attendus** | Diagnostic Growth avec photo → résultat VLM |
| **Critères d'acceptation** | Le diagnostic Growth accepte les photos et utilise le VLM |
| **Ordre recommandé** | 20 |

---

## P3

### AUDIT-021 : Construire l'intégration email pour nurturing

| Champ | Détail |
|-------|--------|
| **Problème** | Les séquences nurturing loggent mais n'envoient pas |
| **Fichiers probables** | `src/lib/growth/agents.ts`, nouveau service email |
| **Dépendances** | Provider email (Resend, SendGrid) |
| **Tests attendus** | Email envoyé et reçu |
| **Critères d'acceptation** | Nurturing envoie de vrais emails |
| **Ordre recommandé** | 21 |

### AUDIT-022 : Construire la facturation Pro

| Champ | Détail |
|-------|--------|
| **Problème** | Pas de module de facturation Pro |
| **Fichiers probables** | Nouveau module facturation |
| **Dépendances** | Décision business (tarifs Pro) |
| **Tests attendus** | Création de facture, TVA, numérotation |
| **Critères d'acceptation** | Factures générées conformément aux normes |
| **Ordre recommandé** | 22 |

### AUDIT-023 : Construire le routage de tournées

| Champ | Détail |
|-------|--------|
| **Problème** | Marketing promet le routage optimisé — inexistant |
| **Fichiers probables** | Nouveau module routage |
| **Dépendances** | API géolocalisation, algorithme TSP/VRP |
| **Tests attendus** | Itinéraire optimisé pour 5+ interventions |
| **Critères d'acceptation** | Routage fonctionnel avec réduction de trajet mesurable |
| **Ordre recommandé** | 23 |

### AUDIT-024 : Construire les devis Pro (PDF)

| Champ | Détail |
|-------|--------|
| **Problème** | Pro n'a pas de module devis |
| **Fichiers probables** | Nouveau module devis |
| **Dépendances** | PDF generation (existe pour rapports) |
| **Tests attendus** | Génération PDF devis |
| **Critères d'acceptation** | Devis PDF téléchargeable |
| **Ordre recommandé** | 24 |

### AUDIT-025 : Ajouter CAPTCHA sur l'inscription

| Champ | Détail |
|-------|--------|
| **Problème** | Pas de protection anti-bot |
| **Fichiers probables** | `src/app/api/auth/register/route.ts`, composant inscription |
| **Dépendances** | reCAPTCHA ou équivalent |
| **Tests attendus** | Inscription sans CAPTCHA → bloquée |
| **Critères d'acceptation** | CAPTCHA vérifié avant création de compte |
| **Ordre recommandé** | 25 |

---

## RÉSUMÉ PAR PHASE

| Phase | Objectif | Tickets | Durée estimée |
|-------|----------|---------|---------------|
| **P0-A** | Conformité RGPD et claims | AUDIT-001, 002, 004, 005 | 1 semaine |
| **P0-B** | Stockage et données | AUDIT-003, 006, 009, 010 | 1-2 semaines |
| **P0-C** | Claims et positionnement | AUDIT-007, 008 | 2-3 jours |
| **P1** | Fiabilité et qualité | AUDIT-011, 012, 013, 014, 015 | 2-3 semaines |
| **P2** | Améliorations et features | AUDIT-016 à 025 | Mois 2+ |
| **Total** | | **25 tickets** | |

---

## ORDRE D'EXÉCUTION DÉTAILLÉ

### P0-A : Conformité RGPD et claims (Semaine 1)

**Objectif** : Éliminer les risques juridiques immédiats.

| Ticket | Action | Dépendances | Critère de sortie |
|--------|--------|-------------|-------------------|
| AUDIT-001 | Supprimer QuickBooks, Xero, routage, facturation, sync | Aucune | 0 mention dans les pages publiques |
| AUDIT-002 | Supprimer ou sourcer « +38% » | Aucune | Affirmation supprimée ou sourcée |
| AUDIT-004 | Strpper EXIF avec sharp avant envoi IA | sharp déjà installé | 0 métadonnées EXIF dans les images envoyées |
| AUDIT-005 | Documenter DPA (technique + juridique) | Identification du provider IA | Document technique + juridique créés |

### P0-B : Stockage et données (Semaines 1-2)

**Objectif** : Corriger les problèmes de stockage de données critiques.

| Ticket | Action | Dépendances | Critère de sortie |
|--------|--------|-------------|-------------------|
| AUDIT-003 | Choisir provider stockage objet (S3/R2/Blob/EU), implémenter upload | Décision business | Photos servies depuis stockage objet, thumbnails fonctionnels |
| AUDIT-006 | Résoudre incohérence limites Free (Option A ou B) | **Décision business requise** | Limites code = marketing |
| AUDIT-009 | Ajouter clés d'idempotence aux écritures offline | Coopération serveur | 0 doublon après retry |
| AUDIT-010 | Unifier logique dosage (diagnostic vs dosing-engine) | Aucune | Même entrée = même recommandation |

### P0-C : Claims et positionnement (Semaine 2)

**Objectif** : Corriger le positionnement marketing.

| Ticket | Action | Dépendances | Critère de sortie |
|--------|--------|-------------|-------------------|
| AUDIT-007 | Reformuler « 10 agents autonomes » | Aucune | Terme « agent autonome » absent du marketing |
| AUDIT-008 | Qualifier l'offline | Aucune | Copy = « mode déconnecté pour les données de base » |

### P1 : Fiabilité et qualité (Semaines 2-4)

**Objectif** : Améliorer la fiabilité technique.

| Ticket | Action | Dépendances | Critère de sortie |
|--------|--------|-------------|-------------------|
| AUDIT-011 | Confidence dynamique dans les action plans | Aucune | Confidence proportionnelle aux paramètres mesurés |
| AUDIT-012 | Documenter LSI simplifié + 3 cas de test | Aucune | Commentaire en haut de fichier + tests |
| AUDIT-013 | Tests unitaires LSI, CWI, predict, reminders | Aucune | 5+ tests par fonction pure |
| AUDIT-014 | Utiliser stripeCustomerId pour Portal | Aucune | Résolution par ID, pas email |
| AUDIT-015 | Renforcer liaison OAuth | UX vérification email | allowDangerousEmailAccountLinking désactivé |

### P2 : Améliorations et features (Mois 2+)

**Objectif** : Fonctionnalités avancées et améliorations UX.

| Ticket | Action | Dépendances | Critère de sortie |
|--------|--------|-------------|-------------------|
| AUDIT-016 | Service worker + manifest PWA | Aucune | PWA installable |
| AUDIT-017 | Complétude EN vs FR | Crowdin | Parité de clés |
| AUDIT-018 | Internationaliser page Growth | Aucune | Page i18n |
| AUDIT-019 | Cron retry webhooks | Vercel Cron ou worker | Webhooks retentés automatiquement |
| AUDIT-020 | Intégrer VLM dans flow Growth | Aucune | Diagnostic Growth avec photo |
| AUDIT-021 | Email nurturing | Provider email | Emails envoyés |
| AUDIT-022 | Facturation Pro | Décision business tarifs | Module fonctionnel |
| AUDIT-023 | Routage tournées | API géoloc, TSP/VRP | Itinéraire optimisé |
| AUDIT-024 | Devis Pro PDF | PDF generation | Devis téléchargeable |
| AUDIT-025 | CAPTCHA inscription | reCAPTCHA | Inscription protégée |
