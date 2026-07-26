# AQWELIA — P1 Design System Premium B2C

Statut : contrat d’implémentation  
Base : `main` au commit `69180ce99094d92c811abd31a369882f974b4dd9`

## 1. Objectif

Transformer les six écrans B2C prioritaires dans une direction premium cohérente, sans reconstruire toute l’application en une seule PR.

Écrans prioritaires :

1. Accueil / état de l’eau ;
2. Diagnostic photo ;
3. Scan bandelette ;
4. Plan d’action ;
5. Suivi et historique ;
6. Paywall AQWELIA Pool.

La première étape vise une reproduction très fidèle de la direction visuelle validée. Les autres écrans recevront ensuite le même langage visuel par composants partagés.

## 2. Principes produit

### Un indicateur principal

L’accueil doit mettre en avant un seul état global compréhensible, accompagné d’une action prioritaire.

Le score ne doit jamais être une valeur décorative ou figée. Il doit être relié à :

- la formule réellement utilisée ;
- la fraîcheur des mesures ;
- le nombre de paramètres disponibles ;
- les données manquantes ;
- un niveau de confiance ;
- une explication accessible.

Lorsque les données sont insuffisantes, l’interface doit afficher un état provisoire plutôt qu’un score artificiellement précis.

### La valeur avant la vente

Le paywall doit apparaître après une démonstration de valeur : résultat, diagnostic, plan ou historique utile. Il ne doit pas interrompre prématurément le parcours.

### L’IA reste explicable

L’interface distingue :

- interprétation et assistance IA ;
- calcul déterministe des dosages ;
- niveau de confiance ;
- contrôle et validation de l’utilisateur.

La formulation absolue `0 % IA` est interdite, car une valeur d’entrée peut provenir d’un scan assisté par IA.

Formulations recommandées :

- `Dosage calculé par moteur déterministe` ;
- `Calcul du dosage sans IA générative` ;
- `L’IA interprète, le moteur calcule`.

## 3. Direction visuelle

### ADN

- premium aquatique ;
- calme, précis et rassurant ;
- fond bleu nuit ;
- accent lagon pour l’eau, la progression et les actions ;
- champagne doux pour la valeur premium ;
- surfaces vitrées mesurées ;
- contraste fort ;
- chiffres majeurs très lisibles ;
- animations discrètes et utiles.

### Thèmes

Le thème sombre premium constitue la direction principale des écrans de démonstration.

Le produit doit également conserver :

- un mode clair haute lisibilité ;
- le respect du réglage système ;
- une lisibilité extérieure au bord d’une piscine ;
- des contrastes conformes aux exigences d’accessibilité.

Aucune information critique ne doit dépendre uniquement d’une couleur.

### Typographie

- typographie display premium pour les scores, prix et grands chiffres ;
- sans-serif lisible pour les contenus fonctionnels ;
- pas de police ajoutée sans vérification de performance, licence et cohérence avec le design system existant ;
- chargement optimisé et fallback explicite.

## 4. Écran 1 — Accueil

### Objectif

Répondre immédiatement à trois questions :

1. quel est l’état de mon eau ?
2. puis-je me baigner ?
3. quelle est l’unique action prioritaire aujourd’hui ?

### Composition

- en-tête compact ;
- anneau principal de qualité de l’eau ;
- score ou état provisoire ;
- libellé de confiance ;
- fraîcheur des données ;
- sécurité baignade ;
- une action principale ;
- météo et rappels en informations secondaires ;
- accès rapide au test ou au scan.

### États obligatoires

- données complètes ;
- données partielles ;
- aucune mesure ;
- mesure ancienne ;
- situation critique ;
- chargement ;
- erreur réseau ;
- accès limité par le plan.

## 5. Écran 2 — Diagnostic photo

### Objectif

Créer un moment de démonstration fort tout en restant prudent et transparent.

### Composition

