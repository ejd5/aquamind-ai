# AQWELIA

> Le copilote intelligent pour la piscine et le spa : mesures, diagnostic, météo, historique et profil du bassin deviennent un plan d’action prudent, compréhensible et traçable.

## État du produit

AQWELIA est une application web Next.js avec une base mobile Capacitor et un espace professionnel pour les piscinistes. Le produit combine :

- un moteur déterministe pour les calculs critiques ;
- une assistance IA pour l’interprétation et l’explication ;
- des parcours piscine et spa ;
- des abonnements web Stripe et mobiles RevenueCat ;
- un backend PostgreSQL en Staging et Production ;
- une base SQLite pour le développement local ;
- sept langues ;
- un socle de confidentialité opt-in et de transparence IA.

La fiche canonique de l’état réel est : [`docs/release/PRODUCT_TRUTH.md`](./docs/release/PRODUCT_TRUTH.md).

## Principes de sécurité

Les dosages critiques ne sont pas confiés à un modèle de langage. Le moteur déterministe applique les règles de calcul et de sécurité ; l’IA aide à expliquer, contextualiser et interpréter.

Règles intégrées notamment :

- aucun dosage sans volume de bassin ;
- TAC avant correction du pH lorsque nécessaire ;
- pH équilibré avant désinfection ;
- interdiction de mélanger des produits incompatibles ;
- délais de filtration, de re-test et de baignade ;
- recommandation de faire intervenir un professionnel sur les valeurs critiques.

AQWELIA assiste l’utilisateur mais ne remplace ni les notices des fabricants ni un professionnel qualifié.

## Architecture

### Application

- Next.js 16 ;
- React 19 ;
- TypeScript ;
- Tailwind CSS et composants Radix/shadcn ;
- NextAuth ;
- Prisma 6 ;
- Vitest ;
- Vercel pour Staging et Production.

### Données

- SQLite pour le développement local ;
- PostgreSQL pour Staging et Production ;
- deux clients Prisma générés et vérifiés dans la CI ;
- migrations Production exécutées par workflows ponctuels contrôlés.

### Mobile

La stratégie actuellement implémentée est **Capacitor 8** :

- identifiant : `com.aqwelia.app` ;
- export statique Next.js dans `out/` ;
- wrapper iOS et Android ;
- backend distant via `NEXT_PUBLIC_API_BASE_URL` ;
- caméra, géolocalisation, fichiers, préférences, partage, haptique, réseau, notifications locales et RevenueCat.

Expo n’est pas l’architecture active du dépôt.

## Sources de vérité

### Plans et prix

La seule source autorisée est [`src/lib/billing/plans.ts`](./src/lib/billing/plans.ts).

| Identifiant | Nom | Prix mensuel | Périmètre |
|---|---:|---:|---|
| `decouverte` | Free / Découverte | 0 € | 1 piscine, limites d’usage |
| `oasis` | Pool | 6,99 € | 1 piscine, fonctions avancées |
| `wellness` | Complete | 10,99 € | 2 piscines + 1 spa |
| `spa365` | Spa | 4,99 € | 1 spa |

Les anciennes appellations Surface, Limpide, Cristal et Gardien ne correspondent plus aux offres canoniques.

### Configuration

Toutes les variables attendues sont documentées dans [`.env.example`](./.env.example). Ne jamais publier de secret dans GitHub, les journaux ou une variable `NEXT_PUBLIC_*` non prévue comme publique.

## Modules principaux

### Particuliers

- profil piscine et spa ;
- mesures et historique ;
- plan d’action et calculs de dosage ;
- diagnostic photo ;
- assistant contextuel ;
- météo et alertes ;
- rappels ;
- guides et vidéos ;
- équipements et inventaire ;
- rapports selon le plan ;
- export et suppression du compte.

### Professionnels

- clients et bassins ;
- interventions ;
- techniciens et organisations ;
- planning et dispatch ;
- fondations des parcours terrain ;
- historique et contrôles d’accès par organisation.

