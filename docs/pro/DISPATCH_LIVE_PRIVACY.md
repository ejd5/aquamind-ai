# AQWELIA Pro — Dispatch Live, GPS et protection des salariés

## Finalité produit

Dispatch Live sert exclusivement à organiser les interventions terrain, visualiser les tournées en cours et proposer au responsable le technicien le plus pertinent pour une urgence. Une recommandation ne réaffecte jamais automatiquement une intervention : une validation humaine reste obligatoire.

## Sources de position

1. **Application professionnelle AQWELIA** — source recommandée. Le technicien démarre et arrête une session visible.
2. **Boîtier GPS du véhicule professionnel** — connecteur premium futur utilisant la même API d'ingestion.
3. Les balises Bluetooth grand public de type AirTag ne sont pas une source métier supportée.

## Garde-fous intégrés

- suivi désactivé par défaut au niveau de l'organisation et de chaque membre ;
- information affichée et versionnée avant le premier démarrage ;
- démarrage, pause et arrêt visibles pour le technicien ;
- arrêt automatique après 14 heures ;
- accès à la carte réservé aux rôles propriétaire, administrateur et manager ;
- journalisation des consultations et recommandations ;
- conservation par défaut et maximale dans cette première version : 60 jours ;
- aucune réaffectation automatique ;
- positions exactes exclues des logs applicatifs et des outils d'analytics ;
- purge opportuniste des points expirés.

## Configuration nécessaire avant mise en service

L'entreprise utilisatrice reste responsable de son information interne et de sa base juridique. Avant d'activer la fonctionnalité en production, elle doit notamment :

- documenter la finalité et les personnes habilitées ;
- informer individuellement les salariés ;
- consulter les représentants du personnel lorsqu'ils existent ;
- inscrire le traitement au registre et évaluer la nécessité d'une AIPD avec le DPO ;
- définir les horaires de suivi et interdire le suivi hors temps de travail ;
- limiter la durée de conservation au besoin réel ;
- formaliser la procédure d'exercice des droits et de sécurité.

## Variables d'environnement cartographiques

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` : carte web et tracé routier dans le navigateur.
- `GOOGLE_MAPS_SERVER_API_KEY` : matrice routière serveur pour les recommandations d'urgence.

Les deux clés doivent être séparées et restreintes dans Google Cloud : restrictions de domaine pour la clé navigateur et restrictions d'API/adresse serveur pour la clé serveur.

## Limite du premier lot

Le composant de partage fourni dans ce lot transmet la position lorsque l’application est ouverte. La collecte fiable en arrière-plan, les notifications permanentes Android et les autorisations iOS seront implémentées dans le client mobile natif. Le serveur, les sessions, la rétention, les droits et la carte web sont conçus pour recevoir cette seconde étape sans migration conceptuelle.

## Balises GPS véhicules

Les balises utilisent les mêmes finalités et restrictions que le suivi smartphone. AQWELIA refuse côté serveur toute position reçue en dehors des jours et horaires de travail configurés, même si le matériel continue à transmettre.

Chaque boîtier dispose d’un jeton révocable affiché une seule fois. Seule son empreinte SHA-256 est conservée. Son attribution à un technicien, sa révocation et les consultations de la carte sont journalisées.

