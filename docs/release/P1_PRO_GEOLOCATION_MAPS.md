# P1 Pro — Géolocalisation et Google Maps

## Objectif

Cette tranche réactive la géolocalisation professionnelle de manière contrôlée pour :

- géocoder l’adresse d’un client ou d’un bassin ;
- confirmer l’emplacement avant enregistrement ;
- préparer une tournée de technicien ;
- calculer une matrice de distances et durées routières lorsque Google Routes est configuré ;
- proposer un ordre de visite ;
- enregistrer cet ordre dans les interventions.

Elle ne met pas en place de scan de quartier, de détection satellite de piscines, d’extraction massive de Google Maps ou de constitution automatique de fichiers de prospection.

## Configuration

Variables déjà prévues dans `.env.example` :

```text
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
GOOGLE_MAPS_SERVER_API_KEY=
NEXT_PUBLIC_PRO_GPS_ENABLED=false
```

### Clé serveur

`GOOGLE_MAPS_SERVER_API_KEY` est utilisée uniquement côté serveur pour :

- Geocoding API v4 ;
- Routes API v2.

Elle ne doit jamais être renvoyée au navigateur, enregistrée dans les logs ou exposée dans une réponse de statut.

La clé doit être restreinte dans Google Cloud aux API réellement utilisées et, lorsque l’infrastructure le permet, aux adresses de sortie du backend.

### Clé navigateur

`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` est destinée uniquement à l’affichage futur d’une carte Google dans le navigateur. Elle n’est pas utilisée pour le géocodage serveur de cette tranche.

## Sources officielles

- Geocoding API v4 : `https://developers.google.com/maps/documentation/geocoding/geocoding`
- Sécurité Geocoding v4 : `https://developers.google.com/maps/documentation/geocoding/start-v4`
- Règles Geocoding : `https://developers.google.com/maps/documentation/geocoding/policies`
- Routes API v2 : `https://developers.google.com/maps/documentation/routes/reference/rest`
- Compute Route Matrix : `https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRouteMatrix`
- Règles Routes API : `https://developers.google.com/maps/documentation/routes/policies`
- Conditions spécifiques : `https://cloud.google.com/maps-platform/terms/maps-service-terms`

Les conditions applicables doivent être revérifiées avant mise en production, en particulier pour un compte de facturation situé dans l’Espace économique européen.

## Architecture serveur

Fichier central :

```text
src/lib/pro/google-maps.ts
```

Le module :

- importe `server-only` ;
- lit la clé uniquement depuis l’environnement serveur ;
- impose des délais maximums ;
- utilise `cache: no-store` ;
- envoie `X-Goog-Api-Key` ;
- envoie un masque `X-Goog-FieldMask` minimal ;
- transforme les erreurs Google en codes applicatifs ;
- ne renvoie jamais la clé ;
- propose un repli local sans prétendre fournir un temps routier Google.

Version :

```text
google-maps-server-v1
```

## Statut de configuration

Route :

```text
GET /api/pro/maps/status
```

La réponse indique :

- si la clé serveur est configurée ;
- si la clé navigateur est configurée ;
- les versions d’API ;
- le nombre maximum d’arrêts ;
- la disponibilité du repli local.

La réponse contient toujours :

```text
serverKeyExposed = false
```

## Géocodage

Route :

```text
POST /api/pro/maps/geocode
```

Corps principal :

```json
{
  "targetType": "client",
  "targetId": "...",
  "address": "10 rue Exemple, 13000 Marseille, France",
  "confirmLocation": false
}
```

### Mode aperçu

Avec `confirmLocation: false` :

- l’adresse est géocodée ;
- le résultat est renvoyé temporairement ;
- aucune coordonnée n’est enregistrée ;
- l’utilisateur peut vérifier l’adresse formatée et la position.

### Mode confirmation

Avec `confirmLocation: true` :

- les coordonnées sont enregistrées dans le client ou le bassin ;
- `geocodedAt` est renseigné ;
- le Place ID est conservé dans une activité CRM ;
- l’adresse formatée Google n’est pas enregistrée ;
- une empreinte SHA-256 de l’adresse saisie est conservée pour l’audit ;
- l’activité précise que la confirmation vient de l’utilisateur.

Activité :

```text
geocoding_confirmed
```

Format d’audit :

```text
google-geocoding-confirmed-location-v1
```

## Conservation et conformité

Les conditions Google actuelles permettent notamment de conserver les Place IDs et encadrent la mise en cache des coordonnées.

AQWELIA applique les règles suivantes :

- aucun résultat de géocodage n’est préchargé en masse ;
- chaque requête concerne une adresse CRM précise ;
- la donnée est isolée dans l’espace du professionnel ;
- l’utilisateur confirme l’emplacement avant persistance ;
- l’adresse formatée Google reste transitoire ;
- le Place ID est la preuve durable privilégiée ;
- `geocodedAt` permet de détecter les coordonnées nécessitant une actualisation ;
- une actualisation opérationnelle est demandée après 30 jours pour les coordonnées identifiées comme issues du géocodage Google ;
- les matrices de trajets ne sont jamais enregistrées.

