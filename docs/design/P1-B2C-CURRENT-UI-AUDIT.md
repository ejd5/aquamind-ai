# AQWELIA — Audit UI actuel des six écrans B2C

Date : 26 juillet 2026  
Base auditée : `main` au commit `69180ce99094d92c811abd31a369882f974b4dd9`

## 1. Conclusion générale

Les six parcours prioritaires existent déjà et sont fonctionnellement plus avancés que les maquettes de vision :

- données réelles ;
- offline et reprise réseau ;
- caméra native ;
- confiance IA ;
- correction manuelle du scan ;
- plans d’action déterministes ;
- historique ;
- Stripe et RevenueCat ;
- sept langues ;
- états de chargement et d’erreur.

Le chantier P1 ne doit donc pas reconstruire le produit. Il doit :

1. simplifier la hiérarchie ;
2. extraire les composants partagés ;
3. supprimer les styles codés en dur ;
4. renforcer les états de données insuffisantes ;
5. distinguer score, fraîcheur et confiance ;
6. appliquer la direction premium aux six écrans ;
7. conserver toutes les règles métier et feature gates.

## 2. Design system existant

### Tokens déjà présents

`src/app/globals.css` contient déjà la palette de la vision :

- Lagoon `#18CFC3` ;
- Aqua `#72E8DF` ;
- Deep Teal `#073C45` ;
- Night `#061F2B` ;
- Mist `#EAFBF8` ;
- Silver `#A8BDC1` ;
- Ivory `#FAFCFB` ;
- Champagne `#C6A56B`.

Des variantes sombres, rayons et ombres AQWELIA existent également.

### Typographie

- Geist est chargé pour l’interface ;
- Playfair Display est chargé et alimente actuellement `font-display` ;
- Cormorant Garamond est déclaré comme token mais n’est pas chargé par `next/font` ;
- l’activation de Cormorant doit être explicite et limitée aux grands chiffres, prix et titres premium, sans remplacer aveuglément toute la typographie.

### Dette actuelle

Deux systèmes coexistent :

- tokens shadcn et anciens tokens Oceanic Luxury ;
- tokens de marque `--aqwelia-*`.

De nombreuses classes utilisent encore :

- des couleurs OKLCH codées directement ;
- `gold` pour des teintes qui sont en réalité turquoise ;
- des gradients différents pour une même signification ;
- des styles répétés entre les modules.

Décision : ne pas supprimer brutalement le système historique. Les nouveaux composants P1 utilisent les tokens AQWELIA nommés, puis les anciens styles sont migrés progressivement.

## 3. Accueil actuel

Fichier principal : `src/components/aquamind/module-dashboard.tsx`.

### Ce qui existe

- indice eau claire ;
- libellé de clarté ;
- date du dernier test ;
- sécurité baignade ;
- première action immédiate ;
- délai du prochain re-test ;
- actions rapides ;
- cinq paramètres récents ;
- tendance pH ;
- alertes ;
- météo ;
- rappels ;
- prédictions ;
- widgets stock, stories, économies, gamification, hivernage et bilan annuel ;
- données hors ligne et état cache ;
- multi-bassin.

### Forces

- les trois informations essentielles existent déjà ;
- la navigation vers diagnostic, test, urgence et assistant est en place ;
- les états chargement, erreur et absence de mesure existent ;
- le score est calculé côté métier et non inventé dans l’UI.

### Problèmes

- trop d’éléments concurrencent le score et l’action principale ;
- `PredictionsWidget` précède actuellement le bloc principal ;
- quatre actions rapides et de nombreux widgets apparaissent au même niveau ;
- le composant `Gauge` mélange rendu, couleurs et logique d’état ;
- les gradients sont codés en dur ;
- `clearWaterIndex ?? 0` transforme l’absence éventuelle de score en zéro ;
- aucune confiance des données n’est affichée ;
- aucune distinction forte entre score incomplet et score complet ;
- des journaux `console.log('[DEBUG] ...')` restent dans le chargement client ;
- les raisons de sécurité baignade issues de la base peuvent être affichées sans traduction structurée dans certains cas.

### Décision de refonte

Le premier viewport mobile doit contenir :

