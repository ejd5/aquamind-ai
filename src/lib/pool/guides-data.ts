// Catalogue de guides pédagogiques — vrai contenu structuré
// Sert le Resource Hub + le moteur de recommandation de guide
//
// i18n strategy: each Guide exposes `titleKey` / `summaryKey` (under the
// `guidesData` namespace, pattern `guides.<id>.title`) plus per-step
// `titleKey` / `detailKey` / `tipKey?` / `warningKey?` (pattern
// `guides.<id>.steps.<n>.title`). French literals are kept as legacy fallback.
// Categories already use the existing `cat_<id>` keys.

export interface GuideStep {
  title: string           // French fallback (legacy)
  titleKey: string        // translation key
  detail: string          // French fallback (legacy)
  detailKey: string       // translation key
  tip?: string            // French fallback (legacy)
  tipKey?: string         // translation key
  warning?: string        // French fallback (legacy)
  warningKey?: string     // translation key
}

export interface Guide {
  id: string
  title: string           // French fallback (legacy)
  titleKey: string        // translation key, e.g. 'green-water.title'
  category: 'problems' | 'products' | 'equipment' | 'weather_seasons' | 'safety' | 'getting_started' | 'treatments' | 'faq'
  categoryLabelKey: string  // e.g. 'cat_problems' (existing key in guidesData namespace)
  summary: string         // French fallback (legacy)
  summaryKey: string      // translation key
  durationMin: number
  level: 'beginner' | 'intermediate' | 'expert'
  tags: string[]
  steps: GuideStep[]
  relatedGuideIds?: string[]
  videoTitle?: string
}

export const CATEGORIES: { id: Guide['category']; label: string; labelKey: string; icon: string }[] = [
  { id: 'getting_started', label: 'Débuter', labelKey: 'cat_getting_started', icon: '🚀' },
  { id: 'problems', label: "Problèmes d'eau", labelKey: 'cat_problems', icon: '⚠️' },
  { id: 'products', label: 'Produits & dosages', labelKey: 'cat_products', icon: '⚗️' },
  { id: 'equipment', label: 'Équipements', labelKey: 'cat_equipment', icon: '🔧' },
  { id: 'weather_seasons', label: 'Météo & saisons', labelKey: 'cat_weather_seasons', icon: '🌤️' },
  { id: 'safety', label: 'Sécurité & baignade', labelKey: 'cat_safety', icon: '🛟' },
  { id: 'treatments', label: 'Traitements (chlore/sel/brome)', labelKey: 'cat_treatments', icon: '💊' },
  { id: 'faq', label: 'FAQ', labelKey: 'cat_faq', icon: '❓' },
]

// Helper to build step keys from guide id + step index (1-based).
function stepKey(id: string, n: number, field: 'title' | 'detail' | 'tip' | 'warning'): string {
  return `${id}.steps.${n}.${field}`
}

