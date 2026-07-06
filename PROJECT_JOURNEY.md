# AquaMind AI — Journal de parcours complet

> Ce document capture l'historique complet de la construction d'AquaMind AI, étape par étape, pour archive et reprise en main.

## 📅 Sessions de développement

### Session 1 — Cadrage & première version
**Demande utilisateur** : "Créer une app pour utilisateur de piscine révolutionnaire et totalement innovante en interagissant avec l'IA"

**Réponse** : Construction d'une app "AquaMind AI" combinant 6 intelligences artificielles :
- 🤖 Assistant conversationnel (LLM)
- 👁️ Analyse visuelle de l'eau (VLM)
- 🎨 Générateur de design de piscine (Image Generation)
- 🎙️ Assistant vocal (TTS + ASR)
- 🔍 Recherche web temps réel
- 📊 Dashboard + base de données (Prisma)

**Stack** : Next.js 16 App Router, TypeScript, Tailwind 4, shadcn/ui, Prisma SQLite, z-ai-web-dev-sdk

**Livrables** : 7 sections (Dashboard, Assistant, Analyse eau, Design, Voix, Maintenance, Mesures), design "Oceanic Luxury" (glassmorphism, or champagne, Playfair Display).

### Session 2 — Refonte CTO / Produit
**Demande** : "Transforme en vrai copilote piscine, pas une vitrine IA. Crée profil piscine, moteur de dosage, plan d'action, modules sérieux."

**Réponse** : Refonte architecturale majeure.

**Fondation déterministe** (`src/lib/pool/`) — l'IP critique séparée de l'IA :
- `targets.ts` — plages idéales (pH 7.0-7.4, chlore 1-3, TAC 80-120, CYA 30-50...)
- `dosing-engine.ts` — calcul dosage par volume
- `water-balance.ts` — LSI + indice eau claire 0-100
- `safety-rules.ts` — sécurité baignade + interdictions
- `action-plan.ts` — génération plan ordonné (TAC→pH→chlore)
- `ai-context.ts` — prompts IA structurés
- `units.ts` — conversions

**7 modules tabbed** sur route `/` unique :
1. Dashboard Aujourd'hui
2. Diagnostic Photo (VLM prudent)
3. Analyse Eau (avec plan auto)
4. Assistant IA (contextuel)
5. Plan d'Action
6. Carnet de Santé
7. Maintenance & Équipements

+ Onboarding profil piscine (4 étapes)
+ Emergency mode (14 parcours)
+ Schéma Prisma complet (PoolProfile, WaterTest, PhotoDiagnostic, ActionPlan, Equipment, ProductInventory, ChatMessage, MaintenanceTask)

### Session 3 — Expansion modules (Phases 1-24)
**Demande** : "Refondre pour en faire le meilleur assistant du marché. Ajouter météo, rappels, guides, paywall, prep iOS/Android, naming."

**Réponse** : 4 nouveaux modules + moteurs + docs.

**Nouveaux moteurs** :
- `weather-engine.ts` — risk engine (orage, canicule, pluie, vent, UV, gel) → alertes + filtration
- `reminders.ts` — rappels contextuels (météo, historique, inventaire, équipements)
- `guides-data.ts` — 20 guides structurés + moteur de recommandation
- `freemium.ts` — 4 plans (Surface/Limpide/Cristal/Gardien) + gating 8 features

**4 nouveaux modules** :
8. Météo Intelligente (wttr.in réel + alerts)
9. Ressources & Guides (20 guides + recommandation)
10. Rappels Intelligents (contextuels)
11. Premium / Paywall (freemium animé)

**Nouveaux modèles Prisma** : Reminder, GuideView, Subscription, AnalyticsEvent

**Nouvelles APIs** : weather, reminders, guides, subscription, analytics

**Livrables stratégiques** :
- `PRODUCT_AUDIT.md` — audit honnête du produit
- `BRAND_NAMING.md` — 23 propositions, reco : **PoolPilot**
- `STORE_READINESS.md` — plan app native iOS/Android (RN/Expo, 15 semaines)
- `README.md` — vue d'ensemble

### Session 4 — Landing page premium
**Demande** : "Crée une landing page qui explique tout : problème, coûts réels, comparatif, simulations, gains. Connecte au dashboard. Animations style 21st.dev."

**Réponse** : Landing page marketing complète (14 sections) + connexion landing↔app.

