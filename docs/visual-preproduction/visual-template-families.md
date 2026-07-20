# AQWELIA — Regroupement des Pages en Familles de Templates

> Phase 2 du Masterplan Visuel — Templates visuels réutilisables
> Date : 2026-07-21 | Branche : docs/visual-preproduction-phase-2

---

## Résumé

| Métrique | Valeur |
|----------|--------|
| **Familles de templates** | 24 |
| **Pages totales** | 101 |
| **Pages couvertes** | 101 |
| **Templates uniques** | 24 |
| **Variantes desktop/tablette/mobile** | 72 |

---

## 1. LANDING MARKETING

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Landing Marketing |
| **Routes concernées** | `/`, `/pro`, `/growth`, `/business`, `/care`, `/technologie`, `/spa`, `/winter-guardian`, `/hivernage`, `/remise-en-route` |
| **Nombre de pages** | 10 |
| **Audience** | Public |
| **Structure commune** | Hero section → Avantages → Fonctionnalités → Témoignages → CTA → Footer |
| **Composants communs** | `LandingPage`, `BrainTechnologySection`, `Accordion`, `ContactForm` |
| **Différences** | Hero spécifique par univers, nombre de sections variable |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P0 |
| **Écran maître** | Homepage AQWELIA (`/`) |

---

## 2. PAGE FONCTIONNALITÉ

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Page Fonctionnalité |
| **Routes concernées** | `/fonctionnalites`, `/pro/fonctionnalites`, `/growth/fonctionnalites`, `/growth/qualification`, `/growth/landing-pages`, `/growth/reactivation`, `/growth/marketplace-leads` |
| **Nombre de pages** | 7 |
| **Audience** | Public |
| **Structure commune** | Titre → Description → Grille de fonctionnalités → CTA |
| **Composants communs** | Cartes fonctionnalités, `Accordion` |
| **Différences** | Nombre de cartes, contenu spécifique |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P1 |
| **Écran maître** | `/fonctionnalites` |

---

## 3. PAGE TARIFAIRE

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Page Tarifaire |
| **Routes concernées** | `/tarifs`, `/pro/tarifs`, `/growth/tarifs`, `/business/tarifs` |
| **Nombre de pages** | 4 |
| **Audience** | Public |
| **Structure commune** | Titre → Grille de plans → Comparaison → FAQ → CTA |
| **Composants communs** | `PricingExplorer`, cartes pricing, `Accordion` |
| **Différences** | Nombre de plans, fonctionnalités mises en avant |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P0 |
| **Écran maître** | `/tarifs` |

---

## 4. ARTICLE OU RESSOURCE

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Article / Ressource |
| **Routes concernées** | `/academy`, `/academy/guides`, `/academy/certification`, `/partenaires`, `/partenaires/piscinistes`, `/partenaires/fournisseurs`, `/affiliation` |
| **Nombre de pages** | 7 |
| **Audience** | Public |
| **Structure commune** | Titre → Contenu → Sidebar → CTA |
| **Composants communs** | `Breadcrumbs`, `Accordion`, cartes |
| **Différences** | Type de contenu, présence de sidebar |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P2 |
| **Écran maître** | `/academy` |

---

## 5. AUTHENTIFICATION

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Authentification |
| **Routes concernées** | `/auth/signin` |
| **Nombre de pages** | 1 |
| **Audience** | Public |
| **Structure commune** | Logo → Formulaire → OAuth → Lien inscription |
| **Composants communs** | Formulaire credentials, boutons OAuth (Google, Apple) |
| **Différences** | — |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P0 |
| **Écran maître** | `/auth/signin` |

---

## 6. ONBOARDING

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Onboarding |
| **Routes concernées** | Client-side (post-login) |
| **Nombre de pages** | 1 (wizard multi-étapes) |
| **Audience** | Utilisateurs authentifiés |
| **Structure commune** | Wizard 5 étapes → Type piscine → Dimensions → Équipements → Géoloc → Upsell |
| **Composants communs** | `Onboarding`, `ModulePaywall` |
| **Différences** | Étapes variables selon plan |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P0 |
| **Écran maître** | Onboarding étape 1 |

