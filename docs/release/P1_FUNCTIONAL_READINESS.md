# P1 Functional Readiness — AQWELIA

## Décision

Le périmètre fonctionnel P1 demandé est considéré comme **terminé côté code** lorsque la PR de readiness passe entièrement au vert.

Périmètre couvert :

1. parcours mobile et technicien ;
2. qualité scientifique, LSI, sécurité et dosages ;
3. catalogue, devis, factures et relances Pro ;
4. géocodage et ordre de tournée Google Maps avec repli contrôlé.

Cette conclusion ne signifie pas que la production peut être ouverte sans configuration. Elle sépare volontairement :

- la readiness du code ;
- la configuration des services externes ;
- la validation juridique et opérationnelle ;
- l’autorisation explicite de fusion.

## Pile de PR

Ordre actuel :

```text
#55  P1 Mobile / Technician
  ↓
#56  Scientific Quality A
  ↓
#57  Scientific Contextual Targets B
  ↓
#58  Scientific Safety & Dosage Readiness C
  ↓
#59  Scientific Persistence D
  ↓
#60  Scientific Confidence & Provenance E
  ↓
#61  Commercial Pro A
  ↓
#62  Pro Geolocation & Google Maps
  ↓
#63  P1 Functional Readiness
```

La PR #63 cible la branche de #62. Elle ne doit pas être fusionnée directement dans `main` avant traitement ordonné de la pile.

## Gate automatisé

Commande :

```bash
node scripts/check-p1-functional-readiness.mjs
```

Rapport par défaut :

```text
artifacts/p1-functional-readiness.json
```

Version du rapport :

```text
p1-functional-readiness-v1
```

Le gate vérifie :

- la présence des artefacts Mobile, Scientific, Commercial et Maps ;
- les migrations scientifiques SQLite et PostgreSQL ;
- les contrats versionnés ;
- les routes API essentielles ;
- les tests associés ;
- les documents de release ;
- les scripts `package.json` nécessaires ;
- la présence des variables attendues dans `.env.example` ;
- l’absence de workflows temporaires `_apply_*`, `_temp_*` ou `_diagnostic_*` ;
- l’exécution explicite des quatre groupes de tests dans la CI P1.

Le gate échoue lorsque le code ou le dépôt est incomplet. Il ne requiert pas de véritables secrets dans la CI.

## Chaîne de validation finale

La CI `P1 Product Quality` exécute :

1. installation figée des dépendances ;
2. génération des clients Prisma SQLite et PostgreSQL ;
3. validation du schéma et des migrations PostgreSQL ;
4. exécution de la migration scientifique SQLite ;
5. lint ;
6. TypeScript ;
7. contrats Mobile, Scientific, Commercial et Maps ;
8. génération du rapport de readiness ;
9. suite smoke complète ;
10. build Next.js de production.

Le rapport JSON est publié comme artefact GitHub Actions pendant 30 jours.

## État fonctionnel par domaine

### Mobile et technicien

Disponible :

- architecture Capacitor ;
- parcours d’authentification mobile ;
- espace technicien du jour ;
- rapport d’intervention ;
- shell mobile Pro ;
- fondation hors ligne et idempotence ;
- scripts de build et synchronisation iOS/Android.

Reste humain :

- certificats Apple ;
- keystore Android ;
- identifiants de bundle définitifs ;
- métadonnées stores ;
- produits RevenueCat réels ;
- comptes et appareils de test ;
- soumission et validation stores.

### Scientific Quality

Disponible :

- qualité dynamique des mesures ;
- confiance ajustée selon fraîcheur, méthode et calibration ;
- LSI strict sans température ou TDS inventés ;
- objectifs contextualisés piscine/spa et chlore/brome/sel ;
- sécurité baignade contextualisée ;
- dosages `ready`, `deferred` ou `not_calculable` ;
- masquage des quantités non fiables ;
- persistance du TDS, de la provenance et des versions ;
- limites fabricant du sel et du chlore ;
- migrations SQLite et PostgreSQL.

Reste humain :

- validation métier finale des coefficients produits ;
- collecte des concentrations exactes des produits commercialisés ;
- vérification des notices équipements ;
- protocole de revue scientifique continue.

### Commercial Pro

Disponible :

- catalogue de services, produits et frais ;
- devis et factures versionnés ;
- calcul serveur HT, TVA et TTC ;
- statuts et transitions contrôlés ;
- conversion devis accepté vers facture ;
- suivi des impayés ;
- enregistrement des relances ;
- audit CRM ;
- isolation par espace Pro.

Reste humain :

