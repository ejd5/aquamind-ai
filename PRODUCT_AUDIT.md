# AQWELIA — Product Audit

> Audit honnête de l'état du produit après les itérations successives.

## ✅ Ce qui est déjà bon (fondation solide)

### Architecture
- **Moteur déterministe `src/lib/pool/*`** : l'IP critique est en place et séparée de l'IA
  - `dosing-engine.ts` : calculs de dosage précis par volume
  - `water-balance.ts` : LSI + indice eau claire 0-100
  - `safety-rules.ts` : sécurité baignade + interdictions
  - `action-plan.ts` : génération ordonnée (TAC→pH→chlore)
  - `targets.ts`, `units.ts`, `ai-context.ts`
- **Schéma Prisma complet** : PoolProfile, WaterTest, PhotoDiagnostic, ActionPlan, Equipment, ProductInventory, ChatMessage, MaintenanceTask, PoolDesign, Reminder, GuideView, Subscription, AnalyticsEvent
- **APIs REST** : profile, water-test, action-plan, photo-diagnostic, equipment, inventory, chat, dashboard, weather, reminders, guides, subscription, analytics

### Modules produit (11 modules sur la route `/`)
1. Dashboard Aujourd'hui — indice eau claire + swim safety + cartes météo/rappels
2. Diagnostic Photo — VLM prudent avec niveau de confiance
3. Analyse Eau — formulaire complet + plan d'action auto
4. Assistant IA — chat contextuel (profil + dernier test injectés)
5. Plan d'Action — actions ordonnées + dosages + doNotDo
6. Carnet de Santé — historique + graphiques
7. Maintenance — équipements + inventaire + rappels
8. **Météo Intelligente** — wttr.in réel + risk engine + filtration
9. **Guides & Ressources** — 20 guides structurés + recommandation
10. **Rappels Intelligents** — générés depuis météo + historique + inventaire
11. **Premium / Paywall** — 4 plans freemium (Surface/Limpide/Cristal/Gardien)

### UX
- Onboarding profil piscine en 4 étapes
- Emergency mode (14 parcours)
- Design premium Oceanic Luxury (glassmorphism, or, Playfair)
- Responsive mobile-first + sticky footer
- Navigation tabbed (desktop sidebar + mobile bottom-nav avec "Plus")

### Sécurité
- Pas de dosage sans volume
- pH avant chlore, TAC avant pH
- Aucun mélange de produits
- Délais baignade affichés
- "Quand appeler un professionnel" sur valeurs critiques
- Disclaimer permanent

## ⚠️ Ce qui restait "vitrine IA" — maintenant traité

| Avant | Maintenant |
|---|---|
| Météo absente | ✅ Météo réelle wttr.in + risk engine déterministe |
| Rappels calendrier fixe | ✅ Rappels intelligents (météo + historique + inventaire) |
| Aucun guide | ✅ 20 guides structurés + moteur de recommandation |
| Pas de business model | ✅ Freemium 4 plans + 4 durées + gating |
| Dashboard sans risque météo | ✅ Carte risque météo + prochain rappel |

## 🔧 Trous fonctionnels restants (priorités futures)

### Priorité 1 (prochaine itération)
- [ ] **Scan bandelette amélioré** : calibration couleur + correction manuelle + aide visuelle "comment prendre la photo"
- [ ] **Rapport PDF** : export du carnet de santé (gated Cristal+)
- [ ] **Notifications push** : nécessite app native (voir STORE_READINESS.md)
- [ ] **Mode pro pisciniste** : multi-clients, devis, planning (gated Gardien)
- [ ] **Vidéos tutoriels** : hébergement + miniatures (infrastructure en place via `videoTitle` dans guides)

### Priorité 2
- [ ] **Pool Memory** : détection de patterns (pH qui remonte, chlore qui chute après chaleur)
- [ ] **Multi-piscines** (gated Cristal) — UI à ajouter
- [ ] **Saisonnier intelligent** : détection automatique remise en route / hivernage
- [ ] **Intégration sondes connectées** : pH/chlore/temp IoT (future API)
- [ ] **Support in-app** : chat aide + FAQ contextuelle

### Priorité 3
- [ ] **App native iOS/Android** (voir STORE_READINESS.md)
- [ ] **Analytics dashboard** (KPIs déjà trackés en DB)
- [ ] **A/B testing** onboarding
- [ ] **Internationalisation** (ES, EN, DE, IT)

## 📊 Métriques produit (analytics en place)

Le tracking est prêt via `/api/analytics`. Événements à instrumenter côté frontend :
- `first_scan` — premier diagnostic photo
- `first_test` — premier test d'eau
- `first_plan` — premier plan d'action généré
- `paywall_viewed` — vue du paywall
- `subscription_activated` — conversion
- `guide_opened` — (déjà tracké via GuideView)
- `emergency_launched` — usage mode urgence
- `weather_alert_dismissed` / `weather_alert_acted`

KPIs cibles :
- Onboarding completion > 70%
- Test J1 retention > 40%
- Scan photo J7 > 25%
- Paywall conversion > 3%
- Guide open rate > 50% (utilisateurs actifs)

## 🎯 Recommandation stratégique

Le produit est **prêt pour une beta privée web**. Les fondations (moteur déterministe, modules, freemium, contenu éducatif, météo, rappels) sont solides.

**Prochain jalon critique** : l'app native iOS/Android (cf. STORE_READINESS.md) pour débloquer notifications push, caméra native et soumission stores.

**Renommage recommandé** : PoolPilot (cf. BRAND_NAMING.md) pour le lancement public.
