# AQWELIA — Registre Canonique des Écrans

> Phase 2 du Masterplan Visuel — Identifiants uniques et classification
> Date : 2026-07-21 | Branche : docs/visual-preproduction-phase-2

---

## Résumé

| Métrique | Valeur |
|----------|--------|
| **Écrans uniques** | 71 |
| **Simples variantes** | 24 |
| **Modales** | 8 |
| **Composants** | 66 |
| **États système** | 18 |
| **Pages sans maquette indépendante** | 24 |
| **Total écrans à maqueter** | 71 |

---

## LÉGENDE

| Type | Description |
|------|-------------|
| **ÉCRAN** | Page complète nécessitant une maquette indépendante |
| **VARIANTE** | Variation d'un même template (desktop/tablette/mobile) |
| **MODALE** | Overlay ou dialog nécessitant une maquette dédiée |
| **COMP** | Composant réutilisable sans maquette indépendante |
| **ÉTAT** | État UI spécifique sans maquette indépendante |
| **SKIP** | Page ne nécessitant pas de maquette (texte statique, redirect) |

---

## 1. SITE PUBLIC

| ID | Nom | Route | Audience | Famille | Support | Priorité | Plan | Feature Gate | Maquette |
|----|-----|-------|----------|---------|---------|----------|------|-------------|----------|
| WEB-HOME-001 | Homepage AQWELIA | `/` | public | Landing Marketing | Responsive | P0 | — | — | **Maître** |
| WEB-FEAT-001 | Fonctionnalités | `/fonctionnalites` | public | Page Fonctionnalité | Responsive | P1 | — | — | Variante |
| WEB-PRICE-001 | Tarifs Particuliers | `/tarifs` | public | Page Tarifaire | Responsive | P0 | — | — | **Maître** |
| WEB-HOW-001 | Comment ça marche | `/comment-ca-marche` | public | Page Fonctionnalité | Responsive | P2 | — | — | Variante |
| WEB-ABOUT-001 | À propos | `/a-propos` | public | Article / Ressource | Responsive | P2 | — | — | Variante |
| WEB-CONTACT-001 | Contact | `/contact` | public | Formulaire / Assistant | Responsive | P1 | — | — | Variante |
| WEB-DIAG-001 | Diagnostic IA | `/diagnostic-ia` | public | Landing Marketing | Responsive | P2 | — | — | Variante |
| WEB-WATER-001 | Analyse eau | `/analyse-eau` | public | Landing Marketing | Responsive | P2 | — | — | Variante |
| WEB-STRIP-001 | StripScan™ | `/analyse-bandelettes` | public | Landing Marketing | Responsive | P2 | — | — | Variante |
| WEB-WEATHER-001 | Météo & Alertes | `/meteo-alertes` | public | Landing Marketing | Responsive | P2 | — | — | Variante |
| WEB-SPA-001 | Spa 365 | `/spa` | public | Landing Marketing | Responsive | P2 | — | — | Variante |
| WEB-TECH-001 | AQWELIA Brain | `/technologie` | public | Landing Marketing | Responsive | P2 | — | — | Variante |
| WEB-WINTER-001 | Winter Guardian | `/winter-guardian` | public | Landing Marketing | Responsive | P2 | — | — | Variante |
| WEB-HIVER-001 | Hivernage | `/hivernage` | public | Landing Marketing | Responsive | P2 | — | — | Variante |
| WEB-REMISE-001 | Remise en route | `/remise-en-route` | public | Landing Marketing | Responsive | P2 | — | — | Variante |
| WEB-RAPPEL-001 | Rappels entretien | `/rappels-entretien` | public | Landing Marketing | Responsive | P2 | — | — | Variante |

---

## 2. AUTHENTIFICATION

| ID | Nom | Route | Audience | Famille | Support | Priorité | Plan | Feature Gate | Maquette |
|----|-----|-------|----------|---------|---------|----------|------|-------------|----------|
| WEB-AUTH-001 | Connexion / Inscription | `/auth/signin` | public | Authentification | Responsive | P0 | — | — | **Maître** |

---

## 3. AQWELIA PRO — MARKETING

