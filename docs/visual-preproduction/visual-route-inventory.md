# AQWELIA — Inventaire Complet des Routes

> Phase 1 du Masterplan Visuel — Inventaire des routes
> Date : 2026-07-20 | Branche : feat/aqwelia-brain-foundation | SHA : ec1ac462

---

## Résumé

| Métrique | Valeur |
|----------|--------|
| **Routes pages totales** | 101 |
| **Routes API totales** | 80 |
| **Total routes** | 181 |
| **Routes publiques** | 62 |
| **Routes authentifiées** | 39 |
| **Routes admin** | 1 (+ middleware) |
| **Redirects** | 3 |

---

## 1. SITE PUBLIC — `(public)` + racine

| # | Chemin | Nom | Audience | Rôle | Plan | Feature Gate | Statut | Composants principaux | Données | Actions | Mobile |
|---|--------|-----|----------|------|------|-------------|--------|----------------------|---------|---------|--------|
| 1 | `/` | Accueil (Landing + App entry) | public | — | — | — | Complet | `LandingPage`, `AppShell`, `MobileAppShell` | Session, pool profile | Enter app | ✅ |
| 2 | `/fonctionnalites` | Fonctionnalités (11 modules) | public | — | — | — | Complet | `BrainTechnologySection` | Statique | — | ✅ |
| 3 | `/tarifs` | Tarifs (4 plans) | public | — | — | — | Complet | `PricingExplorer`, `Accordion` | Statique | — | ✅ |
| 4 | `/comment-ca-marche` | Comment ça marche (5 étapes) | public | — | — | — | Complet | `Accordion` | Statique | — | ✅ |
| 5 | `/a-propos` | À propos | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 6 | `/contact` | Formulaire contact | public | — | — | — | Complet | `ContactForm` | — | Soumettre | ✅ |
| 7 | `/diagnostic-ia` | Diagnostic IA (marketing) | public | — | — | — | Complet | `BrainTechnologySection` | Statique | — | ✅ |
| 8 | `/analyse-eau` | Analyse eau (marketing) | public | — | — | — | Partiel | Cartes statiques | Statique | — | ✅ |
| 9 | `/analyse-bandelettes` | StripScan™ (marketing) | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 10 | `/meteo-alertes` | Météo & Alertes (marketing) | public | — | — | — | Partiel | Cartes statiques | Statique | — | ✅ |
| 11 | `/spa` | Spa 365 (marketing) | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 12 | `/technologie` | AQWELIA Brain (marketing) | public | — | — | — | Complet | `BrainTechnologySection` | Statique | — | ✅ |
| 13 | `/winter-guardian` | Winter Guardian (marketing) | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 14 | `/hivernage` | Hivernage (marketing) | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 15 | `/remise-en-route` | Remise en route (marketing) | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 16 | `/rappels-entretien` | Rappels entretien (marketing) | public | — | — | — | Partiel | Cartes statiques | Statique | — | ✅ |

---

## 2. AUTHENTIFICATION

| # | Chemin | Nom | Audience | Rôle | Plan | Feature Gate | Statut | Composants | Données | Actions | Mobile |
|---|--------|-----|----------|------|------|-------------|--------|-----------|---------|---------|--------|
| 17 | `/auth/signin` | Connexion / Inscription | public | — | — | — | Complet | OAuth (Google, Apple), formulaire credentials | `/api/auth/providers` | Sign in, Sign up, OAuth | ✅ |

---

## 3. AQWELIA PRO — Pages marketing

