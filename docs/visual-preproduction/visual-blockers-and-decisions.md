# AQWELIA — Classification des Écarts et Blocages

> Phase 2 du Masterplan Visuel — Blocages fonctionnels et décisions
> Date : 2026-07-21 | Branche : docs/visual-preproduction-phase-2

---

## Résumé

| Métrique | Valeur |
|----------|--------|
| **Écarts total** | 18 |
| **Blocage fonctionnel avant mise en production** | 2 |
| **Blocage nécessaire avant maquette** | 3 |
| **Décision produit** | 4 |
| **Besoin de design** | 3 |
| **Dette technique pendant codage** | 4 |
| **Amélioration future non bloquante** | 2 |

---

## 1. BLOCAGE FONCTIONNEL AVANT MISE EN PRODUCTION

### ÉCART 01 — Module Weather crash client-side

| Champ | Valeur |
|-------|--------|
| **Gravité** | Critique |
| **Utilisateur affecté** | Tous les utilisateurs plan oasis+ |
| **Écrans concernés** | SYS-WEATHER-001, APP-HOME-001, Dashboard Particuliers |
| **Impact sur maquettes** | **AUCUN** — maquetter l'état normal + état error |
| **Moment recommandé correction** | Avant mise en production |
| **Dépendances** | Aucune |
| **Critère de résolution** | Module Weather ne plante plus, ErrorBoundary affiche fallback |

### ÉCART 02 — Absence d'ErrorBoundary global

| Champ | Valeur |
|-------|--------|
| **Gravité** | Critique |
| **Utilisateur affecté** | Tous les utilisateurs |
| **Écrans concernés** | Tous les écrans applicatifs |
| **Impact sur maquettes** | **AUCUN** — maquetter l'état error global |
| **Moment recommandé correction** | Avant mise en production |
| **Dépendances** | Aucune |
| **Critère de résolution** | ErrorBoundary racine + par module, fallback UI affiché |

---

## 2. BLOCAGE NÉCESSAIRE AVANT MAQUETTE

### ÉCART 03 — DiagnosticActionPlan de 1 674 lignes

| Champ | Valeur |
|-------|--------|
| **Gravité** | Majeure |
| **Utilisateur affecté** | Particuliers (maintenance code) |
| **Écrans concernés** | SYS-ACTION-001 |
| **Impact sur maquettes** | **FAIBLE** — maquetter l'état normal, la décomposition est un sujet code |
| **Moment recommandé correction** | Pendant le codage Phase 3 |
| **Dépendances** | Aucune |
| **Critère de résolution** | Composant décomposé en < 500 lignes |

### ÉCART 04 — États loading manquants

| Champ | Valeur |
|-------|--------|
| **Gravité** | Majeure |
| **Utilisateur affecté** | Tous les utilisateurs |
| **Écrans concernés** | module-assistant, module-maintenance, module-weather, module-health-log |
| **Impact sur maquettes** | **ÉLEVÉ** — les maquettes doivent inclure les états skeleton/loading |
| **Moment recommandé correction** | Pendant le codage Phase 3 |
| **Dépendances** | Design skeletons |
| **Critère de résolution** | Tous les modules ont un état skeleton |

### ÉCART 05 — États empty manquants

| Champ | Valeur |
|-------|--------|
| **Gravité** | Majeure |
| **Utilisateur affecté** | Tous les utilisateurs |
| **Écrans concernés** | module-assistant, module-maintenance, module-weather, module-health-log |
| **Impact sur maquettes** | **ÉLEVÉ** — les maquettes doivent inclure les états empty |
| **Moment recommandé correction** | Pendant le codage Phase 3 |
| **Dépendances** | Design empty states |
| **Critère de résolution** | Tous les modules ont un état empty avec CTA |

### ÉCART 06 — États error manquants