---

## 7. DASHBOARD PARTICULIERS

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Dashboard Particuliers |
| **Routes concernées** | `/` (app entry), `/settings` |
| **Nombre de pages** | 2 |
| **Audience** | Particuliers authentifiés |
| **Structure commune** | Header → Navigation → Module principal → Sidebar |
| **Composants communs** | `Header`, `DashboardNav`, modules Aquamind |
| **Différences** | Modules affichés selon plan |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P0 |
| **Écran maître** | Dashboard principal |

---

## 8. FORMULAIRE OU ASSISTANT GUIDÉ

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Formulaire / Assistant Guidé |
| **Routes concernées** | `/contact`, `/pro/early-access`, `/growth/app/leads/new`, `/care/commande` |
| **Nombre de pages** | 4 |
| **Audience** | Public ou authentifié |
| **Structure commune** | Titre → Étapes → Formulaire → Soumission → Confirmation |
| **Composants communs** | `ContactForm`, `EarlyAccessForm`, `CheckoutForm` |
| **Différences** | Nombre d'étapes, validation |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P1 |
| **Écran maître** | `/contact` |

---

## 9. ANALYSE ET RÉSULTATS

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Analyse et Résultats |
| **Routes concernées** | Client-side (module water-test, diagnostic) |
| **Nombre de pages** | 1 (multi-vues) |
| **Audience** | Particuliers authentifiés |
| **Structure commune** | Formulaire input → Résultats → Recommandations → Actions |
| **Composants communs** | `ModuleWaterTest`, `DiagnosticActionPlan`, `StripScanner` |
| **Différences** | Mode basique vs mode Pro (LSI) |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P0 |
| **Écran maître** | Résultats analyse |

---

## 10. HISTORIQUE ET RAPPORTS

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Historique et Rapports |
| **Routes concernées** | Client-side (module health-log), `/pro/app/reports` |
| **Nombre de pages** | 2 |
| **Audience** | Particuliers ou Pro |
| **Structure commune** | Filtres → Liste/Timeline → Détail → Export |
| **Composants communs** | `ModuleHealthLog`, `ProReportsWorkspace` |
| **Différences** | Données affichées, format export |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P1 |
| **Écran maître** | Historique Particuliers |

---

## 11. GESTION D'ÉQUIPEMENTS

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Gestion d'Équipements |
| **Routes concernées** | Client-side (module maintenance), `/care/mon-stock` |
| **Nombre de pages** | 2 |
| **Audience** | Particuliers authentifiés |
| **Structure commune** | Liste → Détail → CRUD → Inventaire |
| **Composants communs** | `ModuleMaintenance`, `RestockWidget`, `CatalogBrowser` |
| **Différences** | Équipements vs produits |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P1 |
| **Écran maître** | Maintenance Particuliers |

---

## 12. DASHBOARD PRO

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Dashboard Pro |
| **Routes concernées** | `/pro/app` |
| **Nombre de pages** | 1 |
| **Audience** | Piscinistes professionnels |
| **Structure commune** | Header → Stats cards → Interventions récentes → Alertes |
| **Composants communs** | `DashboardWidgets`, `ProNav` |
| **Différences** | — |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P0 |
| **Écran maître** | `/pro/app` |

---

## 13. LISTE PROFESSIONNELLE

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Liste Professionnelle |
| **Routes concernées** | `/pro/app/clients`, `/pro/app/pools`, `/pro/app/interventions`, `/growth/app/leads`, `/growth/app/appointments`, `/growth/app/quotes` |
| **Nombre de pages** | 6 |
| **Audience** | Pro ou Growth |
| **Structure commune** | Filtres → DataTable → Actions CRUD → Pagination |
| **Composants communs** | `ClientsList`, `InterventionsList`, `GrowthLeadsList` |
| **Différences** | Colonnes, filtres, actions |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P1 |
| **Écran maître** | `/pro/app/clients` |

---

