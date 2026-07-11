/**
 * AQWELIA Care — Seed data for the marketplace catalog.
 *
 * Contains:
 *  - 9 ProductCategory definitions (slug + i18n nameKey + color)
 *  - 36 Product definitions across green/orange/red categories
 *  - 9 Kit definitions (curated product bundles for common situations)
 *
 * Used by:
 *  - `src/app/api/care/seed/route.ts` (admin/dev endpoint to populate the DB)
 *  - Unit-render fallback when the DB has no products yet (catalogue page)
 *
 * Conventions:
 *  - `sku` is a stable, human-readable identifier (e.g. CARE-STRIP-50).
 *  - `category` matches one of `green | orange | red` (regulation level).
 *  - `nameKey`/`descriptionKey` reference keys under the i18n `care.products.*`
 *    and `care.kits.*` namespaces — never hardcoded French.
 *  - Red products (regulated biocides) are `active=false` — they are listed
 *    for safety/SDS reference but cannot be ordered from AQWELIA Care.
 *    The UI redirects the user to a partner supplier for those.
 */
import type { PrismaClient } from '@prisma/client'

export interface SeedProduct {
  sku: string
  name: string
  brand?: string
  category: 'green' | 'orange' | 'red'
  subcategory?: string
  description?: string
  price: number
  currency?: string
  unit: string
  stockQty: number
  imageUrl?: string
  regulated?: boolean
  hazardLevel?: 'none' | 'low' | 'medium' | 'high'
  sdsUrl?: string
  instructions?: string
  warnings?: string
  active?: boolean
  country?: string
}

export interface SeedCategory {
  slug: string
  name: string
  nameKey: string
  icon?: string
  color: 'green' | 'orange' | 'red'
  sortOrder: number
}

export interface SeedKit {
  slug: string
  name: string
  nameKey: string
  description?: string
  descriptionKey?: string
  price: number
  currency?: string
  imageUrl?: string
  items: Array<{ sku: string; quantity: number }>
  active?: boolean
}

/**
 * 9 product categories covering the AQWELIA Care marketplace scope.
 * The `color` field drives the UI accent (green = safe consumables,
 * orange = chemical correctors, red = regulated biocides — partner-only).
 */
export const CATEGORIES: SeedCategory[] = [
  { slug: 'bandelettes-tests', name: 'Bandelettes & tests', nameKey: 'care.catBandelettes', icon: 'Beaker', color: 'green', sortOrder: 1 },
  { slug: 'cartouches-filtres', name: 'Cartouches & préfiltres', nameKey: 'care.catCartouches', icon: 'Filter', color: 'green', sortOrder: 2 },
  { slug: 'skimmer-filtration', name: 'Skimmer & filtration', nameKey: 'care.catSkimmer', icon: 'Disc3', color: 'green', sortOrder: 3 },
  { slug: 'joints-raccords', name: 'Joints & raccords', nameKey: 'care.catJoints', icon: 'Wrench', color: 'green', sortOrder: 4 },
  { slug: 'doseurs-capteurs', name: 'Doseurs & capteurs', nameKey: 'care.catDoseurs', icon: 'Gauge', color: 'green', sortOrder: 5 },
  { slug: 'hivernage', name: 'Hivernage', nameKey: 'care.catHivernage', icon: 'Snowflake', color: 'green', sortOrder: 6 },
  { slug: 'correcteurs-chimiques', name: 'Correcteurs chimiques', nameKey: 'care.catCorrecteurs', icon: 'Droplets', color: 'orange', sortOrder: 7 },
  { slug: 'nettoyants-entretien', name: 'Nettoyants & entretien', nameKey: 'care.catNettoyants', icon: 'SprayCan', color: 'orange', sortOrder: 8 },
  { slug: 'biocides-reglementes', name: 'Biocides réglementés', nameKey: 'care.catBiocides', icon: 'AlertTriangle', color: 'red', sortOrder: 9 },
]

/**
 * 36 products seeded across the 9 categories. Prices in EUR.
 * Red products are `active=false` (regulation: only sold by licensed partners).
 */