1. identité du bassin et fraîcheur ;
2. anneau principal ;
3. confiance des données ;
4. sécurité baignade ;
5. une action prioritaire ;
6. accès test/scan.

Les prédictions, météo, rappels et widgets de fidélisation deviennent secondaires, sous le premier viewport ou dans des sections repliables.

## 4. Score de qualité de l’eau

Fichier : `src/lib/pool/water-balance.ts`.

### Formule actuelle

`calculateClearWaterIndex` :

- démarre à 100 ;
- retire 10 pour un avertissement ;
- retire 25 pour une valeur critique ;
- retire 15 pour le chlore combiné élevé ;
- retire 15 pour les phosphates élevés ;
- ne pénalise pas les paramètres optionnels absents.

### Conséquence

Un test ne contenant que le pH peut produire un score élevé, alors que la qualité globale de l’eau n’est pas suffisamment documentée.

### Règle P1

Ne pas modifier la formule dans la PR visuelle.

L’interface doit calculer ou recevoir séparément un **niveau de confiance des données**, fondé au minimum sur :

- paramètres présents ;
- paramètres critiques présents ;
- fraîcheur ;
- origine de la donnée ;
- confiance du scan lorsqu’il existe ;
- incohérences détectées.

Affichage prévu :

- score élevé + confiance élevée ;
- score élevé + confiance moyenne ;
- état provisoire + confiance faible ;
- données insuffisantes sans score précis lorsque les prérequis ne sont pas remplis.

La création de la formule de confiance relève d’un lot métier/scientifique séparé ou d’un contrat d’API dédié, pas d’un simple changement CSS.

## 5. Diagnostic photo actuel

Fichier : `src/components/aquamind/module-diagnostic.tsx`.

### Ce qui existe

- photo native et galerie ;
- import web ;
- limite de taille ;
- sélection du type d’image ;
- contrôle offline ;
- appel IA ;
- confiance ;
- résumé ;
- problèmes détectés et probables ;
- étape recommandée ;
- avertissements de sécurité ;
- données manquantes ;
- transparence IA ;
- génération d’un plan lié au diagnostic ;
- historique, réouverture et suppression.

### Forces

- données et états réels ;
- transparence IA déjà intégrée ;
- prudence avec confiance et données manquantes ;
- parcours natif déjà présent ;
- historique fonctionnel.

### Problèmes

- la photo et le résultat sont séparés en deux cartes peu immersives ;
- aucune structure d’annotations visuelles n’est actuellement exposée par le type `DiagnosticResult` ;
- les maquettes montrent des annotations sur image qui ne peuvent pas être inventées sans données de coordonnées ;
- la confiance est une barre générique, peu contextualisée ;
- l’historique est long et concurrence le résultat courant ;
- plusieurs motifs de couleur sont codés en dur ;
- le résultat et le plan peuvent donner une page très longue.

### Décision de refonte

- conserver le parcours fonctionnel ;
- donner la priorité à l’image et au résultat courant ;
- afficher confiance, limites et CTA vers le plan dans le même bloc ;
- replier ou déplacer l’historique ;
- ne pas ajouter de fausses annotations ;
- prévoir une future structure API d’annotations seulement si le modèle fournit des zones fiables.

## 6. Scan bandelette actuel

Fichier : `src/components/aquamind/strip-scanner.tsx`.

### Ce qui existe

- guide en trois étapes ;
- caméra et galerie ;
- analyse ;
- marque détectée ;
- qualité de l’image ;
- confiance globale ;
- confiance par paramètre ;
- normalisation multilingue ;
- plage cible ;
- statut par paramètre ;
- correction manuelle ;
- quota ;
- sauvegarde ;
- erreurs et cas sans bandelette.

### Forces

Ce parcours couvre déjà presque toutes les exigences fonctionnelles des maquettes.

### Problèmes

- modal très dense ;
- hauteur maximale et scroll interne complexes sur petits téléphones ;
- styles de qualité/confiance répétés ;
- réponse brute du VLM visible aux utilisateurs avancés, à reconsidérer pour la version Production ;
- bouton de sauvegarde reste actif avec une confiance globale faible dès lors qu’un paramètre est mappé ;
- aucune étape de validation explicite des paramètres critiques avant sauvegarde ;
- libellé de fermeture `aria-label="Close"` non traduit ;
- plusieurs types utilisent `any`.

