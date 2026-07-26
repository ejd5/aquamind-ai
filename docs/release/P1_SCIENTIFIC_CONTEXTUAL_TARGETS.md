# P1 Scientific Quality — Tranche B : objectifs contextuels

## Statut

Cette tranche est empilée au-dessus de la PR scientifique A, elle-même empilée au-dessus de P1-Mobile.

Elle ajoute un contexte scientifique sans encore modifier automatiquement les dosages historiques du plan d’action.

## Problèmes traités

Les plages statiques ne distinguaient pas suffisamment :

- piscine et spa ;
- chlore sans stabilisant et chlore avec CYA ;
- traitement au brome ;
- électrolyseur au sel avec ou sans plage fabricant documentée.

Le score scientifique exigeait également du chlore libre même lorsque le traitement déclaré était le brome.

## Méthode

Version : `cdc-operational-targets-v1`.

Les objectifs contextuels sont des plages d’exploitation et non des autorisations de dosage. Les instructions du fabricant et les règles locales restent prioritaires.

### pH

- minimum opérationnel : 7,0 ;
- plage préférée AQWELIA : 7,2 à 7,6 ;
- maximum opérationnel : 7,8.

### Chlore libre

- piscine sans CYA : minimum 1 mg/L ;
- piscine avec CYA : minimum 2 mg/L ;
- spa : minimum 3 mg/L ;
- la limite supérieure générique n’est pas inventée : elle reste liée à la notice fabricant.

### Brome

- plage opérationnelle : 3 à 8 mg/L ;
- la mesure attendue pour la qualité scientifique devient `bromine`, pas `freeChlorine`.

### Acide cyanurique

- la présence de CYA dans une piscine chlorée augmente le minimum de chlore libre ;
- le CYA n’est pas recommandé dans un spa ;
- le moteur renvoie une limitation structurée lorsqu’un spa contient une valeur CYA positive.

### Sel

- aucune cible de sel universelle n’est calculée ;
- sans plage fabricant, les quatre limites restent `null` avec la limitation `equipment_salt_range_required` ;
- une plage n’est publiée que lorsque les minimum et maximum de l’équipement sont fournis.

## API

`POST /api/pool/water-test` renvoie maintenant `contextualTargets` avec :

- version de méthode ;
- cible pH ;
- désinfectant attendu ;
- implication du CYA ;
- plage de sel documentée ou exigence de consulter la notice ;
- limitations et codes sources.

Le contexte utilise :

- `PoolProfile.treatmentType` ;
- `PoolProfile.saltSystem` ;
- `PoolProfile.waterBodyType` ;
- les mesures CYA et brome ;
- les bornes fabricant facultatives reçues dans la requête.

## Qualité des mesures

`scientific-quality-v1` est désormais contextuel :

- chlore ou sel : le désinfectant attendu est le chlore libre ;
- brome : le désinfectant attendu est le brome ;
- spa : l’absence de CYA ne réduit pas le score ;
- les pondérations sont normalisées selon les mesures pertinentes.

## Limites conservées

- la sécurité baignade historique n’est pas encore réécrite selon ces objectifs contextuels ;
- les textes d’alerte multilingues brome/spa doivent être ajoutés avant ce changement ;
- les dosages ne sont pas encore différés automatiquement lorsque la précondition contextuelle n’est pas satisfaite ;
- les bornes fabricant de l’électrolyseur ne sont pas persistées dans le profil ;
- le TDS reste non persisté dans cette tranche.

## Tranche suivante

1. Sécurité baignade contextuelle avec traductions dans les sept langues.
2. Préconditions de dosage et états `ready`, `deferred`, `not_calculable`.
3. Plage fabricant de sel persistée sur le profil équipement.
4. TDS et métadonnées de mesure persistés dans SQLite et PostgreSQL.
5. Revue des coefficients selon concentration active et formulation du produit.

## Validation requise

- lint ;
- TypeScript ;
- tests contextuels ;
- suite complète ;
- build de production ;
- aucune régression des PR #55 et #56 ;
- PR maintenue en brouillon et sans fusion automatique.