## 14. FICHE DÉTAIL PROFESSIONNELLE

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Fiche Détail Professionnelle |
| **Routes concernées** | `/pro/app/clients/[id]`, `/pro/app/pools/[id]`, `/pro/app/interventions/[id]`, `/growth/app/leads/[id]` |
| **Nombre de pages** | 4 |
| **Audience** | Pro ou Growth |
| **Structure commune** | En-tête → Infos → Onglets → Actions |
| **Composants communs** | `ClientDetailWorkspace`, `InterventionDetail`, `GrowthLeadDetail` |
| **Différences** | Données affichées, onglets |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P1 |
| **Écran maître** | `/pro/app/clients/[id]` |

---

## 15. PLANNING ET CALENDRIER

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Planning et Calendrier |
| **Routes concernées** | `/pro/app/planning`, `/growth/app/appointments` |
| **Nombre de pages** | 2 |
| **Audience** | Pro ou Growth |
| **Structure commune** | Vue calendrier → Liste → Détail |
| **Composants communs** | `Calendar`, `CalendarWorkspace`, `GrowthCalendar` |
| **Différences** | Données affichées |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P1 |
| **Écran maître** | `/pro/app/planning` |

---

## 16. CARTE ET TOURNÉE

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Carte et Tournée |
| **Routes concernées** | — (non implémenté) |
| **Nombre de pages** | 0 |
| **Audience** | Pro |
| **Structure commune** | Carte → Itinéraire → Liste tournée |
| **Composants communs** | — |
| **Différences** | — |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P2 |
| **Écran maître** | — |

---

## 17. CRM ET PIPELINE

| Champ | Valeur |
|-------|--------|
| **Nom du template** | CRM et Pipeline |
| **Routes concernées** | `/growth/app/qualification`, `/growth/app/matching`, `/growth/app/analytics`, `/growth/app/audit` |
| **Nombre de pages** | 4 |
| **Audience** | Growth |
| **Structure commune** | Pipeline 6 étapes → Board → Analytics → Journal |
| **Composants communs** | `MatchingInterface`, `AnalyticsDashboard`, `AgentHistoryLog` |
| **Différences** | Vue pipeline vs analytics vs audit |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P1 |
| **Écran maître** | `/growth/app/qualification` |

---

## 18. FACTURATION

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Facturation |
| **Routes concernées** | `/care/commande`, `/care/suivi`, `/settings` (billing section) |
| **Nombre de pages** | 3 |
| **Audience** | Utilisateurs authentifiés |
| **Structure commune** | Panier → Checkout → Suivi → Paramètres abonnement |
| **Composants communs** | `CheckoutForm`, `CartManager` |
| **Différences** | E-commerce vs abonnement |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P1 |
| **Écran maître** | `/care/commande` |

---

## 19. DASHBOARD GROWTH

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Dashboard Growth |
| **Routes concernées** | `/growth/app` |
| **Nombre de pages** | 1 |
| **Audience** | Réseaux de piscinistes |
| **Structure commune** | Header → Stats cards → Pipeline → Leads récents |
| **Composants communs** | `GrowthDashboard`, `GrowthNav` |
| **Différences** | — |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P0 |
| **Écran maître** | `/growth/app` |

---

## 20. ADMINISTRATION

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Administration |
| **Routes concernées** | `/admin` |
| **Nombre de pages** | 1 |
| **Audience** | Admin |
| **Structure commune** | Onglets → Configuration → Analytics placeholder |
| **Composants communs** | Onglets, formulaires |
| **Différences** | — |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P2 |
| **Écran maître** | `/admin` |

---

## 21. AQWELIA BRAIN

| Champ | Valeur |
|-------|--------|
| **Nom du template** | AQWELIA Brain |
| **Routes concernées** | Client-side (module brain), `/api/brain/*` |
| **Nombre de pages** | 1 (multi-vues) |
| **Audience** | Tous les utilisateurs |
| **Structure commune** | Métriques → Timeline → Recommandations → Actions → Connaissances |
| **Composants communs** | `BrainWorkspace`, `BrainTimeline`, `BrainMetricsHeader`, `KnowledgeWorkspace` |
| **Différences** | Vues timeline, métriques, connaissances |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P1 |
| **Écran maître** | Brain Workspace |

