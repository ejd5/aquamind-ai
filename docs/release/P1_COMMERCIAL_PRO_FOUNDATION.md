# P1 Commercial Pro — fondation fonctionnelle

## Objectif

Cette tranche livre rapidement les fonctions commerciales indispensables aux professionnels AQWELIA :

- catalogue de prestations, produits et frais ;
- création de devis ;
- création de factures ;
- calcul HT, TVA et TTC côté serveur ;
- suivi des statuts ;
- conversion d’un devis accepté en facture ;
- suivi des impayés ;
- enregistrement des relances.

Elle ne modifie pas la géolocalisation et ne refond pas le CRM Pro existant.

## Architecture retenue

Pour réduire le délai et éviter une migration de schéma bloquante, la tranche s’appuie sur les modèles stables déjà présents :

- `ProductInventory` stocke le catalogue propre à l’espace Pro ;
- `ProClientActivity` stocke les documents commerciaux et leur historique ;
- `ProClient` fournit le périmètre client et l’isolation par propriétaire ;
- `ProIntervention` peut être liée à un document via son identifiant métier.

Les documents sont sérialisés dans `ProClientActivity.details` avec le format versionné :

```text
pro-commercial-v1
```

Cette structure permet une migration ultérieure vers des tables spécialisées sans perdre l’historique.

## Sécurité d’accès

Toutes les routes :

- exigent une session authentifiée ;
- utilisent `getProAccess()` ;
- sont limitées aux rôles disposant de `canManage` ;
- utilisent le propriétaire réel de l’espace Pro, jamais un identifiant fourni par le client ;
- vérifient que le client et l’intervention appartiennent au périmètre professionnel.

Les techniciens et comptes en lecture seule ne peuvent pas administrer la facturation.

## Catalogue Pro

Route :

```text
/api/pro/commercial/catalog
```

Méthodes :

- `GET` : liste et recherche ;
- `POST` : création ;
- `PATCH?id=...` : modification ;
- `DELETE?id=...` : suppression.

Types disponibles :

- `service` ;
- `product` ;
- `fee`.

Chaque article expose :

- nom ;
- description ;
- unité ;
- prix unitaire ;
- taux de TVA ;
- stock indicatif pour les produits.

Les métadonnées commerciales du catalogue utilisent le format `pro-catalog-v1` dans le champ existant `instructions`.

## Devis et factures

Route principale :

```text
/api/pro/commercial/documents
```

### GET

Permet de filtrer par :

- type `quote` ou `invoice` ;
- statut ;
- client.

La réponse contient une synthèse :

- nombre total ;
- nombre de devis ;
- nombre de factures ;
- montant impayé ;
- montant et nombre de factures en retard.

### POST

Crée un devis ou une facture avec :

- client obligatoire ;
- intervention optionnelle ;
- lignes libres ou issues du catalogue ;
- devise ISO sur trois lettres ;
- date d’émission ;
- date de validité pour un devis ;
- date d’échéance pour une facture ;
- notes.

Une validité ou échéance de 30 jours est appliquée par défaut.

## Calcul monétaire

Le moteur `src/lib/pro/commercial.ts` :

- refuse un document sans ligne ;
- limite un document à 100 lignes ;
- exige une quantité strictement positive ;
- refuse les prix négatifs ;
- accepte un taux de TVA entre 0 % et 100 % ;
- arrondit chaque montant monétaire à deux décimales ;
- calcule chaque ligne puis les totaux du document ;
- ne fait jamais confiance à un total envoyé par l’interface.

Les montants sont stockés en nombres décimaux compatibles avec l’architecture historique. Une évolution future pourra passer aux centimes entiers pour une comptabilité plus stricte.

## Cycle de vie

### Devis

```text
draft → sent → accepted | rejected
draft | sent | accepted → cancelled selon les règles autorisées
```

### Facture

```text
draft → sent → overdue → paid
sent → paid
sent | overdue → cancelled
```

Les transitions impossibles sont rejetées.

Les lignes ne peuvent être modifiées que tant que le document est en brouillon.

## Conversion devis vers facture

Route :

```text
POST /api/pro/commercial/documents/{id}/convert
```

Règles :

- le document doit être un devis ;
- le devis doit être accepté ;
- une facture ne peut être créée qu’une seule fois depuis le même devis ;
- les lignes et montants sont repris ;
- la facture reçoit un nouveau numéro ;
- son échéance par défaut est fixée à 30 jours.

Le champ `sourceQuoteActivityId` assure l’idempotence.

## Relances

Route :

```text
POST /api/pro/commercial/documents/{id}/remind
```

La route :

- refuse les brouillons, factures payées ou annulées ;
- exige une facture échue, sauf usage explicite de `force: true` ;
- incrémente le compteur de relances ;
- enregistre la date et le canal ;
- crée une activité CRM `payment_reminder` ;
- passe la facture en `overdue` lorsqu’elle est échue.

Canaux enregistrables :

- email ;
- SMS ;
- téléphone ;
- WhatsApp.

### Limite explicite

Cette tranche enregistre et prépare la relance, mais ne l’expédie pas encore vers un fournisseur externe. La réponse utilise :

```text
deliveryStatus = recorded
```

L’envoi réel devra être relié ultérieurement à un service email, SMS ou WhatsApp avec consentement, journalisation et gestion des erreurs.

## Numérotation

Les numéros utilisent :

```text
DEV-AAAAMMJJ-XXXXXX
FAC-AAAAMMJJ-XXXXXX
```

Le suffixe aléatoire réduit fortement les collisions sans dépendre d’un compteur partagé.

## Tests et validation

Le contrat `tests/p1-commercial-pro.test.ts` couvre :

- calculs HT, TVA et TTC ;
- arrondis ;
- valeurs invalides ;
- transitions de statuts ;
- sérialisation et lecture du format versionné ;
- numérotation ;
- présence et sécurité des routes ;
- conversion idempotente ;
- relances enregistrées sans faux envoi.

La CI P1 exécute :

- génération Prisma SQLite et PostgreSQL ;
- validation PostgreSQL ;
- migration scientifique SQLite ;
- lint ;
- TypeScript ;
- contrats scientifiques et commerciaux ;
- suite complète ;
- build de production.

## Hors périmètre de cette tranche

- PDF légal du devis ou de la facture ;
- signature électronique ;
- paiement en ligne ;
- séquence automatique de relances ;
- émission comptable certifiée ;
- numérotation séquentielle légale par exercice ;
- avoirs et remboursements ;
- export comptable ;
- envoi réel email/SMS/WhatsApp ;
- tables spécialisées `Quote` et `Invoice`.

Ces éléments pourront être ajoutés en tranches successives sans casser le format `pro-commercial-v1`.