**Sections** :
1. Hero animé (aurora mesh, compteurs animés)
2. Le problème (6 pain points)
3. Coûts réels (tableau 1500-3800€/an)
4. Le pisciniste (inclus / pas inclus)
5. La solution (3 étapes + différenciateur déterministe)
6. Comparatif (AquaMind vs PoolMath/Pooli/Clorox/Leslie's/Pisciniste)
7. Simulations (carrousel 6 scénarios concrets)
8. Gains (25h/saison, 550€/an, ROI x5,7)
9. Story (fondateurs utilisateurs)
10. Variations (8 facteurs qui changent l'eau)
11. Features (11 modules)
12. Tarifs (toggle animé, 4 plans)
13. FAQ (8 questions)
14. CTA final

**Connexion landing↔app** : view toggle 'landing'|'app' avec localStorage + détection profil. CTA bascule vers AppShell, bouton "Retour" revient à la landing.

**Tech** : framer-motion (scroll-reveal, compteurs, crossfade), embla-carousel (simulations), glassmorphism, Playfair.

---

## 🏗️ Architecture finale

```
src/
├── app/
│   ├── api/
│   │   ├── chat/                    # Assistant IA contextuel (LLM)
│   │   ├── dashboard/               # Agrège tout
│   │   ├── analytics/               # Events funnel
│   │   ├── guides/                  # Catalogue + recommandation
│   │   ├── subscription/            # Freemium
│   │   └── pool/
│   │       ├── profile/             # Profil piscine
│   │       ├── water-test/          # Mesures + plan auto
│   │       ├── action-plan/         # Régénère plan
│   │       ├── photo-diagnostic/    # VLM analyse photo
│   │       ├── equipment/           # Équipements
│   │       ├── inventory/           # Produits
│   │       ├── weather/             # Météo wttr.in + risk engine
│   │       └── reminders/           # Rappels intelligents
│   ├── page.tsx                     # View toggle landing/app
│   ├── layout.tsx
│   └── globals.css                  # Design Oceanic Luxury
│
├── components/
│   ├── aquamind/                    # L'application (11 modules)
│   │   ├── app-shell.tsx            # Shell + tabs + onboarding gate
│   │   ├── onboarding.tsx
│   │   ├── header.tsx / footer.tsx
│   │   ├── module-dashboard.tsx
│   │   ├── module-diagnostic.tsx
│   │   ├── module-water-test.tsx
│   │   ├── module-assistant.tsx
│   │   ├── module-action-plan.tsx
│   │   ├── module-health-log.tsx
│   │   ├── module-maintenance.tsx
│   │   ├── module-weather.tsx
│   │   ├── module-guides.tsx
│   │   ├── module-reminders.tsx
│   │   ├── module-paywall.tsx
│   │   └── emergency-mode.tsx
│   └── landing/                     # Landing page marketing
│       ├── landing-page.tsx
│       ├── landing-utils.tsx
│       └── sections/ (14 sections)
│
└── lib/pool/                        # ⭐ IP CRITIQUE (déterministe, non-IA)
    ├── targets.ts                   # Plages idéales
    ├── units.ts                     # Conversions
    ├── dosing-engine.ts             # Calcul dosage
    ├── water-balance.ts             # LSI + indice eau claire
    ├── safety-rules.ts              # Sécurité baignade
    ├── action-plan.ts               # Plan ordonné
    ├── ai-context.ts                # Prompts IA
    ├── weather-engine.ts            # Risk engine météo
    ├── reminders.ts                 # Rappels contextuels
    ├── guides-data.ts               # 20 guides
    └── freemium.ts                  # Plans + gating
```

## 🗄️ Base de données (Prisma SQLite)

13 modèles : PoolProfile, WaterTest, PhotoDiagnostic, ActionPlan, Equipment, ProductInventory, ChatMessage, MaintenanceTask, PoolDesign, Reminder, GuideView, Subscription, AnalyticsEvent.

## 🎨 Design system "Oceanic Luxury"
- Palette : teal océan profond + or champagne + perle nacrée
- Typographie : Playfair Display (titres) + Geist Sans (corps)
- Glassmorphism : backdrop-blur + bg-white/60 + border-white/20
- Animations : framer-motion scroll-reveal, compteurs, embla carousels
- Footer sticky (min-h-screen flex flex-col + mt-auto)
- Responsive mobile-first

## 🔒 Règles de sécurité intégrées
- Pas de dosage sans volume
- pH avant chlore, TAC avant pH
- Aucun mélange de produits (chlore + acide = gaz toxique)
- Délais baignade affichés
- "Quand appeler un pro" sur valeurs critiques
- Disclaimer permanent

## 💎 Plans freemium
- Surface (gratuit) : 1 piscine, 2 scans/mois, 5 guides, historique 14j
- Limpide (7,99€/mois) : scans illimités, météo, tous guides, 90j
- Cristal (12,99€/mois, populaire) : 3 piscines, PDF, vidéos premium, mode pro
- Gardien (24,99€/mois) : multi-clients illimité, devis, API

## ⚠️ Limites assumées (honnêtes)
- App native iOS/Android : pas buildable ici (Next.js web). STORE_READINESS.md documente le plan RN/Expo.
- Notifications push : nécessitent app native.
- Rapport PDF : backend prêt, UI à finaliser.
- Multi-piscines UI : backend prêt, UI à ajouter.
- Serveur dev : doit être relancé si inactif (dites "serveur mort").

## 🚀 Reprise en main

```bash
cd /home/z/my-project
bun install              # installer dépendances
bun run db:push          # créer/migrer la base SQLite
bun run dev              # lancer sur http://localhost:3000
bun run lint             # vérifier le code
```

Au premier chargement : landing page par défaut → CTA "Accéder à l'app" → onboarding profil → dashboard.

## 📚 Docs associés
- `README.md` — vue d'ensemble
- `PRODUCT_AUDIT.md` — audit produit
- `BRAND_NAMING.md` — étude naming (reco : PoolPilot)
- `STORE_READINESS.md` — prep iOS/Android
- `PROJECT_JOURNEY.md` — ce document (journal de parcours)

## 🎯 Vision produit

**Positionnement** : "L'assistant qui vous dit exactement quoi faire pour garder une eau claire, saine et équilibrée, sans surdoser ni perdre du temps."

**Promesse** : Photo + mesures + météo + historique + profil + inventaire = diagnostic prudent + plan d'action exact + rappels intelligents.

**Différenciateur** : moteur de dosage DÉTERMINISTE (non-IA) + VLM multimodale prudente + météo temps réel + 20 guides experts. La seule app qui combine tout.

**Naming recommandé pour le lancement** : PoolPilot
