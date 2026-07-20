# AQWELIA — Plan Complet des États UI

> Phase 2 du Masterplan Visuel — États par famille et écran maître
> Date : 2026-07-21 | Branche : docs/visual-preproduction-phase-2

---

## Résumé

| Métrique | Valeur |
|----------|--------|
| **États définis** | 18 |
| **Familles couvertes** | 24 |
| **Écrans maîtres** | 12 |
| **Total combinaisons** | 216 |

---

## 1. LÉGENDE DES ÉTATS

| État | Description | Icône | Couleur |
|------|-------------|-------|---------|
| **initial** | Chargement initial (première visite) | — | — |
| **loading** | Données en cours de chargement | Spinner | `muted` |
| **skeleton** | Placeholder durant chargement | Blocks gris | `muted` |
| **empty** | Aucune donnée disponible | Inbox | `muted` |
| **success** | Action réussie | Check | `green` |
| **information** | Information contextuelle | Info | `blue` |
| **warning** | Attention requise | AlertTriangle | `yellow` |
| **critical** | Situation critique | AlertOctagon | `red` |
| **error** | Erreur système | XCircle | `red` |
| **offline** | Hors connexion | WifiOff | `muted` |
| **permission_refused** | Accès non autorisé | Lock | `red` |
| **donnee_ancienne** | Données non mises à jour | Clock | `yellow` |
| **feature_verrouillee** | Fonctionnalité premium verrouillée | Lock | `accent` |
| **abonnement_requis** | Upgrade plan nécessaire | ArrowUp | `accent` |
| **limite_atteinte** | Quota dépassé | Ban | `red` |
| **action_en_cours** | Traitement en cours | Loader | `blue` |
| **action_reussie** | Action terminée avec succès | CheckCircle | `green` |
| **action_echouee** | Action en échec | XCircle | `red` |

---

## 2. ÉTATS PAR FAMILLE DE TEMPLATE

### 2.1 Landing Marketing

| État | Message | Icône | Action principale | Action secondaire | Récupération |
|------|---------|-------|-------------------|-------------------|-------------|
| initial | — | — | — | — | — |
| success | — | — | — | — | — |

**Desktop** : layout complet, hero above fold.
**Tablette** : colonnes réduites, hero adaptatif.
**Mobile** : colonne unique, hero compact, CTA sticky.

### 2.2 Authentification

| État | Message | Icône | Action principale | Action secondaire | Récupération |
|------|---------|-------|-------------------|-------------------|-------------|
| initial | — | — | — | — | — |
| loading | Connexion en cours… | Loader | — | — | — |
| success | Connexion réussie | Check | Redirection dashboard | — | — |
| error | Email ou mot de passe incorrect | XCircle | Réessayer | Mot de passe oublié | Re-saisir identifiants |
| offline | Connexion impossible | WifiOff | Réessayer | — | Vérifier réseau |

**Desktop** : formulaire centré, largeur max 400px.
**Tablette** : identique desktop.
**Mobile** : pleine largeur, padding réduit.

### 2.3 Onboarding

| État | Message | Icône | Action principale | Action secondaire | Récupération |
|------|---------|-------|-------------------|-------------------|-------------|
| initial | — | — | — | — | — |
| loading | Géolocalisation en cours… | Loader | Autoriser | Passer | Réessayer |
| success | Profil créé ! | Check | Continuer | — | — |
| error | Géolocalisation refusée | XCircle | Entrer adresse manuellement | Passer | Réessayer |

**Desktop** : wizard centré, largeur max 600px.
**Tablette** : identique desktop.
**Mobile** : pleine largeur, étapes en bas.

### 2.4 Dashboard Particuliers

| État | Message | Icône | Action principale | Action secondaire | Récupération |
|------|---------|-------|-------------------|-------------------|-------------|
| initial | Chargement… | — | — | — | — |
| loading | Récupération des données… | Spinner | — | — | — |
| skeleton | — | Blocks | — | — | — |
| empty | Aucune piscine configurée | Inbox | Créer une piscine | — | — |
| success | — | — | — | — | — |
| error | Erreur de chargement | XCircle | Réessayer | — | Re-fetch |
| offline | Données potentiellement obsolètes | WifiOff | Réessayer | — | Vérifier réseau |
| feature_verrouillee | Fonctionnalité premium | Lock | Découvrir le plan | — | — |
| abonnement_requis | Upgrade nécessaire | ArrowUp | Voir les plans | — | — |