| ID | Nom | Route | Audience | Famille | Support | Priorité | Plan | Feature Gate | Maquette |
|----|-----|-------|----------|---------|---------|----------|------|-------------|----------|
| PRO-LAND-001 | Landing Pro | `/pro` | public | Landing Marketing | Responsive | P0 | — | — | **Maître** |
| PRO-FEAT-001 | Pro Fonctionnalités | `/pro/fonctionnalites` | public | Page Fonctionnalité | Responsive | P1 | — | — | Variante |
| PRO-PRICE-001 | Pro Tarifs | `/pro/tarifs` | public | Page Tarifaire | Responsive | P1 | — | — | Variante |
| PRO-FAQ-001 | Pro FAQ | `/pro/faq` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |
| PRO-DEMO-001 | Pro Démo | `/pro/demo` | public | Landing Marketing | Responsive | P2 | — | — | Variante |
| PRO-EARLY-001 | Early Access | `/pro/early-access` | public | Formulaire / Assistant | Responsive | P1 | — | — | Variante |
| PRO-SOLO-001 | Plan Solo | `/pro/solo` | public | Page Tarifaire | Responsive | P2 | — | — | SKIP |
| PRO-TEAM-001 | Plan Team | `/pro/team` | public | Page Tarifaire | Responsive | P2 | — | — | SKIP |
| PRO-FLEET-001 | Plan Fleet | `/pro/fleet` | public | Page Tarifaire | Responsive | P2 | — | — | SKIP |

---

## 4. AQWELIA PRO — APPLICATION

| ID | Nom | Route | Audience | Famille | Support | Priorité | Plan | Feature Gate | Maquette |
|----|-----|-------|----------|---------|---------|----------|------|-------------|----------|
| PRO-DASH-001 | Dashboard Pro | `/pro/app` | pro | Dashboard Pro | Responsive | P0 | Pro | — | **Maître** |
| PRO-CLIENT-001 | Liste Clients | `/pro/app/clients` | pro | Liste Professionnelle | Responsive | P1 | Pro | — | Variante |
| PRO-CLIENT-002 | Détail Client | `/pro/app/clients/[id]` | pro | Fiche Détail Pro | Responsive | P1 | Pro | — | Variante |
| PRO-POOL-001 | Liste Piscines | `/pro/app/pools` | pro | Liste Professionnelle | Responsive | P1 | Pro | — | Variante |
| PRO-POOL-002 | Détail Piscine | `/pro/app/pools/[id]` | pro | Fiche Détail Pro | Responsive | P1 | Pro | — | Variante |
| PRO-PLAN-001 | Planning | `/pro/app/planning` | pro | Planning et Calendrier | Responsive | P1 | Pro | — | Variante |
| PRO-INTERV-001 | Liste Interventions | `/pro/app/interventions` | pro | Liste Professionnelle | Responsive | P1 | Pro | — | Variante |
| PRO-INTERV-002 | Détail Intervention | `/pro/app/interventions/[id]` | pro | Fiche Détail Pro | Responsive | P1 | Pro | — | Variante |
| PRO-REPORT-001 | Rapports | `/pro/app/reports` | pro | Historique et Rapports | Responsive | P1 | Pro | — | Variante |
| PRO-SETTINGS-001 | Paramètres Pro | `/pro/app/settings` | pro | Support et Paramètres | Responsive | P2 | Pro | — | Variante |

---

## 5. AQWELIA GROWTH — MARKETING

| ID | Nom | Route | Audience | Famille | Support | Priorité | Plan | Feature Gate | Maquette |
|----|-----|-------|----------|---------|---------|----------|------|-------------|----------|
| GROW-LAND-001 | Landing Growth | `/growth` | public | Landing Marketing | Responsive | P0 | — | — | **Maître** |
| GROW-FEAT-001 | Growth Fonctionnalités | `/growth/fonctionnalites` | public | Page Fonctionnalité | Responsive | P1 | — | — | Variante |
| GROW-QUAL-001 | Qualification | `/growth/qualification` | public | Page Fonctionnalité | Responsive | P2 | — | — | Variante |
| GROW-LP-001 | Landing Pages | `/growth/landing-pages` | public | Page Fonctionnalité | Responsive | P2 | — | — | Variante |
| GROW-REACT-001 | Reactivation | `/growth/reactivation` | public | Page Fonctionnalité | Responsive | P2 | — | — | Variante |
| GROW-MKT-001 | Marketplace Leads | `/growth/marketplace-leads` | public | Page Fonctionnalité | Responsive | P2 | — | — | Variante |
| GROW-PRICE-001 | Growth Tarifs | `/growth/tarifs` | public | Page Tarifaire | Responsive | P1 | — | — | Variante |
| GROW-FAQ-001 | Growth FAQ | `/growth/faq` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |
| GROW-DEMO-001 | Growth Démo | `/growth/demo` | public | Landing Marketing | Responsive | P2 | — | — | Variante |

