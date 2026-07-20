# AQWELIA — Briefs des Douze Écrans Maîtres

> Phase 2 du Masterplan Visuel — Briefs de conception
> Date : 2026-07-21 | Branche : docs/visual-preproduction-phase-2

---

## Résumé

| Métrique | Valeur |
|----------|--------|
| **Écrans maîtres** | 12 |
| **Desktop** | 12 |
| **Tablette** | 12 |
| **Mobile** | 12 |
| **Total maquettes** | 36 |

---

## 1. HOMEPAGE GÉNÉRALE AQWELIA

| Champ | Valeur |
|-------|--------|
| **ID** | WEB-HOME-001 |
| **Objectif** | Convertir les visiteurs en utilisateurs inscrits |
| **Audience** | Public (propriétaires de piscines) |
| **Action principale** | Créer un compte gratuit |
| **Contenu obligatoire** | Hero section, avantages (5), fonctionnalités (11 modules), témoignages, CTA |
| **Données réelles** | Statique (marketing) |
| **Fonctions existantes** | `LandingPage`, `BrainTechnologySection`, `Accordion` |
| **Fonctions futures** | Vidéo démo, chat live |
| **Composants réutilisables** | `LandingPage`, `ContactForm` |
| **Composants à recréer** | Hero section, grille avantages, section témoignages |
| **États obligatoires** | Default, scroll animations |
| **Responsive** | Desktop (12col), Tablette (8col), Mobile (4col) |
| **Textes existants** | Titres sections, descriptions modules, CTA |
| **Textes nécessitant décision** | Titre hero principal, sous-titre hero |
| **Assets nécessaires** | Logo, personas (4), avantages (5), fonctionnalités (11) |
| **Dépendances** | Aucune |
| **Critères de validation** | Hero visible above fold, CTA cliquer, responsive OK |

---

## 2. LANDING PARTICULIERS

| Champ | Valeur |
|-------|--------|
| **ID** | WEB-PRICE-001 |
| **Objectif** | Présenter les 4 plans B2C et convertir |
| **Audience** | Public (propriétaires de piscines) |
| **Action principale** | Choisir un plan |
| **Contenu obligatoire** | Grille 4 plans, comparaison fonctionnalités, CTA par plan |
| **Données réelles** | Free (0€), Pool (6.99€/mois), Complete (10.99€/mois), Spa (4.99€/mois) |
| **Fonctions existantes** | `PricingExplorer`, `Accordion` |
| **Fonctions futures** | Trial period 7 jours, comparaison avancée |
| **Composants réutilisables** | `PricingExplorer`, `Accordion` |
| **Composants à recréer** | Grille tarifaire, tableau comparatif |
| **États obligatoires** | Default, hover plans, sélection plan |
| **Responsive** | Desktop (4col), Tablette (2col), Mobile (1col scroll) |
| **Textes existants** | Noms plans, taglines, listes fonctionnalités |
| **Textes nécessitant décision** | Tagline hero tarifs, CTA par plan |
| **Assets nécessaires** | Icônes plans (🌊, ✨, 🛡️, ♨️) |
| **Dépendances** | Pricing data (`plans.ts`) |
| **Critères de validation** | 4 plans visibles, prix affichés, CTA fonctionnels |

---

## 3. HOME MOBILE PARTICULIERS

| Champ | Valeur |
|-------|--------|
| **ID** | APP-HOME-001 |
| **Objectif** | Dashboard mobile principal du particulier |
| **Audience** | Particuliers authentifiés |
| **Action principale** | Consulter l'état de la piscine, lancer un test |
| **Contenu obligatoire** | Header, modules (water-test, weather, brain, maintenance), nav bottom |
| **Données réelles** | Profil piscine, dernier test, météo, actions Brain |
| **Fonctions existantes** | `MobileAppShell`, modules Aquamind |
| **Fonctions futures** | Push notifications, widget iOS/Android |
| **Composants réutilisables** | Tous les modules Aquamind |
| **Composants à recréer** | Layout mobile, nav bottom, cards modules |
| **États obligatoires** | Default, loading, empty, error, offline |
| **Responsive** | Mobile uniquement (375px-428px) |
| **Textes existants** | Titres modules, labels |
| **Textes nécessitant décision** | — |
| **Assets nécessaires** | Logo, icônes modules |
| **Dépendances** | Session auth, pool profile |
| **Critères de validation** | Modules visibles, nav fonctionnelle, scroll OK |

---

## 4. SCAN DE BANDELETTE

