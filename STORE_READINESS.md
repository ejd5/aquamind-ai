# AquaMind — Store Readiness (iOS / Android)

> Préparation au lancement App Store + Google Play. L'app web actuelle sert de MVP produit ; la future app native reprendra l'architecture ci-dessous.

## 1. Architecture cross-platform recommandée

### Option recommandée : **React Native + Expo** (ou Flutter)
- **Codebase partagée** : 85% du code entre iOS et Android
- **Accès natif** : caméra, notifications push, paiements in-app, géoloc
- **Performance** : proche du natif (RN New Architecture / Hermes)
- **Écosystème** : Expo EAS pour build + submit automatisés

### Pourquoi pas Next.js PWA seule ?
- Les PWA ont des limitations sur iOS (push limité, stockage, background tasks)
- L'App Store n'accepte pas facilement les wrappers web purs (guideline 4.2)
- L'expérience caméra native est supérieure

### Structure monorepo proposée
```
aquamind/
├── apps/
│   ├── web/              # Next.js (actuel) — site + dashboard
│   ├── mobile/           # Expo (RN) — iOS + Android
│   └── api/              # API partagée (ou tRPC)
├── packages/
│   ├── pool-engine/      # lib/pool/* (dosing, safety, LSI) — code partagé !
│   ├── guides-data/      # catalogue de guides partagé
│   ├── freemium/         # logique plans partagée
│   └── ui/               # design system partagé (NativeWind)
└── assets/               # logos, icônes, captures
```

**Le moteur déterministe `lib/pool/*` est déjà du TypeScript pur** → 100% réutilisable en RN. C'est l'avantage clé de l'architecture actuelle.

## 2. Modules natifs à prévoir

| Fonction | Web (actuel) | Natif (futur) |
|---|---|---|
| Caméra photo | `<input type=file>` | `expo-camera` (live preview, focus, flash) |
| Galerie | File picker | `expo-image-picker` |
| Notifications push | — | `expo-notifications` + APNs/FCM |
| Géoloc / météo | wttr.in | `expo-location` + wttr.in ou API météo native |
| Paiements in-app | (stripe web) | `react-native-iap` (StoreKit / Billing) |
| Stockage photos | FS serveur | `expo-file-system` + Cloud sync |
| Offline | — | SQLite local + sync |
| Analytics | Postgres | Mixpanel / Amplitude (RN SDK) |
| Partage PDF | API route | `expo-sharing` + `react-native-pdf` |

## 3. Assets stores à produire