| # | Chemin | Nom | Audience | Rôle | Plan | Feature Gate | Statut | Composants | Données | Actions | Mobile |
|---|--------|-----|----------|------|------|-------------|--------|-----------|---------|---------|--------|
| 18 | `/pro` | Pro (marketing) | public | — | — | — | Complet | `BrainTechnologySection`, cartes pricing, FAQ | Statique (4 plans) | Lien early-access | ✅ |
| 19 | `/pro/fonctionnalites` | Pro fonctionnalités | public | — | — | — | Complet | 6 cartes modules | Statique | — | ✅ |
| 20 | `/pro/tarifs` | Pro tarifs | public | — | — | — | Complet | Cartes pricing | Statique | — | ✅ |
| 21 | `/pro/faq` | Pro FAQ | public | — | — | — | Complet | `Accordion` | Statique | — | ✅ |
| 22 | `/pro/demo` | Pro démo visuelle | public | — | — | — | Complet | 5 maquettes (browser frames) | Statique | — | ✅ |
| 23 | `/pro/early-access` | Early access | public | — | — | — | Complet | `EarlyAccessForm` → `/api/pro/early-access` | — | Soumettre | ✅ |
| 24 | `/pro/solo` | Plan Solo | public | — | — | — | Partiel | Statique | Statique | — | ✅ |
| 25 | `/pro/team` | Plan Team | public | — | — | — | Partiel | Statique | Statique | — | ✅ |
| 26 | `/pro/fleet` | Plan Fleet | public | — | — | — | Partiel | Statique | Statique | — | ✅ |

---

## 4. AQWELIA PRO — Application

| # | Chemin | Nom | Audience | Rôle | Plan | Feature Gate | Statut | Composants | Données | Actions | Mobile |
|---|--------|-----|----------|------|------|-------------|--------|-----------|---------|---------|--------|
| 27 | `/pro/app` | Dashboard Pro | pro | Session | — | — | Complet | Stats cards, interventions, alertes | `/api/pro/dashboard` | Voir clients/piscines | ✅ |
| 28 | `/pro/app/clients` | Liste clients | pro | Session | — | — | Complet | Liste clients | `/api/pro/clients` | CRUD clients | ✅ |
| 29 | `/pro/app/clients/[id]` | Détail client | pro | Session | — | — | Complet | Détail client | `/api/pro/clients/[id]` | Éditer | ✅ |
| 30 | `/pro/app/pools` | Liste piscines | pro | Session | — | — | Complet | Liste piscines | `/api/pro/pools` | CRUD piscines | ✅ |
| 31 | `/pro/app/pools/[id]` | Détail piscine | pro | Session | — | — | Complet | Détail piscine | `/api/pro/pools/[id]` | Éditer | ✅ |
| 32 | `/pro/app/planning` | Planning | pro | Session | — | — | Complet | Vue calendrier | `/api/pro/interventions` | Planifier | ✅ |
| 33 | `/pro/app/interventions` | Liste interventions | pro | Session | — | — | Complet | Liste | `/api/pro/interventions` | CRUD | ✅ |
| 34 | `/pro/app/interventions/[id]` | Détail intervention | pro | Session | — | — | Complet | Détail | `/api/pro/interventions/[id]` | Éditer | ✅ |
| 35 | `/pro/app/reports` | Rapports | pro | Session | — | — | Complet | Liste rapports | `/api/pro/dashboard` | Générer | ✅ |
| 36 | `/pro/app/settings` | Paramètres Pro | pro | Session | — | — | Complet | Formulaire | `/api/pro/settings` | Mettre à jour | ✅ |

---

## 5. GROWTH OS — Pages marketing

| # | Chemin | Nom | Audience | Rôle | Plan | Feature Gate | Statut | Composants | Données | Actions | Mobile |
|---|--------|-----|----------|------|------|-------------|--------|-----------|---------|---------|--------|
| 37 | `/growth` | Growth OS (marketing) | public | — | — | — | Complet | `BrainTechnologySection`, grille 10 agents, pipeline 6 étapes, 3 tiers | Statique | — | ✅ |
| 38 | `/growth/fonctionnalites` | Growth fonctionnalités | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 39 | `/growth/qualification` | Qualification | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 40 | `/growth/landing-pages` | Landing pages | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 41 | `/growth/reactivation` | Reactivation | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 42 | `/growth/marketplace-leads` | Marketplace leads | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 43 | `/growth/tarifs` | Growth tarifs | public | — | — | — | Complet | 3 cartes tiers | Statique | — | ✅ |
| 44 | `/growth/faq` | Growth FAQ | public | — | — | — | Complet | `Accordion` | Statique | — | ✅ |
| 45 | `/growth/demo` | Growth démo | public | — | — | — | Complet | 4 maquettes | Statique | — | ✅ |