| Champ | Valeur |
|-------|--------|
| **ID** | SYS-SCAN-001 |
| **Objectif** | Scanner une bandelette de test via caméra IA |
| **Audience** | Particuliers authentifiés (plan oasis+) |
| **Action principale** | Prendre photo bandelette → obtenir résultats |
| **Contenu obligatoire** | Caméra, guide placement, preview, résultats, recommandations |
| **Données réelles** | Résultats scan (pH, chlore, alcalinité), Clear Water Index |
| **Fonctions existantes** | `StripScanner`, `/api/pool/strip-scan` |
| **Fonctions futures** | Multi-bandelettes, historique scans |
| **Composants réutilisables** | `StripScanner` |
| **Composants à recréer** | Guide caméra, preview temps réel, résultats |
| **États obligatoires** | Default, caméra active, scan en cours, résultats, erreur, quota atteint |
| **Responsive** | Mobile prioritaire, Desktop secondaire |
| **Textes existants** | Instructions scan, labels résultats |
| **Textes nécessitant décision** | Message quota atteint |
| **Assets nécessaires** | Icône caméra, illustrations guide |
| **Dépendances** | NVIDIA Vision API, feature gate `photo_scan` |
| **Critères de validation** | Caméra accessible, scan fonctionne, résultats affichés |

---

## 5. RÉSULTATS ET PLAN RECOMMANDÉ

| Champ | Valeur |
|-------|--------|
| **ID** | SYS-ACTION-001 |
| **Objectif** | Afficher les résultats d'analyse et le plan d'action recommandé |
| **Audience** | Particuliers authentifiés |
| **Action principale** | Consulter les résultats, marquer actions complétées |
| **Contenu obligatoire** | Résultats (pH, chlore, alcalinité), Clear Water Index, plan d'action, actions tracker |
| **Données réelles** | pH 7.2, chlore 1.5, alcalinité 120, CWI 95 |
| **Fonctions existantes** | `DiagnosticActionPlan`, `BrainActionTracker` |
| **Fonctions futures** | PDF export, historique comparatif |
| **Composants réutilisables** | `DiagnosticActionPlan`, `BrainActionTracker` |
| **Composants à recréer** | Layout résultats, cards actions |
| **États obligatoires** | Default, loading, skeleton, error, PDF CTA |
| **Responsive** | Desktop (2col), Tablette (2col), Mobile (1col) |
| **Textes existants** | Labels résultats, descriptions actions |
| **Textes nécessitant décision** — |
| **Assets nécessaires** | Icônes paramètres (pH, chlore, alcalinité) |
| **Dépendances** | `/api/pool/action-plan`, `/api/brain/executions` |
| **Critères de validation** | Résultats affichés, plan d'action complet, actions tracker fonctionnel |

---

## 6. LANDING AQWELIA PRO

| Champ | Valeur |
|-------|--------|
| **ID** | PRO-LAND-001 |
| **Objectif** | Convertir les piscinistes en utilisateurs Pro |
| **Audience** | Public (piscinistes professionnels) |
| **Action principale** | Demander l'accès early-access |
| **Contenu obligatoire** | Hero Pro, 6 modules, pricing, FAQ, CTA early-access |
| **Données réelles** | Statique (marketing) |
| **Fonctions existantes** | `BrainTechnologySection`, cartes pricing, `EarlyAccessForm` |
| **Fonctions futures** | Démo interactive, vidéo témoignages |
| **Composants réutilisables** | `BrainTechnologySection`, `Accordion` |
| **Composants à recréer** | Hero Pro, grille modules, formulaire early-access |
| **États obligatoires** | Default, formulaire soumis, erreur |
| **Responsive** | Desktop (12col), Tablette (8col), Mobile (4col) |
| **Textes existants** | Titres modules, descriptions, FAQ |
| **Textes nécessitant décision** | Hero Pro title, CTA early-access |
| **Assets nécessaires** | Logo Pro, captures démo (5) |
| **Dépendances** | `/api/pro/early-access` |
| **Critères de validation** | Hero visible, modules listés, formulaire fonctionnel |

---

## 7. DASHBOARD AQWELIA PRO

