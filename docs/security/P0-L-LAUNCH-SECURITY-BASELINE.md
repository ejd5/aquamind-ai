# P0-L — Launch Security Baseline

Ce lot fige le socle de lancement AQWELIA avant toute nouvelle fonction commerciale.

## Périmètre

- masquer temporairement Dispatch Live et Terrain GPS derrière un feature flag désactivé par défaut ;
- empêcher le rattachement OAuth automatique à un compte existant partageant la même adresse e-mail ;
- ouvrir le portail Stripe uniquement avec le `stripeCustomerId` stocké par AQWELIA ;
- protéger l’inscription par Cloudflare Turnstile avec validation serveur obligatoire ;
- reprendre automatiquement les événements Stripe et RevenueCat en échec ;
- plafonner les tentatives, conserver l’idempotence et journaliser les événements définitivement échoués.

## Déploiement

Les variables suivantes restent désactivées ou absentes tant que leur service n’est pas configuré :

```text
NEXT_PUBLIC_PRO_GPS_ENABLED=false
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
BILLING_RETRY_CRON_SECRET=
```

Le mode développement et la CI utilisent uniquement les clés de test officielles Turnstile ou un bypass explicitement limité à `NODE_ENV=test`.
