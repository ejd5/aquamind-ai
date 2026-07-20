# AQWELIA — Matrice des Écrans et Fonctionnalités

> Phase 1 du Masterplan Visuel — Inventaire des écrans
> Date : 2026-07-20 | Branche : feat/aqwelia-brain-foundation

---

## Résumé

| Métrique | Valeur |
|----------|--------|
| **Fonctionnalités recensées** | 35 |
| **Présentes et complètes** | 22 |
| **Présentes partiellement** | 7 |
| **Absentes** | 6 |
| **Incohérences détectées** | 4 |

---

## 1. ONBOARDING

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Wizard multi-étapes | ✅ Complet | Client-side | `onboarding.tsx` | Géoloc, profil piscine | Tous | — |
| Sélection type piscine | ✅ Complet | — | `onboarding.tsx` | — | Tous | — |
| Dimensions & forme | ✅ Complet | — | `onboarding.tsx` | — | Tous | — |
| Équipements | ✅ Complet | — | `onboarding.tsx` | — | Tous | — |
| Géolocalisation | ✅ Complet | — | `onboarding.tsx` | Navigator.geolocation | Tous | — |
| Upsell spa (paywall) | ✅ Complet | — | `onboarding.tsx` | Gold lock UI | wellness+ | — |
| Ajout piscine (multi-pool) | ✅ Complet | Client-side | `onboarding.tsx` | `multi_pool` gate | wellness+ | — |

---

## 2. CRÉATION DE COMPTE

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Inscription email/mdp | ✅ Complet | `/auth/signin` | Credentials form | — | Tous | — |
| OAuth Google | ✅ Complet | `/auth/signin` | OAuth buttons | Google provider | Tous | — |
| OAuth Apple | ✅ Complet | `/auth/signin` | OAuth buttons | Apple provider | Tous | — |
| Compte démo | ✅ Complet | `/api/demo/login` | — | `DEMO_ACCOUNT_ENABLED` | Découverte | — |

---

## 3. ANALYSE MANUELLE

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Formulaire pH/chlore/alcalinité | ✅ Complet | Client-side | `module-water-test.tsx` | — | Tous | — |
| Historique tests | ✅ Complet | Client-side | `module-water-test.tsx` | `history_extended` | oasis+ | — |
| Clear Water Index | ✅ Complet | — | `module-water-test.tsx` | — | Tous | — |
| Mode Pro (LSI) | ✅ Complet | — | `module-water-test.tsx` | `pro_mode` gate | oasis+ | — |
| Export PDF | ✅ Complet | — | `module-health-log.tsx` | `pdf_report` gate | oasis+ | — |

---

## 4. SCAN DE BANDELETTE

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Caméra IA scan | ✅ Complet | `/api/pool/strip-scan` | `strip-scanner.tsx` | NVIDIA Vision API | oasis+ | Quota P0-A : 999999 (illimité temporaire) |
| Flux multi-étapes | ✅ Complet | — | `strip-scanner.tsx` | — | oasis+ | — |

---

## 5. RECOMMANDATIONS

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Plan d'action IA | ✅ Complet | `/api/pool/action-plan` | `module-action-plan.tsx` | — | Tous | — |
| Plan diagnostic détaillé | ✅ Complet | — | `diagnostic-action-plan.tsx` | — | Tous | Composant le plus lourd (1674 lignes) |
| Action tracker (Done/Later/Skip) | ✅ Complet | — | `brain-action-tracker.tsx` | Brain | Tous | — |
| Historique exécutions | ✅ Complet | `/api/brain/executions` | Brain timeline | — | Tous | — |

---

## 6. MÉTÉO

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Météo actuelle | ✅ Complet | `/api/pool/weather` | `module-weather.tsx` | wttr.in API | oasis+ | **Bug client-side : erreur JS sur certaines configs** |
| Prévisions 5 jours | ✅ Complet | — | `module-weather.tsx` | — | oasis+ | — |
| Alertes météo | ✅ Complet | — | `module-weather.tsx` | — | oasis+ | — |
| Conseils piscine/météo | ✅ Complet | — | `module-weather.tsx` | — | oasis+ | — |

