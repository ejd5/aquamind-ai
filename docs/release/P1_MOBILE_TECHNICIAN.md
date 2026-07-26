# AQWELIA — P1 Mobile et parcours technicien

Date d’ouverture : 26 juillet 2026  
Branche : `feat/p1-mobile-technician-journey`

## Décision produit

Le chantier design est mis de côté. L’ordre actif devient :

1. P1 Mobile — véritable parcours mobile et technicien ;
2. P1 Scientific Quality — confiance dynamique, LSI et dosages ;
3. P1 Commercial Pro — devis, facturation, catalogue et relances ;
4. reprise ultérieure de la géolocalisation Google Maps.

Aucune refonte visuelle générale ne fait partie de P1 Mobile. Les changements d’interface sont limités à ce qui est nécessaire pour rendre le parcours terrain utilisable, compréhensible, accessible et fiable.

## Objectif

Transformer le socle responsive et Capacitor existant en parcours opérationnel pour un technicien qui travaille depuis son téléphone, parfois avec un réseau faible ou absent.

Le technicien doit pouvoir :

- arriver directement sur sa journée de travail ;
- consulter ses interventions dans l’ordre chronologique ;
- appeler le client et identifier la ville et le bassin ;
- démarrer et terminer une intervention ;
- ouvrir le compte rendu terrain ;
- continuer à travailler lorsque le réseau disparaît ;
- synchroniser les actions sans créer de doublons lorsque la connexion revient.

## Tranche P1-Mobile A — parcours quotidien et offline Pro

Cette branche introduit :

- la route `/pro/app/today` ;
- la redirection des comptes techniciens vers cette route après connexion ;
- une navigation différente pour les managers et les techniciens ;
- une tournée du jour triée par heure ;
- un cache local de la journée courante ;
- la surveillance du réseau web et Capacitor ;
- les actions Démarrer et Terminer ;
- la mise en file locale des changements de statut hors connexion ;
- la reprise via la passerelle d’idempotence existante ;
- l’autorisation strictement limitée des mutations Pro nécessaires au terrain.

## Frontières de sécurité

La file hors ligne ne devient pas une passerelle API générique.

Sont ajoutés uniquement :

- `PATCH /api/pro/interventions/:id` ;
- `POST /api/pro/water-tests`.

Les chemins externes, les routes administratives, les suppressions d’interventions et les méthodes non autorisées restent refusés.

Les contrôles d’authentification, de rôle, d’organisation et d’affectation continuent d’être appliqués par les routes métier au moment de la reprise.

## Tranches suivantes de P1 Mobile

### P1-Mobile B — client API mobile complet

- remplacer les appels `fetch` directs des écrans terrain par `src/lib/api-client.ts` ;
- vérifier cookies, session et erreurs avec le backend HTTPS mobile ;
- normaliser les états chargement, erreur, cache et reprise ;
- empêcher toute dépendance involontaire aux routes API embarquées.

### P1-Mobile C — compte rendu terrain

- formulaire réellement mobile ;
- sauvegarde progressive ;
- tests d’eau hors ligne ;
- actions réalisées et produits utilisés ;
- photos avec stratégie de stockage conforme ;
- signature ou validation client uniquement après cadrage juridique et métier.

### P1-Mobile D — notifications

- rappels locaux de tournée ;
- intervention imminente ;
- action hors ligne en attente ;
- reprise de synchronisation ;
- permissions refusées, retirées et réaccordées ;
- absence de promesse push tant que le canal distant n’est pas configuré.

### P1-Mobile E — recette native

- authentification et restauration de session sur iOS et Android ;
- caméra, fichiers, clavier, safe areas et haptique ;
- réseau lent, coupure et retour réseau ;
- appareils et tailles d’écran représentatifs ;
- accessibilité et taille de texte augmentée ;
- crash monitoring mobile.

### P1-Mobile F — achats et bêta stores

- RevenueCat sandbox ;
- restauration des achats ;
- entitlements alignés sur la source canonique des plans ;
- builds signés ;
- TestFlight interne ;
- Google Play Internal Testing ;
- vérification des liens confidentialité, support et suppression de compte.

## Hors périmètre

- refonte du design system ;
- reproduction de maquettes ;
- modification du moteur chimique ;
- modification du LSI ;
- nouveaux dosages ;
- devis et facturation Pro ;
- réactivation de Dispatch Live ou Terrain GPS ;
- configuration ou reprise de Google Maps.

## Validation obligatoire

1. génération Prisma SQLite et PostgreSQL ;
2. validation du schéma PostgreSQL ;
3. lint ;
4. TypeScript ;
5. contrôle des sept langues ;
6. tests smoke et contrats ;
7. build Next.js de production ;
8. build mobile statique ;
9. recette réseau connecté, lent et hors ligne ;
10. recette avec un compte manager et un compte technicien.

## Critères d’acceptation de la tranche A

- un technicien connecté arrive sur `/pro/app/today` ;
- un manager reste dirigé vers `/pro/app` ;
- le technicien ne voit pas les destinations de gestion d’équipe dans sa navigation principale ;
- la journée est lisible dans l’ordre chronologique ;
- la dernière journée chargée reste visible sans réseau ;
- une action hors ligne est conservée après rechargement ;
- la même clé d’idempotence est réutilisée à chaque tentative ;
- les actions sont rejouées au retour réseau ;
- les routes Pro non autorisées restent rejetées ;
- aucun changement de prix, de design global, de GPS ou de moteur scientifique n’est inclus.