export const GUIDES: Guide[] = [
  {
    id: 'green-water',
    title: "Eau verte : diagnostic et plan d'action",
    titleKey: 'green-water.title',
    category: 'problems',
    categoryLabelKey: 'cat_problems',
    summary: "Identifier la cause d'une eau verte et la traiter étape par étape sans surdoser.",
    summaryKey: 'green-water.summary',
    durationMin: 8,
    level: 'beginner',
    tags: ['algues', 'chlore', 'vert', 'filtration'],
    steps: [
      {
        title: 'Mesurer pH et chlore libre',
        titleKey: stepKey('green-water', 1, 'title'),
        detail: 'Une eau verte est presque toujours due à un manque de désinfectant ou un pH déséquilibré.',
        detailKey: stepKey('green-water', 1, 'detail'),
        warning: "Ne jamais ajouter d'anti-algues avant d'avoir équilibré le pH.",
        warningKey: stepKey('green-water', 1, 'warning'),
      },
      {
        title: 'Équilibrer le pH (7.0-7.4)',
        titleKey: stepKey('green-water', 2, 'title'),
        detail: 'Si le pH est > 7.4, ajoutez du pH- dilué. Attendez 2-3h de filtration.',
        detailKey: stepKey('green-water', 2, 'detail'),
        tip: 'Le chlore est 10x plus efficace à pH 7.2 qu\'à pH 8.0.',
        tipKey: stepKey('green-water', 2, 'tip'),
      },
      {
        title: 'Brosser les parois et le fond',
        titleKey: stepKey('green-water', 3, 'title'),
        detail: "Décrocher les algues aide le traitement à pénétrer.",
        detailKey: stepKey('green-water', 3, 'detail'),
      },
      {
        title: 'Faire un traitement choc',
        titleKey: stepKey('green-water', 4, 'title'),
        detail: 'Chlore choc (après pH équilibré). Filtration continue 24h.',
        detailKey: stepKey('green-water', 4, 'detail'),
        warning: 'Baignade interdite 8h minimum après le choc.',
        warningKey: stepKey('green-water', 4, 'warning'),
      },
      {
        title: 'Ajouter un anti-algues curatif',
        titleKey: stepKey('green-water', 5, 'title'),
        detail: "Après le choc, l'anti-algues prévient la repousse.",
        detailKey: stepKey('green-water', 5, 'detail'),
      },
      {
        title: 'Filtrer en continu 24-48h',
        titleKey: stepKey('green-water', 6, 'title'),
        detail: 'La filtration est aussi importante que les produits.',
        detailKey: stepKey('green-water', 6, 'detail'),
      },
      {
        title: 'Re-tester après 24h',
        titleKey: stepKey('green-water', 7, 'title'),
        detail: "Vérifiez pH et chlore. Si l'eau reste verte, le filtre est peut-être à nettoyer.",
        detailKey: stepKey('green-water', 7, 'detail'),
      },
    ],
    relatedGuideIds: ['filter-backwash', 'chlorine-shock'],
  },
  {
    id: 'cloudy-water',
    title: 'Eau trouble ou laiteuse',
    titleKey: 'cloudy-water.title',
    category: 'problems',
    categoryLabelKey: 'cat_problems',
    summary: "Distinguer les causes d'une eau trouble et appliquer le bon traitement.",
    summaryKey: 'cloudy-water.summary',
    durationMin: 7,
    level: 'beginner',
    tags: ['trouble', 'filtration', 'floculant'],
    steps: [
      {
        title: 'Vérifier la filtration',
        titleKey: stepKey('cloudy-water', 1, 'title'),
        detail: "80% des eaux troubles viennent d'un problème de filtration. Vérifiez pression, durée, propreté du filtre.",
        detailKey: stepKey('cloudy-water', 1, 'detail'),
      },
      {
        title: 'Tester pH et chlore',
        titleKey: stepKey('cloudy-water', 2, 'title'),
        detail: 'pH hors plage ou chlore bas = eau trouble.',
        detailKey: stepKey('cloudy-water', 2, 'detail'),
      },
      {
        title: 'Nettoyer ou backwash le filtre',
        titleKey: stepKey('cloudy-water', 3, 'title'),
        detail: 'Filtre encrassé = eau trouble.',
        detailKey: stepKey('cloudy-water', 3, 'detail'),
      },
      {
        title: 'Utiliser un floculant (si filtre à sable)',
        titleKey: stepKey('cloudy-water', 4, 'title'),
        detail: 'Le floculant agglomère les particules fines pour que le filtre les retienne.',
        detailKey: stepKey('cloudy-water', 4, 'detail'),
        warning: 'Floculant uniquement avec filtre à sable. Pas avec cartouche.',
        warningKey: stepKey('cloudy-water', 4, 'warning'),
      },
      {
        title: 'Filtrer 24h puis aspirer les dépôts',
        titleKey: stepKey('cloudy-water', 5, 'title'),
        detail: 'Après floculation, des dépôts se forment au fond : aspirez-les.',
        detailKey: stepKey('cloudy-water', 5, 'detail'),
      },
    ],
    relatedGuideIds: ['filter-backwash'],
  },
  {
    id: 'chlorine-shock',
    title: 'Quand et comment faire un chlore choc',
    titleKey: 'chlorine-shock.title',
    category: 'products',
    categoryLabelKey: 'cat_products',
    summary: 'Le traitement choc : indications, dosage, sécurité, délais baignade.',
    summaryKey: 'chlorine-shock.summary',
    durationMin: 6,
    level: 'intermediate',
    tags: ['chlore', 'choc', 'sécurité'],
    steps: [
      {
        title: 'Vérifier le pH AVANT',
        titleKey: stepKey('chlorine-shock', 1, 'title'),
        detail: "Un choc est inefficace si le pH > 7.6. Équilibrez d'abord.",
        detailKey: stepKey('chlorine-shock', 1, 'detail'),
        warning: 'Ne JAMAIS faire un choc sans avoir vérifié le pH.',
        warningKey: stepKey('chlorine-shock', 1, 'warning'),
      },
      {
        title: 'Choisir le bon moment',
        titleKey: stepKey('chlorine-shock', 2, 'title'),
        detail: 'Le soir, sans baigneurs, filtration en marche.',
        detailKey: stepKey('chlorine-shock', 2, 'detail'),
      },
      {
        title: 'Doser selon le volume',
        titleKey: stepKey('chlorine-shock', 3, 'title'),
        detail: 'AQWELIA calcule la quantité selon votre volume de bassin.',
        detailKey: stepKey('chlorine-shock', 3, 'detail'),
      },
      {
        title: 'Dissoudre dans un seau',
        titleKey: stepKey('chlorine-shock', 4, 'title'),
        detail: 'Ne jamais verser le choc en poudre directement au bord.',
        detailKey: stepKey('chlorine-shock', 4, 'detail'),
      },
      {
        title: 'Filtrer 4h minimum',
        titleKey: stepKey('chlorine-shock', 5, 'title'),
        detail: 'Le chlore doit être bien réparti.',
        detailKey: stepKey('chlorine-shock', 5, 'detail'),
      },
      {
        title: 'Attendre 8h avant baignade',
        titleKey: stepKey('chlorine-shock', 6, 'title'),
        detail: 'Vérifiez le chlore libre avant de se baigner (doit être < 3 mg/L).',
        detailKey: stepKey('chlorine-shock', 6, 'detail'),
        warning: 'Baignade interdite pendant 8h minimum.',
        warningKey: stepKey('chlorine-shock', 6, 'warning'),
      },
    ],
    relatedGuideIds: ['green-water', 'combined-chlorine'],
  },
  {
    id: 'combined-chlorine',
    title: 'Odeur forte de chlore et yeux qui piquent',
    titleKey: 'combined-chlorine.title',
    category: 'problems',
    categoryLabelKey: 'cat_problems',
    summary: "Comprendre les chloramines et comment s'en débarrasser.",
    summaryKey: 'combined-chlorine.summary',
    durationMin: 5,
    level: 'intermediate',
    tags: ['chloramines', 'odeur', 'yeux', 'choc'],
    steps: [
      {
        title: 'Comprendre la cause',
        titleKey: stepKey('combined-chlorine', 1, 'title'),
        detail: "L'odeur forte de chlore n'est PAS un excès de chlore : ce sont les chloramines (chlore combiné), sous-produits de la désinfection.",
        detailKey: stepKey('combined-chlorine', 1, 'detail'),
      },
      {
        title: 'Mesurer chlore libre ET total',
        titleKey: stepKey('combined-chlorine', 2, 'title'),
        detail: 'Chlore combiné = chlore total - chlore libre. Si > 0.4 mg/L, traitement nécessaire.',
        detailKey: stepKey('combined-chlorine', 2, 'detail'),
      },
      {
        title: 'Faire un traitement choc',
        titleKey: stepKey('combined-chlorine', 3, 'title'),
        detail: 'Le choc casse les chloramines et libère du chlore libre actif.',
        detailKey: stepKey('combined-chlorine', 3, 'detail'),
      },
      {
        title: 'Vérifier le pH',
        titleKey: stepKey('combined-chlorine', 4, 'title'),
        detail: 'Un pH haut aggrave les chloramines.',
        detailKey: stepKey('combined-chlorine', 4, 'detail'),
      },
    ],
    relatedGuideIds: ['chlorine-shock'],
  },
  {
    id: 'filter-backwash',
    title: 'Backwash (contre-lavage) du filtre à sable',
    titleKey: 'filter-backwash.title',
    category: 'equipment',
    categoryLabelKey: 'cat_equipment',
    summary: 'Quand et comment faire un backwash efficacement.',
    summaryKey: 'filter-backwash.summary',
    durationMin: 5,
    level: 'beginner',
    tags: ['filtre', 'backwash', 'sable'],
    steps: [
      {
        title: 'Quand backwash ?',
        titleKey: stepKey('filter-backwash', 1, 'title'),
        detail: "Quand la pression monte de 0.3-0.5 bar au-dessus de la pression de service, ou toutes les 2-4 semaines.",
        detailKey: stepKey('filter-backwash', 1, 'detail'),
      },
      {
        title: 'Éteindre la pompe',
        titleKey: stepKey('filter-backwash', 2, 'title'),
        detail: 'TOUJOURS éteindre la pompe avant de manipuler la vanne.',
        detailKey: stepKey('filter-backwash', 2, 'detail'),
        warning: 'Risque électrique et matériel.',
        warningKey: stepKey('filter-backwash', 2, 'warning'),
      },
      {
        title: 'Placer la vanne sur BACKWASH',
        titleKey: stepKey('filter-backwash', 3, 'title'),
        detail: 'Tourner fermement la vanne multivoies.',
        detailKey: stepKey('filter-backwash', 3, 'detail'),
      },
      {
        title: 'Rallumer la pompe 2-3 min',
        titleKey: stepKey('filter-backwash', 4, 'title'),
        detail: "L'eau s'écoule à l'égout jusqu'à ce qu'elle redevienne claire.",
        detailKey: stepKey('filter-backwash', 4, 'detail'),
      },
      {
        title: 'Éteindre, vanne sur RINSE 30s',
        titleKey: stepKey('filter-backwash', 5, 'title'),
        detail: 'Le rinçage re-tasse le sable et évite le retour de saletés.',
        detailKey: stepKey('filter-backwash', 5, 'detail'),
      },
      {
        title: 'Revenir en position FILTER',
        titleKey: stepKey('filter-backwash', 6, 'title'),
        detail: 'Remettre la vanne en filtration normale.',
        detailKey: stepKey('filter-backwash', 6, 'detail'),
      },
    ],
    relatedGuideIds: ['filter-cartridge-clean'],
  },
  {
    id: 'filter-cartridge-clean',
    title: 'Nettoyer un filtre à cartouche',
    titleKey: 'filter-cartridge-clean.title',
    category: 'equipment',
    categoryLabelKey: 'cat_equipment',
    summary: "Démontage et rinçage d'une cartouche de filtration.",
    summaryKey: 'filter-cartridge-clean.summary',
    durationMin: 6,
    level: 'beginner',
    tags: ['filtre', 'cartouche', 'nettoyage'],
    steps: [
      {
        title: 'Éteindre la pompe',
        titleKey: stepKey('filter-cartridge-clean', 1, 'title'),
        detail: "Couper l'alimentation électrique.",
        detailKey: stepKey('filter-cartridge-clean', 1, 'detail'),
        warning: 'Sécurité électrique obligatoire.',
        warningKey: stepKey('filter-cartridge-clean', 1, 'warning'),
      },
      {
        title: 'Démonter la cartouche',
        titleKey: stepKey('filter-cartridge-clean', 2, 'title'),
        detail: 'Ouvrir le corps du filtre selon le modèle.',
        detailKey: stepKey('filter-cartridge-clean', 2, 'detail'),
      },
      {
        title: 'Rincer au jet',
        titleKey: stepKey('filter-cartridge-clean', 3, 'title'),
        detail: 'Jet d\'eau doux, des haut vers le bas, entre les plis.',
        detailKey: stepKey('filter-cartridge-clean', 3, 'detail'),
      },
      {
        title: 'Tremper dans un nettoyant filtre (optionnel)',
        titleKey: stepKey('filter-cartridge-clean', 4, 'title'),
        detail: 'Tous les 2-3 nettoyages, dégraissage et détartrage.',
        detailKey: stepKey('filter-cartridge-clean', 4, 'detail'),
      },
      {
        title: 'Remonter et redémarrer',
        titleKey: stepKey('filter-cartridge-clean', 5, 'title'),
        detail: 'Bien repositionner les joints.',
        detailKey: stepKey('filter-cartridge-clean', 5, 'detail'),
      },
    ],
    relatedGuideIds: ['filter-backwash'],
  },
  {
    id: 'cell-clean',
    title: "Nettoyer la cellule de l'électrolyseur",
    titleKey: 'cell-clean.title',
    category: 'equipment',
    categoryLabelKey: 'cat_equipment',
    summary: "Détartrer la cellule d'électrolyseur au sel pour maintenir la production de chlore.",
    summaryKey: 'cell-clean.summary',
    durationMin: 10,
    level: 'intermediate',
    tags: ['électrolyseur', 'sel', 'cellule', 'tartre'],
    steps: [
      {
        title: "Couper l'alimentation",
        titleKey: stepKey('cell-clean', 1, 'title'),
        detail: 'Éteindre l\'électrolyseur et la pompe.',
        detailKey: stepKey('cell-clean', 1, 'detail'),
        warning: "Sécurité électrique. Ne jamais manipuler la cellule sous tension.",
        warningKey: stepKey('cell-clean', 1, 'warning'),
      },
      {
        title: 'Démonter la cellule',
        titleKey: stepKey('cell-clean', 2, 'title'),
        detail: 'Dévisser selon le modèle. Vérifier l\'état des électrodes.',
        detailKey: stepKey('cell-clean', 2, 'detail'),
      },
      {
        title: 'Préparer une solution acide diluée',
        titleKey: stepKey('cell-clean', 3, 'title'),
        detail: '1/3 acide chlorhydrique + 2/3 eau dans un récipient plastique.',
        detailKey: stepKey('cell-clean', 3, 'detail'),
        warning: "TOUJOURS verser l'acide dans l'eau, jamais l'inverse. Gants et lunettes obligatoires. Aération.",
        warningKey: stepKey('cell-clean', 3, 'warning'),
      },
      {
        title: 'Tremper 10-15 min',
        titleKey: stepKey('cell-clean', 4, 'title'),
        detail: "Le tartre se dissout. Ne pas laisser trop longtemps.",
        detailKey: stepKey('cell-clean', 4, 'detail'),
      },
      {
        title: 'Rincer abondamment',
        titleKey: stepKey('cell-clean', 5, 'title'),
        detail: "À l'eau claire jusqu'à disparition de l'odeur.",
        detailKey: stepKey('cell-clean', 5, 'detail'),
      },
      {
        title: 'Remonter et redémarrer',
        titleKey: stepKey('cell-clean', 6, 'title'),
        detail: "Vérifier la production sur l'afficheur.",
        detailKey: stepKey('cell-clean', 6, 'detail'),
      },
    ],
    relatedGuideIds: ['salt-system-basics'],
  },
  {
    id: 'salt-system-basics',
    title: 'Comprendre son électrolyseur au sel',
    titleKey: 'salt-system-basics.title',
    category: 'treatments',
    categoryLabelKey: 'cat_treatments',
    summary: 'Principe, taux de sel, production, entretien courant.',
    summaryKey: 'salt-system-basics.summary',
    durationMin: 8,
    level: 'intermediate',
    tags: ['sel', 'électrolyseur', 'traitement'],
    steps: [
      {
        title: 'Le principe',
        titleKey: stepKey('salt-system-basics', 1, 'title'),
        detail: "Le sel (NaCl) est électrolysé en chlore actif in-situ. Pas de stockage de chlore, eau plus douce.",
        detailKey: stepKey('salt-system-basics', 1, 'detail'),
      },
      {
        title: 'Taux de sel requis',
        titleKey: stepKey('salt-system-basics', 2, 'title'),
        detail: 'Selon le modèle : généralement 3-7 g/L. Vérifiez la notice. Trop bas = pas de production ; trop haut = surconsommation.',
        detailKey: stepKey('salt-system-basics', 2, 'detail'),
      },
      {
        title: 'Stabilisant (CYA) indispensable',
        titleKey: stepKey('salt-system-basics', 3, 'title'),
        detail: 'Sans stabilisant, le chlore produit est détruit par le soleil en 2h.',
        detailKey: stepKey('salt-system-basics', 3, 'detail'),
      },
      {
        title: 'Surveiller le pH',
        titleKey: stepKey('salt-system-basics', 4, 'title'),
        detail: "L'électrolyseur fait monter le pH. Régulation fréquente nécessaire.",
        detailKey: stepKey('salt-system-basics', 4, 'detail'),
      },
      {
        title: 'Production selon température',
        titleKey: stepKey('salt-system-basics', 5, 'title'),
        detail: "En eau froide (< 15°C), la production chute. Ne pas s'inquiéter en hiver.",
        detailKey: stepKey('salt-system-basics', 5, 'detail'),
      },
      {
        title: 'Entretien cellule',
        titleKey: stepKey('salt-system-basics', 6, 'title'),
        detail: "Nettoyage acide tous les 3-6 mois selon dureté de l'eau.",
        detailKey: stepKey('salt-system-basics', 6, 'detail'),
      },
    ],
    relatedGuideIds: ['cell-clean'],
  },
  {
    id: 'ph-control',
    title: 'Maîtriser son pH',
    titleKey: 'ph-control.title',
    category: 'products',
    categoryLabelKey: 'cat_products',
    summary: "Pourquoi le pH est le paramètre n°1, comment l'ajuster.",
    summaryKey: 'ph-control.summary',
    durationMin: 6,
    level: 'beginner',
    tags: ['ph', 'équilibrage'],
    steps: [
      {
        title: 'Le pH est prioritaire',
        titleKey: stepKey('ph-control', 1, 'title'),
        detail: "Tout part du pH : efficacité du chlore, confort baignade, protection équipements.",
        detailKey: stepKey('ph-control', 1, 'detail'),
      },
      {
        title: 'Plage idéale 7.0-7.4',
        titleKey: stepKey('ph-control', 2, 'title'),
        detail: 'Plus près de 7.2 = chlore optimal.',
        detailKey: stepKey('ph-control', 2, 'detail'),
      },
      {
        title: 'Ajuster le TAC avant le pH si instable',
        titleKey: stepKey('ph-control', 3, 'title'),
        detail: 'Un TAC bas rend le pH instable.',
        detailKey: stepKey('ph-control', 3, 'detail'),
      },
      {
        title: 'Doser par petite quantité',
        titleKey: stepKey('ph-control', 4, 'title'),
        detail: 'Ne jamais modifier le pH de plus de 0.3 d\'un coup.',
        detailKey: stepKey('ph-control', 4, 'detail'),
      },
      {
        title: 'Filtrer 2-3h puis re-tester',
        titleKey: stepKey('ph-control', 5, 'title'),
        detail: 'Le mélange doit être homogène.',
        detailKey: stepKey('ph-control', 5, 'detail'),
      },
    ],
    relatedGuideIds: ['tac-control'],
  },
  {
    id: 'tac-control',
    title: "Comprendre l'alcalinité (TAC)",
    titleKey: 'tac-control.title',
    category: 'products',
    categoryLabelKey: 'cat_products',
    summary: 'Le TAC est le tampon du pH. Sans bon TAC, le pH devient instable.',
    summaryKey: 'tac-control.summary',
    durationMin: 6,
    level: 'intermediate',
    tags: ['tac', 'alcalinité', 'ph'],
    steps: [
      {
        title: 'Rôle du TAC',
        titleKey: stepKey('tac-control', 1, 'title'),
        detail: "Le TAC (alcalinité totale) stabilise le pH. Sans lui, le pH saute à chaque ajout de produit.",
        detailKey: stepKey('tac-control', 1, 'detail'),
      },
      {
        title: 'Plage idéale 80-120 mg/L',
        titleKey: stepKey('tac-control', 2, 'title'),
        detail: 'Cible 100 mg/L.',
        detailKey: stepKey('tac-control', 2, 'detail'),
      },
      {
        title: 'Ajuster AVANT le pH',
        titleKey: stepKey('tac-control', 3, 'title'),
        detail: "Toujours équilibrer le TAC d'abord, sinon le pH ne tiendra pas.",
        detailKey: stepKey('tac-control', 3, 'detail'),
      },
      {
        title: 'Pour remonter : bicarbonate de sodium',
        titleKey: stepKey('tac-control', 4, 'title'),
        detail: 'Diluer, répartir, filtration 3h.',
        detailKey: stepKey('tac-control', 4, 'detail'),
      },
      {
        title: 'Pour baisser : acide',
        titleKey: stepKey('tac-control', 5, 'title'),
        detail: 'Plus complexe, se fait lentement avec un pH-.',
        detailKey: stepKey('tac-control', 5, 'detail'),
      },
    ],
    relatedGuideIds: ['ph-control'],
  },
  {
    id: 'after-storm',
    title: 'Que faire après un orage ?',
    titleKey: 'after-storm.title',
    category: 'weather_seasons',
    categoryLabelKey: 'cat_weather_seasons',
    summary: "L'orage dilue le chlore et modifie le pH. Routine post-orage.",
    summaryKey: 'after-storm.summary',
    durationMin: 4,
    level: 'beginner',
    tags: ['orage', 'météo', 'chlore'],
    steps: [
      {
        title: 'Tester pH et chlore',
        titleKey: stepKey('after-storm', 1, 'title'),
        detail: "L'orage acidifie souvent l'eau et dilue le chlore.",
        detailKey: stepKey('after-storm', 1, 'detail'),
      },
      {
        title: 'Nettoyer skimmer et panier',
        titleKey: stepKey('after-storm', 2, 'title'),
        detail: 'Débris apportés par la pluie et le vent.',
        detailKey: stepKey('after-storm', 2, 'detail'),
      },
      {
        title: 'Ajuster le pH si nécessaire',
        titleKey: stepKey('after-storm', 3, 'title'),
        detail: "Priorité au pH avant tout ajout de chlore.",
        detailKey: stepKey('after-storm', 3, 'detail'),
      },
      {
        title: 'Compléter le chlore si bas',
        titleKey: stepKey('after-storm', 4, 'title'),
        detail: 'Chlore lent ou choc selon l\'écart.',
        detailKey: stepKey('after-storm', 4, 'detail'),
      },
      {
        title: 'Filtrer 4-6h',
        titleKey: stepKey('after-storm', 5, 'title'),
        detail: 'Bien répartir les corrections.',
        detailKey: stepKey('after-storm', 5, 'detail'),
      },
    ],
    relatedGuideIds: ['ph-control', 'chlorine-shock'],
  },
  {
    id: 'vacation-mode',
    title: 'Avant de partir en vacances',
    titleKey: 'vacation-mode.title',
    category: 'weather_seasons',
    categoryLabelKey: 'cat_weather_seasons',
    summary: 'Préparer sa piscine pour une absence de plusieurs jours/semaines.',
    summaryKey: 'vacation-mode.summary',
    durationMin: 7,
    level: 'intermediate',
    tags: ['vacances', 'absence', 'prévention'],
    steps: [
      {
        title: 'Faire un test complet',
        titleKey: stepKey('vacation-mode', 1, 'title'),
        detail: 'Tout équilibrer avant le départ : pH, chlore, TAC.',
        detailKey: stepKey('vacation-mode', 1, 'detail'),
      },
      {
        title: 'Chlore choc la veille',
        titleKey: stepKey('vacation-mode', 2, 'title'),
        detail: 'Désinfecter en profondeur.',
        detailKey: stepKey('vacation-mode', 2, 'detail'),
      },
      {
        title: 'Remplir le distributeur de chlore lent',
        titleKey: stepKey('vacation-mode', 3, 'title'),
        detail: "Pour une absence < 1 semaine.",
        detailKey: stepKey('vacation-mode', 3, 'detail'),
      },
      {
        title: 'Régler la minuterie filtration',
        titleKey: stepKey('vacation-mode', 4, 'title'),
        detail: "Au moins 4-6h/jour, de préférence la nuit.",
        detailKey: stepKey('vacation-mode', 4, 'detail'),
      },
      {
        title: 'Couvrir la piscine',
        titleKey: stepKey('vacation-mode', 5, 'title'),
        detail: 'Bâche ou volet : limite débris et évaporation.',
        detailKey: stepKey('vacation-mode', 5, 'detail'),
      },
      {
        title: 'Pour une longue absence : voisin ou robot',
        titleKey: stepKey('vacation-mode', 6, 'title'),
        detail: 'Faites vérifier ou installez un robot.',
        detailKey: stepKey('vacation-mode', 6, 'detail'),
      },
      {
        title: 'Selon saison : hivernage actif ou passif',
        titleKey: stepKey('vacation-mode', 7, 'title'),
        detail: 'En été, filtration réduite suffit. En hiver, hivernage complet.',
        detailKey: stepKey('vacation-mode', 7, 'detail'),
      },
    ],
    relatedGuideIds: ['winterization', 'startup'],
  },
  {
    id: 'winterization',
    title: 'Hiverner sa piscine',
    titleKey: 'winterization.title',
    category: 'weather_seasons',
    categoryLabelKey: 'cat_weather_seasons',
    summary: "Mettre la piscine en hivernage pour l'hiver sans abîmer les équipements.",
    summaryKey: 'winterization.summary',
    durationMin: 10,
    level: 'intermediate',
    tags: ['hiver', 'hivernage', 'saison'],
    steps: [
      {
        title: 'Choisir hivernage actif ou passif',
        titleKey: stepKey('winterization', 1, 'title'),
        detail: 'Actif : filtration réduite. Passif : arrêt total. Dépend du climat.',
        detailKey: stepKey('winterization', 1, 'detail'),
      },
      {
        title: 'Nettoyer en profondeur',
        titleKey: stepKey('winterization', 2, 'title'),
        detail: 'Eau, parois, fond, filtre, ligne d\'eau.',
        detailKey: stepKey('winterization', 2, 'detail'),
      },
      {
        title: "Faire un traitement d'hiver",
        titleKey: stepKey('winterization', 3, 'title'),
        detail: "Produit d'hivernage anti-algues et anticalcaire.",
        detailKey: stepKey('winterization', 3, 'detail'),
      },
      {
        title: 'Baisser le niveau d\'eau',
        titleKey: stepKey('winterization', 4, 'title'),
        detail: '10-15 cm sous les buses pour passif.',
        detailKey: stepKey('winterization', 4, 'detail'),
      },
      {
        title: 'Vider les canalisations sensibles',
        titleKey: stepKey('winterization', 5, 'title'),
        detail: 'Protéger du gel.',
        detailKey: stepKey('winterization', 5, 'detail'),
      },
      {
        title: 'Couvrir la piscine',
        titleKey: stepKey('winterization', 6, 'title'),
        detail: "Bâche d'hiver ou volet.",
        detailKey: stepKey('winterization', 6, 'detail'),
      },
      {
        title: 'Hivernage actif : filtration 2-3h/jour',
        titleKey: stepKey('winterization', 7, 'title'),
        detail: 'Surtout pendant les périodes de gel.',
        detailKey: stepKey('winterization', 7, 'detail'),
      },
    ],
    relatedGuideIds: ['startup'],
  },
  {
    id: 'startup',
    title: 'Remise en route au printemps',
    titleKey: 'startup.title',
    category: 'weather_seasons',
    categoryLabelKey: 'cat_weather_seasons',
    summary: "Réveiller sa piscine après l'hiver en douceur.",
    summaryKey: 'startup.summary',
    durationMin: 10,
    level: 'intermediate',
    tags: ['printemps', 'remise en route', 'saison'],
    steps: [
      {
        title: 'Retirer la couverture et nettoyer',
        titleKey: stepKey('startup', 1, 'title'),
        detail: 'Enlever feuilles et débris accumulés.',
        detailKey: stepKey('startup', 1, 'detail'),
      },
      {
        title: 'Remettre en eau si niveau bas',
        titleKey: stepKey('startup', 2, 'title'),
        detail: 'Refaire le niveau.',
        detailKey: stepKey('startup', 2, 'detail'),
      },
      {
        title: 'Démarrer la filtration',
        titleKey: stepKey('startup', 3, 'title'),
        detail: 'Vérifier le filtre (backwash si nécessaire).',
        detailKey: stepKey('startup', 3, 'detail'),
      },
      {
        title: 'Tester l\'eau',
        titleKey: stepKey('startup', 4, 'title'),
        detail: 'pH, chlore, TAC, stabilisant.',
        detailKey: stepKey('startup', 4, 'detail'),
      },
      {
        title: 'Équilibrer progressivement',
        titleKey: stepKey('startup', 5, 'title'),
        detail: 'TAC → pH → chlore. Pas de précipitation.',
        detailKey: stepKey('startup', 5, 'detail'),
      },
      {
        title: 'Faire un traitement choc',
        titleKey: stepKey('startup', 6, 'title'),
        detail: 'Pour repartir sur une base saine.',
        detailKey: stepKey('startup', 6, 'detail'),
      },
      {
        title: 'Vérifier les équipements',
        titleKey: stepKey('startup', 7, 'title'),
        detail: 'Pompe, électrolyseur, joints, manomètre.',
        detailKey: stepKey('startup', 7, 'detail'),
      },
    ],
    relatedGuideIds: ['winterization', 'filter-backwash'],
  },
  {
    id: 'swim-safety',
    title: 'Sécurité baignade : quand peut-on se baigner ?',
    titleKey: 'swim-safety.title',
    category: 'safety',
    categoryLabelKey: 'cat_safety',
    summary: 'Critères de sécurité pour une baignade sans risque.',
    summaryKey: 'swim-safety.summary',
    durationMin: 5,
    level: 'beginner',
    tags: ['sécurité', 'baignade'],
    steps: [
      {
        title: 'pH entre 7.0 et 7.6',
        titleKey: stepKey('swim-safety', 1, 'title'),
        detail: 'Hors de cette plage : irritation possible.',
        detailKey: stepKey('swim-safety', 1, 'detail'),
      },
      {
        title: 'Chlore libre entre 1 et 3 mg/L',
        titleKey: stepKey('swim-safety', 2, 'title'),
        detail: 'Moins = désinfection insuffisante. Plus = irritation.',
        detailKey: stepKey('swim-safety', 2, 'detail'),
      },
      {
        title: 'Chlore combiné < 0.4 mg/L',
        titleKey: stepKey('swim-safety', 3, 'title'),
        detail: 'Au-dessus : odeur forte, yeux qui piquent.',
        detailKey: stepKey('swim-safety', 3, 'detail'),
      },
      {
        title: 'Respecter les délais après traitement',
        titleKey: stepKey('swim-safety', 4, 'title'),
        detail: '2h après pH, 8h après chlore choc.',
        detailKey: stepKey('swim-safety', 4, 'detail'),
      },
      {
        title: 'En cas de doute : ne pas se baigner',
        titleKey: stepKey('swim-safety', 5, 'title'),
        detail: "Mieux vaut attendre un test qu'aller dans une eau douteuse.",
        detailKey: stepKey('swim-safety', 5, 'detail'),
      },
    ],
    relatedGuideIds: ['chlorine-shock', 'combined-chlorine'],
  },
  {
    id: 'product-safety',
    title: 'Sécurité produits chimiques',
    titleKey: 'product-safety.title',
    category: 'safety',
    categoryLabelKey: 'cat_safety',
    summary: "Les règles d'or pour manipuler et stocker les produits piscine.",
    summaryKey: 'product-safety.summary',
    durationMin: 6,
    level: 'beginner',
    tags: ['sécurité', 'produits', 'stockage'],
    steps: [
      {
        title: 'Ne JAMAIS mélanger les produits',
        titleKey: stepKey('product-safety', 1, 'title'),
        detail: 'Chlore + acide = gaz toxique mortel. Toujours diluer séparément.',
        detailKey: stepKey('product-safety', 1, 'detail'),
        warning: 'Règle absolue de survie.',
        warningKey: stepKey('product-safety', 1, 'warning'),
      },
      {
        title: "Toujours ajouter le produit dans l'eau",
        titleKey: stepKey('product-safety', 2, 'title'),
        detail: "Jamais l'eau dans le produit acide (projection).",
        detailKey: stepKey('product-safety', 2, 'detail'),
      },
      {
        title: 'Porter gants et lunettes',
        titleKey: stepKey('product-safety', 3, 'title'),
        detail: 'Surtout pour les acides et le chlore concentré.',
        detailKey: stepKey('product-safety', 3, 'detail'),
      },
      {
        title: 'Stocker au sec, frais, ventilé',
        titleKey: stepKey('product-safety', 4, 'title'),
        detail: 'Séparer acides et chlores. Hors portée des enfants.',
        detailKey: stepKey('product-safety', 4, 'detail'),
      },
      {
        title: 'Respecter les notices',
        titleKey: stepKey('product-safety', 5, 'title'),
        detail: "Chaque produit a ses règles de dosage et d'application.",
        detailKey: stepKey('product-safety', 5, 'detail'),
      },
      {
        title: "En cas d'incident : appeler le 15 ou le centre antipoison",
        titleKey: stepKey('product-safety', 6, 'title'),
        detail: 'Ne pas faire vomir, consulter immédiatement.',
        detailKey: stepKey('product-safety', 6, 'detail'),
      },
    ],
  },
  {
    id: 'getting-started',
    title: 'Débuter avec sa piscine',
    titleKey: 'getting-started.title',
    category: 'getting_started',
    categoryLabelKey: 'cat_getting_started',
    summary: "Les 10 premières choses à savoir quand on devient propriétaire d'une piscine.",
    summaryKey: 'getting-started.summary',
    durationMin: 12,
    level: 'beginner',
    tags: ['débutant', 'base', 'parcours'],
    steps: [
      {
        title: 'Connaître le volume de sa piscine',
        titleKey: stepKey('getting-started', 1, 'title'),
        detail: "Indispensable pour tout dosage. AQWELIA le calcule à partir des dimensions.",
        detailKey: stepKey('getting-started', 1, 'detail'),
      },
      {
        title: 'Comprendre le pH',
        titleKey: stepKey('getting-started', 2, 'title'),
        detail: 'Le paramètre n°1. Tout part de là.',
        detailKey: stepKey('getting-started', 2, 'detail'),
      },
      {
        title: 'Comprendre le chlore',
        titleKey: stepKey('getting-started', 3, 'title'),
        detail: 'Libre, total, combiné. AQWELIA vous guide.',
        detailKey: stepKey('getting-started', 3, 'detail'),
      },
      {
        title: 'Filtrer suffisamment',
        titleKey: stepKey('getting-started', 4, 'title'),
        detail: "Moitié de la température de l'eau en heures.",
        detailKey: stepKey('getting-started', 4, 'detail'),
      },
      {
        title: 'Tester 1-2x par semaine',
        titleKey: stepKey('getting-started', 5, 'title'),
        detail: 'Plus souvent par forte chaleur.',
        detailKey: stepKey('getting-started', 5, 'detail'),
      },
      {
        title: 'Entretenir le filtre',
        titleKey: stepKey('getting-started', 6, 'title'),
        detail: 'Backwash ou rinçage régulier.',
        detailKey: stepKey('getting-started', 6, 'detail'),
      },
      {
        title: 'Surveiller le niveau d\'eau',
        titleKey: stepKey('getting-started', 7, 'title'),
        detail: 'Trop bas = pompe en danger ; trop haut = skimmer inefficace.',
        detailKey: stepKey('getting-started', 7, 'detail'),
      },
      {
        title: 'Brosser et nettoyer la ligne d\'eau',
        titleKey: stepKey('getting-started', 8, 'title'),
        detail: 'Évite algues et dépôts.',
        detailKey: stepKey('getting-started', 8, 'detail'),
      },
      {
        title: 'Anticiper la météo',
        titleKey: stepKey('getting-started', 9, 'title'),
        detail: 'Orage, canicule, vacances : prévenir plutôt que guérir.',
        detailKey: stepKey('getting-started', 9, 'detail'),
      },
      {
        title: 'Garder un carnet',
        titleKey: stepKey('getting-started', 10, 'title'),
        detail: 'AQWELIA garde l\'historique pour vous.',
        detailKey: stepKey('getting-started', 10, 'detail'),
      },
    ],
    relatedGuideIds: ['ph-control', 'getting-started-spa'],
  },
  {
    id: 'getting-started-spa',
    title: 'Spécificités du spa',
    titleKey: 'getting-started-spa.title',
    category: 'getting_started',
    categoryLabelKey: 'cat_getting_started',
    summary: 'Le spa a ses règles : eau chaude, volume réduit, brome plutôt que chlore.',
    summaryKey: 'getting-started-spa.summary',
    durationMin: 8,
    level: 'intermediate',
    tags: ['spa', 'brome', 'chaud'],
    steps: [
      {
        title: 'Volume réduit = réactions rapides',
        titleKey: stepKey('getting-started-spa', 1, 'title'),
        detail: "L'eau tourne vite. Tests plus fréquents.",
        detailKey: stepKey('getting-started-spa', 1, 'detail'),
      },
      {
        title: 'Préférer le brome au chlore',
        titleKey: stepKey('getting-started-spa', 2, 'title'),
        detail: 'Le brome est plus stable à chaud et moins odorant.',
        detailKey: stepKey('getting-started-spa', 2, 'detail'),
      },
      {
        title: 'Température et pH',
        titleKey: stepKey('getting-started-spa', 3, 'title'),
        detail: 'Le pH bouge avec la température. Tester à température de bain.',
        detailKey: stepKey('getting-started-spa', 3, 'detail'),
      },
      {
        title: 'Choc hebdomadaire',
        titleKey: stepKey('getting-started-spa', 4, 'title'),
        detail: 'Plus nécessaire qu\'en piscine.',
        detailKey: stepKey('getting-started-spa', 4, 'detail'),
      },
      {
        title: 'Vidange périodique',
        titleKey: stepKey('getting-started-spa', 5, 'title'),
        detail: 'Tous les 3-4 mois selon usage.',
        detailKey: stepKey('getting-started-spa', 5, 'detail'),
      },
    ],
  },
  {
    id: 'faq-test-frequency',
    title: 'À quelle fréquence tester son eau ?',
    titleKey: 'faq-test-frequency.title',
    category: 'faq',
    categoryLabelKey: 'cat_faq',
    summary: 'Rythme recommandé selon saison et usage.',
    summaryKey: 'faq-test-frequency.summary',
    durationMin: 3,
    level: 'beginner',
    tags: ['test', 'fréquence', 'faq'],
    steps: [
      {
        title: 'En saison chaide',
        titleKey: stepKey('faq-test-frequency', 1, 'title'),
        detail: '2 fois par semaine minimum, plus si forte chaleur.',
        detailKey: stepKey('faq-test-frequency', 1, 'detail'),
      },
      {
        title: 'En saison froide (hivernage actif)',
        titleKey: stepKey('faq-test-frequency', 2, 'title'),
        detail: '1 fois tous les 15 jours.',
        detailKey: stepKey('faq-test-frequency', 2, 'detail'),
      },
      {
        title: 'Après tout traitement',
        titleKey: stepKey('faq-test-frequency', 3, 'title'),
        detail: 'Re-test dans les 3-24h selon produit.',
        detailKey: stepKey('faq-test-frequency', 3, 'detail'),
      },
      {
        title: 'Après orage',
        titleKey: stepKey('faq-test-frequency', 4, 'title'),
        detail: 'Test systématique.',
        detailKey: stepKey('faq-test-frequency', 4, 'detail'),
      },
      {
        title: 'Avant baignade si doute',
        titleKey: stepKey('faq-test-frequency', 5, 'title'),
        detail: 'Toujours.',
        detailKey: stepKey('faq-test-frequency', 5, 'detail'),
      },
    ],
  },
  {
    id: 'faq-cya-high',
    title: 'Mon stabilisant (CYA) est trop haut',
    titleKey: 'faq-cya-high.title',
    category: 'faq',
    categoryLabelKey: 'cat_faq',
    summary: 'Que faire quand le CYA dépasse 50-60 mg/L ?',
    summaryKey: 'faq-cya-high.summary',
    durationMin: 4,
    level: 'expert',
    tags: ['cya', 'stabilisant', 'dilution', 'faq'],
    steps: [
      {
        title: 'Pourquoi c\'est un problème',
        titleKey: stepKey('faq-cya-high', 1, 'title'),
        detail: 'Un CYA trop haut "bloque" le chlore : il est présent mais inactif. Risque algues malgré un chlore normal.',
        detailKey: stepKey('faq-cya-high', 1, 'detail'),
      },
      {
        title: 'Il n\'existe pas de produit pour baisser le CYA',
        titleKey: stepKey('faq-cya-high', 2, 'title'),
        detail: 'Seule solution : diluer l\'eau.',
        detailKey: stepKey('faq-cya-high', 2, 'detail'),
      },
      {
        title: 'Renouveler 20-30% de l\'eau',
        titleKey: stepKey('faq-cya-high', 3, 'title'),
        detail: 'Vidange partielle puis complément.',
        detailKey: stepKey('faq-cya-high', 3, 'detail'),
      },
      {
        title: 'Re-tester après renouvellement',
        titleKey: stepKey('faq-cya-high', 4, 'title'),
        detail: 'Vérifier la nouvelle valeur.',
        detailKey: stepKey('faq-cya-high', 4, 'detail'),
      },
      {
        title: 'À l\'avenir : utiliser moins de chlore stabilisé',
        titleKey: stepKey('faq-cya-high', 5, 'title'),
        detail: 'Préférer chlore non stabilisé ou électrolyseur.',
        detailKey: stepKey('faq-cya-high', 5, 'detail'),
      },
    ],
  },
]

