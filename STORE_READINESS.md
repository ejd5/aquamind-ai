# AQWELIA — Préparation App Store et Google Play

Ce document décrit la stratégie mobile réellement implémentée dans le dépôt. Les exigences exactes des stores évoluent : elles doivent être revérifiées dans App Store Connect et Google Play Console au moment de chaque soumission.

## 1. Décision d’architecture

AQWELIA utilise actuellement **Capacitor 8** autour d’un export statique Next.js.

Références du dépôt :

- [`capacitor.config.ts`](./capacitor.config.ts) ;
- [`next.config.mobile.ts`](./next.config.mobile.ts) ;
- scripts `mobile:*` dans [`package.json`](./package.json) ;
- dépendances `@capacitor/ios`, `@capacitor/android` et plugins natifs ;
- `@revenuecat/purchases-capacitor` pour les achats intégrés.

Identité actuelle :

```text
App ID : com.aqwelia.app
Nom : Aqwelia
Web directory : out
```

Expo ou Flutter ne sont pas l’architecture active. Une réévaluation technologique ne doit être envisagée qu’après avoir identifié une limitation concrète et bloquante de Capacitor.

## 2. Fonctionnement du client mobile

Le build mobile utilise :

```bash
MOBILE_BUILD=true next build -c next.config.mobile.ts
```

Il produit un répertoire `out/` contenant l’interface statique embarquée dans la WebView native.

Les routes API Next.js ne sont pas incluses. L’application mobile doit appeler le backend déployé via :

```env
NEXT_PUBLIC_API_BASE_URL=https://backend-aqwelia.example
```

Cette URL doit être :

- HTTPS ;
- compatible avec la version mobile publiée ;
- accessible sans redirection vers un domaine de preview ;
- configurée avant la compilation de release ;
- testée pour l’authentification, les cookies/tokens et les erreurs réseau.

## 3. Capacités natives présentes

Les plugins installés couvrent notamment :

- caméra ;
- géolocalisation ;
- fichiers ;
- préférences ;
- partage ;
- réseau ;
- haptique ;
- clavier ;
- splash screen ;
- barre de statut ;
- notifications locales ;
- navigateur intégré ;
- RevenueCat.

La présence d’un plugin ne signifie pas que son parcours est entièrement prêt pour les stores. Chaque capacité doit être testée sur appareils réels, avec autorisation acceptée, refusée, retirée et réaccordée.

## 4. État actuel

### Fondations disponibles

- configuration Capacitor ;
- scripts de build, synchronisation et ouverture des projets natifs ;
- identifiant d’application stable ;
- export statique mobile ;
- intégration RevenueCat côté client et backend ;
- webhooks de facturation idempotents ;
- export et suppression de compte ;
- politique de confidentialité et pages légales accessibles ;
- transparence IA et consentement analytics opt-in.

### À finaliser avant une bêta externe

- vérifier ou générer les projets natifs iOS et Android depuis le HEAD actuel ;
- configurer le backend mobile de Staging ;
- tester connexion, déconnexion et restauration de session ;
- tester caméra et import de photos ;
- tester le refus des permissions ;
- tester le mode hors connexion et la reprise réseau ;
- tester les notifications ;
- configurer les produits et entitlements RevenueCat sandbox ;
- valider les liens profonds et retours OAuth ;
- préparer icônes, splash screens et captures ;
- ajouter une surveillance des erreurs mobiles ;
- effectuer une recette sur plusieurs appareils et tailles d’écran.

### À finaliser avant Production

- comptes Apple Developer et Google Play opérationnels ;
- contrats, fiscalité et coordonnées bancaires configurés ;
- certificats, profils et signatures de release ;
- produits d’abonnement approuvés ou prêts à être soumis ;
- URLs publiques de support, confidentialité et suppression de compte ;
- fiche Data Safety / App Privacy cohérente avec les traitements réels ;
- compte de revue temporaire lorsque nécessaire ;
- tests sandbox complets ;
- plan de support et de rollback ;
- validation juridique des textes et informations de l’éditeur.