---

## 6. GROWTH OS — Application

| # | Chemin | Nom | Audience | Rôle | Plan | Feature Gate | Statut | Composants | Données | Actions | Mobile |
|---|--------|-----|----------|------|------|-------------|--------|-----------|---------|---------|--------|
| 46 | `/growth/app` | Dashboard Growth | growth | Session | — | — | Complet | 4 stats cards, pipeline, agents, leads table | `/api/growth/dashboard` | Voir leads/conversions | ✅ |
| 47 | `/growth/app/leads` | Boîte de réception leads | growth | Session | — | — | Complet | Liste leads | `/api/growth/leads` | CRUD leads | ✅ |
| 48 | `/growth/app/leads/[id]` | Détail lead | growth | Session | — | — | Complet | Détail + timeline | `/api/growth/leads/[id]` | Voir/éditer | ✅ |
| 49 | `/growth/app/leads/new` | Nouveau lead | growth | Session | — | — | Complet | Formulaire | — | Créer lead | ✅ |
| 50 | `/growth/app/qualification` | Qualification leads | growth | Session | — | — | Complet | Board qualification | `/api/growth/leads` | Qualifier | ✅ |
| 51 | `/growth/app/matching` | Matching leads | growth | Session | — | — | Complet | Interface matching | `/api/growth/leads/[id]/match` | Matcher | ✅ |
| 52 | `/growth/app/appointments` | Rendez-vous | growth | Session | — | — | Complet | Calendrier/liste | `/api/growth/appointments` | CRUD RDV | ✅ |
| 53 | `/growth/app/quotes` | Devis | growth | Session | — | — | Complet | Liste devis | `/api/growth/quotes` | CRUD devis | ✅ |
| 54 | `/growth/app/analytics` | Analytics | growth | Session | — | — | Complet | Graphiques + KPIs | `/api/growth/dashboard` | Voir analytics | ✅ |
| 55 | `/growth/app/audit` | Journal agents | growth | Session | — | — | Complet | Historique agents | `/api/growth/agents/run` | Voir activité | ✅ |
| 56 | `/growth/app/settings` | Paramètres Growth | growth | Session | — | — | Complet | Formulaire | `/api/growth/settings` | Mettre à jour | ✅ |

---

## 7. CARE — E-commerce

| # | Chemin | Nom | Audience | Rôle | Plan | Feature Gate | Statut | Composants | Données | Actions | Mobile |
|---|--------|-----|----------|------|------|-------------|--------|-----------|---------|---------|--------|
| 57 | `/care` | Care (marketing, "Coming soon") | public | — | — | — | Complet | `NotifyForm` | Catalogue DB (6 produits) | Notify signup | ✅ |
| 58 | `/care/catalogue` | Catalogue produits | public | — | — | — | Complet | `CatalogBrowser` | DB produits + catégories | Filtrer/rechercher | ✅ |
| 59 | `/care/produit/[slug]` | Détail produit | public | — | — | — | Complet | Détail produit | DB par SKU | Voir détails | ✅ |
| 60 | `/care/categories/[slug]` | Détail catégorie | public | — | — | — | Complet | Produits catégorie | DB par catégorie | Parcourir | ✅ |
| 61 | `/care/kits` | Liste kits | public | — | — | — | Complet | Cartes kits | DB kits | Parcourir | ✅ |
| 62 | `/care/kits/[slug]` | Détail kit | public | — | — | — | Complet | Détail kit | DB par slug | Voir kit | ✅ |
| 63 | `/care/recommandations` | Méthodologie recommandations | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 64 | `/care/securite-produits` | Sécurité produits | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 65 | `/care/partenaires` | Fournisseurs partenaires | public | — | — | — | Complet | Liste partenaires | Statique | — | ✅ |
| 66 | `/care/panier` | Panier | auth | Session | — | — | Complet | `CartManager` | DB panier | Ajouter/supprimer | ✅ |
| 67 | `/care/commande` | Paiement | auth | Session | — | — | Complet | `CheckoutForm` → `/api/care/checkout` | DB panier | Soumettre commande | ✅ |
| 68 | `/care/suivi` | Suivi commandes | auth | Session | — | — | Complet | Liste + badges statut | DB commandes | Voir statut | ✅ |
| 69 | `/care/mon-stock` | Mon stock | auth | Session | — | — | Complet | Liste + réassort | DB inventaire | Gérer stock | ✅ |

