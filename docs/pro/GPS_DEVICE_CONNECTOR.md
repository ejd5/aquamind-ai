# AQWELIA Pro — connecteur de balises GPS véhicules

## Objectif

Le connecteur permet à une entreprise d’alimenter **Dispatch Live** avec la position d’un véhicule professionnel, indépendamment du smartphone du technicien. Le boîtier et le téléphone utilisent la même carte, les mêmes tournées et le même moteur consultatif de réaffectation des urgences.

Le suivi reste désactivé par défaut. L’entreprise doit activer Dispatch Live, autoriser le technicien et recueillir son accusé de lecture de l’information de géolocalisation avant d’enregistrer un boîtier.

## Fournisseurs

Le modèle est indépendant du fournisseur. Les profils disponibles sont :

- `generic` — appel HTTP JSON direct ;
- `traccar` — compatible avec les principaux champs de position Traccar ;
- `samsara` ;
- `geotab` ;
- `webfleet`.

Les trois derniers profils utilisent aujourd’hui le format normalisé AQWELIA. Leurs connecteurs de synchronisation fournisseur-à-fournisseur pourront être ajoutés sans modifier le modèle de données ni la carte.

## Enregistrement

Depuis **AQWELIA Pro → Dispatch Live → Balises GPS véhicules**, un responsable sélectionne :

1. le technicien ;
2. le fournisseur ;
3. l’identifiant externe du boîtier ;
4. un libellé ;
5. le véhicule.

AQWELIA génère alors un jeton secret. Il n’est affiché qu’une seule fois. Seule son empreinte SHA-256 est conservée en base. La révocation du boîtier invalide immédiatement le jeton et arrête ses sessions actives.

## Endpoint d’ingestion

```text
POST /api/pro/location/device
Authorization: Bearer aqg_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

### Format générique

```json
{
  "externalEventId": "position-2026-07-25T08:12:20Z",
  "latitude": 43.2965,
  "longitude": 5.3698,
  "accuracy": 8,
  "altitude": 24,
  "speed": 11.4,
  "heading": 135,
  "battery": 0.82,
  "recordedAt": "2026-07-25T08:12:20Z"
}
```

`externalEventId` est conseillé pour rendre les appels idempotents. Deux événements portant le même identifiant dans une même session ne créent pas deux points.

L’endpoint accepte un corps JSON de 32 Ko maximum et au plus un nouvel événement toutes les cinq secondes par boîtier. Un doublon identifié par `externalEventId` reste reconnu comme tel même lors d’un nouvel essai rapide.

### Format Traccar accepté

AQWELIA reconnaît notamment :

- `latitude`, `longitude` ;
- `fixTime`, `deviceTime` ou `serverTime` ;
- `course` ;
- `speed` en nœuds, convertie en mètres par seconde ;
- `id` comme identifiant d’événement ;
- `attributes.batteryLevel` ou `attributes.battery`.

L’appel peut contenir les champs directement à la racine ou dans un objet `position`.

## Règles de confidentialité

Le serveur refuse le point lorsque :

- le suivi est désactivé pour l’entreprise ;
- le technicien n’est plus autorisé ;
- l’information de géolocalisation n’a pas été reconnue par le technicien ;
- le boîtier est révoqué ;
- la date est trop ancienne ou située dans le futur ;
- le point se situe hors des jours ou horaires de travail configurés du technicien.

Ainsi, un boîtier qui continue physiquement à transmettre le soir ou le week-end ne crée aucune position exploitable dans AQWELIA.

## Sécurité

- jeton aléatoire de forte entropie ;
- jeton jamais relu depuis la base ;
- stockage SHA-256 uniquement ;
- révocation par responsable ;
- séparation stricte par organisation ;
- limitation à un événement connu sur les dernières 24 heures ;
- contrôle du type, de la taille et de la fréquence des requêtes ;
- déduplication des événements, y compris en cas de requêtes concurrentes ;
- rétention des positions limitée à la durée de l’entreprise, avec un maximum de 60 jours ;
- journalisation de l’enregistrement et de la révocation.

## Limites du premier lot

- AQWELIA fournit l’endpoint sécurisé, mais ne configure pas automatiquement les comptes des fournisseurs tiers ;
- un serveur Traccar ou le fournisseur doit transmettre les positions à l’endpoint ;
- la réaffectation d’une urgence reste une recommandation soumise à validation humaine ;
- l’historique détaillé ne doit pas être utilisé pour mesurer en permanence les pauses, la vitesse ou la performance individuelle.