export const PRODUCTS: SeedProduct[] = [
  // ── Bandelettes & tests (green) ────────────────────────────────────────
  { sku: 'CARE-STRIP-50', name: 'Bandelettes 5-en-1 (x50)', brand: 'Aquacolor', category: 'green', subcategory: 'bandelettes-tests', price: 9.9, unit: 'piece', stockQty: 240, hazardLevel: 'none', description: 'pH, chlore libre, brome, TAC, dureté — résultats en 15 secondes.' },
  { sku: 'CARE-STRIP-7IN1-25', name: 'Bandelettes 7-en-1 (x25)', brand: 'Aquacolor', category: 'green', subcategory: 'bandelettes-tests', price: 12.9, unit: 'piece', stockQty: 180, hazardLevel: 'none', description: 'pH, chlore, brome, TAC, TH, cyanurate, acide isocyanurique.' },
  { sku: 'CARE-THERMO-PISC', name: 'Thermomètre flottant piscine', brand: 'Aqwelia', category: 'green', subcategory: 'bandelettes-tests', price: 14.9, unit: 'piece', stockQty: 90, hazardLevel: 'none', description: 'Thermomètre analogique flottant, lecture °C/°F.' },
  { sku: 'CARE-DOSEUR-LIQ', name: 'Doseur liquide 100 mL', brand: 'Aqwelia', category: 'green', subcategory: 'bandelettes-tests', price: 6.5, unit: 'piece', stockQty: 320, hazardLevel: 'none', description: 'Doseur gradué pour prélèvements et ajouts précis.' },
  { sku: 'CARE-KIT-TEST-COMPLET', name: 'Kit test colorimétrique complet', brand: 'Aquacolor', category: 'green', subcategory: 'bandelettes-tests', price: 29.9, unit: 'piece', stockQty: 60, hazardLevel: 'none', description: 'pH, chlore, brome, TAC, TH — réactifs + comparateur.' },

  // ── Cartouches & préfiltres (green) ────────────────────────────────────
  { sku: 'CARE-CART-STD-4PACK', name: 'Cartouche filtrante standard (x4)', brand: 'FiltraPure', category: 'green', subcategory: 'cartouches-filtres', price: 39.9, unit: 'piece', stockQty: 80, hazardLevel: 'none', description: 'Compatible pompes Intex/Bestway 4 m³/h — 4 cartouches.' },
  { sku: 'CARE-CART-HI-FLOW', name: 'Cartouche haute densité (x2)', brand: 'FiltraPure', category: 'green', subcategory: 'cartouches-filtres', price: 34.9, unit: 'piece', stockQty: 65, hazardLevel: 'none', description: 'Filtration 25 µm, polyester non-tissé haute durée de vie.' },
  { sku: 'CARE-PREFILT-MAILL', name: 'Préfiltre maillage fin', brand: 'FiltraPure', category: 'green', subcategory: 'cartouches-filtres', price: 12.9, unit: 'piece', stockQty: 140, hazardLevel: 'none', description: 'Préfiltre lavable pour pompe à chaleur et électrolyseur.' },
  { sku: 'CARE-CART-SPA-2PACK', name: 'Cartouche spa (x2)', brand: 'FiltraPure', category: 'green', subcategory: 'cartouches-filtres', price: 19.9, unit: 'piece', stockQty: 110, hazardLevel: 'none', description: 'Compatible spas 1,5 m³/h — 2 cartouches de rechange.' },

  // ── Skimmer & filtration (green) ──────────────────────────────────────
  { sku: 'CARE-CHAUSS-SKIM', name: 'Chaussette de skimmer (x3)', brand: 'SkimPro', category: 'green', subcategory: 'skimmer-filtration', price: 8.9, unit: 'piece', stockQty: 200, hazardLevel: 'none', description: 'Filet de skimmer lavable, retient feuilles et débris.' },
  { sku: 'CARE-PANIER-SKIM-STD', name: 'Panier de skimmer standard', brand: 'SkimPro', category: 'green', subcategory: 'skimmer-filtration', price: 14.9, unit: 'piece', stockQty: 75, hazardLevel: 'none', description: 'Panier de remplacement universel pour skimmer rond.' },
  { sku: 'CARE-EPONGE-FILT', name: 'Éponge de filtration (x3)', brand: 'Aqwelia', category: 'green', subcategory: 'skimmer-filtration', price: 9.9, unit: 'piece', stockQty: 130, hazardLevel: 'none', description: 'Éponge complémentaire pour skimmer, capture les fines particules.' },

  // ── Joints & raccords (green) ─────────────────────────────────────────
  { sku: 'CARE-JOINT-MULTI-50', name: 'Kit joints multi-tailles (x50)', brand: 'JointPro', category: 'green', subcategory: 'joints-raccords', price: 11.9, unit: 'piece', stockQty: 160, hazardLevel: 'none', description: '50 joints plats Ø 20 à 60 mm pour raccords piscine.' },
  { sku: 'CARE-JOINT-POMPE', name: 'Joint pompe XP44', brand: 'JointPro', category: 'green', subcategory: 'joints-raccords', price: 4.5, unit: 'piece', stockQty: 220, hazardLevel: 'none', description: 'Joint torique pompe — compatibilité universelle.' },
  { sku: 'CARE-RACCORD-50-32', name: 'Raccord union Ø 50→32', brand: 'JointPro', category: 'green', subcategory: 'joints-raccords', price: 7.9, unit: 'piece', stockQty: 95, hazardLevel: 'none', description: 'Raccord union laiton+PVC pour adaptation tuyauterie.' },
  { sku: 'CARE-BOUCHON-HIVER', name: 'Bouchon d\'hivernage (x4)', brand: 'JointPro', category: 'green', subcategory: 'joints-raccords', price: 9.9, unit: 'piece', stockQty: 180, hazardLevel: 'none', description: 'Bouchons expansés pour retours et refoulement.' },

  // ── Doseurs & capteurs (green) ────────────────────────────────────────
  { sku: 'CARE-DOSEUR-CHLO', name: 'Doseur flottant chlore lent', brand: 'Aqwelia', category: 'green', subcategory: 'doseurs-capteurs', price: 12.9, unit: 'piece', stockQty: 140, hazardLevel: 'none', description: 'Doseur ajustable pour galets de chlore lent.' },
  { sku: 'CARE-DOSEUR-BROM', name: 'Doseur brome spa', brand: 'Aqwelia', category: 'green', subcategory: 'doseurs-capteurs', price: 14.9, unit: 'piece', stockQty: 90, hazardLevel: 'none', description: 'Doseur flottant spécifique brome, adapté températures spa.' },
  { sku: 'CARE-CAPT-NIVEAU', name: 'Capteur de niveau d\'eau', brand: 'SensorPool', category: 'green', subcategory: 'doseurs-capteurs', price: 49.9, unit: 'piece', stockQty: 35, hazardLevel: 'none', description: 'Capteur optique d\'appoint d\'eau, connexion sans fil.' },
  { sku: 'CARE-CAPT-TEMP', name: 'Sonde température flottante', brand: 'SensorPool', category: 'green', subcategory: 'doseurs-capteurs', price: 29.9, unit: 'piece', stockQty: 55, hazardLevel: 'none', description: 'Sonde étanche BLE, 1 an d\'autonomie, alerte température.' },
  { sku: 'CARE-SONDE-Smart', name: 'Sonde connectée pH/ORP', brand: 'SensorPool', category: 'green', subcategory: 'doseurs-capteurs', price: 189.0, unit: 'piece', stockQty: 18, hazardLevel: 'none', description: 'Mesure continue pH/ORP/température, sync app AQWELIA.' },

  // ── Hivernage (green) ─────────────────────────────────────────────────
  { sku: 'CARE-HIVER-LIQ-1L', name: 'Liquide d\'hivernage 1 L', brand: 'WinterPool', category: 'green', subcategory: 'hivernage', price: 14.9, unit: 'L', stockQty: 130, hazardLevel: 'low', description: 'Anticalcaire et antigel non toxique pour hivernage passif.' },
  { sku: 'CARE-HIVER-LIQ-5L', name: 'Liquide d\'hivernage 5 L', brand: 'WinterPool', category: 'green', subcategory: 'hivernage', price: 49.9, unit: 'L', stockQty: 60, hazardLevel: 'low', description: 'Bidon 5 L économique pour piscines > 50 m³.' },
  { sku: 'CARE-HIVER-FLOTTEUR', name: 'Flotteur d\'hivernage (x4)', brand: 'WinterPool', category: 'green', subcategory: 'hivernage', price: 12.9, unit: 'piece', stockQty: 110, hazardLevel: 'none', description: 'Flotteurs givrés anti-pression glace pour bassin.' },
  { sku: 'CARE-HIVER-COUV-LDPE', name: 'Couverture d\'hivernage LDPE 6×3 m', brand: 'WinterPool', category: 'green', subcategory: 'hivernage', price: 89.0, unit: 'piece', stockQty: 25, hazardLevel: 'none', description: 'Bâcheopaque anti-UV, œillets renforcés tous les 50 cm.' },

  // ── Correcteurs chimiques (orange) ─────────────────────────────────────
  { sku: 'CARE-PHMOINS-1KG', name: 'pH− 1 kg', brand: 'AquaChem', category: 'orange', subcategory: 'correcteurs-chimiques', price: 8.9, unit: 'kg', stockQty: 240, hazardLevel: 'medium', description: 'Bisulfate de sodium, abaisse le pH vers 7.2–7.4.' },
  { sku: 'CARE-PHPLUS-1KG', name: 'pH+ 1 kg', brand: 'AquaChem', category: 'orange', subcategory: 'correcteurs-chimiques', price: 9.9, unit: 'kg', stockQty: 220, hazardLevel: 'medium', description: 'Carbonate de sodium, augmente le pH vers 7.2–7.4.' },
  { sku: 'CARE-TACPLUS-5KG', name: 'TAC+ 5 kg', brand: 'AquaChem', category: 'orange', subcategory: 'correcteurs-chimiques', price: 24.9, unit: 'kg', stockQty: 95, hazardLevel: 'low', description: 'Bicarbonate de sodium, augmente le TAC vers 80–120 mg/L.' },
  { sku: 'CARE-DURETE-5KG', name: 'Dureté+ 5 kg', brand: 'AquaChem', category: 'orange', subcategory: 'correcteurs-chimiques', price: 26.9, unit: 'kg', stockQty: 80, hazardLevel: 'low', description: 'Chlorure de calcium, augmente le TH vers 200–400 mg/L.' },
  { sku: 'CARE-CLARIFIANT-1L', name: 'Clarifiant 1 L', brand: 'AquaChem', category: 'orange', subcategory: 'correcteurs-chimiques', price: 12.9, unit: 'L', stockQty: 140, hazardLevel: 'low', description: 'Floculant liquide pour eau trouble, améliore la filtration.' },
  { sku: 'CARE-FLOCULANT-1KG', name: 'Floculant cartouche (x6)', brand: 'AquaChem', category: 'orange', subcategory: 'correcteurs-chimiques', price: 14.9, unit: 'piece', stockQty: 110, hazardLevel: 'low', description: 'Cartouches floculantes à placer dans le skimmer.' },
  { sku: 'CARE-ANTICALC-1L', name: 'Anti-calcaire 1 L', brand: 'AquaChem', category: 'orange', subcategory: 'correcteurs-chimiques', price: 11.9, unit: 'L', stockQty: 130, hazardLevel: 'low', description: 'Séquestrant calcium, prévient les dépôts en paroi.' },
  { sku: 'CARE-ANTIPHOS-1L', name: 'Anti-phosphates 1 L', brand: 'AquaChem', category: 'orange', subcategory: 'correcteurs-chimiques', price: 19.9, unit: 'L', stockQty: 90, hazardLevel: 'low', description: 'Élimine les phosphates pour bloquer la prolifération d\'algues.' },
  { sku: 'CARE-ENZYMES-1L', name: 'Enzymes clarifiantes 1 L', brand: 'AquaChem', category: 'orange', subcategory: 'correcteurs-chimiques', price: 22.9, unit: 'L', stockQty: 70, hazardLevel: 'low', description: 'Dégrade huiles, crèmes et matières organiques.' },

  // ── Nettoyants & entretien (orange) ────────────────────────────────────
  { sku: 'CARE-DETARTRE-1L', name: 'Détartrant ligne 1 L', brand: 'CleanLine', category: 'orange', subcategory: 'nettoyants-entretien', price: 13.9, unit: 'L', stockQty: 120, hazardLevel: 'medium', description: 'Détartrant acide pour électrolyseur, cellule et ligne d\'eau.' },
  { sku: 'CARE-NETTOY-LIGNE-500', name: 'Nettoyant ligne d\'eau 500 mL', brand: 'CleanLine', category: 'orange', subcategory: 'nettoyants-entretien', price: 9.9, unit: 'ml', stockQty: 200, hazardLevel: 'low', description: 'Gel nettoyant sans acide pour margelles et ligne d\'eau.' },
  { sku: 'CARE-EPONGE-LIGNE', name: 'Éponge magique ligne d\'eau (x3)', brand: 'CleanLine', category: 'orange', subcategory: 'nettoyants-entretien', price: 7.9, unit: 'piece', stockQty: 180, hazardLevel: 'none', description: 'Éponge melamine pour frotter sans produit chimique.' },
  { sku: 'CARE-BROSSE-TROU', name: 'Brosse de trou de skimmer', brand: 'CleanLine', category: 'orange', subcategory: 'nettoyants-entretien', price: 6.9, unit: 'piece', stockQty: 240, hazardLevel: 'none', description: 'Brosse conique pour nettoyer les trous de skimmer.' },

  // ── Biocides réglementés (red — non vendus, info + SDS only) ───────────
  { sku: 'CARE-CHLORE-CHOC-5KG', name: 'Chlore choc 5 kg', brand: 'AquaChem', category: 'red', subcategory: 'biocides-reglementes', price: 39.9, unit: 'kg', stockQty: 0, regulated: true, hazardLevel: 'high', active: false, description: 'Hypochlorite de calcium 65 % — biocide réglementé BPR. Disponible chez votre pisciniste partenaire.' },
  { sku: 'CARE-CHLORE-LENT-5KG', name: 'Chlore lent 5 kg', brand: 'AquaChem', category: 'red', subcategory: 'biocides-reglementes', price: 44.9, unit: 'kg', stockQty: 0, regulated: true, hazardLevel: 'high', active: false, description: 'Trichloroisocyanurate 90 % — biocide réglementé BPR. Disponible chez votre pisciniste partenaire.' },
  { sku: 'CARE-BROMO-20TAB', name: 'Brome pastilles 20 g (x10)', brand: 'AquaChem', category: 'red', subcategory: 'biocides-reglementes', price: 19.9, unit: 'piece', stockQty: 0, regulated: true, hazardLevel: 'high', active: false, description: '1-bromo-3-chloro-5,5-diméthylhydantoïne — biocide BPR. Disponible chez votre pisciniste partenaire.' },
  { sku: 'CARE-HYPOCHLO-25L', name: 'Hypochlorite de sodium 25 L', brand: 'AquaChem', category: 'red', subcategory: 'biocides-reglementes', price: 49.9, unit: 'L', stockQty: 0, regulated: true, hazardLevel: 'high', active: false, description: 'Eau de Javel 12° — biocide réglementé BPR. Disponible chez votre pisciniste partenaire.' },
  { sku: 'CARE-ANTIALG-3L', name: 'Anti-algues 3 L', brand: 'AquaChem', category: 'red', subcategory: 'biocides-reglementes', price: 24.9, unit: 'L', stockQty: 0, regulated: true, hazardLevel: 'medium', active: false, description: 'Polyquaternalire ammonium — biocide réglementé BPR. Disponible chez votre pisciniste partenaire.' },
]