---

## 8. SETTINGS

| # | Chemin | Nom | Audience | Rôle | Plan | Feature Gate | Statut | Composants | Données | Actions | Mobile |
|---|--------|-----|----------|------|------|-------------|--------|-----------|---------|---------|--------|
| 70 | `/settings` | Paramètres & Vie privée | auth | Session | Plan affiché | — | Complet | Billing, préférences (langue/pays/unités), export/suppression | Plan actif, notifs | Gérer abo, exporter, supprimer | ✅ |

---

## 9. ADMINISTRATION

| # | Chemin | Nom | Audience | Rôle | Plan | Feature Gate | Statut | Composants | Données | Actions | Mobile |
|---|--------|-----|----------|------|------|-------------|--------|-----------|---------|---------|--------|
| 71 | `/admin` | Panneau admin (5 onglets) | admin | Session + `isAdminEmail` | — | — | Partiel | Bannières (localStorage), Popups (localStorage), Contenu (placeholder), Analytics (placeholder), Users (placeholder) | localStorage | Configurer bannières/popup | ✅ |

---

## 10. ACADEMY

| # | Chemin | Nom | Audience | Rôle | Plan | Feature Gate | Statut | Composants | Données | Actions | Mobile |
|---|--------|-----|----------|------|------|-------------|--------|-----------|---------|---------|--------|
| 72 | `/academy` | Accueil Academy (6 piliers) | public | — | — | — | Complet | `Breadcrumbs`, schemas JSON-LD | Statique | Parcourir guides | ✅ |
| 73 | `/academy/guides` | Guides Academy | public | — | — | — | Complet | Liste guides | `/api/academy/courses` | Parcourir | ✅ |
| 74 | `/academy/certification` | Processus certification | public | — | — | — | Complet | Timeline 4 étapes | Statique | S'inscrire | ✅ |

---

## 11. PARTENAIRES

| # | Chemin | Nom | Audience | Rôle | Plan | Feature Gate | Statut | Composants | Données | Actions | Mobile |
|---|--------|-----|----------|------|------|-------------|--------|-----------|---------|---------|--------|
| 75 | `/partenaires` | Partenaires (marketing) | public | — | — | — | Complet | 2 types, grille bénéfices, 4 étapes | Statique | — | ✅ |
| 76 | `/partenaires/piscinistes` | Piscinistes partenaires | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 77 | `/partenaires/fournisseurs` | Fournisseurs partenaires | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 78 | `/affiliation` | Programme affiliation | public | — | — | — | Complet | Commissions, 4 étapes | Statique | — | ✅ |

---

## 12. BUSINESS — Hébergement B2B