| Champ | Valeur |
|-------|--------|
| **ID** | PRO-DASH-001 |
| **Objectif** | Vue d'ensemble de l'activité du pisciniste |
| **Audience** | Piscinistes professionnels |
| **Action principale** | Consulter les stats, accéder aux interventions du jour |
| **Contenu obligatoire** | Stats cards (clients, piscines, interventions, alertes), liste interventions récentes, alertes |
| **Données réelles** | 12 clients, 24 piscines, 8 interventions cette semaine, 2 alertes |
| **Fonctions existantes** | `DashboardWidgets`, `ProNav` |
| **Fonctions futures** | Graphiques tendances, export rapports |
| **Composants réutilisables** | `DashboardWidgets`, `ProNav` |
| **Composants à recréer** | Layout dashboard, stats cards, liste interventions |
| **États obligatoires** | Default, loading, empty, error |
| **Responsive** | Desktop (12col), Tablette (8col), Mobile (4col) |
| **Textes existants** | Labels stats, titres sections |
| **Textes nécessitant décision** | — |
| **Assets nécessaires** | Icônes stats |
| **Dépendances** | `/api/pro/dashboard` |
| **Critères de validation** | Stats affichées, interventions listées, nav fonctionnelle |

---

## 8. APPLICATION MOBILE TECHNICIEN

| Champ | Valeur |
|-------|--------|
| **ID** | APP-TECH-001 |
| **Objectif** | Application mobile pour technicien sur le terrain |
| **Audience** | Piscinistes professionnels (techniciens) |
| **Action principale** | Consulter planning du jour, intervenir, prendre photo |
| **Contenu obligatoire** | Planning du jour, fiche intervention, actions rapides, photo avant/après |
| **Données réelles** | 3 interventions du jour, détails client/piscine |
| **Fonctions existantes** | `InterventionDetail`, `InterventionsList` |
| **Fonctions futures** | GPS/Navigation, signature client, photo avant/après |
| **Composants réutilisables** | `InterventionDetail` |
| **Composants à recréer** | Layout mobile tech, cards intervention, actions rapides |
| **États obligatoires** | Default, loading, empty, error, offline |
| **Responsive** | Mobile uniquement (375px-428px) |
| **Textes existants** | Labels interventions, statuts |
| **Textes nécessitant décision** | — |
| **Assets nécessaires** | Icônes actions (photo, validation, commentaire) |
| **Dépendances** | `/api/pro/interventions`, `/api/pro/clients/[id]` |
| **Critères de validation** | Planning affiché, fiche intervention complète, actions fonctionnelles |

---

## 9. LANDING AQWELIA GROWTH

| Champ | Valeur |
|-------|--------|
| **ID** | GROW-LAND-001 |
| **Objectif** | Convertir les réseaux en utilisateurs Growth |
| **Audience** | Public (réseaux de piscinistes) |
| **Action principale** | Demander une démo |
| **Contenu obligatoire** | Hero Growth, 10 agents, pipeline 6 étapes, 3 tiers pricing |
| **Données réelles** | Statique (marketing) |
| **Fonctions existantes** | `BrainTechnologySection`, grille agents |
| **Fonctions futures** | Démo interactive, calculateur ROI |
| **Composants réutilisables** | `BrainTechnologySection` |
| **Composants à recréer** | Hero Growth, grille agents, pipeline visuel |
| **États obligatoires** | Default |
| **Responsive** | Desktop (12col), Tablette (8col), Mobile (4col) |
| **Textes existants** | Titres agents, descriptions pipeline |
| **Textes nécessitant décision** | Hero Growth title, CTA démo |
| **Assets nécessaires** | Logo Growth, illustrations agents |
| **Dépendances** | Aucune |
| **Critères de validation** | Hero visible, agents listés, pipeline visible |

---

## 10. DASHBOARD AQWELIA GROWTH

| Champ | Valeur |
|-------|--------|
| **ID** | GROW-DASH-001 |
| **Objectif** | Vue d'ensemble de l'activité Growth |
| **Audience** | Réseaux de piscinistes |
| **Action principale** | Consulter les leads, le pipeline, les conversions |
| **Contenu obligatoire** | Stats cards (leads, conversions, revenus, pipeline), leads récents, agents actifs |
| **Données réelles** | 42 leads, 12 conversions, 15 600€ revenus, pipeline 6 étapes |
| **Fonctions existantes** | `GrowthDashboard`, `GrowthNav` |
| **Fonctions futures** | Graphiques tendances, export analytics |
| **Composants réutilisables** | `GrowthDashboard`, `GrowthNav` |
| **Composants à recréer** | Layout dashboard, stats cards, pipeline visuel |
| **États obligatoires** | Default, loading, empty, error |
| **Responsive** | Desktop (12col), Tablette (8col), Mobile (4col) |
| **Textes existants** | Labels stats, titres sections |
| **Textes nécessitant décision** | — |
| **Assets nécessaires** | Icônes stats, graphiques |
| **Dépendances** | `/api/growth/dashboard` |
| **Critères de validation** | Stats affichés, pipeline visible, leads listés |

---

## 11. LANDING AQWELIA BRAIN

