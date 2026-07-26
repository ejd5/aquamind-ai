# P1 Scientific Quality — Tranche A

## Statut

Cette tranche est empilée au-dessus de P1-Mobile. Elle doit être rebasée ou retargetée vers `main` après la fusion de la PR mobile.

Elle ne modifie pas encore les coefficients chimiques historiques. Elle ajoute la couche de preuve, de qualité et de prudence nécessaire avant de réviser ces coefficients produit par produit.

## Objectifs

1. Ne plus afficher une confiance fixe de 90 % quelle que soit la qualité des données.
2. Refuser les valeurs impossibles ou manifestement corrompues.
3. Détecter les incohérences entre chlore libre, chlore total et chlore combiné.
4. Ne plus calculer le LSI avec une température silencieusement supposée.
5. Utiliser une formule LSI identifiée et versionnée.
6. Distinguer une estimation générique de dosage d'une instruction fabricant.
7. Exposer les mesures manquantes et les limites du résultat à l'API.

## Qualité scientifique des mesures

Méthode : `scientific-quality-v1`.

Le score varie de 0 à 1. Il décrit la complétude, la plausibilité et la cohérence des mesures. Il ne représente pas une probabilité statistique que le diagnostic soit exact.

Pondération initiale :

| Mesure | Poids |
|---|---:|
| pH | 0,25 |
| chlore libre | 0,20 |
| alcalinité / TAC | 0,15 |
| température | 0,10 |
| dureté calcium | 0,10 |
| acide cyanurique / CYA | 0,10 |
| chlore combiné | 0,05 |
| matières dissoutes totales / TDS | 0,05 |

Niveaux :

- `high` : score supérieur ou égal à 0,85 ;
- `medium` : score supérieur ou égal à 0,65 ;
- `low` : score supérieur ou égal à 0,40 ;
- `insufficient` : score inférieur à 0,40.

Garde-fous :

- un pH invalide force le score à zéro ;
- une mesure de désinfectant absente plafonne la confiance ;
- un volume absent ou invalide interdit le dosage ;
- les incohérences chlore libre / total / combiné réduisent le score ;
- les mesures non plausibles sont listées, jamais corrigées silencieusement.

## LSI strict

Méthode : `epa-phs-9.3-v1`.

Relation utilisée :

```text
LSI = pH - pHs
pHs = (9.3 + A + B) - (C + D)
A = (log10(TDS) - 1) / 10
B = -13.12 × log10(température °C + 273) + 34.55
C = log10(dureté calcium en CaCO3) - 0.4
D = log10(alcalinité totale en CaCO3)
```

Entrées obligatoires :

- pH ;
- température ;
- dureté calcium exprimée en mg/L comme CaCO3 ;
- alcalinité totale exprimée en mg/L comme CaCO3 ;
- TDS exprimé en mg/L.

Le calcul renvoie `null` si une entrée manque ou est invalide. Aucune température par défaut et aucun TDS estimé ne sont injectés.

## Dosages

Méthode actuelle : `generic-product-estimate-v1`.

Chaque dosage renvoyé par le plan qualifié porte désormais :

- `basis: generic_estimate` ;
- `methodVersion: generic-product-estimate-v1` ;
- `requiresProductLabelVerification: true`.

Cela signifie que la quantité reste une estimation générique fondée sur les coefficients AQWELIA existants. La concentration, la formulation et les instructions du produit réel restent prioritaires.

## API de test d'eau

`POST /api/pool/water-test` renvoie désormais :

- `scientificQuality` pour tous les plans ;
- un niveau de confiance dynamique persisté dans `ActionPlan.confidence` ;
- les métadonnées de méthode des dosages ;
- pour le mode Pro, `lsiCalculation` avec valeur, pH de saturation, entrées manquantes ou invalides et version de méthode.

Le champ `totalDissolvedSolids` peut être fourni dans la requête pour le calcul strict. Il n'est pas encore persisté dans `WaterTest` dans cette tranche.

## Limites explicitement conservées

- Les coefficients de dosage n'ont pas encore été validés par formulation et concentration commerciale.
- Les plages cibles doivent encore être contextualisées selon piscine, spa, désinfectant, présence de CYA et spécifications de l'électrolyseur.
- Le TDS n'est pas encore stocké dans les schémas SQLite et PostgreSQL.
- La qualité temporelle n'est pas encore calculée : âge de la mesure, type de test, calibration de sonde et précision de bandelette.
- Le Clear Water Index reste un indice AQWELIA distinct du score de qualité des données.

## Tranche B prévue

1. Migration SQLite et PostgreSQL pour TDS, origine, date de mesure et précision.
2. Confiance liée à l'âge et au mode d'acquisition de chaque mesure.
3. Plages cibles contextualisées par bassin, traitement et CYA.
4. Dosages différés lorsque les préconditions ne sont pas satisfaites.
5. Bibliothèque versionnée de formulations produit et concentrations actives.
6. Traçabilité des sources scientifiques et revue humaine des changements de règles.

## Conditions avant fusion

- lint ;
- TypeScript ;
- tests scientifiques ciblés ;
- suite complète de tests ;
- build Next.js de production ;
- aucune régression P1-Mobile ;
- revue du contrat LSI et des unités ;
- PR maintenue en brouillon tant que la branche mobile n'est pas fusionnée.