| # | Chemin | Nom | Audience | Rôle | Plan | Feature Gate | Statut | Composants | Données | Actions | Mobile |
|---|--------|-----|----------|------|------|-------------|--------|-----------|---------|---------|--------|
| 79 | `/business` | Business (marketing) | public | — | — | — | Complet | 8 cartes features, 6 secteurs, pricing | Statique | — | ✅ |
| 80 | `/business/hotels` | Offre hôtels | public | — | — | — | Complet | 6 bénéfices + checklist | Statique | — | ✅ |
| 81 | `/business/campings` | Offre campings | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 82 | `/business/spas` | Offre spas | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 83 | `/business/conciergeries` | Offre conciergeries | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 84 | `/business/multisite` | Offre multi-sites | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 85 | `/business/tarifs` | Business tarifs | public | — | — | — | Complet | 2 cartes plans + comparaison | Statique | — | ✅ |
| 86 | `/business/demo` | Business démo | public | — | — | — | Complet | 5 maquettes | Statique | — | ✅ |

---

## 13. LÉGAL & SUPPORT

| # | Chemin | Nom | Audience | Rôle | Plan | Feature Gate | Statut | Composants | Données | Actions | Mobile |
|---|--------|-----|----------|------|------|-------------|--------|-----------|---------|---------|--------|
| 87 | `/legal/privacy` | Politique de confidentialité | public | — | — | — | Complet | Texte juridique | Statique | — | ✅ |
| 88 | `/legal/cgu` | Conditions d'utilisation | public | — | — | — | Complet | Texte juridique | Statique | — | ✅ |
| 89 | `/legal/cookies` | Politique cookies | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 90 | `/legal/accessibilite` | Déclaration accessibilité | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 91 | `/legal/securite` | Politique sécurité | public | — | — | — | Complet | Statique | Statique | — | ✅ |
| 92 | `/legal/support` | Support | public | — | — | — | Complet | Catégories FAQ, liens contact | Statique | — | ✅ |
| 93 | `/legal/cgv` | Conditions générales de vente | public | — | — | — | Complet | Texte juridique | Statique | — | ✅ |

---

## 14. REDIRECTS (URLs legacy)

| # | Chemin | Cible | Type |
|---|--------|-------|------|
| 94 | `/confidentialite` | → `/legal/privacy` | 308 |
| 95 | `/conditions-utilisation` | → `/legal/cgu` | 308 |
| 96 | `/mentions-legales` | → `/legal/cgu` | 308 |

---

## 15. STANDALONE / INTERNES

| # | Chemin | Nom | Audience | Rôle | Plan | Feature Gate | Statut | Composants | Données | Actions | Mobile |
|---|--------|-----|----------|------|------|-------------|--------|-----------|---------|---------|--------|
| 97 | `/store` | App Store / Play Store prep | interne | — | — | — | Complet | Status board | Statique | — | ✅ |
| 98 | `/faq` | FAQ (racine) | public | — | — | — | Placeholder | Titre + description | — | — | ✅ |
| 99 | `/guides` | Guides (racine) | public | — | — | — | Placeholder | Titre + description | — | — | ✅ |
| 100 | `/gestion-donnees` | Gestion données (RGPD) | public | — | — | — | Complet | 5 sections | Statique | — | ✅ |
| 101 | `/meteo-alertes` | Météo & alertes | public | — | — | — | Partiel | 2 cartes statiques | Statique | — | ✅ |

---

## 16. ROUTES API — Auth

| # | Chemin | Méthode | Auth | Portée |
|---|--------|---------|------|--------|
| A1 | `/api/auth/[...nextauth]` | ALL | — | NextAuth handler |
| A2 | `/api/auth/register` | POST | — | Inscription |
| A3 | `/api/auth/me` | GET | Session | Utilisateur courant |
| A4 | `/api/demo/login` | POST | — | Auto-login démo |

---

## 17. ROUTES API — Pool (Consumer Brain)