- prise de photo ou import ;
- guide de cadrage ;
- aperçu de l’image ;
- annotations visuelles lorsque disponibles ;
- diagnostic principal ;
- niveau de confiance ;
- limites de l’analyse ;
- CTA vers le plan d’action ;
- possibilité de corriger ou compléter les informations.

### Règles

- aucun résultat fictif ;
- pas de diagnostic définitif si la confiance est faible ;
- transparence IA avant l’envoi ;
- traitement des refus caméra et galerie ;
- poids, format et erreurs de téléversement gérés ;
- données privées non affichées dans les exemples.

## 6. Écran 3 — Scan bandelette

### Objectif

Rendre la lecture de bandelette compréhensible, vérifiable et corrigible.

### Composition

- tutoriel de prise de vue ;
- bandelette détectée ;
- pastilles analysées une par une ;
- valeur lue et confiance par paramètre ;
- correction manuelle ;
- comparaison avec la plage cible ;
- validation avant génération du plan.

### Règles

- ne jamais masquer une confiance faible ;
- permettre la correction de chaque pastille ;
- ne pas générer un dosage tant que les données critiques ne sont pas validées ;
- gérer les bandelettes incompatibles ou illisibles.

## 7. Écran 4 — Plan d’action

### Objectif

Transformer les données en étapes simples, ordonnées et sûres.

### Composition

- résumé du problème ;
- badge `Dosage calculé par moteur déterministe` ;
- timeline ordonnée ;
- quantité, unité et produit générique ;
- précautions ;
- filtration ;
- délai de baignade ;
- heure ou délai du re-test ;
- actions interdites ;
- bouton de confirmation humaine ;
- suivi de l’exécution.

### Règles

- ordre chimique respecté ;
- unités cohérentes avec le bassin et le pays ;
- aucune promesse de résultat garanti ;
- notices fabricants prioritaires ;
- possibilité d’indiquer qu’un produit n’est pas disponible ;
- action critique distincte des conseils facultatifs.

## 8. Écran 5 — Suivi

### Objectif

Montrer une progression réelle et aider l’utilisateur à comprendre les tendances.

### Composition

- évolution sur une période sélectionnable ;
- historique des tests ;
- événements météo et traitements ;
- score avec niveau de confiance ;
- amélioration ou dégradation expliquée ;
- filtres par paramètre ;
- accès au rapport selon le plan.

### Règles

- graphiques accessibles ;
- unités visibles ;
- valeurs manquantes distinctes de zéro ;
- aucune extrapolation présentée comme mesure réelle ;
- historique limité ou verrouillé selon le plan canonique.

## 9. Écran 6 — Paywall AQWELIA Pool

### Objectif

Présenter une offre premium concrète, lisible et non agressive.

### Composition

- nom canonique `AQWELIA Pool` ;
- prix lu depuis `src/lib/billing/plans.ts` ;
- bénéfices liés au contexte de l’utilisateur ;
- mensualité et autres durées disponibles ;
- essai uniquement lorsqu’il est réellement configuré ;
- conditions de renouvellement ;
- restauration des achats sur mobile ;
- accès aux CGV et à la gestion de l’abonnement ;
- fermeture claire.

### Règles

- aucun prix en dur dans le composant ;
- aucun essai fictif ;
- aucune fausse urgence ;
- pas de confusion entre Stripe web et RevenueCat mobile ;
- fonctionnalités alignées avec les feature gates réels.

## 10. Composants partagés prévus

- `WaterQualityHero` ;
- `WaterQualityRing` ;
- `DataFreshnessBadge` ;
- `ConfidenceBadge` ;
- `SwimSafetyStatus` ;
- `PrimaryActionCard` ;
- `AiTransparencyNotice` ;
- `DeterministicCalculationBadge` ;
- `ScanParameterCard` ;
- `ActionTimeline` ;
- `WaterTrendChart` ;
- `PremiumPlanCard` ;
- `MobileScreenHeader` ;
- `EmptyState` ;
- `DataInsufficientState` ;
- `FeatureLockedState`.