### Décision de refonte

- transformer le parcours en séquence mobile claire ;
- conserver la correction par paramètre ;
- ajouter un résumé des paramètres critiques manquants ;
- distinguer « Enregistrer les valeurs » de « Générer le plan » ;
- garder la réponse brute hors du parcours grand public ;
- utiliser les composants partagés de confiance et de statut.

## 7. Plan d’action actuel

Fichier : `src/components/aquamind/module-action-plan.tsx`.

### Ce qui existe

- diagnostic ;
- sévérité ;
- sécurité baignade ;
- actions immédiates ordonnées ;
- confirmation/exécution via `BrainActionTracker` ;
- re-test ;
- filtration ;
- coût ;
- appel professionnel ;
- dosages ;
- méthodes ;
- avertissements ;
- actions interdites ;
- PDF ;
- régénération ;
- offline.

### Forces

- moteur métier très complet ;
- ordre des actions déjà matérialisé ;
- suivi de l’exécution existant ;
- sécurité et interdictions visibles ;
- droits PDF respectés.

### Problèmes

- absence d’un badge explicite expliquant le calcul déterministe ;
- timeline visuelle limitée à une liste numérotée ;
- synthèse, diagnostic, sécurité, actions, dosages et interdictions créent une page longue ;
- unités et coûts arrivent sous forme de chaînes déjà formatées ;
- `confidence` du plan existe dans le type mais n’est pas mise en avant ;
- l’icône `Sparkles` peut laisser penser que tout le plan est génératif ;
- styles de statut codés en dur.

### Décision de refonte

- ajouter `DeterministicCalculationBadge` ;
- séparer diagnostic interprété et calculs ;
- transformer les actions en vraie timeline ;
- mettre les interdictions critiques avant les informations secondaires ;
- conserver `BrainActionTracker` ;
- afficher la confiance de manière contextualisée ;
- ne jamais utiliser `0 % IA`.

## 8. Suivi actuel

Fichier : `src/components/aquamind/module-health-log.tsx`.

### Ce qui existe

- tendance pH ;
- évolution de l’indice ;
- historique des tests ;
- historique des diagnostics ;
- statut baignade ;
- source ;
- suppression offline ;
- PDF ;
- cache.

### Forces

- données réelles et historique disponibles ;
- les deux graphiques principaux existent ;
- les feature gates PDF sont respectés.

### Problèmes

- graphiques SVG/barres construits directement dans le module ;
- couleurs et seuils répétés ;
- période limitée implicitement aux vingt derniers tests, sans contrôle utilisateur ;
- pas de résumé textuel complet pour l’accessibilité ;
- pas de superposition claire entre traitements, météo et évolution ;
- absence d’un niveau de confiance historique ;
- `activePoolId` n’est pas clairement utilisé dans les appels de chargement des tests et diagnostics du composant actuel ;
- aucune distinction entre absence de valeur et valeur zéro dans tous les graphiques n’est garantie.

### Décision de refonte

- extraire `WaterTrendChart` ;
- ajouter un résumé textuel ;
- rendre la période explicite ;
- vérifier le scoping multi-bassin avant modification visuelle ;
- conserver les valeurs manquantes comme lacunes, jamais comme zéro ;
- ajouter les événements traitement/météo dans une itération ultérieure.

## 9. Paywall actuel

Fichier : `src/components/aquamind/module-paywall.tsx`.

### Ce qui existe

- plans chargés depuis l’API ;
- source canonique des durées et mappings ;
- prix selon la durée ;
- Stripe web ;
- RevenueCat natif ;
- restauration d’achat ;
- gestion d’abonnement ;
- comparaison des fonctionnalités ;
- FAQ ;
- plan courant ;
- analytics après consentement.

### Forces

- la logique commerciale est réelle et centralisée ;
- aucune nécessité de reconstruire la facturation ;
- distinction web/mobile déjà en place ;
- restauration présente.

### Problèmes

