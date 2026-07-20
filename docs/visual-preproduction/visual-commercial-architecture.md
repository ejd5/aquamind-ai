# AQWELIA — Architecture Commerciale Canonique

> Phase 2 du Masterplan Visuel — Nomenclature et organisation des offres
> Date : 2026-07-21 | Branche : docs/visual-preproduction-phase-2

---

## 1. RÉSUMÉ

| Métrique | Valeur |
|----------|--------|
| **Univers produits** | 5 (B2C, Pro, Growth, Brain, Care) |
| **Plans B2C** | 4 |
| **Plans B2B Pro** | 4 |
| **Plans Growth** | 3 |
| **Plans Business** | 2 |
| **Feature gates serveur** | 9 |
| **Conflits de nommage** | 3 |

---

## 2. UNIVERS PRODUITS

### 2.1 AQWELIA Pool (B2C — Particuliers)

> Application mobile + web pour propriétaires de piscines et spas.

| Nom actuel | ID code | Audience | Description |
|-----------|---------|----------|-------------|
| **Free** | `decouverte` | Particuliers | Découverte, fonctionnalités de base |
| **Pool** | `oasis` | Particuliers | Copilote intelligent piscine |
| **Complete** | `wellness` | Particuliers | Piscine + spa, tout-en-un |
| **Spa** | `spa365` | Particuliers | Copilote intelligent spa |

### 2.2 AQWELIA Pro (B2B — Piscinistes professionnels)

> Application web pour piscinistes, gestion clients, planning, interventions.

| Nom actuel | Audience | Description |
|-----------|----------|-------------|
| **Solo** | Piscinistes indépendants | 5 clients, 10 piscines |
| **Team** | Petites équipes | 25 clients, 50 piscines |
| **Fleet** | Grandes entreprises | 100 clients, 250 piscines |
| **Enterprise** | Réseaux nationaux | Sur mesure |

### 2.3 AQWELIA Growth (B2B — Réseaux de piscinistes)

> Plateforme de génération et qualification de leads pour réseaux.

| Nom actuel | Audience | Description |
|-----------|----------|-------------|
| **Starter** | Réseaux en démarrage | 10 leads/mois |
| **Pro** | Réseaux établis | 100 leads/mois, matching IA |
| **Enterprise** | Réseaux nationaux | Illimité |

### 2.4 AQWELIA Business (B2B — Hébergement)

> Offre hôtellerie, campings, spas, conciergeries.

| Nom actuel | Audience | Description |
|-----------|----------|-------------|
| **Business** | Hébergeurs | Multi-sites, gestion centralisée |

### 2.5 AQWELIA Brain (Couche d'intelligence)

> Module d'intelligence artificielle transversal à tous les plans.

| Nom actuel | Audience | Description |
|-----------|----------|-------------|
| **Brain** | Tous les utilisateurs | Timeline, métriques, feedback, connaissances |

### 2.6 AQWELIA Care (E-commerce)

> Marketplace de produits d'entretien piscine.

| Nom actuel | Audience | Description |
|-----------|----------|-------------|
| **Care** | Tous les utilisateurs | Catalogue, panier, commande |

---

## 3. NOMMAGE CANONIQUE RECOMMANDÉ

### 3.1 Univers B2C

| ID actuel | Nom actuel | Nom canonique recommandé | Nom d'écran | Impact |
|-----------|-----------|-------------------------|-------------|--------|
| `decouverte` | Free | **AQWELIA Free** | Free | Faible — le nom "Free" est déjà utilisé |
| `oasis` | Pool | **AQWELIA Pool** | Pool | Faible — nom déjà utilisé dans plans.ts |
| `wellness` | Complete | **AQWELIA Complete** | Complete | Faible — nom déjà utilisé dans plans.ts |
| `spa365` | Spa | **AQWELIA Spa** | Spa | Faible — nom déjà utilisé dans plans.ts |

**Conflit identifié** : Le nom "Spa" est utilisé pour `spa365` (B2C) et pourrait être confondu avec l'offre "Spa365" mentionnée dans les feature gates. Recommandation : utiliser "AQWELIA Spa" pour le plan B2C et "Spa365" uniquement comme ID interne.

### 3.2 Univers Pro

| Nom actuel | Nom canonique recommandé | Nom d'écran | Impact |
|-----------|-------------------------|-------------|--------|
| Solo | **AQWELIA Pro Solo** | Pro Solo | Faible |
| Team | **AQWELIA Pro Team** | Pro Team | Faible |
| Fleet | **AQWELIA Pro Fleet** | Pro Fleet | Faible |
| Enterprise | **AQWELIA Pro Enterprise** | Pro Enterprise | Faible |

### 3.3 Univers Growth

| Nom actuel | Nom canonique recommandé | Nom d'écran | Impact |
|-----------|-------------------------|-------------|--------|
| Starter | **AQWELIA Growth Starter** | Growth Starter | Faible |
| Pro | **AQWELIA Growth Pro** | Growth Pro | **Conflit** avec AQWELIA Pro — à clarifier |
| Enterprise | **AQWELIA Growth Enterprise** | Growth Enterprise | Faible |

**Conflit identifié** : "Growth Pro" et "AQWELIA Pro" partagent le même mot "Pro". Recommandation : utiliser "AQWELIA Growth" comme préfixe systématique.

### 3.4 Univers Business

| Nom actuel | Nom canonique recommandé | Nom d'écran | Impact |
|-----------|-------------------------|-------------|--------|
| Business | **AQWELIA Business** | Business | Faible |

