# AQWELIA — Registre de nettoyage du dépôt

Mise à jour : 26 juillet 2026  
Lot : P0-L3

## Objectif

Maintenir une liste GitHub exploitable, éviter les fusions accidentelles d’anciennes branches et empêcher les documents ou automatisations historiques de contredire le produit actuel.

## Pull requests clôturées sans fusion

### PR #1 — New Crowdin updates

Motif :

- branche basée sur un ancien `main` ;
- 108 commits accumulés ;
- synchronisation trop large pour une revue fiable ;
- risque de réintroduire des fichiers de langue obsolètes.

Décision : fermeture sans fusion.

La configuration actuelle reste :

```yaml
files:
  - source: src/i18n/locales/fr.json
    translation: src/i18n/locales/%language%.json
```

Toute prochaine synchronisation Crowdin doit :

1. partir du HEAD actuel de `main` ;
2. créer une PR neuve ;
3. modifier uniquement les fichiers de langue attendus ;
4. conserver les clés canoniques ;
5. passer le contrôle i18n et la CI complète.

### PR #21 — preview: AQWELIA Brain testable

Motif :

- PR explicitement créée pour une preview ;
- mention `DO NOT MERGE` ;
- branche basée sur un ancien état du produit ;
- fondations Brain utiles intégrées depuis dans le produit actuel.

Décision : fermeture sans fusion.

### PR #22 — visual preproduction phases 1 and 2

Motif :

- documentation de préproduction uniquement ;
- mention explicite `NE PAS FUSIONNER` ;
- branche basée sur un ancien `main` ;
- vérité produit et prochain chantier design désormais pilotés par P0-L3.

Décision : fermeture sans fusion.

## Branches historiques

Les branches associées aux PR fermées restent temporairement disponibles pour consultation et comparaison. Elles ne sont pas des branches de travail actives et ne doivent pas être fusionnées dans `main`.

Une suppression définitive pourra être effectuée après vérification qu’aucun document ou asset unique n’est encore nécessaire. La fermeture des PR suffit pour retirer le risque opérationnel immédiat tout en préservant la récupération.

## Pull request active après nettoyage

- PR #53 — `docs(p0-l3): product truth and repository cleanup`.

Aucune autre PR ne doit rester ouverte à la fin de P0-L3, sauf un chantier explicitement autorisé et basé sur le HEAD actuel.

## Workflows

Les workflows ponctuels de migration ou de diagnostic doivent respecter la règle suivante :

1. nom explicite ;
2. déclenchement limité ;
3. secret et environnement contrôlés ;
4. vérification métier après exécution ;
5. suppression automatique ou manuelle immédiatement après succès ;
6. aucun workflow temporaire présent dans le diff final d’une PR applicative ou documentaire.

Workflows permanents attendus :

- qualité P0 ;
- validation PostgreSQL ;
- recette visuelle ;
- reprise de facturation, lorsque son secret est configuré ;
- automatisations permanentes explicitement documentées.

## Documents réalignés dans P0-L3

- `README.md` ;
- `STORE_READINESS.md` ;
- `PRODUCT_AUDIT.md` ;
- `BRAND_NAMING.md` ;
- `docs/release/PRODUCT_TRUTH.md` ;
- présent registre.

## Règles de documentation

- Plans et prix : uniquement `src/lib/billing/plans.ts`.
- Mobile : Capacitor tant qu’aucune décision formelle ne le remplace.
- Nom : AQWELIA.
- GPS : suspendu par défaut.
- Fonctions externes : ne pas les présenter comme disponibles sans configuration.
- Audit historique : ne jamais le traiter comme source de vérité actuelle.
- Toute affirmation de disponibilité doit pouvoir être reliée au code, à une configuration et à un test.

## Contrôle avant fusion de P0-L3

- [ ] aucune modification fonctionnelle ;
- [ ] aucune migration ;
- [ ] aucune variation des plans dans le code ;
- [ ] liens Markdown vérifiés ;
- [ ] absence de workflow temporaire ;
- [ ] une seule PR ouverte ;
- [ ] CI complète verte ;
- [ ] revue du diff ;
- [ ] description de PR mise à jour ;
- [ ] fusion puis vérification des déploiements `main`.