Les noms pourront être adaptés après inspection des composants existants, mais les responsabilités doivent rester séparées.

## 11. Design tokens

Les tokens finaux doivent être intégrés dans la source de styles canonique, pas dupliqués dans chaque écran.

Familles attendues :

- `surface-night` ;
- `surface-elevated` ;
- `lagoon` ;
- `champagne` ;
- `success` ;
- `warning` ;
- `critical` ;
- `text-primary` ;
- `text-secondary` ;
- `border-subtle` ;
- rayons ;
- ombres ;
- espacements ;
- durées d’animation.

Les valeurs exactes seront comparées aux maquettes et aux tokens déjà présents avant modification.

## 12. Accessibilité

- tailles tactiles adaptées au mobile ;
- navigation clavier ;
- focus visible ;
- lecteurs d’écran ;
- contraste ;
- réduction des animations ;
- textes redimensionnables ;
- graphiques accompagnés d’un résumé textuel ;
- score et confiance annoncés séparément ;
- erreurs reliées aux champs concernés.

## 13. Internationalisation

Les six écrans doivent fonctionner dans les sept langues canoniques.

Prévoir :

- longueurs de texte variables ;
- prix et dates localisés ;
- unités ;
- pluriels ;
- retours à la ligne ;
- aucun texte métier codé en dur ;
- contrôle i18n obligatoire dans la CI.

## 14. Performance

- chargement différé des composants lourds ;
- images optimisées ;
- graphiques chargés seulement lorsque nécessaires ;
- animations respectant les appareils modestes ;
- pas de dépendance visuelle lourde sans justification ;
- stabilité du layout ;
- skeletons cohérents.

## 15. Contrat des assets

Les références visuelles doivent être stockées dans le dépôt sous :

```text
docs/design-vision/
  board.png
  screen-1.png
  screen-2.png
  screen-3.png
  screen-4.png
  screen-5.png
  screen-6.png
  screens.html
```

Avant toute implémentation pixel-fidèle :

- vérifier le nombre exact de fichiers ;
- conserver la source HTML ;
- documenter la taille des images ;
- ne pas inclure de secret ou donnée personnelle ;
- committer les assets sur la branche de design, pas directement sur `main`.

## 16. Découpage des PR

### PR A — Fondations

- assets ;
- tokens ;
- typographie ;
- composants de base ;
- états partagés ;
- aucun changement métier.

### PR B — Accueil et suivi

- écran Accueil ;
- écran Suivi ;
- données réelles ;
- tests et recette mobile.

### PR C — Diagnostic et bandelette

- photo ;
- scan ;
- confiance ;
- corrections manuelles.

### PR D — Plan d’action

- timeline ;
- moteur déterministe ;
- sécurité ;
- confirmation humaine.

### PR E — Paywall

- plans canoniques ;
- Stripe/RevenueCat ;
- restauration ;
- conditions.

Aucune PR ne doit transformer simultanément tout le B2C, le Pro et Growth OS.

## 17. Critères d’acceptation

- aucun chiffre fictif ;
- aucun prix dupliqué ;
- aucun texte `0 % IA` absolu ;
- score global documenté ou état provisoire ;
- données réelles ;
- six écrans responsive ;
- modes clair et sombre ;
- sept langues ;
- états vide, chargement, erreur et données insuffisantes ;
- accessibilité ;
- tests ;
- build production ;
- recette visuelle sur le preview exact ;
- aucune régression des feature gates.

## 18. Première étape d’exécution

1. intégrer les huit références visuelles dans `docs/design-vision/` ;
2. auditer les composants actuels correspondant aux six écrans ;
3. comparer les tokens existants aux maquettes ;
4. identifier les composants réutilisables et ceux à remplacer ;
5. produire le diff de fondation sans toucher encore aux règles métier.