// Moteur de recommandation de guide
export function recommendGuides(context: {
  problemDetected?: string
  photoType?: string
  weatherAlerts?: string[]
  isNewUser?: boolean
  hasSaltSystem?: boolean
  isSpa?: boolean
  season?: string
}): Guide[] {
  const recommended: Guide[] = []
  const seen = new Set<string>()

  const add = (id: string) => {
    if (seen.has(id)) return
    const g = GUIDES.find((x) => x.id === id)
    if (g) { recommended.push(g); seen.add(id) }
  }

  if (context.isNewUser) add('getting-started')
  if (context.isSpa) add('getting-started-spa')
  if (context.hasSaltSystem) add('salt-system-basics')

  if (context.problemDetected === 'green') add('green-water')
  if (context.problemDetected === 'cloudy') add('cloudy-water')
  if (context.problemDetected === 'smell') add('combined-chlorine')
  if (context.problemDetected === 'low_chlorine') add('chlorine-shock')
  if (context.problemDetected === 'high_cya') add('faq-cya-high')

  if (context.photoType === 'filter') { add('filter-backwash'); add('filter-cartridge-clean') }
  if (context.photoType === 'electrolyzer') add('cell-clean')

  if (context.weatherAlerts?.includes('storm')) add('after-storm')
  if (context.weatherAlerts?.includes('heat')) add('ph-control')

  if (context.season === 'spring') add('startup')
  if (context.season === 'autumn') add('winterization')

  return recommended.slice(0, 4)
}