/**
 * 9 curated kits — each addresses a common pool/spa situation.
 * `items` reference product SKUs; `price` is the kit bundle price (typically
 * slightly cheaper than buying items separately).
 */
export const KITS: SeedKit[] = [
  {
    slug: 'kit-diagnostic',
    name: 'Kit Diagnostic',
    nameKey: 'care.kitDiagnosticName',
    descriptionKey: 'care.kitDiagnosticDesc',
    price: 39.9,
    imageUrl: '/care/kits/diagnostic.png',
    items: [
      { sku: 'CARE-STRIP-7IN1-25', quantity: 1 },
      { sku: 'CARE-THERMO-PISC', quantity: 1 },
      { sku: 'CARE-DOSEUR-LIQ', quantity: 1 },
      { sku: 'CARE-KIT-TEST-COMPLET', quantity: 1 },
    ],
  },
  {
    slug: 'kit-remise-en-route',
    name: 'Kit Remise en route',
    nameKey: 'care.kitRemiseRouteName',
    descriptionKey: 'care.kitRemiseRouteDesc',
    price: 79.0,
    imageUrl: '/care/kits/remise-en-route.png',
    items: [
      { sku: 'CARE-STRIP-50', quantity: 1 },
      { sku: 'CARE-PHMOINS-1KG', quantity: 2 },
      { sku: 'CARE-PHPLUS-1KG', quantity: 1 },
      { sku: 'CARE-TACPLUS-5KG', quantity: 1 },
      { sku: 'CARE-CLARIFIANT-1L', quantity: 1 },
      { sku: 'CARE-CHAUSS-SKIM', quantity: 1 },
    ],
  },
  {
    slug: 'kit-apres-orage',
    name: 'Kit Après-Orage',
    nameKey: 'care.kitApresOrageName',
    descriptionKey: 'care.kitApresOrageDesc',
    price: 34.9,
    imageUrl: '/care/kits/apres-orage.png',
    items: [
      { sku: 'CARE-STRIP-50', quantity: 1 },
      { sku: 'CARE-CLARIFIANT-1L', quantity: 1 },
      { sku: 'CARE-FLOCULANT-1KG', quantity: 1 },
      { sku: 'CARE-CHAUSS-SKIM', quantity: 1 },
    ],
  },
  {
    slug: 'kit-canicule',
    name: 'Kit Canicule',
    nameKey: 'care.kitCaniculeName',
    descriptionKey: 'care.kitCaniculeDesc',
    price: 42.9,
    imageUrl: '/care/kits/canicule.png',
    items: [
      { sku: 'CARE-STRIP-50', quantity: 1 },
      { sku: 'CARE-CLARIFIANT-1L', quantity: 1 },
      { sku: 'CARE-ANTICALC-1L', quantity: 1 },
      { sku: 'CARE-THERMO-PISC', quantity: 1 },
    ],
  },
  {
    slug: 'kit-depart-vacances',
    name: 'Kit Départ vacances',
    nameKey: 'care.kitDepartVacName',
    descriptionKey: 'care.kitDepartVacDesc',
    price: 54.9,
    imageUrl: '/care/kits/depart-vacances.png',
    items: [
      { sku: 'CARE-STRIP-7IN1-25', quantity: 1 },
      { sku: 'CARE-DOSEUR-CHLO', quantity: 1 },
      { sku: 'CARE-CLARIFIANT-1L', quantity: 1 },
      { sku: 'CARE-CHAUSS-SKIM', quantity: 2 },
      { sku: 'CARE-CAPT-TEMP', quantity: 1 },
    ],
  },
  {
    slug: 'kit-hivernage',
    name: 'Kit Hivernage',
    nameKey: 'care.kitHivernageName',
    descriptionKey: 'care.kitHivernageDesc',
    price: 89.0,
    imageUrl: '/care/kits/hivernage.png',
    items: [
      { sku: 'CARE-HIVER-LIQ-5L', quantity: 1 },
      { sku: 'CARE-HIVER-FLOTTEUR', quantity: 1 },
      { sku: 'CARE-BOUCHON-HIVER', quantity: 1 },
      { sku: 'CARE-DETARTRE-1L', quantity: 1 },
    ],
  },
  {
    slug: 'kit-filtration',
    name: 'Kit Filtration',
    nameKey: 'care.kitFiltrationName',
    descriptionKey: 'care.kitFiltrationDesc',
    price: 64.9,
    imageUrl: '/care/kits/filtration.png',
    items: [
      { sku: 'CARE-CART-STD-4PACK', quantity: 1 },
      { sku: 'CARE-PREFILT-MAILL', quantity: 1 },
      { sku: 'CARE-CHAUSS-SKIM', quantity: 1 },
      { sku: 'CARE-JOINT-MULTI-50', quantity: 1 },
      { sku: 'CARE-EPONGE-FILT', quantity: 1 },
    ],
  },
  {
    slug: 'kit-spa',
    name: 'Kit Spa',
    nameKey: 'care.kitSpaName',
    descriptionKey: 'care.kitSpaDesc',
    price: 74.9,
    imageUrl: '/care/kits/spa.png',
    items: [
      { sku: 'CARE-CART-SPA-2PACK', quantity: 1 },
      { sku: 'CARE-DOSEUR-BROM', quantity: 1 },
      { sku: 'CARE-STRIP-7IN1-25', quantity: 1 },
      { sku: 'CARE-NETTOY-LIGNE-500', quantity: 1 },
      { sku: 'CARE-CLARIFIANT-1L', quantity: 1 },
    ],
  },
  {
    slug: 'kit-residence-secondaire',
    name: 'Kit Résidence secondaire',
    nameKey: 'care.kitResidenceName',
    descriptionKey: 'care.kitResidenceDesc',
    price: 99.0,
    imageUrl: '/care/kits/residence.png',
    items: [
      { sku: 'CARE-STRIP-7IN1-25', quantity: 2 },
      { sku: 'CARE-CAPT-NIVEAU', quantity: 1 },
      { sku: 'CARE-DOSEUR-CHLO', quantity: 1 },
      { sku: 'CARE-CLARIFIANT-1L', quantity: 1 },
      { sku: 'CARE-CHAUSS-SKIM', quantity: 2 },
      { sku: 'CARE-TACPLUS-5KG', quantity: 1 },
    ],
  },
]

