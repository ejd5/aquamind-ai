# AQWELIA — Analyse des Lacunes Visuelles

> Phase 1 du Masterplan Visuel — Écarts et recommandations
> Date : 2026-07-20 | Branche : feat/aqwelia-brain-foundation

---

## Résumé

| Métrique | Valeur |
|----------|--------|
| **Écarts critiques** | 4 |
| **Écarts majeurs** | 6 |
| **Écarts mineurs** | 8 |
| **Recommandations** | 18 |

---

## 1. ÉCRITS CRITIQUES

| # | Problème | Impact | Recommandation |
|---|----------|--------|----------------|
| 1 | **Module Weather crash** | Pages blanches, perte utilisateur | Corriger le bug client-side, ajouter ErrorBoundary |
| 2 | **Pas d'ErrorBoundary global** | Les erreurs JS crashent toute l'app | Ajouter ErrorBoundary racine + par module |
| 3 | **DiagnosticActionPlan trop gros** | 1674 lignes, maintenance difficile | Décomposer en sous-composants |
| 4 | **Push notifications absent** | Retention utilisateur réduite | Implémenter push notifications |

---

## 2. ÉCRITS MAJEURS

| # | Problème | Impact | Recommandation |
|---|----------|--------|----------------|
| 5 | **États loading manquants** | UX dégradée pendant fetch | Ajouter skeletons/loading states |
| 6 | **États empty manquants** | Pas de feedback quand pas de données | Ajouter empty states avec CTA |
| 7 | **États error manquants** | Pas de feedback quand erreur | Ajouter error states avec retry |
| 8 | **Pas de screenshot app** | Marketing difficile | Ajouter screenshots dashboard/app |
| 9 | **Logo dark mode absent** | Expérience dark mode dégradée | Créer variante dark du logo |
| 10 | **Paywall client-side uniquement** | Bypass possible côté serveur | Ajouter gate serveur pour accès critique |

---

## 3. ÉCRITS MINEURS

| # | Problème | Impact | Recommandation |
|---|----------|--------|----------------|
| 11 | **Favicon.ico manquant** | Icône floue sur navigateurs legacy | Générer favicon.ico |
| 12 | **SVGs non optimisés** | Taille bundle augmentée | Minifier SVGs |
| 13 | **Pas de trial period** | Conversion réduite | Ajouter essai gratuit 7 jours |
| 14 | **Pas d'annulation** | UX abonnement dégradée | Ajouter flow d'annulation |
| 15 | **Quota scan illimité** | Coûts IA non maîtrisés | Définir quota réel |
| 16 | **Pas de skeleton screens** | UX chargement dégradée | Ajouter skeletons personnalisés |
| 17 | **Pas de skeletons pages** | UX chargement dégradée | Ajouter skeletons par page |
| 18 | **Pas de skeleton dashboard** | UX chargement dégradée | Ajouter skeleton dashboard |

---

## 4. ÉTATS UI MANQUANTS (par composant)

| Composant | Loading | Empty | Error | Skeleton | Locked |
|-----------|---------|-------|-------|----------|--------|
| `module-assistant.tsx` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `module-maintenance.tsx` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `module-weather.tsx` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `module-health-log.tsx` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `module-diagnostic.tsx` | Partiel | ❌ | ❌ | ✅ | ❌ |
| `module-water-test.tsx` | Partiel | ❌ | ❌ | ✅ | ❌ |
| `module-action-plan.tsx` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `module-brain.tsx` | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 5. RECOMMANDATIONS PRIORITAIRES

| Priorité | Action | Effort | Impact |
|----------|--------|--------|--------|
| P0 | Corriger Module Weather crash | Moyen | Critique |
| P0 | Ajouter ErrorBoundary global | Faible | Critique |
| P1 | Décomposer DiagnosticActionPlan | Élevé | Majeur |
| P1 | Implémenter push notifications | Élevé | Majeur |
| P1 | Ajouter états loading/empty/error | Moyen | Majeur |
| P2 | Ajouter screenshots app | Faible | Moyen |
| P2 | Créer logo dark mode | Faible | Moyen |
| P2 | Générer favicon.ico | Faible | Mineur |