---

## 6. AQWELIA GROWTH — APPLICATION

| ID | Nom | Route | Audience | Famille | Support | Priorité | Plan | Feature Gate | Maquette |
|----|-----|-------|----------|---------|---------|----------|------|-------------|----------|
| GROW-DASH-001 | Dashboard Growth | `/growth/app` | growth | Dashboard Growth | Responsive | P0 | Growth | — | **Maître** |
| GROW-LEAD-001 | Boîte Leads | `/growth/app/leads` | growth | Liste Professionnelle | Responsive | P1 | Growth | — | Variante |
| GROW-LEAD-002 | Détail Lead | `/growth/app/leads/[id]` | growth | Fiche Détail Pro | Responsive | P1 | Growth | — | Variante |
| GROW-LEAD-003 | Nouveau Lead | `/growth/app/leads/new` | growth | Formulaire / Assistant | Responsive | P1 | Growth | — | Variante |
| GROW-QUAL-002 | Qualification Leads | `/growth/app/qualification` | growth | CRM et Pipeline | Responsive | P1 | Growth | — | Variante |
| GROW-MATCH-001 | Matching Leads | `/growth/app/matching` | growth | CRM et Pipeline | Responsive | P1 | Growth | — | Variante |
| GROW-RDV-001 | Rendez-vous | `/growth/app/appointments` | growth | Planning et Calendrier | Responsive | P1 | Growth | — | Variante |
| GROW-DEVIS-001 | Devis | `/growth/app/quotes` | growth | Liste Professionnelle | Responsive | P1 | Growth | — | Variante |
| GROW-ANALYT-001 | Analytics | `/growth/app/analytics` | growth | CRM et Pipeline | Responsive | P1 | Growth | — | Variante |
| GROW-AUDIT-001 | Journal Agents | `/growth/app/audit` | growth | CRM et Pipeline | Responsive | P2 | Growth | — | Variante |
| GROW-SETTINGS-001 | Paramètres Growth | `/growth/app/settings` | growth | Support et Paramètres | Responsive | P2 | Growth | — | Variante |

---

## 7. CARE — E-COMMERCE

| ID | Nom | Route | Audience | Famille | Support | Priorité | Plan | Feature Gate | Maquette |
|----|-----|-------|----------|---------|---------|----------|------|-------------|----------|
| CARE-HOME-001 | Care (Coming Soon) | `/care` | public | Landing Marketing | Responsive | P2 | — | — | Variante |
| CARE-CAT-001 | Catalogue | `/care/catalogue` | public | Liste Professionnelle | Responsive | P1 | — | — | Variante |
| CARE-PROD-001 | Détail Produit | `/care/produit/[slug]` | public | Fiche Détail Pro | Responsive | P1 | — | — | Variante |
| CARE-CAT-002 | Détail Catégorie | `/care/categories/[slug]` | public | Liste Professionnelle | Responsive | P2 | — | — | Variante |
| CARE-KIT-001 | Liste Kits | `/care/kits` | public | Liste Professionnelle | Responsive | P2 | — | — | Variante |
| CARE-KIT-002 | Détail Kit | `/care/kits/[slug]` | public | Fiche Détail Pro | Responsive | P2 | — | — | Variante |
| CARE-METH-001 | Méthodologie | `/care/recommandations` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |
| CARE-SEC-001 | Sécurité Produits | `/care/securite-produits` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |
| CARE-PART-001 | Fournisseurs | `/care/partenaires` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |
| CARE-CART-001 | Panier | `/care/panier` | auth | Facturation | Responsive | P1 | — | — | Variante |
| CARE-COMM-001 | Paiement | `/care/commande` | auth | Facturation | Responsive | P1 | — | — | Variante |
| CARE-SUIVI-001 | Suivi Commandes | `/care/suivi` | auth | Facturation | Responsive | P1 | — | — | Variante |
| CARE-STOCK-001 | Mon Stock | `/care/mon-stock` | auth | Gestion Équipements | Responsive | P1 | — | — | Variante |