---

## 7. ENTRETIEN

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Inventaire produits | ✅ Complet | `/api/pool/inventory` | `module-maintenance.tsx` | — | Tous | — |
| Calendrier interventions | ✅ Complet | — | `module-maintenance.tsx` | — | Tous | — |
| Statut équipements | ✅ Complet | `/api/pool/equipment` | `module-maintenance.tsx` | — | Tous | — |
| Réassort auto | ✅ Complet | `/api/pool/restock` | `restock-widget.tsx` | — | Tous | — |
| IoT capteurs | ✅ Complet | `/api/pool/iot` | `iot-settings.tsx` | ICO/iopool/ESPHome | Tous | — |

---

## 8. RAPPELS

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| CRUD rappels | ✅ Complet | `/api/pool/reminders` | `module-reminders.tsx` | `smart_reminders` | oasis+ | — |
| Rappels intelligents | ✅ Complet | — | `module-reminders.tsx` | — | oasis+ | — |

---

## 9. HISTORIQUE

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Carnet de santé | ✅ Complet | — | `module-health-log.tsx` | — | Tous | États manquants |
| Timeline combinée | ✅ Complet | — | `module-health-log.tsx` | — | Tous | — |
| Historique 14j (free) | ✅ Complet | — | `module-water-test.tsx` | `history_extended` | Tous | — |
| Historique illimité | ✅ Complet | — | `module-water-test.tsx` | — | oasis+ | — |

---

## 10. ÉQUIPEMENTS

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Liste équipements | ✅ Complet | `/api/pool/equipment` | `module-maintenance.tsx` | — | Tous | — |
| Détail équipement | ✅ Complet | — | `module-maintenance.tsx` | — | Tous | — |

---

## 11. RAPPORTS

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Rapport PDF | ✅ Complet | `/api/pool/report` | `module-action-plan.tsx` | `pdf_report` | oasis+ | — |
| Revue annuelle | ✅ Complet | `/api/pool/annual-review` | `annual-review-widget.tsx` | — | Tous | — |

---

## 12. MARKETPLACE (CARE)

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Catalogue produits | ✅ Complet | `/care/catalogue` | `CatalogBrowser` | DB produits | Tous | — |
| Détail produit | ✅ Complet | `/care/produit/[slug]` | Product detail | DB | Tous | — |
| Kits | ✅ Complet | `/care/kits` | Kit cards | DB kits | Tous | — |
| Panier | ✅ Complet | `/care/panier` | `CartManager` | DB panier | Auth | — |
| Paiement | ✅ Complet | `/care/commande` | `CheckoutForm` | `/api/care/checkout` | Auth | — |
| Suivi commandes | ✅ Complet | `/care/suivi` | Order list | DB commandes | Auth | — |
| Mon stock | ✅ Complet | `/care/mon-stock` | Inventory list | DB inventaire | Auth | — |
| Réassort suggéré | ✅ Complet | `/api/pool/restock` | `restock-widget.tsx` | — | Tous | — |

---

## 13. PROFILS

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Profil piscine | ✅ Complet | `/api/pool/profile` | `onboarding.tsx` (réutilisé) | — | Tous | — |
| Profil utilisateur | ✅ Complet | `/settings` | Settings form | — | Auth | — |
| Switch piscine | ✅ Complet | — | `header.tsx` | `multi_pool` | wellness+ | — |

---

## 14. PARAMÈTRES

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Préférences (langue/pays/unités) | ✅ Complet | `/settings` | Settings form | — | Auth | — |
| Notifications | ✅ Complet | `/api/account/notifications` | Settings form | — | Auth | — |
| Export données (RGPD) | ✅ Complet | `/api/account/export` | Settings form | — | Auth | — |
| Suppression compte | ✅ Complet | `/api/account/delete` | Settings form | — | Auth | — |
| Gestion abonnement | ✅ Complet | `/settings` | Billing section | Stripe/RC | Auth | — |

