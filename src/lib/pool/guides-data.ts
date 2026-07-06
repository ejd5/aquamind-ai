// Catalogue de guides pédagogiques — vrai contenu structuré
// Sert le Resource Hub + le moteur de recommandation de guide

export interface GuideStep {
  title: string
  detail: string
  tip?: string
  warning?: string
}

export interface Guide {
  id: string
  title: string
  category: 'problems' | 'products' | 'equipment' | 'weather_seasons' | 'safety' | 'getting_started' | 'treatments' | 'faq'
  summary: string
  durationMin: number
  level: 'beginner' | 'intermediate' | 'expert'
  tags: string[]
  steps: GuideStep[]
  relatedGuideIds?: string[]
  videoTitle?: string
}

export const CATEGORIES: { id: Guide['category']; label: string; icon: string }[] = [
  { id: 'getting_started', label: 'Débuter', icon: '🚀' },
  { id: 'problems', label: "Problèmes d'eau", icon: '⚠️' },
  { id: 'products', label: 'Produits & dosages', icon: '⚗️' },
  { id: 'equipment', label: 'Équipements', icon: '🔧' },
  { id: 'weather_seasons', label: 'Météo & saisons', icon: '🌤️' },
  { id: 'safety', label: 'Sécurité & baignade', icon: '🛟' },
  { id: 'treatments', label: 'Traitements (chlore/sel/brome)', icon: '💊' },
  { id: 'faq', label: 'FAQ', icon: '❓' },
]