| Champ | Valeur |
|-------|--------|
| **Gravité** | Majeure |
| **Utilisateur affecté** | Tous les utilisateurs |
| **Écrans concernés** | module-assistant, module-maintenance, module-weather, module-health-log |
| **Impact sur maquettes** | **ÉLEVÉ** — les maquettes doivent inclure les états error |
| **Moment recommandé correction** | Pendant le codage Phase 3 |
| **Dépendances** | Design error states |
| **Critère de résolution** | Tous les modules ont un état error avec retry |

---

## 3. DÉCISION PRODUIT

### ÉCART 07 — Push notifications absent

| Champ | Valeur |
|-------|--------|
| **Gravité** | Majeure |
| **Utilisateur affecté** | Tous les utilisateurs |
| **Écrans concernés** | APP-HOME-001, tous les écrans mobile |
| **Impact sur maquettes** | **MOYEN** — maquetter l'état sans push, prévoir l'emplacement |
| **Moment recommandé correction** | Phase 4 |
| **Dépendances** | Décision produit : activer les push ? |
| **Critère de résolution** | Push notifications implémentées et fonctionnelles |

### ÉCART 08 — Pas de screenshot app

| Champ | Valeur |
|-------|--------|
| **Gravité** | Moyenne |
| **Utilisateur affecté** | Marketing (conversion) |
| **Écrans concernés** | WEB-HOME-001, toutes les landings |
| **Impact sur maquettes** | **ÉLEVÉ** — les maquettes serviront de screenshots |
| **Moment recommandé correction** | Après Phase 2 |
| **Dépendances** | Maquettes Figma complètes |
| **Critère de résolution** | Screenshots app disponibles pour marketing |

### ÉCART 09 — Logo dark mode absent

| Champ | Valeur |
|-------|--------|
| **Gravité** | Moyenne |
| **Utilisateur affecté** | Utilisateurs dark mode |
| **Écrans concernés** | Tous les écrans |
| **Impact sur maquettes** | **MOYEN** — prévoir les variantes dark mode |
| **Moment recommandé correction** | Phase 2 (design) |
| **Dépendances** | Décision produit : activer dark mode ? |
| **Critère de résolution** | Logo dark mode disponible |

### ÉCART 10 — Paywall client-side uniquement

| Champ | Valeur |
|-------|--------|
| **Gravité** | Moyenne |
| **Utilisateur affecté** | Utilisateurs sur plan limité |
| **Écrans concernés** | SYS-PAYWALL-001, tous les écrans avec fonctionnalités verrouillées |
| **Impact sur maquettes** | **FAIBLE** — maquetter le paywall tel quel |
| **Moment recommandé correction** | Phase 4 |
| **Dépendances** | Décision produit : ajouter gate serveur ? |
| **Critère de résolution** | Gate serveur implémenté pour accès critique |

---

## 4. BESOIN DE DESIGN

### ÉCART 11 — Favicon.ico manquant

| Champ | Valeur |
|-------|--------|
| **Gravité** | Mineure |
| **Utilisateur affecté** | Utilisateurs navigateurs legacy |
| **Écrans concernés** | Tous (onglet navigateur) |
| **Impact sur maquettes** | **AUCUN** |
| **Moment recommandé correction** | Phase 2 (design) |
| **Dépendances** | Logo AQWELIA |
| **Critère de résolution** | favicon.ico généré |

### ÉCART 12 — SVGs non optimisés

| Champ | Valeur |
|-------|--------|
| **Gravité** | Mineure |
| **Utilisateur affecté** | Performance (tous) |
| **Écrans concernés** | Tous |
| **Impact sur maquettes** | **AUCUN** |
| **Moment recommandé correction** | Phase 4 |
| **Dépendances** | Aucune |
| **Critère de résolution** | SVGs minifiés |

### ÉCART 13 — Pas de skeleton screens personnalisés

| Champ | Valeur |
|-------|--------|
| **Gravité** | Moyenne |
| **Utilisateur affecté** | Tous les utilisateurs |
| **Écrans concernés** | Tous les écrans avec chargement |
| **Impact sur maquettes** | **ÉLEVÉ** — les maquettes doivent inclure les skeletons |
| **Moment recommandé correction** | Phase 2 (design) |
| **Dépendances** | Design skeletons |
| **Critère de résolution** | Skeletons personnalisés par module |