---

## 15. SUPPORT

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Chat IA assistant | ✅ Complet | `/api/chat` | `module-assistant.tsx` | — | Tous | **Pas d'états loading/empty/error** |
| FAQ | ✅ Complet | `/legal/support` | FAQ categories | — | Tous | — |
| Contact | ✅ Complet | `/contact` | `ContactForm` | — | Tous | — |
| Guides (premium) | ✅ Complet | `/api/guides` | `module-guides.tsx` | `guides_premium` | oasis+ | — |
| Academy | ✅ Complet | `/academy` | Academy pages | — | Tous | — |

---

## 16. NOTIFICATIONS

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Toast notifications | ✅ Complet | — | `sonner.tsx` | Sonner lib | Tous | — |
| Banner offline | ✅ Complet | — | `offline-banner.tsx` | — | Tous | — |
| Push notifications | ❌ Absent | — | — | — | — | **Non implémenté** |

---

## 17. PAYWALLS

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Paywall B2C | ✅ Complet | Client-side | `module-paywall.tsx` | Stripe + RevenueCat | — | — |
| Stripe checkout | ✅ Complet | `/api/stripe/checkout` | — | Stripe | — | — |
| RevenueCat native | ✅ Complet | — | `module-paywall.tsx` | RevenueCat | — | — |
| Restore purchases | ✅ Complet | — | `module-paywall.tsx` | RevenueCat | — | — |
| Gestion abonnement | ✅ Complet | `/api/stripe/portal` | — | Stripe | — | — |

---

## 18. GESTION MULTI-PISCINES

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Switch piscine | ✅ Complet | — | `header.tsx` | `multi_pool` | wellness+ | — |
| Ajout piscine | ✅ Complet | Client-side | `onboarding.tsx` | `multi_pool` | wellness+ | — |
| Partage co-gestionnaire | ✅ Complet | `/api/pool/share` | `family-manager.tsx` | — | Tous | — |

---

## 19. PRO — PLANNING

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Vue calendrier | ✅ Complet | `/pro/app/planning` | Calendar view | `/api/pro/interventions` | Pro | — |
| Liste interventions | ✅ Complet | `/pro/app/interventions` | Intervention list | `/api/pro/interventions` | Pro | — |
| Détail intervention | ✅ Complet | `/pro/app/interventions/[id]` | Detail view | `/api/pro/interventions/[id]` | Pro | — |
| CRUD interventions | ✅ Complet | — | `add-intervention-modal.tsx` | — | Pro | — |

---

## 20. PRO — CLIENTS

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Liste clients | ✅ Complet | `/pro/app/clients` | Client list | `/api/pro/clients` | Pro | — |
| Détail client | ✅ Complet | `/pro/app/clients/[id]` | Detail view | `/api/pro/clients/[id]` | Pro | — |
| Ajout client | ✅ Complet | — | `add-client-modal.tsx` | — | Pro | — |

---

## 21. PRO — PIscines CLIENTS

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Liste piscines clients | ✅ Complet | `/pro/app/pools` | Pool list | `/api/pro/pools` | Pro | — |
| Détail piscine | ✅ Complet | `/pro/app/pools/[id]` | Detail view | `/api/pro/pools/[id]` | Pro | — |
| Ajout piscine | ✅ Complet | — | `add-pool-modal.tsx` | — | Pro | — |

---

## 22. PRO — TOURNÉES

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Planning tournées | ✅ Complet | `/pro/app/planning` | Calendar view | `/api/pro/interventions` | Pro | — |
| **Optimisation tournées** | ❌ Absent | — | — | — | — | **Non implémenté** |
| **GPS/Navigation** | ❌ Absent | — | — | — | — | **Non implémenté** |

---

## 23. PRO — RAPPORTS

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Rapports intervention | ✅ Complet | `/pro/app/reports` | Report list | `/api/pro/dashboard` | Pro | — |
| **Export PDF Pro** | ❌ Absent | — | — | — | — | **Non implémenté** |