---

## 8. SETTINGS & SUPPORT

| ID | Nom | Route | Audience | Famille | Support | Priorité | Plan | Feature Gate | Maquette |
|----|-----|-------|----------|---------|---------|----------|------|-------------|----------|
| USR-SET-001 | Paramètres & Vie privée | `/settings` | auth | Support et Paramètres | Responsive | P1 | — | — | Variante |

---

## 9. ADMINISTRATION

| ID | Nom | Route | Audience | Famille | Support | Priorité | Plan | Feature Gate | Maquette |
|----|-----|-------|----------|---------|---------|----------|------|-------------|----------|
| ADMIN-001 | Panneau Admin | `/admin` | admin | Administration | Responsive | P2 | — | — | Variante |

---

## 10. ACADEMY

| ID | Nom | Route | Audience | Famille | Support | Priorité | Plan | Feature Gate | Maquette |
|----|-----|-------|----------|---------|---------|----------|------|-------------|----------|
| ACAD-001 | Accueil Academy | `/academy` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |
| ACAD-002 | Guides Academy | `/academy/guides` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |
| ACAD-003 | Certification | `/academy/certification` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |

---

## 11. PARTENAIRES & BUSINESS

| ID | Nom | Route | Audience | Famille | Support | Priorité | Plan | Feature Gate | Maquette |
|----|-----|-------|----------|---------|---------|----------|------|-------------|----------|
| PART-001 | Partenaires | `/partenaires` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |
| PART-002 | Piscinistes | `/partenaires/piscinistes` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |
| PART-003 | Fournisseurs | `/partenaires/fournisseurs` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |
| AFFIL-001 | Affiliation | `/affiliation` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |
| BIZ-001 | Business | `/business` | public | Landing Marketing | Responsive | P2 | — | — | Variante |
| BIZ-HOTEL-001 | Offre Hôtels | `/business/hotels` | public | Page Fonctionnalité | Responsive | P2 | — | — | Variante |
| BIZ-CAMP-001 | Offre Campings | `/business/campings` | public | Page Fonctionnalité | Responsive | P2 | — | — | Variante |
| BIZ-SPA-001 | Offre Spas | `/business/spas` | public | Page Fonctionnalité | Responsive | P2 | — | — | Variante |
| BIZ-CONCI-001 | Offre Conciergeries | `/business/conciergeries` | public | Page Fonctionnalité | Responsive | P2 | — | — | Variante |
| BIZ-MULTI-001 | Offre Multi-sites | `/business/multisite` | public | Page Fonctionnalité | Responsive | P2 | — | — | Variante |
| BIZ-PRICE-001 | Business Tarifs | `/business/tarifs` | public | Page Tarifaire | Responsive | P2 | — | — | Variante |
| BIZ-DEMO-001 | Business Démo | `/business/demo` | public | Landing Marketing | Responsive | P2 | — | — | Variante |

---

## 12. LÉGAL & AUTRES

| ID | Nom | Route | Audience | Famille | Support | Priorité | Plan | Feature Gate | Maquette |
|----|-----|-------|----------|---------|---------|----------|------|-------------|----------|
| LEGAL-001 | Politique confidentialité | `/legal/privacy` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |
| LEGAL-002 | CGU | `/legal/cgu` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |
| LEGAL-003 | Cookies | `/legal/cookies` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |
| LEGAL-004 | Accessibilité | `/legal/accessibilite` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |
| LEGAL-005 | Sécurité | `/legal/securite` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |
| LEGAL-006 | Support | `/legal/support` | public | Support et Paramètres | Responsive | P2 | — | — | SKIP |
| LEGAL-007 | CGV | `/legal/cgv` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |
| MISC-001 | Store | `/store` | interne | — | — | P3 | — | — | SKIP |
| MISC-002 | FAQ | `/faq` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |
| MISC-003 | Guides | `/guides` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |
| MISC-004 | Gestion Données | `/gestion-donnees` | public | Article / Ressource | Responsive | P2 | — | — | SKIP |