- trois plans payants sont présentés simultanément, alors que la maquette de vision montre un paywall contextuel AQWELIA Pool ;
- l’utilisateur reçoit beaucoup de comparaison avant une recommandation personnalisée ;
- durée par défaut `halfyear` à vérifier stratégiquement ;
- certaines chaînes de prix sont formatées manuellement au lieu d’utiliser systématiquement `Intl.NumberFormat` ;
- le hero et les cartes emploient plusieurs gradients historiques ;
- un essai de 14 jours ne doit pas être ajouté sans configuration réelle ;
- l’offre affichée doit dépendre du contexte bassin/spa et du plan courant.

### Décision de refonte

- conserver la page complète de comparaison ;
- créer un composant de paywall contextuel réutilisable pour le parcours après valeur ;
- recommander AQWELIA Pool dans le cas piscine simple ;
- permettre l’accès à la comparaison complète ;
- lire tous les prix et droits depuis les sources existantes ;
- n’afficher essai, remise ou économie que lorsque les données fournisseur le confirment.

## 10. Composants réutilisables à extraire en premier

Priorité fondation :

1. `ConfidenceBadge` ;
2. `DataFreshnessBadge` ;
3. `WaterQualityRing` ;
4. `WaterQualityHero` ;
5. `SwimSafetyStatus` ;
6. `DeterministicCalculationBadge` ;
7. `MetricStatusCard` ;
8. `ActionTimeline` ;
9. `WaterTrendChart` ;
10. `ContextualPaywall`.

Ces composants doivent rester sans logique réseau et recevoir leurs données par props.

## 11. Corrections techniques à inclure dans la fondation

- supprimer les `console.log` de debug du dashboard ;
- remplacer les couleurs OKLCH répétées par des tokens sémantiques ;
- charger Cormorant Garamond avec `next/font` si les références visuelles le confirment ;
- conserver Playfair pour les surfaces existantes pendant la migration ;
- traduire les labels ARIA ;
- réduire les `any` dans les composants touchés ;
- ne pas afficher `0` lorsque le score est absent ;
- rendre la fraîcheur et la confiance explicites ;
- vérifier le scoping multi-bassin du suivi ;
- sortir la réponse brute VLM du parcours public ;
- ne pas modifier la formule CWI dans le lot visuel.

## 12. Dépendance bloquante avant fidélité pixel

Les références produites par GLM sont annoncées localement mais ne sont pas dans GitHub.

Fichiers attendus :

```text
docs/design-vision/board.png
docs/design-vision/screen-1.png
docs/design-vision/screen-2.png
docs/design-vision/screen-3.png
docs/design-vision/screen-4.png
docs/design-vision/screen-5.png
docs/design-vision/screen-6.png
docs/design-vision/screens.html
```

Le texte GLM parle de sept fichiers alors que cette liste en compte huit. Le nombre et les noms doivent être vérifiés lors de l’import.

Sans ces fichiers, une fondation fonctionnelle peut être préparée, mais une promesse de reproduction pixel-fidèle serait trompeuse.

## 13. Découpage d’exécution recommandé

### P1-A — Fondation visuelle

- importer les références ;
- charger la typographie ;
- créer les tokens sémantiques ;
- extraire confiance, fraîcheur, anneau, sécurité et badge déterministe ;
- aucune modification du moteur métier.

### P1-B — Accueil

- premier viewport simplifié ;
- action prioritaire ;
- données insuffisantes ;
- widgets secondaires déplacés ;
- scoping multi-bassin conservé.

### P1-C — Diagnostic et scan

- composition centrée image/résultat ;
- séquence scan ;
- correction manuelle ;
- confiance et limites.

### P1-D — Plan d’action

- timeline ;
- badge déterministe ;
- confirmation humaine ;
- sécurité priorisée.

### P1-E — Suivi

- graphiques partagés ;
- période ;
- accessibilité ;
- multi-bassin.

### P1-F — Paywall

- paywall contextuel ;
- page de comparaison conservée ;
- prix et entitlements réels ;
- recette Stripe/RevenueCat.

## 14. Critère de passage à l’implémentation

Le code P1-A peut démarrer dès que les références visuelles sont accessibles dans le dépôt ou fournies dans la conversation. Avant cela, aucune valeur de spacing, typographie ou composition ne doit être présentée comme pixel-fidèle.