---

## 24. GROWTH — LEADS

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Boîte leads | ✅ Complet | `/growth/app/leads` | Lead list | `/api/growth/leads` | Growth | — |
| Détail lead | ✅ Complet | `/growth/app/leads/[id]` | Detail + timeline | `/api/growth/leads/[id]` | Growth | — |
| Nouveau lead | ✅ Complet | `/growth/app/leads/new` | Formulaire | — | Growth | — |
| Qualification | ✅ Complet | `/growth/app/qualification` | Board | `/api/growth/leads` | Growth | — |
| Matching IA | ✅ Complet | `/growth/app/matching` | Interface matching | `/api/growth/leads/[id]/match` | Growth | — |

---

## 25. GROWTH — PIPELINE

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Pipeline 6 étapes | ✅ Complet | — | `pipeline-workspace.tsx` | — | Growth | — |
| RDV | ✅ Complet | `/growth/app/appointments` | Calendar/list | `/api/growth/appointments` | Growth | — |
| Devis | ✅ Complet | `/growth/app/quotes` | Quote list | `/api/growth/quotes` | Growth | — |
| Analytics | ✅ Complet | `/growth/app/analytics` | Charts + KPIs | `/api/growth/dashboard` | Growth | — |
| Journal agents | ✅ Complet | `/growth/app/audit` | Agent history | `/api/growth/agents/run` | Growth | — |

---

## 26. BRAIN

| Fonctionnalité | Statut | Route | Composant | Dépendances | Plan | Incohérences |
|---------------|--------|-------|-----------|------------|------|-------------|
| Workspace Brain | ✅ Complet | `/api/brain/timeline` | `module-brain.tsx` | — | Tous | **Pas d'états loading/empty/error** |
| Timeline | ✅ Complet | `/api/brain/timeline` | — | — | Tous | — |
| Métriques intelligence | ✅ Complet | — | `module-brain.tsx` | — | Tous | — |
| Feedback recommandations | ✅ Complet | `/api/brain/feedback` | — | — | Tous | — |
| Base connaissances | ✅ Complet | `/api/brain/knowledge` | — | Admin | Admin | — |
| Diagnostic photo | ⚠️ Partiel | `/api/pool/photo-diagnostic` | `module-diagnostic.tsx` | NVIDIA Vision API | Tous | **NVIDIA_API_KEY requise** |

---

## 27. ÉTATS MANQUANTS (par composant)

| Composant | Loading | Empty | Error | Skeleton | Locked/Upgrade |
|-----------|---------|-------|-------|----------|---------------|
| `module-assistant.tsx` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `module-maintenance.tsx` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `module-weather.tsx` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `module-health-log.tsx` | ❌ | ❌ | ❌ | ❌ | ✅ PDF link |
| `module-diagnostic.tsx` | Partiel | ❌ | ❌ | ✅ | ❌ |
| `module-water-test.tsx` | Partiel | ❌ | ❌ | ✅ | ❌ |
| `module-action-plan.tsx` | ❌ | ❌ | ✅ | ✅ | ✅ PDF CTA |
| `module-brain.tsx` | ✅ | ❌ (null) | ❌ (silent catch) | ❌ | ❌ |
| `emergency-mode.tsx` | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 28. INCOHÉRENCES DÉTECTÉES

| # | Problème | Détails |
|---|----------|---------|
| 1 | **Module Weather crash client-side** | Le composant plante côté client sur certaines configurations, rendant la page blanche |
| 2 | **Poids de `diagnostic-action-plan.tsx`** | 1674 lignes — composant le plus lourd du codebase, devrait être décomposé |
| 3 | **Push notifications absent** | Le système de notifications push n'est pas implémenté malgré les préférences notifs dans settings |
| 4 | **Pas de ErrorBoundary global** | Aucun ErrorBoundary React n'est présent — les erreurs JS crashent toute l'app |