**Desktop** : layout 12 colonnes, sidebar navigation.
**Tablette** : layout 8 colonnes, sidebar repliable.
**Mobile** : colonne unique, nav bottom.

### 2.5 Analyse et Résultats

| État | Message | Icône | Action principale | Action secondaire | Récupération |
|------|---------|-------|-------------------|-------------------|-------------|
| initial | — | — | — | — | — |
| loading | Analyse en cours… | Spinner | — | — | — |
| skeleton | — | Blocks | — | — | — |
| success | Résultats disponibles | Check | Voir le plan d'action | Nouveau test | — |
| error | Erreur d'analyse | XCircle | Réessayer | Saisie manuelle | Re-fetch |
| warning | Valeurs hors normes | AlertTriangle | Consulter les recommandations | — | — |
| critical | Eau dangereuse | AlertOctagon | Actions immédiates | — | — |
| feature_verrouillee | Mode Pro verrouillé | Lock | Passer en oasis | — | — |
| limite_atteinte | Quota de scans atteint | Ban | Saisie manuelle | — | Attendre |

**Desktop** : résultats en 2 colonnes (valeurs + plan).
**Tablette** : identique desktop.
**Mobile** : colonne unique, scroll vertical.

### 2.6 Historique et Rapports

| État | Message | Icône | Action principale | Action secondaire | Récupération |
|------|---------|-------|-------------------|-------------------|-------------|
| initial | — | — | — | — | — |
| loading | Chargement historique… | Spinner | — | — | — |
| skeleton | — | Blocks | — | — | — |
| empty | Aucun test enregistré | Inbox | Faire un test | — | — |
| success | — | — | — | — | — |
| error | Erreur de chargement | XCircle | Réessayer | — | Re-fetch |
| donnee_ancienne | Données > 24h | Clock | Actualiser | — | Re-fetch |
| feature_verrouillee | Historique limité à 14 jours | Lock | Passer en oasis | — | — |

**Desktop** : timeline + graphiques.
**Tablette** : identique desktop.
**Mobile** : timeline vertical, graphiques simplifiés.

### 2.7 Gestion Équipements

| État | Message | Icône | Action principale | Action secondaire | Récupération |
|------|---------|-------|-------------------|-------------------|-------------|
| initial | — | — | — | — | — |
| loading | Chargement équipements… | Spinner | — | — | — |
| skeleton | — | Blocks | — | — | — |
| empty | Aucun équipement | Inbox | Ajouter un équipement | — | — |
| success | — | — | — | — | — |
| error | Erreur de chargement | XCircle | Réessayer | — | Re-fetch |
| warning | Réassort nécessaire | AlertTriangle | Commander | — | — |
| critical | Équipement en panne | AlertOctagon | Contacter un pro | — | — |

**Desktop** : grille équipements + inventaire.
**Tablette** : identique desktop.
**Mobile** : liste vertical, détails en modal.

### 2.8 Dashboard Pro

| État | Message | Icône | Action principale | Action secondaire | Récupération |
|------|---------|-------|-------------------|-------------------|-------------|
| initial | — | — | — | — | — |
| loading | Chargement… | Spinner | — | — | — |
| skeleton | — | Blocks | — | — | — |
| empty | Aucune intervention planifiée | Inbox | Planifier une intervention | — | — |
| success | — | — | — | — | — |
| error | Erreur de chargement | XCircle | Réessayer | — | Re-fetch |
| warning | Interventions en retard | AlertTriangle | Voir le planning | — | — |

**Desktop** : layout 12 colonnes, stats + liste.
**Tablette** : layout 8 colonnes.
**Mobile** : colonne unique, nav bottom.

### 2.9 Dashboard Growth

| État | Message | Icône | Action principale | Action secondaire | Récupération |
|------|---------|-------|-------------------|-------------------|-------------|
| initial | — | — | — | — | — |
| loading | Chargement… | Spinner | — | — | — |
| skeleton | — | Blocks | — | — | — |
| empty | Aucun lead | Inbox | Créer un lead | — | — |
| success | — | — | — | — | — |
| error | Erreur de chargement | XCircle | Réessayer | — | Re-fetch |
| warning | Leads non qualifiés | AlertTriangle | Qualifier | — | — |

**Desktop** : layout 12 colonnes, pipeline + stats.
**Tablette** : layout 8 colonnes.
**Mobile** : colonne unique, nav bottom.

### 2.10 AQWELIA Brain