/**
 * Idempotent seeding routine. Run from an admin/dev script or from the
 * `/api/care/seed` route. Safe to re-run: existing products (matched by SKU)
 * are updated in place; categories and kits likewise (matched by slug).
 *
 * NOTE: The Prisma client types for `product`, `productCategory`, `cart`,
 * `order`, `kit` may not yet be picked up by TS before the first `prisma
 * generate`. We use `(db as any)` defensively — the runtime model names are
 * correct as soon as the schema has been pushed.
 */
export async function seedCareDatabase(db: PrismaClient): Promise<void> {
  // Categories
  for (const c of CATEGORIES) {
    await (db as any).productCategory.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        nameKey: c.nameKey,
        icon: c.icon ?? null,
        color: c.color,
        sortOrder: c.sortOrder,
      },
      create: {
        slug: c.slug,
        name: c.name,
        nameKey: c.nameKey,
        icon: c.icon ?? null,
        color: c.color,
        sortOrder: c.sortOrder,
      },
    })
  }

  // Products — upsert by SKU
  for (const p of PRODUCTS) {
    await (db as any).product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        brand: p.brand ?? null,
        category: p.category,
        subcategory: p.subcategory ?? null,
        description: p.description ?? null,
        price: p.price,
        currency: p.currency ?? 'EUR',
        unit: p.unit,
        stockQty: p.stockQty,
        imageUrl: p.imageUrl ?? null,
        regulated: p.regulated ?? false,
        hazardLevel: p.hazardLevel ?? null,
        sdsUrl: p.sdsUrl ?? null,
        instructions: p.instructions ?? null,
        warnings: p.warnings ?? null,
        active: p.active ?? true,
        country: p.country ?? 'FR',
        supplierId: null,
      },
      create: {
        sku: p.sku,
        name: p.name,
        brand: p.brand ?? null,
        category: p.category,
        subcategory: p.subcategory ?? null,
        description: p.description ?? null,
        price: p.price,
        currency: p.currency ?? 'EUR',
        unit: p.unit,
        stockQty: p.stockQty,
        imageUrl: p.imageUrl ?? null,
        regulated: p.regulated ?? false,
        hazardLevel: p.hazardLevel ?? null,
        sdsUrl: p.sdsUrl ?? null,
        instructions: p.instructions ?? null,
        warnings: p.warnings ?? null,
        active: p.active ?? true,
        country: p.country ?? 'FR',
        supplierId: null,
      },
    })
  }

  // Kits — upsert by slug. `items` resolved into a JSON array of
  // {productId, quantity} via a SKU lookup at runtime by the API consumer
  // (kit API resolves SKUs to productIds on read).
  for (const k of KITS) {
    await (db as any).kit.upsert({
      where: { slug: k.slug },
      update: {
        name: k.name,
        nameKey: k.nameKey,
        description: k.description ?? null,
        descriptionKey: k.descriptionKey ?? null,
        price: k.price,
        currency: k.currency ?? 'EUR',
        imageUrl: k.imageUrl ?? null,
        items: JSON.stringify(k.items),
        active: k.active ?? true,
      },
      create: {
        slug: k.slug,
        name: k.name,
        nameKey: k.nameKey,
        description: k.description ?? null,
        descriptionKey: k.descriptionKey ?? null,
        price: k.price,
        currency: k.currency ?? 'EUR',
        imageUrl: k.imageUrl ?? null,
        items: JSON.stringify(k.items),
        active: k.active ?? true,
      },
    })
  }
}