Cette politique applicative ne remplace pas une revue juridique des conditions contractuelles du compte Google Cloud utilisé en production.

## Planification de tournée

Route :

```text
POST /api/pro/maps/route-plan
```

Exemple :

```json
{
  "interventionIds": ["id-1", "id-2", "id-3"],
  "startCoordinates": {
    "latitude": 43.2965,
    "longitude": 5.3698
  },
  "applyOrder": false
}
```

### Limites

- 1 à 24 interventions par calcul ;
- interventions planifiées ou en cours uniquement ;
- contrôle d’accès serveur obligatoire ;
- coordonnées confirmées obligatoires ;
- coordonnées Google anciennes refusées par défaut ;
- `allowStaleCoordinates: true` permet une dérogation explicite, à éviter en production.

La limite de 24 arrêts garde la matrice sous la limite de 625 éléments lorsque le point de départ est ajouté aux origines.

## Google Routes v2

Lorsque la clé est configurée, AQWELIA appelle :

```text
POST https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix
```

Masque demandé :

```text
originIndex,destinationIndex,status,condition,distanceMeters,duration
```

Le champ `status` est volontairement inclus pour ne pas interpréter une liaison en erreur comme une route valide.

La matrice sert uniquement pendant la requête et n’est pas persistée.

## Repli sans Google

Lorsque la clé serveur n’est pas configurée ou qu’une panne serveur Google survient :

- AQWELIA calcule les distances à vol d’oiseau avec la formule de Haversine ;
- la réponse utilise `provider = haversine_fallback` ;
- `estimated = true` ;
- aucun temps routier n’est inventé ;
- `totalDurationSeconds` reste `null` ;
- le motif du repli est exposé.

Ce repli permet de continuer à ordonner une tournée approximative sans présenter le résultat comme un trajet routier réel.

## Algorithme d’ordre

La tranche utilise un plus-proche-voisin déterministe :

1. partir du point de départ fourni, ou conserver le premier arrêt de la liste ;
2. choisir l’arrêt restant avec la durée la plus faible ;
3. utiliser la distance lorsque la durée n’est pas disponible ;
4. poursuivre jusqu’au dernier arrêt ;
5. signaler les liaisons introuvables.

Ce résultat constitue une heuristique rapide, pas une optimisation mathématique globale de flotte.

Une évolution future pourra utiliser Google Route Optimization API pour :

- plusieurs techniciens ;
- fenêtres horaires ;
- compétences ;
- capacités véhicule ;
- priorités et contraintes métier.

## Application de l’ordre

Avec :

```json
{
  "applyOrder": true
}
```

AQWELIA :

- exige un rôle de gestionnaire ;
- met à jour `ProIntervention.routeOrder` ;
- crée une activité CRM `route_order_applied` ;
- enregistre les identifiants et ordres uniquement ;
- n’enregistre ni la matrice Google, ni les durées détaillées, ni les distances par liaison.

## Sécurité d’accès

- session obligatoire ;
- `getProAccess()` ;
- `proClientAccessWhere()` ;
- `proPoolAccessWhere()` ;
- `proInterventionAccessWhere()` ;
- géocodage et application d’ordre réservés à `canManage` ;
- consultation et simulation accessibles aux comptes `canWrite` dans leur périmètre ;
- un technicien ne peut calculer que ses interventions assignées.

## Attribution

Lorsque les résultats Google sont présentés sans carte Google, l’interface devra afficher l’attribution Google Maps conformément à la documentation.

Les réponses API indiquent :

```text
attributionRequired = true
attribution = Google Maps
```

Le repli Haversine ne demande pas cette attribution.

## Interdictions fonctionnelles

Cette tranche ne doit pas être détournée pour :

- parcourir automatiquement des rues ou quartiers ;
- détecter des piscines sur des images aériennes Google ;
- collecter des adresses sans relation client ;
- enrichir automatiquement des fichiers de prospection ;
- stocker des matrices Google pour constituer une base de distances ;
- afficher du contenu Google sur une carte concurrente en violation des conditions applicables.

## Tests

`tests/p1-pro-geolocation-maps.test.ts` couvre :

- configuration sans fuite de clé ;
- validation des adresses et coordonnées ;
- actualisation des coordonnées ;
- lecture des réponses Route Matrix ;
- repli Haversine ;
- ordre avec ou sans point de départ ;
- confirmation avant persistance ;
- Place ID dans l’audit ;
- absence de persistance de la matrice ;
- périmètres d’accès Pro ;
- limite de 24 arrêts.

## Hors périmètre

- carte interactive ;
- navigation virage par virage ;
- suivi GPS en arrière-plan ;
- optimisation multi-véhicules ;
- scan satellite ;
- achat et configuration du compte Google Cloud ;
- consentements mobiles de géolocalisation ;
- nettoyage automatique planifié des anciennes coordonnées ;
- envoi automatique d’ETA aux clients.
