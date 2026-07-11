# AQWELIA — Assistant IA Piscine

> Le copilote piscine qui vous dit exactement quoi faire pour garder une eau claire, saine et équilibrée, sans surdoser ni perdre du temps.

## 🎯 Promesse

**Photo + mesures + météo + historique + profil piscine + inventaire = diagnostic prudent + plan d'action exact + rappels intelligents.**

L'utilisateur sait en moins de 30 secondes : quoi tester, quoi ajouter, combien, dans quel ordre, combien de temps filtrer, quand se baigner, quand re-tester, quand appeler un professionnel.

## 🏗️ Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── chat/              # Assistant IA contextuel (LLM)
│   │   ├── dashboard/         # Agrège profil + dernier test + plan + météo + rappels
│   │   ├── analytics/         # Events funnel
│   │   ├── guides/            # Catalogue + recommandation
│   │   ├── subscription/      # Freemium
│   │   └── pool/
│   │       ├── profile/       # Profil piscine (onboarding)
│   │       ├── water-test/    # Mesures + auto-génération plan
│   │       ├── action-plan/   # Régénère un plan
│   │       ├── photo-diagnostic/ # VLM analyse photo
│   │       ├── equipment/     # Équipements
│   │       ├── inventory/     # Produits
│   │       ├── weather/       # Météo wttr.in + risk engine
│   │       └── reminders/     # Rappels intelligents
│   ├── page.tsx               # Route unique (app tabbed)
│   ├── layout.tsx
│   └── globals.css            # Design system Oceanic Luxury
│
├── components/aquamind/
│   ├── app-shell.tsx          # Shell + tabs + onboarding gate
│   ├── onboarding.tsx         # Création profil 4 étapes
│   ├── header.tsx / footer.tsx
│   ├── module-dashboard.tsx   # "Aujourd'hui"
│   ├── module-diagnostic.tsx  # Photo VLM
│   ├── module-water-test.tsx  # Mesures + plan auto
│   ├── module-assistant.tsx   # Chat IA contextuel
│   ├── module-action-plan.tsx
│   ├── module-health-log.tsx  # Carnet de santé
│   ├── module-maintenance.tsx # Équipements + inventaire
│   ├── module-weather.tsx     # Météo intelligente
│   ├── module-guides.tsx      # Ressources & guides
│   ├── module-reminders.tsx   # Rappels intelligents
│   ├── module-paywall.tsx     # Freemium
│   └── emergency-mode.tsx     # 14 parcours urgents
│
└── lib/pool/                  # ⭐ IP CRITIQUE (déterministe, non-IA)
    ├── targets.ts             # Plages idéales par paramètre
    ├── units.ts               # Conversions volumes/quantités
    ├── dosing-engine.ts       # Calcul dosage par volume
    ├── water-balance.ts       # LSI + indice eau claire
    ├── safety-rules.ts        # Sécurité baignade + interdictions
    ├── action-plan.ts         # Génération plan ordonné
    ├── ai-context.ts          # Prompts IA structurés
    ├── weather-engine.ts      # Risk engine météo
    ├── reminders.ts           # Génération rappels
    ├── guides-data.ts         # Catalogue 20 guides
    └── freemium.ts            # Plans + gating
```

## 🧠 Le moteur déterministe (non-IA)

**Pourquoi séparer l'IA du calcul ?** On ne confie pas la sécurité à un LLM. Les dosages critiques sont calculés par `lib/pool/dosing-engine.ts` (TypeScript pur, testable, déterministe). L'IA explique, le moteur calcule.

Exemple : pour pH 7.8 + chlore 0.3 + TAC 70 sur 40 m³ →
1. TAC+ : 2040 g (avant le pH)
2. pH- : 900 ml (limité à -0.3, warning)
3. Chlore choc (après pH équilibré)
4. Filtration 4h, re-test 3h, baignade interdite

## 🔒 Sécurité (règles intégrées)

- Pas de dosage sans volume de bassin
- pH équilibré AVANT tout chlore
- TAC ajusté AVANT le pH
- Aucun mélange de produits (chlore + acide = gaz toxique)
- Délais de baignade affichés après chaque traitement
- "Quand appeler un professionnel" sur valeurs critiques
- Disclaimer permanent : ne remplace pas un professionnel

## 💎 Plans freemium

| Plan | Prix/mois | Cible |
|---|---|---|
| Surface | Gratuit | Découverte |
| Limpide | 7,99€ | Essentiel |
| Cristal | 12,99€ | Familles (populaire) |
| Gardien | 24,99€ | Piscinistes / pros |

Durées : 7j / 1 mois / 3 mois (-10%) / 6 mois (-20%).

## 🚀 Démarrage dev

```bash
bun install
bun run db:push        # Crée la base SQLite
bun run dev            # http://localhost:3000
bun run lint           # Vérification code
```

Au premier chargement : onboarding profil piscine → dashboard.

## 🧪 Tester le produit

1. Créer un profil (volume 40 m³, traitement chlore)
2. Aller dans "Eau", entrer pH 7.8 + chlore 0.3 + TAC 70
3. Voir le plan d'action se générer avec dosages exacts
4. Aller dans "Photo", tester un diagnostic (eau, filtre, bandelette)
5. Aller dans "Météo", voir les alertes contextuelles
6. Aller dans "Guides", lire "Eau verte : diagnostic"
7. Aller dans "Premium", voir les plans

## 📚 Docs associés

- [`PRODUCT_AUDIT.md`](./PRODUCT_AUDIT.md) — Audit produit + trous restants
- [`BRAND_NAMING.md`](./BRAND_NAMING.md) — Étude naming (reco: PoolPilot)
- [`STORE_READINESS.md`](./STORE_READINESS.md) — Préparation iOS/Android + stores

## 🛣️ Roadmap

- ✅ MVP web complet (11 modules + moteur + freemium)
- ⏳ App native iOS/Android (React Native + Expo, cf. STORE_READINESS.md)
- ⏳ Notifications push
- ⏳ Rapport PDF (gated Cristal)
- ⏳ Mode pro pisciniste (gated Gardien)
- ⏳ Intégration sondes IoT

## ⚠️ Limites actuelles

- Pas de notifications push (nécéssite app native)
- Pas de rapport PDF (UI à finaliser)
- Météo via wttr.in (gratuit mais parfois lent)
- Pas de multi-piscines UI (backend prêt)
- Tracking analytics en DB (à connecter à Mixpanel/Amplitude pour scaling)

## 📝 Licence & responsabilité

AQWELIA aide au diagnostic et à l'entretien mais **ne remplace pas un professionnel**. Les dosages doivent respecter les notices produits. En cas de doute, danger électrique, fuite ou irritation, contacter un professionnel.
