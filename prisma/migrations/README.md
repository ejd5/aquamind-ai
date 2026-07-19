# AQWELIA — Migrations Prisma (SQLite → PostgreSQL)

> ⚠️ Ce README documente la procédure de migration.
> La migration n'est **pas exécutée** dans le sandbox (pas de Postgres disponible).
> Les fichiers de migration SQL seront générés par Prisma au premier `migrate dev` sur un poste disposant de PostgreSQL.

## 1. Pré-requis

- **PostgreSQL ≥ 14** installé et démarré localement (ou Docker)
- Une base `aqwelia` créée :
  ```bash
  createdb aqwelia
  # ou en SQL :
  # CREATE DATABASE aqwelia;
  ```
- Node.js ≥ 20 / Bun
- Dépendances installées : `bun install`

## 2. Configurer le `.env`

Copiez `.env.example` en `.env` et adaptez la `DATABASE_URL` :

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/aqwelia?schema=public"
```

Pour vérifier la connexion :

```bash
bunx prisma db pull --url "$DATABASE_URL"
# doit retourner "The database is empty" ou lister des tables existantes
```

## 3. Générer la première migration PostgreSQL

Puisque le schéma a été migré de SQLite vers PostgreSQL avec ajout du modèle `User`
et de toutes les relations `userId`, on repart d'une migration initiale propre :

```bash
# Option A — Schéma vierge (recommandé pour la première mise en prod / dev mobile)
bunx prisma migrate dev --name init_postgres_user_auth

# Option B — Si une base SQLite locale contient des données à conserver,
# exportez-les en JSON puis réimportez après la migration :
#   bunx prisma db pull   (sur l'ancienne base SQLite, depuis une branche séparée)
#   → script ad hoc d'export/import à écrire (voir §5)
```

`prisma migrate dev` va :
1. Créer le dossier `prisma/migrations/<timestamp>_init_postgres_user_auth/`
2. Y écrire un `migration.sql` (DDL complet : `CREATE TABLE`, `CREATE INDEX`, ...)
3. Appliquer la migration sur la base Postgres
4. Régénérer `node_modules/.prisma/client`

## 4. Régénérer le client Prisma (sans relancer la migration)

À chaque modification du `schema.prisma` :

```bash
bunx prisma generate       # régénère le client TS
bunx prisma migrate dev    # crée + applique une nouvelle migration
# ou, en dev rapide (sans historique de migration) :
bunx prisma db push
```

## 5. Migration des données existantes (optionnel)

Si une base SQLite `db/custom.db` contient des données à conserver
(profils créés pendant la phase de dev pré-auth) :

```bash
# 1. Sur la branche SQLite (avant le switch de provider), exporter :
bunx prisma studio   # export manuel, ou script Node avec prisma.client.sqlite

# 2. Attribuer un userId "legacy" à toutes les données existantes
#    (soit créer un User admin, soit marquer userId NULL temporairement
#     — NON recommandé car userId est NOT NULL dans le nouveau schéma)

# 3. Réimporter dans Postgres après la migration initiale
```

> 💡 Recommandation : pour le passage mobile multi-utilisateur, repartir d'une base propre.
> Les données dev locales n'ont pas vocation à être migrées en production.

## 6. CI / Déploiement

```bash
# En CI / prod — applique les migrations sans générer de nouvelle migration
bunx prisma migrate deploy

# Régénère le client (utile post-build)
bunx prisma generate
```

## 7. Rollback

Prisma ne gère pas les migrations "down" automatiquement.
Pour annuler une migration :

```bash
# Voir l'état des migrations
bunx prisma migrate status

# En dev : réinitialiser complètement (DESTRUCTIF)
bunx prisma migrate reset

# En prod : écrire une nouvelle migration qui annule les changements
```

## 8. Notes spécifiques au schéma AQWELIA

- **Provider** : `postgresql` ( était `sqlite` )
- **JSON** : tous les champs JSON restent en `String` (pas de type `Json` Prisma)
  pour éviter les breaking changes côté application.
- **Indexes** : `@@index([userId])` ajouté sur toutes les tables user-owned
  pour la performance des requêtes filtrant par utilisateur.
- **Cascade** : `onDelete: Cascade` sur toutes les relations `user` → suppression
  d'un User supprime toutes ses données associées (RGPD-friendly).
- **ActionPlan** : pas de `userId` direct (hérite via `WaterTest.userId`).
- **Account** : modèle NextAuth (OAuth futur), structure minimale.
- **Session** : non créé (NextAuth JWT strategy → pas de table Session).

## 9. Vérification post-migration

```bash
# Vérifier que toutes les tables sont créées
bunx prisma db pull --url "$DATABASE_URL"   # doit afficher le schéma complet

# Lancer un script de smoke test
bun run src/scripts/check-db.ts  # à créer si besoin
```

## 10. SQLite : `db push` par défaut, migrations ciblées

Le dépôt utilise **deux stratégies SQLite distinctes** :

- **Dev local** (`DATABASE_URL=file:./db/custom.db`) : `prisma db push` applique
  le schéma sans écrire de migration. Aucune donnée persistante n'est conservée
  en production sur SQLite — SQLite est explicitement réservé au dev
  (voir commentaire en tête de `prisma/schema.prisma`).
- **Migrations SQLite ciblées** : seules les migrations ayant un enjeu de
  rétro-compatibilité testable en CI sont écrites (par exemple
  `20260711000000_p0_b_billing_security`). Le test `run-billing-migration-test.sh`
  crée une base « pré-P0B » ne contenant que `Subscription`, marque la baseline
  comme appliquée, puis exécute `migrate deploy` pour valider la migration.

### `Lead.consentAt` (nullable, ajout 2026-07-19)

- Une **migration PostgreSQL incrémentale** est fournie :
  `prisma/postgresql/migrations/20260719120000_add_lead_consent_at/migration.sql`.
- **Aucune migration SQLite n'est créée** pour `consentAt`, car :
  1. SQLite n'est utilisé qu'en dev (`db push` applique le schéma) ;
  2.une migration SQLite `ALTER TABLE "Lead" ADD COLUMN` casserait
     `run-billing-migration-test.sh` (la base pré-P0B ne crée pas la table
     `Lead`, la baseline étant marquée « applied » sans être exécutée) ;
  3. aucune base SQLite persistante de production ne dépend de cette migration.
- En dev local, exécuter `bun run db:push` pour ajouter `consentAt` à la base
  SQLite existante — les leads historiques conserveront `consentAt = NULL`,
  ce qui est le comportement attendu (nullable).
