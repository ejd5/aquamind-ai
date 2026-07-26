# P1 Scientific Quality — Tranche E : confiance liée à la provenance

## Statut

Cette tranche est empilée au-dessus de la PR #59.

Elle ne modifie ni les plages chimiques ni les coefficients de dosage. Elle transforme la provenance persistée en un score de confiance explicable.

## Deux notions distinctes

### Qualité brute des mesures

`scientific-quality-v1` évalue :

- la complétude ;
- la plausibilité ;
- la cohérence interne ;
- la présence du désinfectant attendu ;
- la possibilité de calculer le LSI et les dosages.

### Confiance opérationnelle

`measurement-confidence-v1` applique ensuite trois facteurs :

- fraîcheur de la mesure ;
- méthode d’acquisition ;
- preuve de calibration pour les appareils instrumentés.

Le résultat n’est pas une probabilité statistique. Il s’agit d’une politique opérationnelle AQWELIA versionnée et transparente.

## Fraîcheur

Les facteurs sont :

| Âge de la mesure | Facteur |
|---|---:|
| jusqu’à 6 heures | 1,00 |
| plus de 6 à 12 heures | 0,90 |
| plus de 12 à 24 heures | 0,75 |
| plus de 24 à 72 heures | 0,50 |
| plus de 72 heures | 0,25 |

Cette politique est cohérente avec la recommandation CDC de vérifier le pH et le désinfectant au moins deux fois par jour, et plus souvent en cas de forte fréquentation. Elle ne prétend pas remplacer une réglementation locale ou un plan de contrôle professionnel.

Une date future de plus de cinq minutes est déjà rejetée par la normalisation de provenance. Si une entrée future atteint directement le moteur de confiance, son facteur de fraîcheur devient zéro.

## Méthode d’acquisition

| Méthode | Facteur |
|---|---:|
| photomètre | 1,00 |
| kit gouttes | 0,95 |
| sonde ou appareil | 0,95 |
| bandelette | 0,80 |
| import | 0,80 |
| méthode manuelle non précisée | 0,75 |

Ces facteurs expriment le niveau de preuve disponible dans AQWELIA. Ils ne constituent pas une certification de précision métrologique d’un appareil ou d’une marque.

## Calibration

Pour `photometer`, `probe` et `device` :

- calibration documentée et antérieure à la mesure : facteur 1,00 ;
- calibration non documentée : facteur 0,85 ;
- date invalide ou postérieure à la mesure : facteur 0,65.

AQWELIA ne fixe pas de durée universelle de validité. L’intervalle de calibration reste celui du fabricant et de la procédure d’exploitation. Même avec une date présente, `manufacturerCalibrationIntervalVerified` reste `false` tant qu’une règle équipement dédiée n’a pas été vérifiée.

## Calcul

```text
confiance finale = qualité brute × fraîcheur × méthode × calibration
```

Le résultat est arrondi à deux décimales et borné entre 0 et 1.

Niveaux :

- `high` : au moins 0,85 ;
- `medium` : au moins 0,65 ;
- `low` : au moins 0,40 ;
- `insufficient` : inférieur à 0,40.

## Compatibilité

Un appel interne historique qui ne fournit pas de provenance conserve le score brut sans décote, avec `provenanceApplied: false`. Les appels de l’API de test d’eau fournissent toujours la provenance normalisée et utilisent le score ajusté.

## Plan d’action

`generateScientificallyQualifiedActionPlan` renvoie désormais :

- `scientificQuality` — qualité brute ;
- `scientificConfidence` — score ajusté et facteurs ;
- `confidence` — valeur finale ajustée ;
- `confidenceLevel` — niveau final.

## Persistance et API

`POST /api/pool/water-test` :

- persiste le score final dans `scientificQualityScore` ;
- persiste `measurement-confidence-v1` dans `scientificMethodVersion` ;
- combine les limitations de qualité et de provenance ;
- persiste la version de confiance dans `ActionPlan.scientificMethodVersion` ;
- renvoie séparément `scientificQuality` et `scientificConfidence` ;
- transmet l’âge de la mesure aux événements analytiques.

## Sources de politique

- CDC Healthy Swimming : pH et désinfectant à contrôler au moins deux fois par jour, plus souvent en cas de forte utilisation ;
- procédures EPA de mesure de qualité de l’eau : calibration des instruments selon les procédures et instructions fabricant.

## Limites conservées

- aucun intervalle de calibration n’est encore chargé depuis une fiche équipement ;
- la classe de précision est persistée mais ne modifie pas encore le facteur ;
- les lots de bandelettes ou réactifs ne sont pas encore vérifiés contre une date d’expiration ;
- les sondes continues n’ont pas encore de modèle de dérive spécifique ;
- l’interface doit encore afficher clairement les trois facteurs et leurs limitations.

## Tranche suivante

1. Fiche équipement et procédure fabricant versionnée.
2. Intervalle de calibration par modèle.
3. Expiration des réactifs et numéros de lots.
4. Modèle de dérive pour les sondes continues.
5. Affichage des preuves et facteurs dans les interfaces web et mobile.

## Conditions avant fusion

- lint ;
- TypeScript ;
- contrats A à E ;
- suite complète ;
- build de production ;
- aucune régression des PR #55 à #59 ;
- PR en brouillon et sans fusion automatique.