export const GUIDES: Guide[] = [
  {
    id: 'green-water',
    title: "Eau verte : diagnostic et plan d'action",
    category: 'problems',
    summary: "Identifier la cause d'une eau verte et la traiter étape par étape sans surdoser.",
    durationMin: 8,
    level: 'beginner',
    tags: ['algues', 'chlore', 'vert', 'filtration'],
    steps: [
      { title: 'Mesurer pH et chlore libre', detail: 'Une eau verte est presque toujours due à un manque de désinfectant ou un pH déséquilibré.', warning: "Ne jamais ajouter d'anti-algues avant d'avoir équilibré le pH." },
      { title: 'Équilibrer le pH (7.0-7.4)', detail: 'Si le pH est > 7.4, ajoutez du pH- dilué. Attendez 2-3h de filtration.', tip: 'Le chlore est 10x plus efficace à pH 7.2 qu\'à pH 8.0.' },
      { title: 'Brosser les parois et le fond', detail: "Décrocher les algues aide le traitement à pénétrer." },
      { title: 'Faire un traitement choc', detail: 'Chlore choc (après pH équilibré). Filtration continue 24h.', warning: 'Baignade interdite 8h minimum après le choc.' },
      { title: 'Ajouter un anti-algues curatif', detail: "Après le choc, l'anti-algues prévient la repousse." },
      { title: 'Filtrer en continu 24-48h', detail: 'La filtration est aussi importante que les produits.' },
      { title: 'Re-tester après 24h', detail: "Vérifiez pH et chlore. Si l'eau reste verte, le filtre est peut-être à nettoyer." },
    ],
    relatedGuideIds: ['filter-backwash', 'chlorine-shock'],
  },
  {
    id: 'cloudy-water',
    title: 'Eau trouble ou laiteuse',
    category: 'problems',
    summary: "Distinguer les causes d'une eau trouble et appliquer le bon traitement.",
    durationMin: 7,
    level: 'beginner',
    tags: ['trouble', 'filtration', 'floculant'],
    steps: [
      { title: 'Vérifier la filtration', detail: "80% des eaux troubles viennent d'un problème de filtration. Vérifiez pression, durée, propreté du filtre." },
      { title: 'Tester pH et chlore', detail: 'pH hors plage ou chlore bas = eau trouble.' },
      { title: 'Nettoyer ou backwash le filtre', detail: 'Filtre encrassé = eau trouble.' },
      { title: 'Utiliser un floculant (si filtre à sable)', detail: 'Le floculant agglomère les particules fines pour que le filtre les retienne.', warning: 'Floculant uniquement avec filtre à sable. Pas avec cartouche.' },
      { title: 'Filtrer 24h puis aspirer les dépôts', detail: 'Après floculation, des dépôts se forment au fond : aspirez-les.' },
    ],
    relatedGuideIds: ['filter-backwash'],
  },
  {
    id: 'chlorine-shock',
    title: 'Quand et comment faire un chlore choc',
    category: 'products',
    summary: 'Le traitement choc : indications, dosage, sécurité, délais baignade.',
    durationMin: 6,
    level: 'intermediate',
    tags: ['chlore', 'choc', 'sécurité'],
    steps: [
      { title: 'Vérifier le pH AVANT', detail: "Un choc est inefficace si le pH > 7.6. Équilibrez d'abord.", warning: 'Ne JAMAIS faire un choc sans avoir vérifié le pH.' },
      { title: 'Choisir le bon moment', detail: 'Le soir, sans baigneurs, filtration en marche.' },
      { title: 'Doser selon le volume', detail: 'AQWELIA calcule la quantité selon votre volume de bassin.' },
      { title: 'Dissoudre dans un seau', detail: 'Ne jamais verser le choc en poudre directement au bord.' },
      { title: 'Filtrer 4h minimum', detail: 'Le chlore doit être bien réparti.' },
      { title: 'Attendre 8h avant baignade', detail: 'Vérifiez le chlore libre avant de se baigner (doit être < 3 mg/L).', warning: 'Baignade interdite pendant 8h minimum.' },
    ],
    relatedGuideIds: ['green-water', 'combined-chlorine'],
  },
  {
    id: 'combined-chlorine',
    title: 'Odeur forte de chlore et yeux qui piquent',
    category: 'problems',
    summary: "Comprendre les chloramines et comment s'en débarrasser.",
    durationMin: 5,
    level: 'intermediate',
    tags: ['chloramines', 'odeur', 'yeux', 'choc'],
    steps: [
      { title: 'Comprendre la cause', detail: "L'odeur forte de chlore n'est PAS un excès de chlore : ce sont les chloramines (chlore combiné), sous-produits de la désinfection." },
      { title: 'Mesurer chlore libre ET total', detail: 'Chlore combiné = chlore total - chlore libre. Si > 0.4 mg/L, traitement nécessaire.' },
      { title: 'Faire un traitement choc', detail: 'Le choc casse les chloramines et libère du chlore libre actif.' },
      { title: 'Vérifier le pH', detail: 'Un pH haut aggrave les chloramines.' },
    ],
    relatedGuideIds: ['chlorine-shock'],
  },
  {
    id: 'filter-backwash',
    title: 'Backwash (contre-lavage) du filtre à sable',
    category: 'equipment',
    summary: 'Quand et comment faire un backwash efficacement.',
    durationMin: 5,
    level: 'beginner',
    tags: ['filtre', 'backwash', 'sable'],
    steps: [
      { title: 'Quand backwash ?', detail: "Quand la pression monte de 0.3-0.5 bar au-dessus de la pression de service, ou toutes les 2-4 semaines." },
      { title: 'Éteindre la pompe', detail: 'TOUJOURS éteindre la pompe avant de manipuler la vanne.', warning: 'Risque électrique et matériel.' },
      { title: 'Placer la vanne sur BACKWASH', detail: 'Tourner fermement la vanne multivoies.' },
      { title: 'Rallumer la pompe 2-3 min', detail: "L'eau s'écoule à l'égout jusqu'à ce qu'elle redevienne claire." },
      { title: 'Éteindre, vanne sur RINSE 30s', detail: 'Le rinçage re-tasse le sable et évite le retour de saletés.' },
      { title: 'Revenir en position FILTER', detail: 'Remettre la vanne en filtration normale.' },
    ],
    relatedGuideIds: ['filter-cartridge-clean'],
  },
  {
    id: 'filter-cartridge-clean',
    title: 'Nettoyer un filtre à cartouche',
    category: 'equipment',
    summary: "Démontage et rinçage d'une cartouche de filtration.",
    durationMin: 6,
    level: 'beginner',
    tags: ['filtre', 'cartouche', 'nettoyage'],
    steps: [
      { title: 'Éteindre la pompe', detail: "Couper l'alimentation électrique.", warning: 'Sécurité électrique obligatoire.' },
      { title: 'Démonter la cartouche', detail: 'Ouvrir le corps du filtre selon le modèle.' },
      { title: 'Rincer au jet', detail: 'Jet d\'eau doux, des haut vers le bas, entre les plis.' },
      { title: 'Tremper dans un nettoyant filtre (optionnel)', detail: 'Tous les 2-3 nettoyages, dégraissage et détartrage.' },
      { title: 'Remonter et redémarrer', detail: 'Bien repositionner les joints.' },
    ],
    relatedGuideIds: ['filter-backwash'],
  },
  {
    id: 'cell-clean',
    title: "Nettoyer la cellule de l'électrolyseur",
    category: 'equipment',
    summary: "Détartrer la cellule d'électrolyseur au sel pour maintenir la production de chlore.",
    durationMin: 10,
    level: 'intermediate',
    tags: ['électrolyseur', 'sel', 'cellule', 'tartre'],
    steps: [
      { title: "Couper l'alimentation", detail: 'Éteindre l\'électrolyseur et la pompe.', warning: "Sécurité électrique. Ne jamais manipuler la cellule sous tension." },
      { title: 'Démonter la cellule', detail: 'Dévisser selon le modèle. Vérifier l\'état des électrodes.' },
      { title: 'Préparer une solution acide diluée', detail: '1/3 acide chlorhydrique + 2/3 eau dans un récipient plastique.', warning: "TOUJOURS verser l'acide dans l'eau, jamais l'inverse. Gants et lunettes obligatoires. Aération." },
      { title: 'Tremper 10-15 min', detail: "Le tartre se dissout. Ne pas laisser trop longtemps." },
      { title: 'Rincer abondamment', detail: "À l'eau claire jusqu'à disparition de l'odeur." },
      { title: 'Remonter et redémarrer', detail: "Vérifier la production sur l'afficheur." },
    ],
    relatedGuideIds: ['salt-system-basics'],
  },
  {
    id: 'salt-system-basics',
    title: 'Comprendre son électrolyseur au sel',
    category: 'treatments',
    summary: 'Principe, taux de sel, production, entretien courant.',
    durationMin: 8,
    level: 'intermediate',
    tags: ['sel', 'électrolyseur', 'traitement'],
    steps: [
      { title: 'Le principe', detail: "Le sel (NaCl) est électrolysé en chlore actif in-situ. Pas de stockage de chlore, eau plus douce." },
      { title: 'Taux de sel requis', detail: 'Selon le modèle : généralement 3-7 g/L. Vérifiez la notice. Trop bas = pas de production ; trop haut = surconsommation.' },
      { title: 'Stabilisant (CYA) indispensable', detail: 'Sans stabilisant, le chlore produit est détruit par le soleil en 2h.' },
      { title: 'Surveiller le pH', detail: "L'électrolyseur fait monter le pH. Régulation fréquente nécessaire." },
      { title: 'Production selon température', detail: "En eau froide (< 15°C), la production chute. Ne pas s'inquiéter en hiver." },
      { title: 'Entretien cellule', detail: "Nettoyage acide tous les 3-6 mois selon dureté de l'eau." },
    ],
    relatedGuideIds: ['cell-clean'],
  },
  {
    id: 'ph-control',
    title: 'Maîtriser son pH',
    category: 'products',
    summary: "Pourquoi le pH est le paramètre n°1, comment l'ajuster.",
    durationMin: 6,
    level: 'beginner',
    tags: ['ph', 'équilibrage'],
    steps: [
      { title: 'Le pH est prioritaire', detail: "Tout part du pH : efficacité du chlore, confort baignade, protection équipements." },
      { title: 'Plage idéale 7.0-7.4', detail: 'Plus près de 7.2 = chlore optimal.' },
      { title: 'Ajuster le TAC avant le pH si instable', detail: 'Un TAC bas rend le pH instable.' },
      { title: 'Doser par petite quantité', detail: 'Ne jamais modifier le pH de plus de 0.3 d\'un coup.' },
      { title: 'Filtrer 2-3h puis re-tester', detail: 'Le mélange doit être homogène.' },
    ],
    relatedGuideIds: ['tac-control'],
  },
  {
    id: 'tac-control',
    title: "Comprendre l'alcalinité (TAC)",
    category: 'products',
    summary: 'Le TAC est le tampon du pH. Sans bon TAC, le pH devient instable.',
    durationMin: 6,
    level: 'intermediate',
    tags: ['tac', 'alcalinité', 'ph'],
    steps: [
      { title: 'Rôle du TAC', detail: "Le TAC (alcalinité totale) stabilise le pH. Sans lui, le pH saute à chaque ajout de produit." },
      { title: 'Plage idéale 80-120 mg/L', detail: 'Cible 100 mg/L.' },
      { title: 'Ajuster AVANT le pH', detail: "Toujours équilibrer le TAC d'abord, sinon le pH ne tiendra pas." },
      { title: 'Pour remonter : bicarbonate de sodium', detail: 'Diluer, répartir, filtration 3h.' },
      { title: 'Pour baisser : acide', detail: 'Plus complexe, se fait lentement avec un pH-.' },
    ],
    relatedGuideIds: ['ph-control'],
  },
  {
    id: 'after-storm',
    title: 'Que faire après un orage ?',
    category: 'weather_seasons',
    summary: "L'orage dilue le chlore et modifie le pH. Routine post-orage.",
    durationMin: 4,
    level: 'beginner',
    tags: ['orage', 'météo', 'chlore'],
    steps: [
      { title: 'Tester pH et chlore', detail: "L'orage acidifie souvent l'eau et dilue le chlore." },
      { title: 'Nettoyer skimmer et panier', detail: 'Débris apportés par la pluie et le vent.' },
      { title: 'Ajuster le pH si nécessaire', detail: "Priorité au pH avant tout ajout de chlore." },
      { title: 'Compléter le chlore si bas', detail: 'Chlore lent ou choc selon l\'écart.' },
      { title: 'Filtrer 4-6h', detail: 'Bien répartir les corrections.' },
    ],
    relatedGuideIds: ['ph-control', 'chlorine-shock'],
  },
  {
    id: 'vacation-mode',
    title: 'Avant de partir en vacances',
    category: 'weather_seasons',
    summary: 'Préparer sa piscine pour une absence de plusieurs jours/semaines.',
    durationMin: 7,
    level: 'intermediate',
    tags: ['vacances', 'absence', 'prévention'],
    steps: [
      { title: 'Faire un test complet', detail: 'Tout équilibrer avant le départ : pH, chlore, TAC.' },
      { title: 'Chlore choc la veille', detail: 'Désinfecter en profondeur.' },
      { title: 'Remplir le distributeur de chlore lent', detail: "Pour une absence < 1 semaine." },
      { title: 'Régler la minuterie filtration', detail: "Au moins 4-6h/jour, de préférence la nuit." },
      { title: 'Couvrir la piscine', detail: 'Bâche ou volet : limite débris et évaporation.' },
      { title: 'Pour une longue absence : voisin ou robot', detail: 'Faites vérifier ou installez un robot.' },
      { title: 'Selon saison : hivernage actif ou passif', detail: 'En été, filtration réduite suffit. En hiver, hivernage complet.' },
    ],
    relatedGuideIds: ['winterization', 'startup'],
  },
  {
    id: 'winterization',
    title: 'Hiverner sa piscine',
    category: 'weather_seasons',
    summary: "Mettre la piscine en hivernage pour l'hiver sans abîmer les équipements.",
    durationMin: 10,
    level: 'intermediate',
    tags: ['hiver', 'hivernage', 'saison'],
    steps: [
      { title: 'Choisir hivernage actif ou passif', detail: 'Actif : filtration réduite. Passif : arrêt total. Dépend du climat.' },
      { title: 'Nettoyer en profondeur', detail: 'Eau, parois, fond, filtre, ligne d\'eau.' },
      { title: "Faire un traitement d'hiver", detail: "Produit d'hivernage anti-algues et anticalcaire." },
      { title: 'Baisser le niveau d\'eau', detail: '10-15 cm sous les buses pour passif.' },
      { title: 'Vider les canalisations sensibles', detail: 'Protéger du gel.' },
      { title: 'Couvrir la piscine', detail: "Bâche d'hiver ou volet." },
      { title: 'Hivernage actif : filtration 2-3h/jour', detail: 'Surtout pendant les périodes de gel.' },
    ],
    relatedGuideIds: ['startup'],
  },
  {
    id: 'startup',
    title: 'Remise en route au printemps',
    category: 'weather_seasons',
    summary: "Réveiller sa piscine après l'hiver en douceur.",
    durationMin: 10,
    level: 'intermediate',
    tags: ['printemps', 'remise en route', 'saison'],
    steps: [
      { title: 'Retirer la couverture et nettoyer', detail: 'Enlever feuilles et débris accumulés.' },
      { title: 'Remettre en eau si niveau bas', detail: 'Refaire le niveau.' },
      { title: 'Démarrer la filtration', detail: 'Vérifier le filtre (backwash si nécessaire).' },
      { title: 'Tester l\'eau', detail: 'pH, chlore, TAC, stabilisant.' },
      { title: 'Équilibrer progressivement', detail: 'TAC → pH → chlore. Pas de précipitation.' },
      { title: 'Faire un traitement choc', detail: 'Pour repartir sur une base saine.' },
      { title: 'Vérifier les équipements', detail: 'Pompe, électrolyseur, joints, manomètre.' },
    ],
    relatedGuideIds: ['winterization', 'filter-backwash'],
  },
  {
    id: 'swim-safety',
    title: 'Sécurité baignade : quand peut-on se baigner ?',
    category: 'safety',
    summary: 'Critères de sécurité pour une baignade sans risque.',
    durationMin: 5,
    level: 'beginner',
    tags: ['sécurité', 'baignade'],
    steps: [
      { title: 'pH entre 7.0 et 7.6', detail: 'Hors de cette plage : irritation possible.' },
      { title: 'Chlore libre entre 1 et 3 mg/L', detail: 'Moins = désinfection insuffisante. Plus = irritation.' },
      { title: 'Chlore combiné < 0.4 mg/L', detail: 'Au-dessus : odeur forte, yeux qui piquent.' },
      { title: 'Respecter les délais après traitement', detail: '2h après pH, 8h après chlore choc.' },
      { title: 'En cas de doute : ne pas se baigner', detail: "Mieux vaut attendre un test qu'aller dans une eau douteuse." },
    ],
    relatedGuideIds: ['chlorine-shock', 'combined-chlorine'],
  },
  {
    id: 'product-safety',
    title: 'Sécurité produits chimiques',
    category: 'safety',
    summary: "Les règles d'or pour manipuler et stocker les produits piscine.",
    durationMin: 6,
    level: 'beginner',
    tags: ['sécurité', 'produits', 'stockage'],
    steps: [
      { title: 'Ne JAMAIS mélanger les produits', detail: 'Chlore + acide = gaz toxique mortel. Toujours diluer séparément.', warning: 'Règle absolue de survie.' },
      { title: "Toujours ajouter le produit dans l'eau", detail: "Jamais l'eau dans le produit acide (projection)." },
      { title: 'Porter gants et lunettes', detail: 'Surtout pour les acides et le chlore concentré.' },
      { title: 'Stocker au sec, frais, ventilé', detail: 'Séparer acides et chlores. Hors portée des enfants.' },
      { title: 'Respecter les notices', detail: "Chaque produit a ses règles de dosage et d'application." },
      { title: "En cas d'incident : appeler le 15 ou le centre antipoison", detail: 'Ne pas faire vomir, consulter immédiatement.' },
    ],
  },
  {
    id: 'getting-started',
    title: 'Débuter avec sa piscine',
    category: 'getting_started',
    summary: "Les 10 premières choses à savoir quand on devient propriétaire d'une piscine.",
    durationMin: 12,
    level: 'beginner',
    tags: ['débutant', 'base', 'parcours'],
    steps: [
      { title: 'Connaître le volume de sa piscine', detail: "Indispensable pour tout dosage. AQWELIA le calcule à partir des dimensions." },
      { title: 'Comprendre le pH', detail: 'Le paramètre n°1. Tout part de là.' },
      { title: 'Comprendre le chlore', detail: 'Libre, total, combiné. AQWELIA vous guide.' },
      { title: 'Filtrer suffisamment', detail: "Moitié de la température de l'eau en heures." },
      { title: 'Tester 1-2x par semaine', detail: 'Plus souvent par forte chaleur.' },
      { title: 'Entretenir le filtre', detail: 'Backwash ou rinçage régulier.' },
      { title: 'Surveiller le niveau d\'eau', detail: 'Trop bas = pompe en danger ; trop haut = skimmer inefficace.' },
      { title: 'Brosser et nettoyer la ligne d\'eau', detail: 'Évite algues et dépôts.' },
      { title: 'Anticiper la météo', detail: 'Orage, canicule, vacances : prévenir plutôt que guérir.' },
      { title: 'Garder un carnet', detail: 'AQWELIA garde l\'historique pour vous.' },
    ],
    relatedGuideIds: ['ph-control', 'getting-started-spa'],
  },
  {
    id: 'getting-started-spa',
    title: 'Spécificités du spa',
    category: 'getting_started',
    summary: 'Le spa a ses règles : eau chaude, volume réduit, brome plutôt que chlore.',
    durationMin: 8,
    level: 'intermediate',
    tags: ['spa', 'brome', 'chaud'],
    steps: [
      { title: 'Volume réduit = réactions rapides', detail: "L'eau tourne vite. Tests plus fréquents." },
      { title: 'Préférer le brome au chlore', detail: 'Le brome est plus stable à chaud et moins odorant.' },
      { title: 'Température et pH', detail: 'Le pH bouge avec la température. Tester à température de bain.' },
      { title: 'Choc hebdomadaire', detail: 'Plus nécessaire qu\'en piscine.' },
      { title: 'Vidange périodique', detail: 'Tous les 3-4 mois selon usage.' },
    ],
  },
  {
    id: 'faq-test-frequency',
    title: 'À quelle fréquence tester son eau ?',
    category: 'faq',
    summary: 'Rythme recommandé selon saison et usage.',
    durationMin: 3,
    level: 'beginner',
    tags: ['test', 'fréquence', 'faq'],
    steps: [
      { title: 'En saison chaide', detail: '2 fois par semaine minimum, plus si forte chaleur.' },
      { title: 'En saison froide (hivernage actif)', detail: '1 fois tous les 15 jours.' },
      { title: 'Après tout traitement', detail: 'Re-test dans les 3-24h selon produit.' },
      { title: 'Après orage', detail: 'Test systématique.' },
      { title: 'Avant baignade si doute', detail: 'Toujours.' },
    ],
  },
  {
    id: 'faq-cya-high',
    title: 'Mon stabilisant (CYA) est trop haut',
    category: 'faq',
    summary: 'Que faire quand le CYA dépasse 50-60 mg/L ?',
    durationMin: 4,
    level: 'expert',
    tags: ['cya', 'stabilisant', 'dilution', 'faq'],
    steps: [
      { title: 'Pourquoi c\'est un problème', detail: 'Un CYA trop haut "bloque" le chlore : il est présent mais inactif. Risque algues malgré un chlore normal.' },
      { title: 'Il n\'existe pas de produit pour baisser le CYA', detail: 'Seule solution : diluer l\'eau.' },
      { title: 'Renouveler 20-30% de l\'eau', detail: 'Vidange partielle puis complément.' },
      { title: 'Re-tester après renouvellement', detail: 'Vérifier la nouvelle valeur.' },
      { title: 'À l\'avenir : utiliser moins de chlore stabilisé', detail: 'Préférer chlore non stabilisé ou électrolyseur.' },
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