| Champ | Valeur |
|-------|--------|
| **ID** | WEB-TECH-001 |
| **Objectif** | Présenter la technologie Brain au public |
| **Audience** | Public |
| **Action principale** | Découvrir la technologie, créer un compte |
| **Contenu obligatoire** | Hero Brain, explication IA, cas d'usage, CTA |
| **Données réelles** | Statique (marketing) |
| **Fonctions existantes** | `BrainTechnologySection` |
| **Fonctions futures** | Vidéo démo Brain, cas d'usage interactifs |
| **Composants réutilisables** | `BrainTechnologySection` |
| **Composants à recréer** | Hero Brain, section technologie |
| **États obligatoires** | Default |
| **Responsive** | Desktop (12col), Tablette (8col), Mobile (4col) |
| **Textes existants** | Titre, description technologie |
| **Textes nécessitant décision** | Hero Brain title |
| **Assets nécessaires** | Logo Brain, illustrations IA |
| **Dépendances** | Aucune |
| **Critères de validation** | Hero visible, technologie expliquée, CTA fonctionnel |

---

## 12. TARIFS PARTICULIERS ET PROFESSIONNELS

> Les tarifs Particuliers et Professionnels nécessitent deux écrans différents car les audiences et la structure des plans sont radicalement différentes.

### 12A. TARIFS PARTICULIERS

| Champ | Valeur |
|-------|--------|
| **ID** | WEB-PRICE-001 |
| **Objectif** | Convertir les particuliers vers un plan payant |
| **Audience** | Public (propriétaires de piscines) |
| **Action principale** | Choisir un plan B2C |
| **Contenu obligatoire** | Grille 4 plans (Free, Pool, Complete, Spa), comparaison, CTA |
| **Données réelles** | Free (0€), Pool (6.99€), Complete (10.99€), Spa (4.99€) |
| **Fonctions existantes** | `PricingExplorer` |
| **Fonctions futures** | Trial period, comparaison avancée |
| **Composants réutilisables** | `PricingExplorer` |
| **Composants à recréer** | Grille tarifaire B2C |
| **États obligatoires** | Default, hover, sélection |
| **Responsive** | Desktop (4col), Tablette (2col), Mobile (1col) |
| **Textes existants** | Noms, taglines, fonctionnalités |
| **Textes nécessitant décision** | Tagline hero |
| **Assets nécessaires** | Icônes plans |
| **Dépendances** | `plans.ts` |
| **Critères de validation** | 4 plans, prix, CTA |

### 12B. TARIFS PROFESSIONNELS

| Champ | Valeur |
|-------|--------|
| **ID** | PRO-PRICE-001 |
| **Objectif** | Convertir les piscinistes vers un plan Pro |
| **Audience** | Public (piscinistes professionnels) |
| **Action principale** | Demander l'accès early-access |
| **Contenu obligatoire** | Grille 4 plans Pro (Solo, Team, Fleet, Enterprise), comparaison, CTA |
| **Données réelles** | Solo (29€), Team (79€), Fleet (149€), Enterprise (sur mesure) |
| **Fonctions existantes** | Cartes pricing |
| **Fonctions futures** | Calculator ROI, comparaison avancée |
| **Composants réutilisables** | Cartes pricing |
| **Composants à recréer** | Grille tarifaire Pro |
| **États obligatoires** | Default, hover, sélection |
| **Responsive** | Desktop (4col), Tablette (2col), Mobile (1col) |
| **Textes existants** | Noms plans, limites |
| **Textes nécessitant décision** | Tagline hero Pro, CTA |
| **Assets nécessaires** | Icônes plans Pro |
| **Dépendances** | Aucune (prix à définir) |
| **Critères de validation** | 4 plans, prix, CTA |

---

## 13. MATRICE DE DÉCISION

| Écran | Décision produit nécessaire | Décision pouvant attendre |
|-------|---------------------------|--------------------------|
| Homepage | Titre hero principal | Vidéo démo |
| Tarifs Particuliers | Tagline hero | Trial period |
| Home Mobile | — | Push notifications |
| Scan Bandelette | — | Multi-bandelettes |
| Résultats | — | PDF export |
| Landing Pro | Titre hero Pro | Démo interactive |
| Dashboard Pro | — | Graphiques tendances |
| Mobile Tech | — | GPS/Navigation |
| Landing Growth | Titre hero Growth | Démo interactive |
| Dashboard Growth | — | Graphiques tendances |
| Landing Brain | Titre hero Brain | Vidéo démo |
| Tarifs Pro | Prix plans Pro, CTA | Calculator ROI |
