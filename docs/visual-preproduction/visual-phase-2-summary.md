# AQWELIA — Synthèse de Phase 2

> Phase 2 du Masterplan Visuel — Résumé exécutif
> Date : 2026-07-21 | Branche : docs/visual-preproduction-phase-2

---

## 1. MÉTRIQUES CLÉS

| Métrique | Valeur |
|----------|--------|
| **Pages réelles** | 101 |
| **Routes API** | 80 |
| **Familles de templates** | 24 |
| **Écrans uniques à maqueter** | 71 |
| **Simples variantes** | 24 |
| **Modales** | 8 |
| **États UI** | 18 |
| **Écrans maîtres** | 12 |
| **Assets à produire** | 68 |
| **Pages Figma** | 12 |
| **Composants Figma** | 114 |
| **Durée estimée conception** | 35 jours |

---

## 2. DÉCISIONS COMMERCIALES NÉCESSAIRES

| # | Décision | Impact | Délai |
|---|----------|--------|-------|
| 1 | Renommer "Pool" en "AQWELIA Pool" | Cohérence de marque | Avant maquettes |
| 2 | Renommer "Complete" en "AQWELIA Complete" | Cohérence de marque | Avant maquettes |
| 3 | Clarifier "Growth Pro" vs "AQWELIA Pro" | Éviter confusion | Avant maquettes |
| 4 | Définir le prix des plans Pro | Maquettes tarifaires | Avant maquettes |
| 5 | Définir le prix des plans Growth | Maquettes tarifaires | Avant maquettes |
| 6 | Valider le nom "Spa365" vs "Spa" | Cohérence B2C | Avant maquettes |
| 7 | Ajouter trial period ? | Impact conversion | Pendant codage |
| 8 | Monétiser Brain ? | Impact business | Pendant codage |
| 9 | Activer dark mode ? | Impact design | Phase 2 design |

---

## 3. BLOCAGES FONCTIONNELS

| # | Blocage | Gravité | Résolution |
|---|---------|---------|------------|
| 1 | Module Weather crash client-side | Critique | Code Phase 3 |
| 2 | Absence d'ErrorBoundary global | Critique | Code Phase 3 |
| 3 | DiagnosticActionPlan 1674 lignes | Majeure | Code Phase 3 |
| 4 | États loading/empty/error manquants | Majeure | Design + Code |

---

## 4. BLOCAGES DE DESIGN

| # | Blocage | Impact | Résolution |
|---|---------|--------|------------|
| 1 | Skeletons personnalisés | Élevé | Design Phase 2 |
| 2 | Empty states avec CTA | Élevé | Design Phase 2 |
| 3 | Error states avec retry | Élevé | Design Phase 2 |
| 4 | Logo dark mode | Moyen | Design Phase 2 |

---

## 5. ORDRE DE PRODUCTION RECOMMANDÉ

| Étape | Description | Durée | Priorité |
|-------|-------------|-------|----------|
| 1 | Foundations (tokens, typographie, couleurs) | 2 jours | P0 |
| 2 | Components (shadcn/ui + custom) | 3 jours | P0 |
| 3 | Homepage AQWELIA | 2 jours | P0 |
| 4 | Particuliers (dashboard + modules) | 4 jours | P0 |
| 5 | Mobile Particuliers | 3 jours | P0 |
| 6 | Pro (dashboard + CRM + planning) | 4 jours | P0 |
| 7 | Mobile Technicien | 2 jours | P0 |
| 8 | Growth (dashboard + pipeline) | 4 jours | P0 |
| 9 | Brain (workspace + timeline) | 3 jours | P1 |
| 10 | Tarifs (B2C + Pro + Growth) | 2 jours | P0 |
| 11 | Responsive (variantes tablette/mobile) | 3 jours | P1 |
| 12 | States (loading, empty, error, etc.) | 3 jours | P1 |
| **Total** | | **35 jours** | |

---

## 6. LISTE DES DOCUMENTS PRODUITS

### Phase 1 (7 documents)

| Document | Contenu |
|----------|---------|
| `visual-route-inventory.md` | 181 routes (101 pages + 80 API) |
| `visual-screen-matrix.md` | 35 fonctionnalités, états UI |
| `visual-component-inventory.md` | 114 composants (66 custom + 48 shadcn/ui) |
| `visual-assets-inventory.md` | 33 images, 8 langues |
| `visual-feature-gates-map.md` | 9 gates, 10 plans |
| `visual-gap-analysis.md` | 18 écarts, recommandations |
| `visual-executive-summary.md` | Synthèse globale |

### Phase 2 (11 documents)

| Document | Contenu |
|----------|---------|
| `visual-commercial-architecture.md` | Nomenclature et organisation des offres |
| `visual-template-families.md` | 24 familles de templates |
| `visual-screen-registry.md` | Registre canonique avec IDs |
| `visual-master-screen-briefs.md` | Briefs 12 écrans maîtres |
| `visual-blockers-and-decisions.md` | Classification des 18 écarts |
| `visual-ui-state-plan.md` | Plan complet des états UI |
| `visual-copy-source-map.md` | Carte source des contenus français |
| `visual-demo-data-contract.md` | Contrat de données de démonstration |
| `visual-asset-production-plan.md` | Plan de production des assets |
| `visual-figma-production-plan.md` | Architecture du fichier Figma |
| `visual-phase-2-summary.md` | Ce document |

---

## 7. RECOMMANDATION GO / NO-GO

### GO pour commencer FOUNDATION-01

| Critère | Statut |
|---------|--------|
| Phase 1 complétée | ✅ |
| Phase 2 complétée | ✅ |
| Décisions critiques prises | ⚠️ 6 décisions restantes |
| Blocages fonctionnels identifiés | ✅ |
| Blocages design identifiés | ✅ |
| Ordre de production défini | ✅ |
| Assets listés | ✅ |
| Données démo définies | ✅ |

**Recommandation** : GO conditionnel — les 6 décisions commerciales critiques doivent être prises avant de commencer les maquettes, mais n'empêchent pas de commencer les Foundations (tokens, typographie, couleurs).

---

## 8. PROCHAINES ÉTAPES

| Étape | Description | Délai |
|-------|-------------|-------|
| **Phase 3** | Conception Figma Foundations + Components | 5 jours |
| **Phase 4** | Conception Figma Homepage + Particuliers | 9 jours |
| **Phase 5** | Conception Figma Pro + Growth | 8 jours |
| **Phase 6** | Conception Figma Brain + Tarifs | 5 jours |
| **Phase 7** | Conception Figma Responsive + States | 6 jours |
| **Phase 8** | Revue et itération | 2 jours |
| **Total** | | **35 jours** |
