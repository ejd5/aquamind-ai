# AQWELIA — Audit produit synthétique

> Mise à jour P0-L3 — 26 juillet 2026.

Ce document remplace l’ancien audit historique qui mentionnait encore les offres Surface/Limpide/Cristal/Gardien, une application native non commencée, l’absence du mode Pro et un éventuel renommage PoolPilot. Ces affirmations ne correspondent plus à l’état actuel du dépôt.

La source canonique détaillée est : [`docs/release/PRODUCT_TRUTH.md`](./docs/release/PRODUCT_TRUTH.md).

## 1. Fondations solides

### Moteur métier

- moteur déterministe séparé de l’IA ;
- calculs de dosage par volume ;
- règles de sécurité ;
- ordre des traitements ;
- équilibre de l’eau et LSI ;
- génération de plans d’action ;
- contexte structuré pour l’assistant IA.

### Produit grand public

- profil piscine et spa ;
- tests d’eau et historique ;
- diagnostic photo ;
- assistant contextuel ;
- météo et risques ;
- rappels ;
- guides ;
- équipements et inventaire ;
- rapports selon les droits ;
- export et suppression de compte.

### Produit professionnel

- organisations ;
- clients et bassins ;
- techniciens ;
- interventions ;
- planning ;
- fondations de dispatch ;
- isolation des données par organisation.

### Infrastructure

- Next.js 16 et React 19 ;
- Prisma SQLite pour le développement ;
- Prisma PostgreSQL pour Staging et Production ;
- CI couvrant génération, schémas, lint, TypeScript, i18n, tests et build ;
- Vercel Staging et Production ;
- Stripe pour le web ;
- RevenueCat pour iOS et Android ;
- Capacitor 8 pour le mobile.

## 2. Plans canoniques

La seule source de vérité est [`src/lib/billing/plans.ts`](./src/lib/billing/plans.ts).

| Identifiant | Nom | Mensuel |
|---|---:|---:|
| `decouverte` | Free / Découverte | 0 € |
| `oasis` | Pool | 6,99 € |
| `wellness` | Complete | 10,99 € |
| `spa365` | Spa | 4,99 € |

Aucun document ne doit réintroduire les anciens noms ou dupliquer les prix.

## 3. Sécurité et conformité technique

Le socle actuel comprend :

- absence de dosage sans volume ;
- ordre TAC, pH et désinfection ;
- interdictions de mélange ;
- délais de baignade et re-tests ;
- authentification OAuth sans liaison implicite dangereuse ;
- Stripe basé sur le `stripeCustomerId` stocké ;
- reprise automatique des webhooks échoués ;
- Turnstile prêt à être activé ;
- analytics refusés par défaut ;
- PostHog après consentement uniquement ;
- transparence IA ;
- export et suppression des données ;
- pages juridiques et formulaire public de suppression.

Les textes doivent encore être complétés avec l’identité réelle de l’éditeur et relus par un professionnel avant commercialisation.

## 4. Mobile

Le dépôt possède une base Capacitor 8 avec :

- identifiant `com.aqwelia.app` ;
- export statique Next.js ;
- backend distant ;
- plugins caméra, géolocalisation, fichiers, préférences, réseau, partage, haptique et notifications locales ;
- RevenueCat Capacitor.

Le produit n’est pas encore déclaré prêt pour les stores. Il reste à finaliser les parcours sur appareils réels, l’offline, les notifications, les achats sandbox, les builds signés, les assets et la recette TestFlight/Google Play.

Voir [`STORE_READINESS.md`](./STORE_READINESS.md).

## 5. Fonctions suspendues

`Dispatch Live` et `Terrain GPS` restent volontairement désactivés par défaut.

Leur reprise exige :

- clés Google Maps ;
- validation des coûts et quotas ;
- conformité et consentement ;
- recette réelle manager/technicien ;
- activation explicite de `NEXT_PUBLIC_PRO_GPS_ENABLED`.

## 6. Points de qualité encore ouverts

### Produit et design

- sécuriser la vision graphique des six écrans B2C prioritaires ;
- décliner un design system cohérent ;
- gérer tous les états : vide, chargement, erreur, données insuffisantes ;
- ne pas afficher un score global précis sans formule et confiance documentées.

### Scientifique

- confiance dynamique selon la quantité, la fraîcheur et la qualité des données ;
- validation comparative du LSI ;
- recette exhaustive des dosages et unités ;
- clarification entre interprétation IA et calcul déterministe.

### Mobile

- authentification persistante ;
- offline et reprise réseau ;
- notifications ;
- achats RevenueCat sandbox ;
- recette sur appareils ;
- préparation des stores.

### Professionnels

- devis ;
- catalogue de produits et prestations ;
- facturation ;
- emails et relances ;
- parcours terrain finalisé ;
- recette multi-rôles.

## 7. Mesures produit recommandées

Les métriques doivent respecter le consentement analytics.

Moments utiles à suivre :

- onboarding terminé ;
- premier bassin ;
- premier test ;
- premier diagnostic ;
- premier plan d’action ;
- action réellement exécutée ;
- amélioration mesurée après re-test ;
- paywall vu après démonstration de valeur ;
- abonnement activé ;
- restauration d’achat ;
- rétention et fréquence d’usage.

Les objectifs chiffrés restent des hypothèses commerciales tant qu’ils ne sont pas validés sur un échantillon réel.

## 8. Recommandation actuelle

AQWELIA possède une fondation web, métier, Pro, mobile et conformité beaucoup plus avancée que lors du premier audit.

L’ordre recommandé est :

1. terminer P0-L3 et nettoyer le dépôt ;
2. reproduire les six écrans B2C prioritaires dans un design system durable ;
3. finaliser le parcours mobile Capacitor ;
4. renforcer la qualité scientifique ;
5. compléter les fonctions commerciales Pro ;
6. reprendre ultérieurement la géolocalisation.

Le nom produit canonique est **AQWELIA**. Le document historique `BRAND_NAMING.md` ne constitue pas une décision de renommage active.