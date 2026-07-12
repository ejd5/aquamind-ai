# AQWELIA PostgreSQL

Ce dossier contient le schéma et les migrations réservés au staging et à la production PostgreSQL.

Le fichier `schema.prisma` est généré depuis `prisma/schema.prisma`. Il ne doit pas être modifié manuellement.

## Commandes

```bash
bun run db:pg:sync
bun run db:pg:check
bun run db:pg:generate
bun run db:pg:deploy
bun run test:postgresql
```

## Règles

- SQLite reste le moteur local et celui des tests automatisés existants.
- PostgreSQL devient le moteur de staging et production.
- Toute modification de modèle commence dans `prisma/schema.prisma`, puis exécute `db:pg:sync`.
- Les migrations SQLite et PostgreSQL restent dans des dossiers séparés.
- Ne jamais lancer `db push` sur staging ou production.
- Tester chaque migration avec `prisma migrate deploy` sur une base PostgreSQL éphémère avant fusion.

## Migration des données existantes

La baseline PostgreSQL crée une base neuve. Elle ne transfère pas automatiquement les données SQLite existantes. Le transfert fera l'objet d'un script séparé avec comptages avant/après, contrôle des clés étrangères et procédure de retour arrière.

## Plan de bascule

1. Déployer une base PostgreSQL vide de staging avec `db:pg:deploy`.
2. Exporter une copie chiffrée de la base SQLite après arrêt des écritures.
3. Importer les tables dans l'ordre des dépendances, dans une transaction.
4. Comparer le nombre de lignes par table et vérifier les relations orphelines.
5. Tester authentification, profils, analyses, abonnements et webhooks sur staging.
6. Répéter la procédure sur une copie récente avant la fenêtre de production.
7. Conserver la base SQLite originale en lecture seule pendant la période de retour arrière.
