# P1 Production Activation — AQWELIA

## État de départ

La pile P1 `#55` à `#63` est fusionnée sur `main`.

SHA final de la pile fonctionnelle :

```text
277f8c45d506b0a80c374fdeeadcb5b2b1bf9a5e
```

Le code P1 a passé les contrôles Mobile, Scientific, Commercial, Maps, smoke tests et build de production.

Les deux statuts Vercel associés au SHA final signalent actuellement une limite externe de fréquence de builds du compte Vercel. Ce blocage n'est pas une erreur de compilation AQWELIA.

## Workflow sécurisé

Le workflow `.github/workflows/p1-production-activation.yml` propose trois actions manuelles depuis GitHub Actions :

1. `preflight` ;
2. `migrate_postgresql` ;
3. `redeploy_vercel`.

Toutes les actions utilisent l'environnement GitHub `production`.

Le préflight ne restitue jamais les valeurs des secrets. Il publie uniquement :

- les noms des contrôles ;
- leur état `ready` ou `blocked` ;
- les groupes encore bloquants ;
- les actions externes à effectuer.

## Étape 1 — PostgreSQL

Configurer dans l'environnement GitHub `production` :

```text
Variable  DATABASE_PROVIDER=postgresql
Secret    DATABASE_URL=postgresql://...
```

Avant la migration :

- produire une sauvegarde ;
- vérifier qu'elle est restaurable ;
- confirmer le serveur et la base ciblés ;
- conserver le point de retour arrière.

Pour déployer les migrations :

```text
Action       migrate_postgresql
Confirmation DEPLOY_P1_MIGRATIONS
```

Le workflow refuse une URL non PostgreSQL, régénère le client, valide la structure, déploie les migrations puis contrôle leur statut.

## Étape 2 — Authentification

Configurer au minimum :

```text
Secret    NEXTAUTH_SECRET
Variable  NEXTAUTH_URL=https://...
Variable  NEXT_PUBLIC_SITE_URL=https://...
Variable  NEXT_PUBLIC_API_BASE_URL=https://...
```

`NEXTAUTH_SECRET` doit être unique et suffisamment long. Les URL doivent être les URL HTTPS canoniques.

OAuth Google et Apple restent facultatifs. S'ils sont activés, ajouter leurs identifiants, secrets et URL de redirection dans les consoles concernées.

## Étape 3 — Stripe et RevenueCat

Configurer les secrets Live Stripe :

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

Configurer les douze identifiants de prix Stripe attendus pour Oasis, Wellness et Spa365.

Configurer RevenueCat :

```text
NEXT_PUBLIC_REVENUECAT_IOS_KEY
NEXT_PUBLIC_REVENUECAT_ANDROID_KEY
REVENUECAT_API_KEY
REVENUECAT_WEBHOOK_SECRET
```

Vérifications obligatoires : achat, renouvellement, expiration, restauration, remboursement et reprise idempotente des webhooks.

## Étape 4 — Google Maps

Configurer :

```text
Secret    GOOGLE_MAPS_SERVER_API_KEY
Variable  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY  # uniquement si une carte navigateur est activée
```

Dans Google Cloud :

- activer la facturation ;
- activer Geocoding API v4 ;
- activer Routes API v2 ;
- séparer clé serveur et clé navigateur ;
- restreindre les APIs, domaines et sorties backend ;
- conserver l'attribution Google dans les interfaces concernées.

Sans clé serveur, AQWELIA conserve le repli Haversine et n'invente aucune durée routière.

## Étape 5 — Communications

Configurer :

```text
SMTP_HOST
SMTP_USER
SMTP_PASS
EMAIL_FROM
```

Puis vérifier SPF, DKIM et DMARC.

Les relances commerciales restent au statut réel `recorded` tant qu'aucune preuve d'envoi fournisseur n'est reçue. SMS et WhatsApp ne doivent être activés qu'avec un fournisseur validé et le consentement approprié.

## Étape 6 — Mobile et stores

Configurer hors dépôt :

- certificats Apple ;
- profils de provisioning ;
- keystore Android ;
- mots de passe de signature ;
- bundle IDs définitifs ;
- comptes App Store Connect et Google Play Console ;
- fiches, captures, classifications et déclarations de confidentialité ;
- produits stores reliés à RevenueCat.

Aucun certificat, fichier `.p8`, keystore ou mot de passe de signature ne doit être commité.

## Étape 7 — Légal et conformité

Renseigner les variables `NEXT_PUBLIC_LEGAL_*` documentées dans `.env.example` : éditeur, forme juridique, adresse, SIREN, registre, TVA, directeur de publication, hébergeur et médiateur.

Faire valider :

- mentions légales ;
- politique de confidentialité ;
- politique cookies ;
- registre des sous-traitants ;
- déclarations de confidentialité Apple et Google ;
- base juridique des communications commerciales et du suivi de localisation.

## Étape 8 — Fusion

Terminée : les PR `#55` à `#63` ont été fusionnées dans l'ordre avec des merge commits afin de préserver l'historique de la pile.

## Vercel

Le SHA final est actuellement bloqué par la limite de fréquence de builds du compte Vercel.

Après rétablissement du quota, deux possibilités :

1. relancer manuellement le déploiement dans Vercel ;
2. configurer le secret GitHub `VERCEL_DEPLOY_HOOK_URL`, puis lancer :

```text
Action       redeploy_vercel
Confirmation REDEPLOY_P1_PRODUCTION
```

## Préflight final

Lancer depuis GitHub Actions :

```text
Workflow P1 Production Activation
Action   preflight
```

Le préflight doit retourner `status = pass` avant migration et ouverture de production.

## Limites de cette automatisation

Le workflow ne peut pas :

- créer les comptes externes ;
- acheter ou modifier les abonnements Vercel/Google/Apple ;
- inventer les données légales ;
- générer les clés Live de paiement ;
- signer les applications sans certificats ;
- déclarer une sauvegarde restaurable sans preuve opérationnelle.

Ces éléments restent sous le contrôle du propriétaire des comptes et des responsables juridique, financier et opérationnel.