## 5. Build et synchronisation

### Build statique

```bash
bun run mobile:build
```

### Synchronisation iOS et Android

```bash
bun run mobile:sync
```

### Ouvrir iOS

```bash
bun run mobile:ios
```

ou :

```bash
bun run mobile:open:ios
```

### Ouvrir Android

```bash
bun run mobile:android
```

ou :

```bash
bun run mobile:open:android
```

Avant chaque synchronisation, exécuter les validations du dépôt et vérifier que `NEXT_PUBLIC_API_BASE_URL` pointe vers l’environnement attendu.

## 6. Environnements mobiles

### Développement local

- backend local ou tunnel HTTPS contrôlé ;
- produits RevenueCat de test ;
- aucune donnée réelle ;
- logs détaillés autorisés sans secrets.

### Staging

- backend `aqwelia-staging` ;
- base PostgreSQL Staging ;
- comptes de test ;
- Stripe et RevenueCat sandbox ;
- OAuth avec URLs Staging ;
- TestFlight interne et Google Play Internal Testing.

### Production

- backend `aqwelia-production` ;
- base Neon Production ;
- produits et entitlements Production ;
- secrets séparés de Staging ;
- aucune clé de test ;
- logs sans données sensibles ;
- monitoring actif.

Une application Staging ne doit jamais utiliser la base ou les clés de Production.

## 7. Abonnements mobiles

La source de vérité des plans est [`src/lib/billing/plans.ts`](./src/lib/billing/plans.ts).

Plans actifs :

| Identifiant | Nom | Prix mensuel canonique |
|---|---:|---:|
| `decouverte` | Free / Découverte | 0 € |
| `oasis` | Pool | 6,99 € |
| `wellness` | Complete | 10,99 € |
| `spa365` | Spa | 4,99 € |

Les Product IDs RevenueCat, entitlements, offres App Store et abonnements Google Play doivent correspondre exactement à cette source.

Parcours à tester :

1. nouvel achat ;
2. période d’essai lorsqu’elle est réellement configurée ;
3. restauration des achats ;
4. renouvellement ;
5. annulation avec accès jusqu’à expiration ;
6. paiement échoué et période de grâce ;
7. changement de plan ;
8. achat sur un autre appareil ;
9. webhook reçu plusieurs fois ;
10. événement reçu dans le désordre ;
11. reprise automatique d’un webhook échoué ;
12. suppression de compte avec abonnement encore actif.

Aucun prix ne doit être écrit en dur dans une seconde source documentaire ou applicative.

## 8. Permissions et confidentialité

Chaque permission doit avoir :

- une finalité réelle ;
- une explication claire avant la demande système lorsque nécessaire ;
- un texte localisé ;
- un comportement fonctionnel en cas de refus ;
- un accès aux réglages pour la réactiver ;
- aucune collecte en arrière-plan non documentée.

### Caméra et photos

- diagnostic et scan ;
- suppression des métadonnées lorsque prévu ;
- aucune promesse d’historique photo durable sans stockage objet privé ;
- traitement IA signalé avant envoi.

### Géolocalisation

La météo locale peut utiliser la position lorsque l’utilisateur l’autorise. Le suivi GPS professionnel reste suspendu par défaut :

```env
NEXT_PUBLIC_PRO_GPS_ENABLED=false
```

Il ne doit pas être présenté dans la fiche Store comme disponible tant qu’il n’a pas été réactivé, configuré et recetté.

### Analytics

- refus par défaut ;
- aucun chargement PostHog avant consentement ;
- choix modifiable ;
- déclaration Store cohérente avec les événements réellement collectés.

## 9. Suppression de compte

La suppression doit être accessible depuis l’application et depuis une page publique.

La recette doit vérifier :

