# AQWELIA — Vérité produit et état de lancement

Dernière vérification technique : 26 juillet 2026  
Branche de référence : `main`  
HEAD vérifié au démarrage de P0-L3 : `f72ebf0488b547cdaf7e85003d2f15b461b1896f`

Ce document est la fiche canonique de l’état réel d’AQWELIA. Il distingue ce qui existe dans le code, ce qui est utilisable, ce qui dépend d’une configuration externe, ce qui reste en bêta et ce qui est volontairement suspendu.

## 1. Règles de vérité

- Les plans, prix, droits et limites ont une seule source de vérité : [`src/lib/billing/plans.ts`](../../src/lib/billing/plans.ts).
- Le fichier [`src/lib/pool/freemium.ts`](../../src/lib/pool/freemium.ts) ne contient plus de définitions : il réexporte la source canonique pour compatibilité.
- Le mobile actuel repose sur Capacitor 8, pas sur Expo : [`capacitor.config.ts`](../../capacitor.config.ts), [`next.config.mobile.ts`](../../next.config.mobile.ts) et les scripts `mobile:*` de [`package.json`](../../package.json).
- Le développement local utilise SQLite ; Staging et Production utilisent PostgreSQL via un client Prisma séparé.
- Une fonctionnalité n’est pas considérée comme disponible uniquement parce qu’un écran existe : ses services externes, variables, droits, migrations et tests doivent également être opérationnels.
- Les textes juridiques intégrés constituent une base produit et technique, pas un avis juridique.

## 2. Architecture réellement utilisée

### Web et backend

- Next.js 16, React 19 et TypeScript.
- Prisma 6 avec deux schémas maintenus en parallèle : SQLite pour le développement et PostgreSQL pour les environnements hébergés.
- Authentification NextAuth avec identifiants, Google et Apple lorsque leurs variables sont configurées.
- Abonnements web via Stripe.
- Paiements mobiles via RevenueCat et les achats intégrés des stores.
- Déploiements Vercel séparés : `aqwelia-staging` et `aqwelia-production`.

### Mobile

- Wrapper natif Capacitor 8.
- Identifiant d’application : `com.aqwelia.app`.
- Export statique Next.js vers `out/`, embarqué dans une WebView native.
- Les routes API ne sont pas embarquées dans l’application : le client mobile appelle le backend HTTPS défini par `NEXT_PUBLIC_API_BASE_URL`.
- Plugins présents : caméra, géolocalisation, notifications locales, préférences, réseau, fichiers, partage, clavier, haptique, splash screen et barre de statut.
- RevenueCat Capacitor est installé pour les abonnements iOS et Android.

Cette base permet une bêta native, mais elle ne prouve pas encore une préparation complète aux stores : les builds signés, les comptes Apple/Google, les achats sandbox, les permissions finales, les assets et les tests sur appareils réels restent nécessaires.

## 3. Offres grand public canoniques

Les montants sont définis en euros dans `src/lib/billing/plans.ts`.

| Identifiant interne | Nom produit | Mensuel | Périmètre principal |
|---|---:|---:|---|
| `decouverte` | Free / Découverte | 0 € | 1 piscine, usage limité |
| `oasis` | Pool | 6,99 € | 1 piscine, fonctions avancées |
| `wellness` | Complete | 10,99 € | 2 piscines + 1 spa |
| `spa365` | Spa | 4,99 € | 1 spa |

Les anciennes appellations Surface, Limpide, Cristal et Gardien ne doivent plus être présentées comme les offres actuelles.

Les prix trimestriels, saisonniers et annuels doivent également être lus depuis la source canonique. Aucun document, écran ou intégration ne doit dupliquer ces montants.

## 4. État fonctionnel

### Disponible dans le produit

- Profil piscine et spa selon le plan.
- Saisie des mesures et historique.
- Moteur déterministe de dosage, règles de sécurité et plans d’action.
- Diagnostic photo et assistance IA lorsque NVIDIA NIM est configuré.
- Assistant contextuel.
- Météo et moteur de risques.
- Rappels, guides, stock, équipements et rapports selon les droits du plan.
- Abonnements web Stripe et synchronisation mobile RevenueCat.
- Espace professionnel : clients, bassins, interventions, techniciens, planning et fondations de dispatch.
- Export des données et suppression de compte.
- Pages légales, transparence IA et consentement analytics opt-in.

### En bêta ou nécessitant une recette métier complémentaire

- Parcours mobile complet sur appareils iOS et Android.
- Expérience hors ligne et synchronisation des mutations.
- Achats intégrés réels Apple/Google en sandbox puis en production.
- Notifications mobiles complètes.
- Fonctions Pro avancées, notamment les parcours terrain et la recette multi-rôles.
- Précision scientifique étendue : confiance dynamique, validation comparative du LSI et recette exhaustive des dosages.

### Suspendu volontairement

- `Dispatch Live` et `Terrain GPS` sont masqués et bloqués par défaut.
- Le code, les migrations et les tables GPS sont conservés.
- Réactivation uniquement après configuration des clés Google Maps, validation des coûts, conformité, consentement et recette réelle.
- Flag requis : `NEXT_PUBLIC_PRO_GPS_ENABLED=true`.