`Dispatch Live` et `Terrain GPS` sont volontairement désactivés par défaut. Leur réactivation exige les clés Google Maps, une validation des coûts, une recette complète et le flag :

```env
NEXT_PUBLIC_PRO_GPS_ENABLED=true
```

## Confidentialité et conformité technique

Le socle actuel comprend :

- analytics refusés par défaut ;
- PostHog chargé uniquement après consentement ;
- refus aussi accessible que l’acceptation ;
- consentement modifiable ;
- transparence avant l’envoi de données à l’IA ;
- export des données ;
- suppression du compte et des données Pro ;
- pages légales et formulaire public de suppression.

Les informations juridiques de l’éditeur, de l’hébergeur et du médiateur doivent être renseignées avant commercialisation. Les textes doivent être relus par un professionnel compétent.

## Démarrage local

```bash
bun install
cp .env.example .env
bun run db:generate:all
bun run db:push
bun run dev
```

Application locale : `http://localhost:3000`.

## Commandes de qualité

```bash
bun run db:generate:all
bun run test:postgresql
bun run lint
bun run typecheck
python3 scripts/i18n/check-hardcoded-strings.py
bash tests/run-smoke-tests.sh
bun run build
```

Une PR applicative ne doit pas être fusionnée avant le passage de ces contrôles. Les changements visuels doivent aussi passer la recette Playwright prévue par le dépôt.

## Commandes mobiles

```bash
bun run mobile:build
bun run mobile:sync
bun run mobile:ios
bun run mobile:android
```

Le build mobile ne contient pas les routes API Next.js. Il doit appeler un backend déployé en HTTPS.

## Abonnements

- Web : Stripe ;
- iOS et Android : RevenueCat ;
- synchronisation serveur par webhooks idempotents ;
- reprise automatique des événements échoués lorsque le secret du cron est configuré.

Les IDs Stripe, produits RevenueCat et droits doivent rester alignés avec `src/lib/billing/plans.ts`.

## Services externes

Selon les fonctionnalités activées :

- Neon/PostgreSQL ;
- Vercel ;
- Stripe ;
- RevenueCat ;
- NVIDIA NIM ;
- Google et Apple OAuth ;
- PostHog ;
- Cloudflare Turnstile ;
- SMTP ;
- Google Maps.

L’absence d’une configuration externe doit produire un comportement désactivé ou explicite, jamais une fausse disponibilité.

## État des prochains chantiers

1. P0-L3 — documentation, vérité produit et nettoyage du dépôt ;
2. design system B2C et reproduction des six écrans prioritaires ;
3. parcours mobile Capacitor, offline, notifications et achats sandbox ;
4. confiance dynamique, LSI et validation scientifique ;
5. devis, catalogue, facturation et relances Pro ;
6. reprise ultérieure de la géolocalisation.

## Documentation utile

- [`docs/release/PRODUCT_TRUTH.md`](./docs/release/PRODUCT_TRUTH.md) — vérité produit et état de lancement ;
- [`STORE_READINESS.md`](./STORE_READINESS.md) — préparation iOS et Android ;
- [`docs/legal/P0-L2-LAUNCH-COMPLIANCE.md`](./docs/legal/P0-L2-LAUNCH-COMPLIANCE.md) — conformité technique de lancement ;
- [`PRODUCT_AUDIT.md`](./PRODUCT_AUDIT.md) — audit historique, à lire avec la fiche de vérité actuelle ;
- [`src/lib/billing/plans.ts`](./src/lib/billing/plans.ts) — plans et prix canoniques.

## Licence et responsabilité

AQWELIA fournit une aide au diagnostic et à l’entretien. Les dosages doivent respecter les notices des produits, les équipements installés et la réglementation applicable. En cas de danger électrique, fuite, irritation, exposition chimique ou doute sur la sécurité, interrompre l’action et contacter un professionnel.