---

## 5. DETTE TECHNIQUE À TRAITER PENDANT LE CODAGE

### ÉCART 14 — Pas de trial period

| Champ | Valeur |
|-------|--------|
| **Gravité** | Mineure |
| **Utilisateur affecté** | Utilisateurs potentiels |
| **Écrans concernés** | WEB-PRICE-001, SYS-PAYWALL-001 |
| **Impact sur maquettes** | **FAIBLE** — maquetter l'état actuel |
| **Moment recommandé correction** | Phase 4 |
| **Dépendances** | Décision produit |
| **Critère de résolution** | Trial period 7 jours implémenté |

### ÉCART 15 — Pas d'annulation abonnement

| Champ | Valeur |
|-------|--------|
| **Gravité** | Mineure |
| **Utilisateur affecté** | Utilisateurs payants |
| **Écrans concernés** | USR-SET-001 |
| **Impact sur maquettes** | **FAIBLE** — maquetter l'état actuel |
| **Moment recommandé correction** | Phase 4 |
| **Dépendances** | Décision produit |
| **Critère de résolution** | Flow d'annulation implémenté |

### ÉCART 16 — Quota scan illimité

| Champ | Valeur |
|-------|--------|
| **Gravité** | Moyenne |
| **Utilisateur affecté** | Business (coûts IA) |
| **Écrans concernés** | SYS-SCAN-001 |
| **Impact sur maquettes** | **FAIBLE** — maquetter l'état quota atteint |
| **Moment recommandé correction** | Phase 4 |
| **Dépendances** | Décision produit : quota réel |
| **Critère de résolution** | Quota scan défini et appliqué |

### ÉCART 17 — Pas de skeletons pages

| Champ | Valeur |
|-------|--------|
| **Gravité** | Mineure |
| **Utilisateur affecté** | Tous les utilisateurs |
| **Écrans concernés** | Tous les écrans |
| **Impact sur maquettes** | **MOYEN** — prévoir les états skeleton |
| **Moment recommandé correction** | Phase 3 |
| **Dépendances** | Design skeletons |
| **Critère de résolution** | Skeletons par page implémentés |

---

## 6. AMÉLIORATION FUTURE NON BLOQUANTE

### ÉCART 18 — Pas de skeleton dashboard

| Champ | Valeur |
|-------|--------|
| **Gravité** | Mineure |
| **Utilisateur affecté** | Tous les utilisateurs |
| **Écrans concernés** | PRO-DASH-001, GROW-DASH-001, APP-HOME-001 |
| **Impact sur maquettes** | **FAIBLE** — prévoir l'état skeleton |
| **Moment recommandé correction** | Phase 4 |
| **Dépendances** | Design skeletons |
| **Critère de résolution** | Skeletons dashboard implémentés |

---

## 7. MATRICE DE RÉSOLUTION

| Écart | Blocage maquette | Blocage prod | Résolution |
|-------|-----------------|-------------|------------|
| 01 Weather crash | Non | Oui | Code |
| 02 ErrorBoundary | Non | Oui | Code |
| 03 DiagnosticActionPlan | Non | Non | Code |
| 04 Loading manquants | **Oui** | Non | Design + Code |
| 05 Empty manquants | **Oui** | Non | Design + Code |
| 06 Error manquants | **Oui** | Non | Design + Code |
| 07 Push notifications | Non | Non | Décision produit |
| 08 Screenshots | Non | Non | Après maquettes |
| 09 Logo dark mode | Non | Non | Design |
| 10 Paywall serveur | Non | Non | Décision produit |
| 11 Favicon | Non | Non | Design |
| 12 SVGs | Non | Non | Code |
| 13 Skeletons | **Oui** | Non | Design |
| 14 Trial period | Non | Non | Décision produit |
| 15 Annulation | Non | Non | Décision produit |
| 16 Quota scan | Non | Non | Décision produit |
| 17 Skeletons pages | Non | Non | Design + Code |
| 18 Skeletons dashboard | Non | Non | Design + Code |
