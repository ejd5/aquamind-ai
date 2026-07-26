# P1 Scientific Quality — Tranche D : persistance et provenance

## Statut

Cette tranche est empilée au-dessus de la PR #58.

Ordre actuel :

1. #55 — P1-Mobile ;
2. #56 — qualité des mesures et LSI strict ;
3. #57 — objectifs contextuels ;
4. #58 — sécurité baignade et disponibilité des dosages ;
5. cette tranche — persistance scientifique et limites fabricant.

Aucune fusion automatique.

## Objectifs

1. Persister toutes les entrées indispensables au LSI strict.
2. Conserver la date réelle et la méthode d’acquisition d’une mesure.
3. Rendre les scores et versions scientifiques auditables dans le temps.
4. Conserver les limites fabricant au niveau du bassin plutôt que dans une requête isolée.
5. Maintenir une parité stricte entre SQLite et PostgreSQL.
6. Ajouter uniquement des migrations incrémentales, sans modifier la baseline PostgreSQL déjà déployée.

## Schéma `PoolProfile`

Nouveaux champs facultatifs :

- `manufacturerSaltMin` — minimum de sel documenté par l’équipement, en g/L ;
- `manufacturerSaltMax` — maximum de sel documenté par l’équipement, en g/L ;
- `manufacturerChlorineMax` — limite haute documentée par la notice produit, en mg/L.

Règles d’écriture :

- les valeurs doivent être numériques et non négatives ;
- les deux bornes de sel doivent être renseignées ou supprimées ensemble ;
- le maximum de sel doit être strictement supérieur au minimum ;
- une limite peut être supprimée explicitement avec `null` ;
- aucune cible universelle n’est créée lorsque la notice est absente.

## Schéma `WaterTest`

Nouveaux champs :

- `totalDissolvedSolids` — TDS en mg/L ;
- `measuredAt` — instant réel de la mesure ;
- `measurementMethod` — méthode d’acquisition normalisée ;
- `measurementMetadata` — métadonnées JSON filtrées ;
- `scientificQualityScore` — score déterministe de qualité des données ;
- `scientificMethodVersion` — version du calcul de qualité ;
- `scientificLimitations` — limitations structurées au moment de l’analyse ;
- `lsiMethodVersion` — version de la formule LSI.

Méthodes autorisées :

- `manual` ;
- `kit_drop` ;
- `strip` ;
- `photometer` ;
- `probe` ;
- `device` ;
- `imported`.

Les anciennes sources restent compatibles :

- `strip_photo` devient `strip` ;
- `device` reste `device` ;
- `imported` reste `imported` ;
- toute autre source historique devient `manual` si aucune méthode explicite n’est fournie.

## Métadonnées de mesure

Seules les clés suivantes sont conservées :

- marque et modèle de l’appareil ;
- identifiant de l’appareil ;
- date de calibration ;
- numéro de lot ;
- opérateur ;
- classe de précision ;
- système d’unités.

Les valeurs imbriquées et clés non autorisées sont supprimées. La taille sérialisée est limitée. Les tableaux et formats non objets sont refusés.

## Date de mesure

- si `measuredAt` manque, l’instant de soumission est utilisé ;
- une date invalide est refusée ;
- une date située à plus de cinq minutes dans le futur est refusée ;
- `createdAt` continue de représenter l’enregistrement dans AQWELIA ;
- `measuredAt` représente l’instant scientifique de l’observation.

## Schéma `ActionPlan`

Nouveaux champs :

- `scientificMethodVersion` ;
- `dosageMethodVersion` ;
- `swimSafetyMethodVersion`.

Ces champs rendent le résultat reproductible même après une évolution future des règles.

## Migrations

Migration : `20260726170000_scientific_measurement_persistence`.

Deux versions parallèles sont ajoutées :

- SQLite : `prisma/migrations/.../migration.sql` ;
- PostgreSQL : `prisma/postgresql/migrations/.../migration.sql`.

La baseline PostgreSQL demeure immuable. La migration PostgreSQL utilise `DOUBLE PRECISION` et `TIMESTAMP(3)` ; la migration SQLite utilise `REAL` et `DATETIME`.

## API

### Profil bassin

`POST` et `PATCH /api/pool/profile` valident et persistent les limites fabricant.

### Test d’eau

`POST /api/pool/water-test` :

- utilise les limites fabricant persistées du bassin ;
- persiste le TDS et la provenance ;
- persiste le score, les limitations et les versions scientifiques ;
- persiste les versions de méthode du plan ;
- renvoie `measurementProvenance` dans la réponse ;
- renvoie une erreur `400` structurée pour une provenance invalide.

Pour un plan sans accès Pro, le détail du LSI et sa version restent masqués, conformément au feature gate existant.

## Contrôles

- synchronisation automatique du schéma PostgreSQL depuis le schéma canonique SQLite ;
- validation Prisma des deux clients ;
- contrôle structurel de la migration PostgreSQL ;
- exécution réelle de la migration SQLite sur une base temporaire ;
- tests de provenance et de compatibilité des sources ;
- tests des limites fabricant ;
- suite complète et build de production.

## Limites conservées

- la précision et l’âge d’une mesure sont persistés mais ne modifient pas encore le score scientifique ;
- la calibration n’est pas encore vérifiée contre une durée de validité par appareil ;
- les caractéristiques fabricant restent rattachées au bassin et non à une fiche équipement dédiée ;
- le dosage de sel générique demeure bloqué jusqu’à un recalcul depuis la plage réelle ;
- les coefficients chimiques restent à auditer selon la concentration active de chaque produit.

## Tranche suivante

1. Décote du score selon l’âge, la méthode et la calibration.
2. Fiche équipement scientifique avec plages et documents fabricant.
3. Recalcul du sel depuis une cible documentée.
4. Bibliothèque de formulations produit versionnée.
5. Affichage clair des preuves et limites dans les écrans web et mobile.

## Conditions avant fusion

- migrations SQLite et PostgreSQL validées ;
- lint ;
- TypeScript ;
- contrats scientifiques A+B+C+D ;
- suite complète ;
- build de production ;
- absence de régression des PR #55 à #58 ;
- PR en brouillon et sans fusion automatique.