### App Store (iOS)
- [ ] **App icon** 1024×1024 (PNG, sans alpha, sans coins arrondis — Apple les ajoute)
- [ ] **Screenshots** : 6.7" (iPhone 15 Pro Max) + 6.5" + 5.5" (au minimum)
  - Format : 1290×2796 px (6.7")
  - Storyboard recommandé :
    1. Dashboard santé piscine (indice eau claire 95/100)
    2. Diagnostic photo eau (VLM en action)
    3. Scan bandelette (lecture + confiance)
    4. Alerte météo orage (push notification)
    5. Plan d'action ordonné (1. TAC → 2. pH → 3. Chlore)
    6. Analyse filtre / électrolyseur
    7. Ressources & vidéos
    8. Rappels intelligents
- [ ] **App Preview video** (optionnel mais recommandé) : 15-30s, in-app footage only, sans voix off
- [ ] **Description** FR + EN (4000 char max)
- [ ] **Mots-clés** (100 char) : piscine, eau, chlore, ph, spa, entretien, analyse
- [ ] **URL support** + **URL politique confidentialité**
- [ ] **Classification** : 4+ (pas de contenu sensible)

### Google Play (Android)
- [ ] **App icon** 512×512 PNG (avec transparence OK)
- [ ] **Feature graphic** 1024×500 (bannière store)
- [ ] **Screenshots** : min 2, max 8, format 16:9 ou 9:16
  - Même storyboard qu'iOS
- [ ] **Phone screenshot** 1080×1920 min
  - [ ] **Tablet screenshots** (optionnel) 7" + 10"
- [ ] **App preview video** (YouTube URL) : 30s-2min
- [ ] **Description courte** (80 char) + **longue** (4000 char)
- [ ] **Data safety form** (obligatoire)
- [ ] **Target audience** : 13+
- [ ] **News** : app signing par Google

## 4. Configuration requise

### iOS
- **Minimum** : iOS 15.0 (couvre 99% des devices)
- **Devices** : iPhone (obligatoire), iPad (optionnel stage 2)
- **Orientations** : portrait (principal), paysage (plans d'action)
- **Permissions** :
  - `NSCameraUsageDescription` : "Pour diagnostiquer votre eau et vos équipements"
  - `NSPhotoLibraryUsageDescription` : "Pour importer des photos de test"
  - `NSLocationWhenInUseUsageDescription` : "Pour la météo locale de votre piscine"

### Android
- **Minimum** : Android 8.0 (API 26)
- **Target** : Android 14 (API 34)
- **Permissions** :
  - `CAMERA`, `READ_MEDIA_IMAGES`, `ACCESS_COARSE_LOCATION`, `POST_NOTIFICATIONS`
- **Architecture** : arm64-v8a, armeabi-v7a, x86_64

## 5. Modèle freemium + paiements

### Implémentation paiements
- **iOS** : StoreKit 2 (subscriptions auto-renouvelables)
- **Android** : Google Play Billing Library 6
- **Server-side** : webhook pour valider reçus → activer en DB

### Product IDs suggérés
```
com.aquamind.limpide.week
com.aquamind.limpide.month
com.aquamind.limpide.quarter
com.aquamind.limpide.halfyear
com.aquamind.cristal.week
com.aquamind.cristal.month
... (12 SKUs total)
```

### Pricing tiers (à valider avec Apple/Google pricing matrix)
- Limpide : 2,99€/semaine · 7,99€/mois · 19,99€/3mois · 34,99€/6mois
- Cristal : 4,99€/semaine · 12,99€/mois · 32,99€/3mois · 57,99€/6mois
- Gardien : 9,99€/semaine · 24,99€/mois · 59,99€/3mois · 109,99€/6mois

**Note** : Apple/Google prennent 15-30% de commission. Penser à ajuster les prix.

## 6. ASO (App Store Optimization)

### Mots-clés cibles
- Primaire : "assistant piscine", "pool care", "entretien piscine"
- Secondaire : "ph piscine", "chlore", "eau verte", "spa", "électrolyseur", "bandelette test"
- Long tail : "que faire eau verte piscine", "dosage chlore", "après orage piscine"

### Stratégie de notation
- Demander un avis après un "win moment" (eau revenue à 90+ après plan d'action)
- Répondre à tous les avis (positifs et négatifs)
- Cible : 4,5★ minimum

## 7. Checklist de soumission

### Pré-lancement
- [ ] Tests beta via TestFlight (iOS) + Internal testing (Play)
- [ ] Crash-free rate > 99,5%
- [ ] Onboarding fluide (complétion > 70%)
- [ ] Plans payants testés bout en bout (sandbox)
- [ ] Politique de confidentialité rédigée + URL
- [ ] CGU + mentions légales
- [ ] Disclaimer responsabilité professionnel (déjà en place)
- [ ] Support email + FAQ in-app

### Soumission
- [ ] Build de release signé
- [ ] App Store Connect : nouvelle app + metadata + screenshots + build
- [ ] Google Play Console : nouvelle app + listing + APK/AAB
- [ ] Review time : 24-48h (Apple), 1-3j (Google)

### Post-lancement
- [ ] Monitoring crash (Sentry / Crashlytics)
- [ ] Analytics funnel (Mixpanel)
- [ ] Support tickets (Zendesk / in-app chat)
- [ ] Mises à jour toutes les 2-4 semaines

## 8. Roadmap native suggérée

| Semaine | Livrable |
|---|---|
| 1-2 | Setup monorepo + Expo + portage du moteur `lib/pool/*` |
| 3-4 | Navigation + onboarding + profil piscine (reprendre les composants) |
| 5-6 | Caméra native + diagnostic photo + scan bandelette |
| 7 | Météo + notifications push |
| 8 | Paiements in-app (StoreKit + Billing) |
| 9 | Rappels + guides + carnet |
| 10 | Beta TestFlight + Internal testing |
| 11 | Polish + assets stores |
| 12 | Soumission App Store + Google Play |
| 13-14 | Review + fixes |
| 15 | 🚀 Lancement |

## 9. Risques & mitigations

| Risque | Mitigation |
|---|---|
| Rejet App Store (guideline 4.2 minimum functionality) | S'assurer que l'app native a des fonctionnalités au-delà du web (push, caméra live, offline) |
| Rejet pour "health claims" | Disclaimer clair : "ne remplace pas un professionnel" (déjà en place) |
| Coûts commission 30% | Proposer paiement web pour plan annuel (règle Apple : OK si pas de lien in-app) |
| Concurrency native | Tests approfondis sur devices réels (pas seulement simulateur) |
| Taille de l'app | Optimiser images, utiliser App Thinning |
