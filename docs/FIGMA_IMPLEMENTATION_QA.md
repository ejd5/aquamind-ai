# AQWELIA — Recette visuelle de l’intégration Figma

Cette checklist valide l’intégration du fichier maître **AQWELIA — Product Design System & Experience 2026** dans l’application réelle.

## Préconditions

- Utiliser une Preview Vercel liée à la PR de design.
- Vérifier que l’environnement `Preview` contient `DATABASE_PROVIDER=postgresql`, `DATABASE_URL`, `NEXTAUTH_SECRET` et `AUTH_TRUST_HOST=true`.
- Tester au minimum en français et dans une seconde locale.
- Ne pas utiliser les données de production pour les parcours nécessitant un compte.
- Vérifier les thèmes clair et sombre lorsqu’ils sont accessibles.

## Viewports canoniques

| Cible | Largeur × hauteur |
|---|---:|
| Desktop large | 1440 × 1000 |
| Laptop | 1280 × 800 |
| Tablette | 768 × 1024 |
| Mobile iOS | 390 × 844 |
| Mobile Android | 412 × 915 |

## 1. Landing Particuliers — `/`

### Hero

- [ ] L’image remplit le cadre sans sujet coupé.
- [ ] Le fond diffus couvre la totalité du hero.
- [ ] L’image nette reste complète au-dessus du fond diffus.
- [ ] Le titre Playfair reste lisible sur toutes les largeurs.
- [ ] Les deux CTA restent visibles et atteignent au moins 44 px de hauteur.
- [ ] La carte de diagnostic ne masque pas le texte principal.
- [ ] Les quatre statistiques restent alignées en desktop et passent sur deux colonnes en mobile.

### Solution

- [ ] La photographie reste complète et ne déforme pas les équipements.
- [ ] Les trois étapes restent lisibles sur fond photographique.
- [ ] Les traductions longues ne débordent pas des cartes.

### Fonctionnalités

- [ ] Les 11 cartes utilisent la même grille et les mêmes rayons.
- [ ] Les deux cartes sombres gardent un contraste suffisant.
- [ ] Le fond `modules-bg.png` ne se répète pas en mosaïque.

### CTA final

- [ ] La scène de piscine reste visible sans réduire la lisibilité.
- [ ] Le dégradé protège le texte à gauche.
- [ ] Les boutons ne recouvrent pas le sujet principal de l’image.

## 2. Application Particulier — vue `app` de `/`

Le routage reste piloté par le profil, la session et la plateforme. Une session web valide est requise pour ouvrir l’application.

### Desktop

- [ ] La sidebar sombre possède un contraste AA.
- [ ] L’item actif utilise Lagoon sans perdre la lisibilité.
- [ ] Le cockpit principal conserve toutes les données existantes.
- [ ] Les cartes météo, rappels et actions ne changent pas de comportement.
- [ ] Les widgets secondaires restent accessibles après la refonte.

### Mobile

- [ ] La navigation basse respecte la safe area.
- [ ] Toutes les actions tactiles atteignent 44 px.
- [ ] Aucun contenu n’est masqué par la navigation fixe.
- [ ] Le texte ne déborde pas à 390 px et 412 px.

## 3. Onboarding

- [ ] Les quatre étapes et leur progression restent fonctionnelles.
- [ ] Piscine, spa et offre combinée conservent leurs validations.
- [ ] Les champs ont une hauteur minimum de 48 px.
- [ ] Les choix sélectionnés sont identifiables sans dépendre uniquement de la couleur.
- [ ] Les erreurs de volume, géolocalisation et sauvegarde sont inchangées.
- [ ] L’image d’ambiance ne gêne pas la saisie.

## 4. Diagnostic photo et bandelette

- [ ] L’image à analyser utilise `contain` et n’est jamais coupée.
- [ ] La zone de dépôt est identifiable et utilisable au clavier.
- [ ] Les onglets Photo et Bandelette ont une cible tactile suffisante.
- [ ] Chargement, résultat, erreur, avertissements et historique restent présents.
- [ ] Les garde-fous de dosage et les avertissements de sécurité sont inchangés.
- [ ] Le mode hors ligne conserve son comportement.

## 5. AQWELIA Pro — `/pro/app`

### Authentification

- [ ] Un utilisateur non authentifié est redirigé vers la connexion.
- [ ] L’organisation ou le nom du compte reste visible après connexion.

### Cockpit

- [ ] Le header, la sidebar et le contenu utilisent la palette Pro Champagne/Aqua.
- [ ] Les quatre statistiques reprennent les données de `/api/pro/dashboard`.
- [ ] Les interventions du jour et les alertes restent fonctionnelles.
- [ ] Les listes Clients, Planning, Interventions, Bassins et Rapports restent accessibles.
- [ ] La navigation mobile est scrollable et chaque action atteint 44 px.

## 6. Accessibilité

- [ ] Navigation intégrale au clavier.
- [ ] Focus visible sur boutons, liens, onglets et options.
- [ ] `prefers-reduced-motion` supprime les translations décoratives.
- [ ] Les images informatives ont un texte alternatif localisé.
- [ ] Les doublons décoratifs des images ont un `alt` vide.
- [ ] Le zoom navigateur à 200 % ne masque aucune action principale.

## 7. Non-régression métier

- [ ] Aucune migration ajoutée.
- [ ] Aucun prix, plan ou entitlement modifié.
- [ ] Aucun appel API supprimé ou remplacé.
- [ ] Aucun secret ajouté au dépôt.
- [ ] Lint, TypeScript, traductions, smoke tests et build production sont verts.

## Critère de sortie

La PR peut quitter le statut brouillon uniquement lorsque :

1. GitHub Actions est vert sur la tête de branche ;
2. une Preview Vercel fonctionnelle est disponible ;
3. les cinq viewports canoniques ont été contrôlés ;
4. les parcours Particulier, onboarding, diagnostic et Pro ont été validés ;
5. aucun changement métier, tarifaire ou de données n’est détecté.