| # | Chemin | Méthode | Auth | Feature Gate | Portée |
|---|--------|---------|------|-------------|--------|
| A5 | `/api/pool/profile` | GET | ✅ | `multi_pool`, `spa_support` | Profil piscine |
| A6 | `/api/pool/water-test` | GET/POST | ✅ | `history_extended`, `pro_mode` | Tests eau |
| A7 | `/api/pool/strip-scan` | POST | ✅ | `photo_scan` | Scan bandelette IA |
| A8 | `/api/pool/weather` | GET | ✅ | `weather_advanced` | Météo |
| A9 | `/api/pool/reminders` | GET/POST | ✅ | `smart_reminders` | Rappels |
| A10 | `/api/pool/action-plan` | GET | ✅ | — | Plan d'action |
| A11 | `/api/pool/inventory` | GET/POST | ✅ | — | Inventaire produits |
| A12 | `/api/pool/predictions` | GET | ✅ | — | Prédictions |
| A13 | `/api/pool/savings` | GET | ✅ | — | Économies |
| A14 | `/api/pool/gamification` | GET | ✅ | — | Gamification |
| A15 | `/api/pool/photo-diagnostic` | POST | ✅ | — | Diagnostic photo IA |
| A16 | `/api/pool/annual-review` | GET | ✅ | — | Revue annuelle |
| A17 | `/api/pool/restock` | POST | ✅ | — | Réassort auto |
| A18 | `/api/pool/equipment` | GET/POST | ✅ | — | Équipements |
| A19 | `/api/pool/iot` | GET/POST | ✅ | — | IoT capteurs |
| A20 | `/api/pool/winter-guardian` | GET/POST | ✅ | — | Winter Guardian |
| A21 | `/api/pool/share` | POST | ✅ | — | Partage données |
| A22 | `/api/pool/report` | GET | ✅ | `pdf_report` | Rapport PDF |

---

## 18. ROUTES API — Pro

| # | Chemin | Méthode | Auth | Portée |
|---|--------|---------|------|--------|
| A23 | `/api/pro/dashboard` | GET | ✅ | Stats dashboard Pro |
| A24 | `/api/pro/clients` | GET/POST | ✅ | CRUD clients |
| A25 | `/api/pro/clients/[id]` | GET/PUT/DELETE | ✅ | Détail client |
| A26 | `/api/pro/pools` | GET/POST | ✅ | CRUD piscines |
| A27 | `/api/pro/pools/[id]` | GET/PUT/DELETE | ✅ | Détail piscine |
| A28 | `/api/pro/interventions` | GET/POST | ✅ | CRUD interventions |
| A29 | `/api/pro/interventions/[id]` | GET/PUT/DELETE | ✅ | Détail intervention |
| A30 | `/api/pro/water-tests` | GET/POST | ✅ | Tests eau Pro |
| A31 | `/api/pro/settings` | GET/PUT | ✅ | Paramètres |
| A32 | `/api/pro/early-access` | POST | — | Capture leads |
| A33 | `/api/pro/export` | GET | ✅ | Export données |

---

## 19. ROUTES API — Growth OS

| # | Chemin | Méthode | Auth | Portée |
|---|--------|---------|------|--------|
| A34 | `/api/growth/dashboard` | GET | ✅ | Stats Growth |
| A35 | `/api/growth/leads` | GET/POST | — | CRUD leads (public capture) |
| A36 | `/api/growth/leads/[id]` | GET/PUT | ✅ | Détail lead |
| A37 | `/api/growth/leads/[id]/match` | POST | ✅ | Matching lead → pro |
| A38 | `/api/growth/leads/[id]/qualify` | POST | ✅ | Qualification lead |
| A39 | `/api/growth/appointments` | GET/POST | ✅ | CRUD RDV |
| A40 | `/api/growth/appointments/[id]` | GET/PUT/DELETE | ✅ | Détail RDV |
| A41 | `/api/growth/quotes` | GET/POST | ✅ | CRUD devis |
| A42 | `/api/growth/quotes/[id]` | GET/PUT | ✅ | Détail devis |
| A43 | `/api/growth/audit` | GET | ✅ | Journal agents |
| A44 | `/api/growth/agents/run` | POST | ✅ | Déclencher agent |
| A45 | `/api/growth/settings` | GET/PUT | ✅ | Paramètres |

---

## 20. ROUTES API — Care (E-commerce)