### Non garanti tant que la configuration externe manque

- Google et Apple Login.
- Stripe et son portail client.
- RevenueCat et les achats intégrés.
- NVIDIA NIM pour le chat et la vision.
- PostHog, chargé uniquement après consentement.
- Cloudflare Turnstile lorsque le mode obligatoire est activé.
- Envoi d’e-mails SMTP.
- Google Maps pour le dispatch GPS.
- Cron de reprise des webhooks de facturation.
- Informations légales complètes de l’éditeur.

## 5. Confidentialité et conformité technique

Le socle P0-L2 apporte notamment :

- analytics refusés par défaut ;
- absence de chargement PostHog avant consentement ;
- boutons Accepter et Refuser de poids équivalent ;
- consentement réversible ;
- migration des comptes historiques vers `consentAnalytics=false` ;
- transparence avant les traitements IA ;
- export des données ;
- suppression de compte étendue aux données Pro ;
- formulaire public de demande de suppression ;
- pages CGU, CGV, confidentialité, cookies, IA, sous-traitants, sécurité, accessibilité et mentions légales.

Avant commercialisation, les champs juridiques obligatoires doivent être renseignés et les textes relus par un professionnel compétent.

## 6. Variables externes critiques

La liste détaillée et commentée est maintenue dans [`.env.example`](../../.env.example). Les principales familles sont :

- base de données et fournisseur Prisma ;
- NextAuth et URL publiques ;
- Google et Apple OAuth ;
- Stripe et Price IDs ;
- RevenueCat ;
- NVIDIA NIM ;
- SMTP ;
- PostHog ;
- Turnstile ;
- Google Maps ;
- secret du cron de reprise de facturation ;
- identité juridique, hébergeur et médiateur ;
- URL du backend mobile.

Les valeurs secrètes ne doivent jamais être placées dans une variable `NEXT_PUBLIC_*`, sauf lorsqu’il s’agit explicitement d’une clé publique prévue pour le navigateur ou le client mobile.

## 7. Contrôles obligatoires avant fusion ou publication

### Pour toute PR applicative

1. Génération des deux clients Prisma.
2. Validation du schéma et de la baseline PostgreSQL.
3. Lint.
4. TypeScript.
5. Contrôle des traductions.
6. Tests smoke et contrats.
7. Build Next.js de production.
8. Recette visuelle lorsqu’un écran est modifié.

### Pour toute migration Production

1. Migration testée sur base vide et base historique.
2. Idempotence vérifiée.
3. Connexion directe PostgreSQL, non poolée.
4. `prisma migrate deploy` uniquement via un workflow ponctuel contrôlé.
5. Vérification métier après migration.
6. Suppression automatique du workflow ponctuel après succès.

### Pour toute publication mobile

1. Backend Production compatible avec la version mobile.
2. URL API HTTPS configurée.
3. Authentification testée sur appareil réel.
4. Permissions caméra, photos, notifications et géolocalisation vérifiées.
5. Achats RevenueCat testés en sandbox.
6. Suppression de compte accessible depuis l’application.
7. Politique de confidentialité et URL support accessibles publiquement.
8. Build signé, TestFlight et Google Play Internal Testing avant soumission.

## 8. Décisions encore nécessaires

- Compléter l’identité juridique et choisir le médiateur de la consommation.
- Faire valider les textes et durées de conservation.
- Configurer Turnstile avant une ouverture publique importante.
- Configurer le secret du cron de reprise de facturation.
- Décider de la stratégie de conservation des photos : aucun stockage durable ou stockage objet privé.
- Finaliser le parcours mobile Capacitor avant toute éventuelle réévaluation technologique.
- Reprendre le GPS uniquement lorsque le budget et les clés Google Maps sont acceptés.
- Définir et documenter formellement le futur indice global de qualité de l’eau avant de l’utiliser comme score marketing précis.

## 9. Prochain ordre de travail

1. P0-L3 : documentation, vérité produit et nettoyage du dépôt — terminé et fusionné.
2. P1 Mobile : véritable parcours mobile et technicien, offline, notifications et achats sandbox — chantier actif.
3. P1 Scientific Quality : confiance dynamique, LSI et validation des dosages.
4. P1 Commercial Pro : devis, catalogue, facturation et relances.
5. Reprise ultérieure de la géolocalisation Google Maps.
6. Design system et refonte visuelle : mis de côté jusqu’à une décision ultérieure.

Le cadrage détaillé du chantier mobile est maintenu dans [`P1_MOBILE_TECHNICIAN.md`](./P1_MOBILE_TECHNICIAN.md).

## 10. Références internes

- [`README.md`](../../README.md)
- [`STORE_READINESS.md`](../../STORE_READINESS.md)
- [`src/lib/billing/plans.ts`](../../src/lib/billing/plans.ts)
- [`package.json`](../../package.json)
- [`capacitor.config.ts`](../../capacitor.config.ts)
- [`next.config.mobile.ts`](../../next.config.mobile.ts)
- [`.env.example`](../../.env.example)
- [`docs/legal/P0-L2-LAUNCH-COMPLIANCE.md`](../legal/P0-L2-LAUNCH-COMPLIANCE.md)