- choix du fournisseur d’envoi ;
- configuration SMTP/SMS/WhatsApp ;
- numérotation comptable séquentielle définitive ;
- PDF légal ;
- signature électronique ;
- paiement en ligne ;
- avoirs, remboursements et export comptable.

Important : une relance possède actuellement le statut réel `recorded`. Elle n’est pas présentée comme envoyée tant qu’un fournisseur n’est pas connecté.

### Géolocalisation et Maps

Disponible :

- statut de configuration sans fuite de clé ;
- Geocoding API v4 côté serveur ;
- aperçu puis confirmation avant persistance ;
- Place ID et audit CRM ;
- Routes API v2 / Compute Route Matrix ;
- tournée de 1 à 24 interventions ;
- ordre heuristique ;
- mise à jour optionnelle de `routeOrder` ;
- repli Haversine sans durée routière inventée ;
- absence de persistance des matrices Google ;
- restrictions fonctionnelles contre le scan massif.

Reste humain :

- compte Google Cloud avec facturation ;
- activation Geocoding API v4 et Routes API v2 ;
- clés navigateur et serveur séparées ;
- restrictions API, domaines et sorties backend ;
- variables d’environnement de production ;
- vérification périodique des conditions Google ;
- attribution dans les futures interfaces de carte.

## Actions bloquantes avant production

### Base de données

- choisir définitivement PostgreSQL pour staging/production ;
- définir `DATABASE_PROVIDER=postgresql` ;
- définir la véritable `DATABASE_URL` ;
- sauvegarder la base ;
- exécuter la chaîne de migrations revue ;
- vérifier les données après migration ;
- conserver un plan de retour arrière.

### Authentification

- générer un `NEXTAUTH_SECRET` fort et unique ;
- définir les URL HTTPS canoniques ;
- configurer OAuth Google et Apple si activés ;
- vérifier les redirections autorisées ;
- désactiver ou faire tourner les comptes temporaires de revue.

### Facturation

- créer et vérifier les produits et tarifs Stripe Live ;
- créer et vérifier les produits App Store / Play Store ;
- aligner RevenueCat avec les droits AQWELIA ;
- configurer les webhooks et secrets Live ;
- tester achat, renouvellement, expiration, remboursement et restauration.

### Communications

- configurer SMTP ou un autre fournisseur transactionnel ;
- vérifier SPF, DKIM et DMARC ;
- tester les erreurs et reprises ;
- ajouter SMS/WhatsApp uniquement avec consentement et fournisseur validé ;
- ne jamais convertir automatiquement `recorded` en `sent` sans preuve fournisseur.

### Mentions légales et confidentialité

- compléter les champs éditeur, société, SIREN, TVA et publication ;
- compléter hébergeur et médiateur ;
- vérifier politique de confidentialité et cookies ;
- documenter les sous-traitants ;
- finaliser les déclarations de confidentialité Apple et Google.

### Observabilité

- choisir et configurer le suivi d’erreurs ;
- définir les alertes critiques ;
- vérifier les journaux sans secrets ni données sensibles ;
- surveiller webhooks, migrations, facturation et API Google.

## Séquence de fusion recommandée

Aucune fusion ne doit avoir lieu sans autorisation explicite du propriétaire du dépôt.

Après autorisation :

1. revérifier que toutes les PR sont en brouillon ou dans l’état attendu ;
2. revérifier chaque SHA et chaque CI ;
3. fusionner #55 dans sa base cible ;
4. rebaser ou retargeter #56 sur la nouvelle base ;
5. relancer la CI ;
6. répéter dans l’ordre #57, #58, #59, #60, #61, #62 ;
7. retargeter #63 sur la dernière branche fusionnée ou sur `main` ;
8. relancer le gate P1 complet ;
9. fusionner #63 seulement si le rapport final reste `pass` ;
10. supprimer les branches devenues inutiles après vérification.

Ne pas fusionner toute la pile simultanément sans revalidation entre les étapes.

## Séquence de déploiement recommandée

1. sauvegarde et vérification de restauration ;
2. déploiement des migrations sur staging ;
3. déploiement applicatif staging ;
4. smoke tests authentification, bassin, test d’eau, Pro, mobile web et facturation ;
5. test des webhooks en environnement de test ;
6. test Google avec clés staging ;
7. validation des rôles Pro et de l’isolation des clients ;
8. validation mobile sur appareils réels ;
9. approbation produit, scientifique, juridique et opérations ;
10. déploiement production contrôlé ;
11. surveillance renforcée après publication.

## Critère final

Le code P1 est prêt lorsque :

```text
P1 Product Quality = success
p1-functional-readiness.json.status = pass
```

La production est prête uniquement lorsque les actions humaines listées dans `productionBlockers` sont traitées et documentées.

La fusion reste une décision explicite, séparée de ce gate.