| # | Chemin | Méthode | Auth | Portée |
|---|--------|---------|------|--------|
| A46 | `/api/care/products` | GET | — | Catalogue |
| A47 | `/api/care/products/[id]` | GET | — | Détail produit |
| A48 | `/api/care/categories` | GET | — | Catégories |
| A49 | `/api/care/kits` | GET | — | Kits |
| A50 | `/api/care/cart` | GET | ✅ | Panier |
| A51 | `/api/care/cart/item` | POST/PUT/DELETE | ✅ | Article panier |
| A52 | `/api/care/checkout` | POST | ✅ | Paiement |
| A53 | `/api/care/orders` | GET | ✅ | Commandes |
| A54 | `/api/care/seed` | POST | — | Seed catalogue |
| A55 | `/api/care/notify` | POST | — | Waitlist |

---

## 21. ROUTES API — Billing / Stripe

| # | Chemin | Méthode | Auth | Portée |
|---|--------|---------|------|--------|
| A56 | `/api/stripe/checkout` | POST | ✅ | Session Stripe |
| A57 | `/api/stripe/portal` | POST | ✅ | Portail client |
| A58 | `/api/stripe/webhook` | POST | Signature | Webhook Stripe |
| A59 | `/api/subscription` | GET | ✅ | Statut abonnement |
| A60 | `/api/revenuecat/webhook` | POST | — | Webhook RevenueCat |

---

## 22. ROUTES API — Brain / Analytics

| # | Chemin | Méthode | Auth | Portée |
|---|--------|---------|------|--------|
| A61 | `/api/brain/timeline` | GET | ✅ | Timeline Brain |
| A62 | `/api/brain/feedback` | POST | ✅ | Feedback recommandations |
| A63 | `/api/brain/executions` | GET/POST | ✅ | Exécutions agents |
| A64 | `/api/brain/knowledge` | GET/POST | ✅/Admin | Base connaissances |
| A65 | `/api/brain/outcomes` | GET | ✅ | Résultats traitements |
| A66 | `/api/analytics` | GET | ✅ | Dashboard analytics |
| A67 | `/api/dashboard` | GET | ✅ | Dashboard principal |

---

## 23. ROUTES API — Account / Autres

| # | Chemin | Méthode | Auth | Portée |
|---|--------|---------|------|--------|
| A68 | `/api/account/notifications` | GET/POST | ✅ | Préférences notifs |
| A69 | `/api/account/export` | GET | ✅ | Export RGPD |
| A70 | `/api/account/delete` | POST | ✅ | Suppression compte |
| A71 | `/api/contact` | POST | — | Formulaire contact |
| A72 | `/api/chat` | POST | ✅ | Assistant IA |
| A73 | `/api/guides` | GET | ✅ | Guides (`guides_premium`) |
| A74 | `/api/stories` | GET | — | Témoignages |
| A75 | `/api/academy/courses` | GET | — | Cours Academy |
| A76 | `/api/academy/certification` | POST | ✅ | Soumettre évaluation |
| A77 | `/api/partners/apply` | POST | — | Candidature partenaire |
| A78 | `/api/health` | GET | — | Health check |
| A79 | `/api/route` | GET | — | Info API racine |
| A80 | `/api/admin/reconcile` | POST | Admin | Réconciliation abo |

---

## 24. FEATURE GATES SERVEUR

| Gate | Plan requis | Vérifié dans |
|------|------------|-------------|
| `photo_scan` | oasis+ | `/api/pool/strip-scan` |
| `weather_advanced` | oasis+ | `/api/pool/weather` |
| `smart_reminders` | oasis+ | `/api/pool/reminders` |
| `guides_premium` | oasis+ | `/api/guides` |
| `multi_pool` | wellness+ | `/api/pool/profile` |
| `pdf_report` | oasis+ | `/api/pool/report` |
| `pro_mode` | oasis+ | `/api/pool/water-test` |
| `history_extended` | oasis+ | `/api/pool/water-test` |
| `spa_support` | wellness+ | `/api/pool/profile` |