---

## 13. ÉCRANS SYSTÈME (non routés)

| ID | Nom | Audience | Famille | Support | Priorité | Plan | Feature Gate | Maquette |
|----|-----|----------|---------|---------|----------|------|-------------|----------|
| SYS-ONBOARD-001 | Onboarding Wizard | auth | Onboarding | Responsive | P0 | — | — | **Maître** |
| SYS-PAYWALL-001 | Paywall Modal | auth | Paywall et Abonnement | Responsive | P1 | — | — | **Maître** |
| SYS-BRAIN-001 | Brain Workspace | auth | AQWELIA Brain | Responsive | P1 | — | — | **Maître** |
| SYS-SCAN-001 | Strip Scanner | auth | Analyse et Résultats | Responsive | P0 | oasis+ | photo_scan | **Maître** |
| SYS-DIAG-001 | Diagnostic Photo | auth | Analyse et Résultats | Responsive | P1 | — | — | Variante |
| SYS-ACTION-001 | Action Plan | auth | Analyse et Résultats | Responsive | P1 | — | — | Variante |
| SYS-WEATHER-001 | Module Météo | auth | Dashboard Particuliers | Responsive | P0 | oasis+ | weather_advanced | Variante |
| SYS-MAINT-001 | Module Maintenance | auth | Gestion Équipements | Responsive | P1 | — | — | Variante |
| SYS-HEALTH-001 | Module Health Log | auth | Historique et Rapports | Responsive | P1 | — | — | Variante |
| SYS-REMIND-001 | Module Rappels | auth | Dashboard Particuliers | Responsive | P1 | oasis+ | smart_reminders | Variante |
| SYS-GUIDES-001 | Module Guides | auth | Support et Paramètres | Responsive | P2 | oasis+ | guides_premium | Variante |
| SYS-ASSIST-001 | Module Assistant | auth | Support et Paramètres | Responsive | P1 | — | — | Variante |
| SYS-IOT-001 | IoT Settings | auth | Gestion Équipements | Responsive | P2 | — | — | Variante |
| SYS-FAMILY-001 | Family Manager | auth | Dashboard Particuliers | Responsive | P2 | — | — | Variante |
| SYS-EMERG-001 | Emergency Mode | auth | Dashboard Particuliers | Responsive | P1 | — | — | Variante |

---

## 14. MODALES

| ID | Nom | Audience | Famille | Support | Priorité | Plan | Feature Gate | Maquette |
|----|-----|----------|---------|---------|----------|------|-------------|----------|
| MOD-CLIENT-001 | Ajout Client | pro | Liste Professionnelle | Responsive | P1 | Pro | — | **Maître** |
| MOD-POOL-001 | Ajout Piscine | pro | Liste Professionnelle | Responsive | P1 | Pro | — | Variante |
| MOD-INTERV-001 | Ajout Intervention | pro | Planning et Calendrier | Responsive | P1 | Pro | — | Variante |
| MOD-LEAD-001 | Nouveau Lead | growth | Formulaire / Assistant | Responsive | P1 | Growth | — | Variante |
| MOD-RDV-001 | Nouveau RDV | growth | Planning et Calendrier | Responsive | P1 | Growth | — | Variante |
| MOD-DEVIS-001 | Nouveau Devis | growth | Facturation | Responsive | P1 | Growth | — | Variante |
| MOD-PAYWALL-001 | Upgrade Plan | auth | Paywall et Abonnement | Responsive | P1 | — | — | Variante |
| MOD-FEEDBACK-001 | Feedback Recommandation | auth | AQWELIA Brain | Responsive | P1 | — | — | Variante |

---

## 15. COMPOSANTS SANS MAQUETTE

