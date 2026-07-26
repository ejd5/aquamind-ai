# P0-L — Launch Security Baseline

Ce lot fige le socle de lancement AQWELIA avant toute nouvelle fonction commerciale.

## Protections

- Dispatch Live et Terrain GPS sont conservés dans le code mais masqués et bloqués tant que `NEXT_PUBLIC_PRO_GPS_ENABLED` n’est pas explicitement activé.
- Google et Apple ne sont plus autorisés à rattacher automatiquement une identité OAuth à un compte existant sur la seule base de l’e-mail.
- Le portail Stripe utilise uniquement le `stripeCustomerId` persistant associé à l’utilisateur.
- L’inscription peut être rendue strictement dépendante de Cloudflare Turnstile avec `TURNSTILE_REQUIRED=true`.
- Un cron GitHub horaire rappelle les événements Stripe et RevenueCat arrivés à échéance dans la file de reprise.

## Variables à configurer avant activation

```text
NEXT_PUBLIC_PRO_GPS_ENABLED=false
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
TURNSTILE_REQUIRED=false
BILLING_RETRY_CRON_SECRET=
```

`BILLING_RETRY_CRON_SECRET` doit avoir exactement la même valeur dans Vercel Production et dans les secrets GitHub Actions. Turnstile reste facultatif tant que `TURNSTILE_REQUIRED=false`, afin de ne pas bloquer les environnements avant la création du widget Cloudflare.

## Liaison OAuth

Une collision d’e-mail entre un compte existant et une nouvelle identité Google/Apple est refusée. La liaison explicite depuis une session déjà authentifiée est volontairement différée à un lot dédié ; aucune liaison implicite n’est tolérée dans l’intervalle.