---

## 4. ANALYSE DES FEATURE GATES

### 4.1 Feature gates serveur

| Gate | Niveaux | B2C | Pro | Growth | Brain |
|------|---------|-----|-----|--------|-------|
| `water_test` | free, basic, premium | ✅ | — | — | — |
| `history_extended` | basic, premium | ✅ | — | — | — |
| `weather_advanced` | premium | ✅ | — | — | — |
| `smart_reminders` | basic, premium | ✅ | — | — | — |
| `multi_pool` | premium | ✅ | — | — | — |
| `pdf_report` | premium | ✅ | — | — | — |
| `pro_mode` | premium | ✅ | — | — | — |
| `guides_premium` | premium | ✅ | — | — | — |
| `care_catalogue` | free, basic, premium | ✅ | — | — | — |

### 4.2 Feature gates B2B

| Fonctionnalité | Pro | Growth | Business |
|---------------|-----|--------|----------|
| Gestion clients | ✅ | — | ✅ |
| Planning interventions | ✅ | — | ✅ |
| Rapports | ✅ | — | ✅ |
| Matching IA | — | ✅ | — |
| Pipeline leads | — | ✅ | — |
| Analytics | — | ✅ | ✅ |
| Multi-sites | — | — | ✅ |

### 4.3 Incohérences de gating

| # | Problème | Détails | Impact |
|---|----------|---------|--------|
| 1 | **Paywall client-side uniquement** | Le gate est vérifié côté serveur mais le paywall UI est client-side | Bypass possible |
| 2 | **Quota scan illimité** | `maxPhotoScansPerMonth: 999999` temporaire | Coûts IA non maîtrisés |
| 3 | **Pas de trial period** | Pas de période d'essai pour les plans payants | Conversion réduite |
| 4 | **Pas de gate pour Brain** | Brain est accessible à tous les plans | Pas de monétisation |

---

## 5. MATRICE DES FONCTIONNALITÉS PAR PLAN

### 5.1 B2C

| Fonctionnalité | Free | Pool | Complete | Spa |
|---------------|------|------|----------|-----|
| Profil piscine | 1 | 1 | 2+1 spa | 1 spa |
| Tests/mois | Illimité* | Illimité* | Illimité* | Illimité* |
| Scans photo/mois | Illimité* | Illimité* | Illimité* | Illimité* |
| Historique | 14j | Illimité | Illimité | Illimité |
| Météo avancée | ❌ | ✅ | ✅ | ❌ |
| Rappels intelligents | ❌ | ✅ | ✅ | ✅ |
| Multi-piscine | ❌ | ❌ | ✅ | ❌ |
| PDF rapport | ❌ | ✅ | ✅ | ❌ |
| Mode Pro (LSI) | ❌ | ✅ | ✅ | ❌ |
| Guides premium | Basique | Tous+vidéo | Tous+vidéo | Tous |
| Spa support | ❌ | ❌ | ✅ | ✅ |
| AI chat | ❌ | ✅ | ✅ | ❌ |

*Quota temporairement illimité (999999) — décision P0-A

### 5.2 B2B Pro

| Fonctionnalité | Solo | Team | Fleet | Enterprise |
|---------------|------|------|-------|------------|
| Clients | 5 | 25 | 100 | Illimité |
| Piscines | 10 | 50 | 250 | Illimité |
| Interventions/mois | 50 | 200 | Illimité | Illimité |
| Rapports | Basic | Avancé | Complet | Custom |
| Planning | ✅ | ✅ | ✅ | ✅ |
| Multi-utilisateurs | ❌ | ✅ | ✅ | ✅ |

### 5.3 Growth

| Fonctionnalité | Starter | Pro | Enterprise |
|---------------|---------|-----|------------|
| Leads/mois | 10 | 100 | Illimité |
| Matching IA | ❌ | ✅ | ✅ |
| Pricing | Fixe | Dynamique | Custom |
| Support | Email | Prioritaire | Dédié |

---

## 6. DÉCISIONS COMMERCIALES NÉCESSAIRES AVANT MAQUETTAGE

| # | Décision | Impact | Délai |
|---|----------|--------|-------|
| 1 | **Renommer "Pool" en "AQWELIA Pool"** | Cohérence de marque | Avant maquettes |
| 2 | **Renommer "Complete" en "AQWELIA Complete"** | Cohérence de marque | Avant maquettes |
| 3 | **Clarifier "Growth Pro" vs "AQWELIA Pro"** | Éviter confusion | Avant maquettes |
| 4 | **Définir le prix des plans Pro** | Maquettes tarifaires | Avant maquettes |
| 5 | **Définir le prix des plans Growth** | Maquettes tarifaires | Avant maquettes |
| 6 | **Valider le nom "Spa365" vs "Spa"** | Cohérence B2C | Avant maquettes |
| 7 | **Ajouter trial period ?** | Impact conversion | Pendant codage |
| 8 | **Monétiser Brain ?** | Impact business | Pendant codage |

---

## 7. DÉCISIONS POUVANT ATTENDRE LE CODAGE

| # | Décision | Impact |
|---|----------|--------|
| 1 | Ajouter trial period 7 jours | Faible |
| 2 | Ajouter annulation abonnement | Faible |
| 3 | Définir quota scan réel | Moyen |
| 4 | Ajouter gate serveur paywall | Moyen |
| 5 | Monétiser Brain | Élevé |