| ID | Nom | Famille | Notes |
|----|-----|---------|-------|
| COMP-HEADER-001 | Header | Transversal | Navigation principale |
| COMP-NAV-001 | Dashboard Nav | Transversal | Navigation sidebar |
| COMP-PRO-NAV-001 | Pro Nav | Dashboard Pro | Navigation Pro |
| COMP-GROW-NAV-001 | Growth Nav | Dashboard Growth | Navigation Growth |
| COMP-SKELETON-001 | Skeleton | États Système | État chargement |
| COMP-TOAST-001 | Toast / Sonner | États Système | Notifications |
| COMP-OFFLINE-001 | Offline Banner | États Système | État hors-ligne |
| COMP-CONSENT-001 | Consent Banner | Transversal | RGPD cookies |
| COMP-FEEDBACK-001 | Feedback Widget | Transversal | Widget retour |
| COMP-LOGO-001 | Logo | Transversal | Logo AQWELIA |
| COMP-PAYWALL-001 | Module Paywall | Paywall et Abonnement | Composant paywall |
| COMP-RESTOCK-001 | Restock Widget | Gestion Équipements | Réassort auto |
| COMP-IOT-001 | IoT Settings | Gestion Équipements | Capteurs |
| COMP-CHART-PH-001 | Chart pH | Analyse et Résultats | Graphique pH |
| COMP-CHART-TREND-001 | Chart Trend | Analyse et Résultats | Tendances |
| COMP-HEATMAP-001 | Calendar Heatmap | Historique et Rapports | Calendrier visuel |
| COMP-HELP-001 | Help Popover | Transversal | Aide contextuelle |
| COMP-PULSING-001 | Pulsing Dot | Transversal | Indicateur actif |
| COMP-FG-DEMO-001 | Feature Gate Demo | Transversal | Démo gates |

---

## 16. ÉTATS SYSTÈME

| ID | Nom | Composants concernés | Maquette |
|----|-----|---------------------|----------|
| STATE-LOADING-001 | Loading | Tous les modules | SKIP |
| STATE-SKELETON-001 | Skeleton | Tous les modules | SKIP |
| STATE-EMPTY-001 | Empty | Brain, Maintenance, Weather | SKIP |
| STATE-ERROR-001 | Error | Tous les modules | SKIP |
| STATE-SUCCESS-001 | Success | Tous (Sonner) | SKIP |
| STATE-WARNING-001 | Warning | Emergency Mode | SKIP |
| STATE-CRITICAL-001 | Critical | Emergency Mode | SKIP |
| STATE-OFFLINE-001 | Offline | Offline Banner | SKIP |
| STATE-UNAUTH-001 | Unauthorized | Middleware | SKIP |
- STATE-NODATA-001 | No Data | Tous | SKIP |
| STATE-ANCIENT-001 | Donnée Ancienne | Health Log | SKIP |
| STATE-LOCKED-001 | Feature Verrouillée | Paywall | SKIP |
| STATE-UPGRADE-001 | Abonnement Requis | Paywall | SKIP |
| STATE-LIMIT-001 | Limite Atteinte | Quotas | SKIP |
| STATE-ACTION-001 | Action En Cours | Tous | SKIP |
| STATE-ACTIONOK-001 | Action Réussie | Tous | SKIP |
| STATE-ACTIONFAIL-001 | Action Échouée | Tous | SKIP |

---

## 17. PAGES SKIP (pas de maquette nécessaire)

| ID | Raison |
|----|--------|
| PRO-FAQ-001 | Texte statique accordion |
| PRO-SOLO-001 | Texte statique |
| PRO-TEAM-001 | Texte statique |
| PRO-FLEET-001 | Texte statique |
| GROW-FAQ-001 | Texte statique accordion |
| CARE-METH-001 | Texte statique |
| CARE-SEC-001 | Texte statique |
| CARE-PART-001 | Texte statique |
| ACAD-001-003 | Texte statique |
| PART-001-003 | Texte statique |
| AFFIL-001 | Texte statique |
| LEGAL-001-007 | Texte juridique statique |
| MISC-001-004 | Texte statique ou redirect |
| Tous les STATES | Composants transversaux |
| Tous les COMP | Composants réutilisables |
