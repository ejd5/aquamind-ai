# AQWELIA — P0-C Production Readiness

## État validé

- P0-B est isolé sur `fix/p0-billing-security-codex` et sa CI est verte.
- L'administration est protégée côté serveur par NextAuth et `ADMIN_EMAILS`.
- Les API administrateur refusent l'accès lorsque l'allowlist est absente.
- Le compte de revue mobile est désactivé par défaut et ne contient plus de mot de passe dans le code.
- Les écritures publiques sensibles disposent d'une limitation anti-abus standalone.
- Le moteur de dosage rejette les volumes et mesures invalides.
- Le stabilisant est plafonné à 50 mg/L par traitement calculé.
- Les pH extrêmes interdisent toujours la baignade.
- Les en-têtes de sécurité essentiels et React Strict Mode sont actifs.

## Décisions bloquantes avant production

### 1. Base de données

Le schéma Prisma utilise actuellement SQLite. Cette configuration convient au développement et à une instance unique, mais pas au déploiement cible web + mobile + Pro + Growth OS.

Décision recommandée : PostgreSQL managé avec sauvegardes automatiques et restauration point-in-time.

Travail requis après validation :

1. créer l'instance PostgreSQL de staging ;
2. convertir le provider Prisma et générer une baseline PostgreSQL ;
3. écrire et tester la migration des données SQLite existantes ;
4. tester `prisma migrate deploy` sur staging ;
5. documenter sauvegarde, restauration et retour arrière.

### 2. Hébergement

Choisir explicitement entre :

- plateforme serverless + PostgreSQL + rate limiting distribué ;
- serveur standalone supervisé + PostgreSQL + reverse proxy.

La limitation en mémoire ajoutée dans P0-C protège une instance standalone, mais ne remplace pas Cloudflare, Redis ou un service équivalent en multi-instance.

### 3. Secrets et fournisseurs

À configurer hors GitHub dans staging puis production :

- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL` ;
- `ADMIN_EMAILS` ;
- Stripe secret, webhook secret et 12 Price IDs ;
- RevenueCat clés iOS/Android, clé serveur et secret webhook ;
- nouvelle clé NVIDIA après révocation de la clé exposée ;
- SMTP ;
- PostHog selon le consentement retenu ;
- monitoring d'erreurs.

### 4. Observabilité et reprise

- installer un vrai collecteur d'erreurs ;
- brancher une alerte externe sur `/api/health` ;
- conserver les logs structurés sans données personnelles ;
- simuler une panne DB et un webhook fournisseur indisponible ;
- exécuter un exercice de restauration avant lancement.

## Critères de sortie P0-C

- CI verte sur la PR P0-C ;
- tests fonctionnels, sécurité, dosage et build réussis ;
- staging déployé avec secrets de test ;
- Stripe et RevenueCat testés de bout en bout ;
- base de production et procédure de sauvegarde validées ;
- monitoring et alertes actifs ;
- aucune clé réelle dans Git ou dans les discussions ;
- validation manuelle des parcours inscription, diagnostic, dosage, abonnement, annulation et restauration d'achat.

## Hors périmètre P0-C

- nouvelles fonctionnalités AQWELIA Pro ;
- nouveaux agents Growth OS ;
- prospection cartographique ;
- marketplace et partenariats commerciaux.

Ces chantiers reprennent après sécurisation du socle de production.
