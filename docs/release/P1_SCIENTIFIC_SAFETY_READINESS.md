# P1 Scientific Quality — Tranche C : sécurité et disponibilité des dosages

## Statut

Cette tranche est empilée au-dessus de la tranche B des objectifs contextuels.

Ordre des PR :

1. #55 — P1-Mobile ;
2. #56 — qualité des mesures et LSI strict ;
3. #57 — objectifs contextuels piscine, spa, chlore, brome et sel ;
4. cette tranche — sécurité baignade contextuelle et disponibilité des dosages.

Aucune fusion automatique.

## Sécurité baignade contextuelle

Méthode : `cdc-swim-safety-v1`.

La conclusion n’utilise plus une seule plage de chlore pour tous les bassins. Elle s’appuie sur `cdc-operational-targets-v1` et le traitement déclaré.

### Règles

- pH inférieur à 6,5 ou supérieur à 8,2 : baignade interdite ;
- pH hors de la plage opérationnelle 7,0–7,8 : baignade déconseillée ;
- désinfectant attendu non mesuré : sécurité inconnue ;
- chlore libre sous le minimum contextuel : baignade interdite ;
- brome sous 3 mg/L ou au-dessus de 8 mg/L : baignade interdite ;
- chlore combiné supérieur à 0,4 mg/L : baignade interdite ;
- CYA positif dans un spa : baignade déconseillée et limitation explicite ;
- chlore au-dessus d’une limite fabricant fournie : baignade interdite ;
- sans limite fabricant, aucune limite haute générique de chlore n’est inventée.

### Langues

Les raisons structurées sont disponibles en :

- français ;
- anglais ;
- espagnol ;
- allemand ;
- italien ;
- portugais ;
- néerlandais.

Chaque raison contient un code stable, un message localisé et les paramètres mesurés.

## Disponibilité des dosages

Méthode : `dosage-readiness-v1`.

Chaque dosage reçoit un état :

- `ready` : les données minimales et les préconditions sont présentes ;
- `deferred` : le dosage doit être recalculé après une action préalable ;
- `not_calculable` : AQWELIA ne dispose pas des informations nécessaires ou le dosage n’est pas applicable.

### Principaux blocages

- volume invalide ;
- mesure indispensable absente ;
- traitement incompatible ;
- pH à rééquilibrer avant chloration ou anti-algues ;
- stabilisant non applicable dans un spa ;
- type de filtre absent ou incompatible pour un floculant ;
- plage de sel de l’équipement absente ;
- ancienne cible générique de sel à remplacer par un recalcul depuis la plage fabricant.

## Suppression des quantités actionnables

Lorsqu’un dosage est `deferred` ou `not_calculable` :

- `quantity` devient `—` ;
- `estimatedCost` devient `—` ;
- `calculationSuppressed` vaut `true` ;
- le moteur indique si un nouveau calcul est requis après la précondition.

Une action devenue non applicable, par exemple « ajouter du stabilisant » dans un spa ou « ajouter du sel » depuis une ancienne cible générique, est retirée de la liste immédiate.

Une action différée reste visible pour expliquer la séquence, mais aucune quantité ne peut être appliquée avant le nouveau calcul.

## API

`POST /api/pool/water-test` :

- persiste le statut de baignade contextuel ;
- renvoie `contextualSwimSafety` au niveau principal et dans le plan qualifié ;
- renvoie la disponibilité de chaque dosage dans `chemicalDosages[].readiness` ;
- accepte une limite haute de chlore fabricant facultative ;
- transmet le type de filtre au moteur de disponibilité ;
- conserve le LSI strict et le score scientifique des tranches précédentes.

## Compatibilité

Le moteur historique continue de produire les candidats et l’ordre pédagogique. La couche scientifique :

- remplace la conclusion de sécurité ;
- masque les calculs non sûrs ;
- retire les actions non applicables ;
- recalcule les durées de filtration, de re-test et le coût uniquement à partir des dosages `ready`.

Les anciennes données persistées restent lisibles.

## Limites conservées

- la limite haute de chlore dépend encore d’une valeur fabricant fournie dans la requête ;
- les caractéristiques fabricant ne sont pas encore persistées dans l’équipement ;
- le dosage du sel doit encore être recalculé depuis la plage réelle avant d’être réactivé ;
- les coefficients des produits génériques restent à valider par concentration active ;
- l’interface doit afficher clairement les états et raisons avant une publication grand public.

## Validation requise

- PostgreSQL ;
- lint ;
- TypeScript ;
- tests des sept langues ;
- tests de sécurité contextuelle ;
- tests de disponibilité et masquage des quantités ;
- suite complète ;
- build de production ;
- aucune régression des PR #55, #56 et #57 ;
- PR en brouillon, sans fusion automatique.