| État | Message | Icône | Action principale | Action secondaire | Récupération |
|------|---------|-------|-------------------|-------------------|-------------|
| initial | — | — | — | — | — |
| loading | Chargement timeline… | Spinner | — | — | — |
| skeleton | — | Blocks | — | — | — |
| empty | Aucune donnée Brain | Inbox | Faire un premier test | — | — |
| success | — | — | — | — | — |
| error | Erreur Brain | XCircle | Réessayer | — | Re-fetch |
| feature_verrouillee | Brain limité | Lock | Découvrir les fonctionnalités | — | — |

**Desktop** : timeline + métriques + recommandations.
**Tablette** : identique desktop.
**Mobile** : colonne unique, timeline vertical.

### 2.11 Paywall et Abonnement

| État | Message | Icône | Action principale | Action secondaire | Récupération |
|------|---------|-------|-------------------|-------------------|-------------|
| initial | — | — | — | — | — |
| loading | Vérification abonnement… | Spinner | — | — | — |
| success | Abonnement activé ! | Check | Accéder à la fonctionnalité | — | — |
| error | Erreur de paiement | XCircle | Réessayer | Contacter le support | — |
| action_en_cours | Paiement en cours… | Loader | — | — | — |
| action_echouee | Paiement refusé | XCircle | Réessayer | Changer de moyen | — |
| limite_atteinte | Fonctionnalité non incluse | Ban | Voir les plans | — | — |

**Desktop** : modal centrée, largeur max 500px.
**Tablette** : identique desktop.
**Mobile** : sheet plein écran.

### 2.12 Support et Paramètres

| État | Message | Icône | Action principale | Action secondaire | Récupération |
|------|---------|-------|-------------------|-------------------|-------------|
| initial | — | — | — | — | — |
| loading | Chargement… | Spinner | — | — | — |
| success | Paramètres sauvegardés | Check | — | — | — |
| error | Erreur de sauvegarde | XCircle | Réessayer | — | — |
| warning | Données non sauvegardées | AlertTriangle | Sauvegarder | Annuler | — |

**Desktop** : layout 2 colonnes (menu + contenu).
**Tablette** : identique desktop.
**Mobile** : menu en modal, contenu pleine largeur.

---

## 3. ÉTATS PAR ÉCRAN MAÎTRE

| Écran | initial | loading | skeleton | empty | success | warning | critical | error | offline | locked | upgrade | limit |
|-------|---------|---------|----------|-------|---------|---------|----------|-------|---------|--------|---------|-------|
| WEB-HOME-001 | — | — | — | — | — | — | — | — | — | — | — | — |
| WEB-PRICE-001 | — | — | — | — | — | — | — | — | — | — | — | — |
| APP-HOME-001 | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| SYS-SCAN-001 | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | ✅ |
| SYS-ACTION-001 | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | ✅ | — | — | ✅ | — |
| PRO-LAND-001 | — | — | — | — | — | — | — | — | — | — | — | — |
| PRO-DASH-001 | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | ✅ | ✅ | — | — | — |
| APP-TECH-001 | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | ✅ | ✅ | — | — | — |
| GROW-LAND-001 | — | — | — | — | — | — | — | — | — | — | — | — |
| GROW-DASH-001 | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | ✅ | ✅ | — | — | — |
| WEB-TECH-001 | — | — | — | — | — | — | — | — | — | — | — | — |
| PRO-PRICE-001 | — | — | — | — | — | — | — | — | — | — | — | — |

---

## 4. DIFFÉRENCES MOBILE / DESKTOP

| État | Desktop | Mobile |
|------|---------|--------|
| loading | Spinner centré | Spinner centré |
| skeleton | Blocks layout colonnes | Blocks layout colonne unique |
| empty | CTA centré + illustration | CTA centré, illustration réduite |
| error | Message + bouton réessayer | Message + bouton réessayer |
| warning | Bannière en haut | Bannière pleine largeur |
| critical | Overlay + action immédiate | Sheet plein écran + action |
| locked | Badge + CTA upgrade | Badge + CTA upgrade |
| offline | Bannière sticky top | Bannière sticky top |

---

## 5. COMPOSANTS ÉTATS RÉUTILISABLES

| Composant | Utilisation | Fichier |
|-----------|-------------|---------|
| `Skeleton` | État skeleton | `ui/skeleton.tsx` |
| `Alert` | États warning/critical | `ui/alert.tsx` |
| `Sonner` | États success/error | `ui/sonner.tsx` |
| `OfflineBanner` | État offline | `offline-banner.tsx` |
| `EmergencyMode` | État critical | `emergency-mode.tsx` |
| `ModulePaywall` | États locked/upgrade | `module-paywall.tsx` |