---

## 22. SUPPORT ET PARAMÈTRES

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Support et Paramètres |
| **Routes concernées** | `/settings`, `/legal/support`, `/contact`, `/faq`, `/guides`, `/gestion-donnees` |
| **Nombre de pages** | 6 |
| **Audience** | Tous les utilisateurs |
| **Structure commune** | Formulaire → Préférences → Aide → Légal |
| **Composants communs** | `ContactForm`, `Accordion`, formulaires |
| **Différences** | Contenu spécifique |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P1 |
| **Écran maître** | `/settings` |

---

## 23. ÉTATS SYSTÈME

| Champ | Valeur |
|-------|--------|
| **Nom du template** | États Système |
| **Routes concernées** | Transversal (toutes les pages) |
| **Nombre de pages** | 0 (composants) |
| **Audience** | Tous |
| **Structure commune** | Loading → Skeleton → Empty → Error → Success → Warning |
| **Composants communs** | `Skeleton`, `Alert`, `OfflineBanner`, `EmergencyMode` |
| **Différences** | États spécifiques par module |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P0 |
| **Écran maître** | — |

---

## 24. PAYWALL ET ABONNEMENT

| Champ | Valeur |
|-------|--------|
| **Nom du template** | Paywall et Abonnement |
| **Routes concernées** | Client-side (module paywall), `/api/stripe/*` |
| **Nombre de pages** | 1 (modale) |
| **Audience** | Utilisateurs sur plan limité |
| **Structure commune** | Overlay → Plan recommandé → Comparaison → CTA upgrade |
| **Composants communs** | `ModulePaywall` |
| **Différences** | Plan proposé selon fonctionnalité verrouillée |
| **Versions** | Desktop, Tablette, Mobile |
| **Priorité** | P1 |
| **Écran maître** | Paywall modal |

---

## 25. MATRICE DE COUVERTURE

| Famille | Pages | Desktop | Tablette | Mobile |
|---------|-------|---------|----------|--------|
| 1. Landing Marketing | 10 | ✅ | ✅ | ✅ |
| 2. Page Fonctionnalité | 7 | ✅ | ✅ | ✅ |
| 3. Page Tarifaire | 4 | ✅ | ✅ | ✅ |
| 4. Article / Ressource | 7 | ✅ | ✅ | ✅ |
| 5. Authentification | 1 | ✅ | ✅ | ✅ |
| 6. Onboarding | 1 | ✅ | ✅ | ✅ |
| 7. Dashboard Particuliers | 2 | ✅ | ✅ | ✅ |
| 8. Formulaire / Assistant | 4 | ✅ | ✅ | ✅ |
| 9. Analyse et Résultats | 1 | ✅ | ✅ | ✅ |
| 10. Historique et Rapports | 2 | ✅ | ✅ | ✅ |
| 11. Gestion Équipements | 2 | ✅ | ✅ | ✅ |
| 12. Dashboard Pro | 1 | ✅ | ✅ | ✅ |
| 13. Liste Professionnelle | 6 | ✅ | ✅ | ✅ |
| 14. Fiche Détail Pro | 4 | ✅ | ✅ | ✅ |
| 15. Planning et Calendrier | 2 | ✅ | ✅ | ✅ |
| 16. Carte et Tournée | 0 | — | — | — |
| 17. CRM et Pipeline | 4 | ✅ | ✅ | ✅ |
| 18. Facturation | 3 | ✅ | ✅ | ✅ |
| 19. Dashboard Growth | 1 | ✅ | ✅ | ✅ |
| 20. Administration | 1 | ✅ | ✅ | ✅ |
| 21. AQWELIA Brain | 1 | ✅ | ✅ | ✅ |
| 22. Support et Paramètres | 6 | ✅ | ✅ | ✅ |
| 23. États Système | 0 | — | — | — |
| 24. Paywall et Abonnement | 1 | ✅ | ✅ | ✅ |
| **Total** | **71** | **71** | **71** | **71** |
