# AQWELIA — Migrations Prisma

## Provider actuel : SQLite (dev)

Le projet utilise **SQLite** en développement (fichier `db/custom.db`).
En production, basculez vers PostgreSQL (voir section ci-dessous).

## Procédures

### Nouvelle base (fresh)

```bash
# 1. Supprimer l'ancienne base
rm -f db/custom.db

# 2. Appliquer toutes les migrations
bunx prisma migrate deploy

# 3. Générer le client Prisma
bun run db:generate
```

### Base existante pré-Prisma-Migrate (migration initiale)

Si vous avez une base créée avec `db:push` (sans migrations) :

```bash
# 1. Sauvegarder la base existante
cp db/custom.db db/custom.db.backup

# 2. Marquer la migration baseline comme appliquée
bunx prisma migrate resolve --applied 20260710000000_baseline

# 3. Appliquer les migrations restantes
bunx prisma migrate deploy

# 4. Vérifier l'état
bunx prisma migrate status
```

### Test de migration

```bash
# Test sur une base isolée
bun run test:migration
```

Ce script :
1. Crée une base SQLite temporaire
2. Applique `migrate deploy`
3. Vérifie les tables et colonnes
4. Nettoie la base de test

## Migration vers PostgreSQL (production)

1. Changer `provider = "sqlite"` → `provider = "postgresql"` dans `prisma/schema.prisma`
2. Mettre à jour `DATABASE_URL` dans `.env`
3. Créer les migrations PostgreSQL :
   ```bash
   bunx prisma migrate dev --name init_postgresql
   ```
4. Migrer les données depuis SQLite (script de transfert nécessaire)

## Migrations disponibles

| Migration | Description |
|-----------|-------------|
| `20260710000000_baseline` | Schéma initial (tous les modèles P0-A) |
| `20260711000000_p0_b_billing_security` | P0-B : status, store, BillingEvent, backfill, unique constraints |
