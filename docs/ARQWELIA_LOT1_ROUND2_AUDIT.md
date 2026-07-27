# ARQWELIA Lot 1 — Round 2 Audit (before)

> Captures d'avant dans `docs/design-vision/arqwelia-lot1/_before/`.
> Réalignement visuel sur la direction « 7 of 10 » : premium, bleu nuit profond,
> cyan/aqua lumineux, champagne discret, serif premium + sans moderne, symbole
> eau + projet + localisation + mise en relation, grandes photographies/
> visualisations, cartes profondes, avant/après, présence IA + AR + pros
> vérifiés, expérience qualitative internationale rassurante.

## Écarts par rapport à la direction premium

### Transverses
- **Palette trop plate** : `arq-navy` est un navy unique, il manque un navy
  secondaire + des bordures translucides + des ombres profondes + des lueurs
  aqua contrôlées. Aucun gradient premium défini comme token.
- **Typographie** : `font-aq-display` (Cormorant Garamond) existe mais n'est
  utilisé que pour 3 titres. La combinaison serif+sans n'est pas systématisée.
- **Pas de symbole de marque** : AUCUN symbole associant eau + projet +
  localisation + mise en relation. Le header n'affiche que le mot "AQWELIA".
- **Pas de photographie/visualisation riche** : zieéro. Tout est fond uni.
  Aucune grande photo de piscine, aucun avant/après, aucune visualisation AR.
- **Cards trop génériques** : `border + bg-arq-ink/40` partout. Pas de glass,
  pas de bordure translucide, pas de profondeur.
- **Boutons** : `bg-arq-aqua text-arq-navy` générique, pas de状态 (hover
  glow), pas de variante secondaire premium.

### `/arqwelia` (landing)
- Hero : titre + 2 CTA sur fond uni — **trop vide**, pas de visuel, pas de
  badge, pas de photo premium, AR grid trop subtil.
- Bande de confiance : une simple ligne de texte — pas de cartes, pas d'icônes.
- Parcours : 4 cartes génériques (pas 7 étapes), pas de distinction
  opérationnel/démonstration/forthcoming.
- Pas de section avant/après.
- Pas de section IA + AR.
- Reality Score : non montré visuellement.
- Project Passport : un simple paragraphe — pas de carte premium, pas d'aperçu.
- Pros vérifiés : absent (uniquement le formulaire waitlist, pas de "pros
  vérifiés" comme promesse).
- Confidentialité : encart sobre — manque de visuels rassurants.
- FAQ : détails natifs basiques — OK mais peu premium.
- CTA final : sobre, pas de scenographie.

### `/arqwelia/start/photos`
- Zone d'upload : dashed border générique. Pas d'état vide premium (icône
 _upload seule). Pas de message explicite quand sessionStorage plein.
- Conseils : liste à puces sobre.
- Pas de grille AR subtile, pas de visuel premium.

### `/arqwelia/start/project`
- Cartes de choix : boutons plats `border + bg`. Passent à côté de l'identité
  premium. Pas de progression visible (h-1 strip muet).
- Mesure connue : 3 inputs plats.

### `/arqwelia/start/analysis`
- Badge démo présent (OK). Mais desc dit "Vous regardez une simulation" —
  bien. Manque : séparation claire entre **déclaré** (par l'utilisateur) et
  **estimé (démo)**. Le score s'affiche mais sans mise en scène premium
  (pas de jauge, pas d'arrière-plan riche).
- Pas de visuel d'"analyse" (grille AR, calques).

### `/arqwelia/start/concepts`
- Cards A/B : previews en gradients plats + silhouette CSS simple. **Trop
  maigre** pour la direction premium. Pas de distinction visuelle forte
  Réaliste/Inspiration. Pas d'avant/après. Pas de badges premium.
- Desktop 1440 : rendu correct mais peu immersif.

### `/arqwelia/start/contact`
- Form plats. Pourquoi les coordonnées ? Précisé mais sans mise en scène
  premium (pas d'encart confidentité premium, pas de puce "Vous choisissez").

### `/arqwelia/start/success`
- Carte sobre avec publicId + score + 3 actions. **Pas un Project Passport
  premium** : passe à côté de l'identité "Passeport / dossier premium".
  Statut privé pas marqué. Prochaines étapes absentes.

### `/pro/arqwelia/opportunities`
- Table sobre. Pas d'identité "ARQWELIA Studio". Manque : informations
  manquantes, disponibilité future matching, explication du bouton désactivé.

## Desktop / mobile
- Landing mobile 390 : OK mais hero sans visuel reste faible.
- Concepts desktop 1440 : 2 colonnes — OK mais peu immersif.
- Questionnaire mobile : OK mais cartes de choix peu premium.

## Feature flag / nav
- Aucun point d'entrée ARQWELIA dans le dashboard particulier ni l'espace
  Pro. La nav publique ne mentionne pas ARQWELIA quand le flag est on.

## i18n
- `arqwelia` namespace présent dans les 7 locales, mais ES/DE/IT/PT/NL
  contiennent des valeurs FR (= faux multilingue). Décision Round 2 : Option B
  — limiter à FR+EN, retirer le namespace des 5 autres locales, documenter.

## Prisma
- Schéma ok mais livré via `db push` seulement. Pas de migration
  reproductible. À corriger (migration additive).