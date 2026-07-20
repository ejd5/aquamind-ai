# AQWELIA — Carte des Feature Gates

> Phase 1 du Masterplan Visuel — Feature gates et gating
> Date : 2026-07-20 | Branche : feat/aqwelia-brain-foundation

---

## Résumé

| Métrique | Valeur |
|----------|--------|
| **Feature gates total** | 9 |
| **Plans B2C** | 4 (Découverte, Oasis, Wellness, Spa365) |
| **Plans B2B Pro** | 4 (Solo, Team, Fleet, Enterprise) |
| **Plans Growth** | 3 (Starter, Pro, Enterprise) |

---

## 1. FEATURE GATES SERVEUR

| Feature Gate | Niveaux | Source | Détails |
|-------------|---------|--------|---------|
| `water_test` | free, basic, premium | `gate.ts` | Tests de水质 |
| `history_extended` | basic, premium | `gate.ts` | Historique étendu |
| `weather_advanced` | premium | `gate.ts` | Météo avancée |
| `smart_reminders` | basic, premium | `gate.ts` | Rappels intelligents |
| `multi_pool` | premium | `gate.ts` | Multi-piscines |
| `pdf_report` | premium | `gate.ts` | Rapports PDF |
| `pro_mode` | premium | `gate.ts` | Mode Pro (LSI, etc.) |
| `guides_premium` | premium | `gate.ts` | Guides premium |
| `care_catalogue` | free, basic, premium | `gate.ts` | Catalogue Care |

---

## 2. PLANS B2C

| Plan | Prix/mois | Water Test | History | Weather | Reminders | Multi Pool | PDF | Pro | Guides |
|------|-----------|------------|---------|---------|-----------|------------|-----|-----|--------|
| **Découverte** | Gratuit | basic | basic | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Oasis** | 4.99€ | premium | basic | premium | basic | ❌ | ❌ | ❌ | ❌ |
| **Wellness** | 9.99€ | premium | premium | premium | premium | premium | premium | ❌ | ❌ |
| **Spa365** | 14.99€ | premium | premium | premium | premium | premium | premium | premium | premium |

---

## 3. PLANS B2B PRO

| Plan | Prix/mois | Clients | Pools | Interventions | Reports |
|------|-----------|---------|-------|---------------|---------|
| **Solo** | 29€ | 5 | 10 | 50/mois | Basic |
| **Team** | 79€ | 25 | 50 | 200/mois | Avancé |
| **Fleet** | 149€ | 100 | 250 | Illimité | Complet |
| **Enterprise** | Sur mesure | Illimité | Illimité | Illimité | Custom |

---

## 4. PLANS GROWTH

| Plan | Leads/mois | Matching IA | Pricing | Support |
|------|------------|-------------|---------|---------|
| **Starter** | 10 | ❌ | Fixe | Email |
| **Pro** | 100 | ✅ | Dynamique | Prioritaire |
| **Enterprise** | Illimité | ✅ | Custom | Dédié |

---

## 5. GATES IMPLÉMENTÉS (côté serveur)

```typescript
// gate.ts - requireFeatureAccess
export function requireFeatureAccess(
  feature: string,
  minLevel?: string
): { hasAccess: boolean; currentLevel: string; requiredLevel?: string }
```

---

## 6. INCOHÉRENCES DÉTECTÉES

| # | Problème | Détails |
|---|----------|---------|
| 1 | **Pas de gate paywall** | Le paywall est client-side uniquement — bypass possible |
| 2 | **Quota scan non limité** | Le quota P0-A est 999999 (illimité temporaire) |
| 3 | **Pas de trial period** | Pas de période d'essai pour les plans payants |
| 4 | **Pas d'annulation** | Pas de flow d'annulation d'abonnement |