- authentification ou vérification de la demande ;
- avertissement sur les conséquences ;
- suppression des données personnelles et professionnelles concernées ;
- absence de données orphelines ;
- traitement distinct de l’abonnement du store ;
- confirmation compréhensible ;
- conservation légale éventuelle clairement expliquée.

Supprimer un compte AQWELIA ne résilie pas nécessairement automatiquement l’abonnement Apple ou Google : l’interface doit orienter clairement l’utilisateur vers la gestion de son abonnement lorsque requis.

## 10. Assets et fiche Store

Préparer au minimum :

- icône iOS ;
- icône Android adaptative ;
- splash screen ;
- captures des formats demandés dans les consoles au moment de la soumission ;
- visuel promotionnel Google Play lorsqu’il est requis ;
- description courte et longue ;
- mots-clés et catégories ;
- URL support ;
- URL confidentialité ;
- URL suppression de compte ;
- coordonnées de contact pour la revue ;
- notes de revue expliquant l’IA, les abonnements et les permissions.

Storyboard recommandé pour les captures :

1. état de l’eau et action prioritaire ;
2. diagnostic photo avec transparence IA ;
3. lecture de bandelette ;
4. plan d’action déterministe ;
5. historique et évolution ;
6. offre payante après démonstration de valeur.

Ne pas utiliser un score global précis tant que sa formule, sa fraîcheur et son niveau de confiance ne sont pas documentés et testés.

## 11. Matrice de recette minimale

### Appareils

- iPhone récent ;
- iPhone plus ancien encore supporté ;
- au moins deux tailles Android ;
- appareil avec réseau lent ;
- appareil avec espace de stockage faible ;
- modes clair et sombre ;
- taille de texte augmentée.

### Scénarios

- première installation ;
- mise à jour depuis une version précédente ;
- création de compte ;
- Google/Apple Login lorsqu’activés ;
- déconnexion/reconnexion ;
- onboarding ;
- ajout d’un bassin ;
- saisie d’un test ;
- diagnostic photo ;
- plan d’action ;
- perte et retour réseau ;
- achat et restauration ;
- export ;
- suppression du compte ;
- ouverture des liens juridiques ;
- refus de chaque permission.

## 12. Critères de passage en bêta

- build signé installé sur appareils réels ;
- aucune erreur bloquante sur authentification et navigation ;
- backend Staging stable ;
- crash monitoring actif ;
- achats sandbox validés ;
- export et suppression validés ;
- textes et liens publics accessibles ;
- aucune fonction suspendue présentée comme disponible ;
- procédure de support établie.

## 13. Critères de soumission

- CI complète verte sur le commit publié ;
- version et numéro de build cohérents ;
- secrets et environnements contrôlés ;
- politique de confidentialité et déclarations Store alignées ;
- contenus localisés relus ;
- assets conformes aux consoles ;
- compte de revue fonctionnel et temporaire ;
- abonnement sandbox testé de bout en bout ;
- plan de surveillance après publication ;
- validation finale sur le binaire exact soumis.

## 14. Prochain ordre recommandé

1. stabiliser le design system B2C sur les six écrans prioritaires ;
2. finaliser les parcours Capacitor ;
3. renforcer offline et reprise réseau ;
4. terminer les notifications ;
5. valider RevenueCat sandbox ;
6. produire les assets Store ;
7. lancer TestFlight interne et Google Play Internal Testing ;
8. corriger les retours ;
9. soumettre uniquement lorsque la checklist est entièrement vérifiée.

## 15. Documents liés

- [`docs/release/PRODUCT_TRUTH.md`](./docs/release/PRODUCT_TRUTH.md) ;
- [`README.md`](./README.md) ;
- [`.env.example`](./.env.example) ;
- [`docs/legal/P0-L2-LAUNCH-COMPLIANCE.md`](./docs/legal/P0-L2-LAUNCH-COMPLIANCE.md) ;
- [`src/lib/billing/plans.ts`](./src/lib/billing/plans.ts).