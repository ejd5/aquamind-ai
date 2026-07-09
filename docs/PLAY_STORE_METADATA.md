# AQWELIA — Google Play Store Metadata

> Submission metadata for AQWELIA on the Google Play Store (Android).
> Application ID: `com.aqwelia.app` · Default language: French (FR-FR).
> Reference page in the app: [`/store`](/store). Source of truth for Play Console.

---

## 1. App identity

| Field | Value |
|-------|-------|
| **App name** | AQWELIA |
| **Application ID** | `com.aqwelia.app` |
| **Developer name** | AQWELIA |
| **Developer email** | `contact@aqwelia.app` |
| **Developer website** | `https://aqwelia.app` |
| **Default language** | French (FR-FR) |
| **App category** | Health & Fitness (primary), Lifestyle (secondary) |
| **Content rating** | Everyone (ESRB) / 3+ (IARC) |
| **Target audience** | 13+ (per Google Play Families policy) |
| **Price** | Free (with In-App Purchases) |
| **Availability** | France, Belgium, Switzerland, Luxembourg, Canada, Spain, Germany, Italy, Portugal, Netherlands, United Kingdom, United States |
| **App signing** | Play App Signing (Google manages the upload + app signing keys) |
| **Copyright** | © 2026 AQWELIA |

---

## 2. Short description (80 chars max)

```
Copilote piscine IA : analyse d'eau, dosage, météo, spa, rappels. 7j gratuits.
```

> Length: 78 chars — within the 80-char limit.

---

## 3. Full description (4000 chars max)

> ✅ Currently ~2300 chars — leaves headroom for editing.

```
AQWELIA — Votre copilote intelligent pour une eau de piscine toujours claire, saine et sûre.

• ANALYSEZ
Saisissez vos mesures (pH, chlore, TAC, stabilisant, sel, calcium…) ou prenez une photo de votre bandelette. AQWELIA calcule instantanément l'indice d'eau claire, vérifie la sécurité baignade et identifie les déséquilibres.

• COMPRENEZ
Notre IA explique chaque résultat en langage clair : pourquoi le pH a-t-il bougé ? Que faire des chloramines ? Faut-il vraiment un traitement choc ? Plus de Google à 23h, plus de doute permanent.

• AGISSEZ
Recevez un plan d'action ordonné étape par étape : TAC avant pH, pH avant chlore, dosage exact en ml/g pour votre volume d'eau, temps d'attente, filtration recommandée. Suivez l'exécution, l'app vérifie la cohérence.

POURQUOI AQWELIA ?
- Diagnostic IA instantané basé sur 14 paramètres d'eau
- Plan d'action déterministe (jamais d'aléatoire, jamais de contradiction)
- Calculs de dosage précis pour votre volume et vos produits
- Météo piscine (orage, canicule, gel) avec alertes automatiques
- Rappels intelligents : refaire un test, ajouter du chlore, hiverner
- 50+ guides experts et vidéos pas-à-pas
- Historique illimité (plans payants) et export PDF
- Mode pro LSI pour les piscinistes et techniciens
- Support spa complet avec le plan Wellness (brome, oxygène actif, eau chaude)

PLANS
- Découverte (gratuit) : 1 piscine, 2 tests/mois, 5 guides, historique 14 j
- Oasis : analyses illimitées, météo avancée, rappels, mode pro, PDF — 7 jours gratuits
- Wellness : Oasis + spa + traitements spécifiques spa — 7 jours gratuits

AQWELIA ne remplace pas votre pisciniste — elle le complète. Il vient 1 fois par semaine, AQWELIA couvre les 6 autres jours, gère les urgences, et vous apprend à comprendre votre bassin.

Données 100% privées, hébergées en UE, jamais revendues. Annulable en 1 clic.
```

---

## 4. What's New (release notes) — v1.0.0

```
🎉 Bienvenue dans AQWELIA 1.0 !

• Analyse d'eau multi-paramètres (pH, chlore, TAC, CYA, calcium, sel…)
• Diagnostic photo par IA (bandelettes + équipements)
• Plan d'action déterministe étape par étape
• Météo piscine + alertes orage/canicule
• Rappels intelligents
• 50+ guides experts + vidéos
• Plans Oasis et Wellness avec 7 jours gratuits

On a construit AQWELIA pour que vous passiez moins de temps à entretenir et plus de temps à profiter de votre piscine. Écrivez-nous : contact@aqwelia.app
```

---

## 5. Screenshots required

### 5.1 Phone screenshots (16:9 or 9:16, minimum 1080 × 1920 px, max 8)

| # | Storyboard frame | Filename pattern |
|---|------------------|------------------|
| 1 | Dashboard santé piscine (indice eau claire 95/100) | `01-dashboard.png` |
| 2 | Diagnostic photo eau (VLM en action) | `02-photo-diag.png` |
| 3 | Scan bandelette (lecture IA + confiance) | `03-strip-scan.png` |
| 4 | Alerte météo orage (notification push) | `04-weather-alert.png` |
| 5 | Plan d'action ordonné (1. TAC → 2. pH → 3. Chlore) | `05-action-plan.png` |
| 6 | Analyse filtre / électrolyseur | `06-equipment.png` |
| 7 | Ressources & vidéos (guides premium) | `07-guides.png` |
| 8 | Rappels intelligents (snooze, hivernage) | `08-reminders.png` |

> Status: ⚠️ To generate from the running app via Android Studio + screenshot tool,
> or via a dedicated tool like `fastlane supply` (recommended for batch upload).

### 5.2 Tablet screenshots (7" + 10") — optional for v1.0

> AQWELIA v1.0 targets phones only. Tablet screenshots can be deferred to v1.1
> if we explicitly opt out of tablet optimization in the Play Console.

### 5.3 Feature graphic (1024 × 500 px, JPEG or PNG)

> Required for the Play Store listing (banner displayed above the screenshots).

**Concept**: AQWELIA brand gradient background (oceanic dark `#003B4A` → gold `#D4AF37`),
centered AQWELIA wordmark in Playfair Display + tagline "Copilote piscine IA" + subtle
wave motif (matching the logo). No screenshot or device frame — pure brand banner.

> Status: ⚠️ To generate. Source PSD / Figma to be produced by the design team.

### 5.4 App icon (512 × 512 px, PNG, 32-bit)

> Already present as `public/mobile/ios/icon-1024.png` — downscale to 512 × 512 for Play Console.
> Apple's 1024 icon and Google's 512 icon use the same source artwork (no rounded corners —
> both stores mask the icon automatically).

### 5.5 Promo video (optional, YouTube URL)

> Optional but recommended for conversion. Length: 30 seconds to 2 minutes.
> Same storyboard as the App Preview video (see `APP_STORE_METADATA.md` §8.3).
> Upload to the AQWELIA YouTube channel and paste the URL into the Play Console.

---

## 6. Data safety form (required)

> Filled into Play Console → App content → Data safety.
> Mirrors the iOS App Privacy details from `APP_STORE_METADATA.md` §6.

### 6.1 Data collected

| Data type | Collected? | Purpose | Encrypted in transit? | Can user request deletion? |
|-----------|------------|---------|------------------------|----------------------------|
| **Email address** | Yes | Account, transactional emails | Yes | Yes (in-app: Settings → Delete account) |
| **Name** | Yes | Account personalization | Yes | Yes |
| **Pool measurements** | Yes | Diagnostic + history | Yes | Yes |
| **Photos** | Yes | AI diagnostic (processed by NVIDIA NIM, retained on user account) | Yes | Yes |
| **Approximate location** | Yes (opt-in) | Local weather for pool | Yes | Yes (clearable in Settings) |
| **Purchase history** | Yes | Subscription verification | Yes | Yes |

### 6.2 Data sharing

- **Shared with third parties?** No (except: NVIDIA NIM for AI inference — only photo content, no PII; Stripe for payment processing — only billing data, no pool data).

### 6.3 Security practices

- ✅ Data encrypted in transit (HTTPS / TLS 1.2+)
- ✅ User can request data deletion (in-app: Settings → Account → Delete account, or email `contact@aqwelia.app`)
- ✅ Independent security review: scheduled Q1 2026 (pre-launch)

### 6.4 Family policy

- **Target audience**: 13+ (per Google Play Families policy) — not designed for children under 13
- **Eligible for Families program?** No (the app is intended for adult pool/spa owners)

---

## 7. Privacy policy + support URLs

| Field | URL |
|-------|-----|
| **Privacy policy URL** | `https://aqwelia.app/legal/privacy` |
| **Terms of service URL** | `https://aqwelia.app/legal/cgu` |
| **Support URL** | `https://aqwelia.app/legal/support` |
| **Customer support email** | `contact@aqwelia.app` |

---

## 8. App content declarations (Play Console)

| Declaration | Status |
|-------------|--------|
| **Privacy policy** | ✅ Required URL filled (see §7) |
| **App access** | ✅ App is publicly accessible (no API restrictions) |
| **Ads** | ✅ App does not contain ads |
| **In-app purchases** | ✅ Yes — see §9 below |
| **Data safety** | ✅ Filled (see §6) |
| **Government apps** | N/A |
| **Financial features** | N/A (payment handled by Google Play Billing) |
| **Health-related content** | ✅ App provides pool maintenance advice, not medical advice — disclaimer in `/legal/cgu` |
| **Target audience** | ✅ 13+ |
| **News app** | N/A |
| **COVID-19 contact tracing** | N/A |

---

## 9. In-App Products (subscriptions)

> Created in Play Console → Monetize → Products → Subscriptions.
> Product IDs are matched by RevenueCat (see `src/lib/billing/revenuecat.ts`).

| Product ID | Plan | Billing period | Base price (FR, EUR) | Free trial |
|------------|------|----------------|----------------------|------------|
| `aqwelia_oasis_monthly` | Oasis | 1 month | 9,99 € | 7 days |
| `aqwelia_oasis_seasonal` | Oasis | 6 months | 39,99 € | 7 days |
| `aqwelia_oasis_yearly` | Oasis | 1 year | 59,99 € | 7 days |
| `aqwelia_oasis_weekly` | Oasis (Pass urgence) | 1 week | 3,99 € | None |
| `aqwelia_wellness_monthly` | Wellness | 1 month | 14,99 € | 7 days |
| `aqwelia_wellness_seasonal` | Wellness | 6 months | 54,99 € | 7 days |
| `aqwelia_wellness_yearly` | Wellness | 1 year | 79,99 € | 7 days |
| `aqwelia_wellness_weekly` | Wellness (Pass urgence) | 1 week | 5,99 € | None |

> The weekly "Pass urgence" is a one-shot subscription with no trial — useful for short-term
> situations (post-storm recovery, vacation troubleshooting). The 7-day free trial applies
> only to monthly / seasonal / yearly subscriptions.

### Subscription terms (displayed in-app + Play Store)

```
Paiement débité sur votre compte Google Play à la confirmation de l'achat.
L'abonnement se renouvelle automatiquement sauf si la résiliation est effectuée au moins 24h avant la fin de la période en cours.
Le compte est débité du renouvellement dans les 24h précédant la fin de la période.
Vous pouvez gérer et résilier vos abonnements dans Google Play → Profil → Paiements et abonnements → Abonnements.
Période d'essai de 7 jours : aucun débit pendant l'essai ; le premier paiement intervient à la fin de l'essai.
```

---

## 10. Target SDK + manifest declarations

### 10.1 Target SDK

| Field | Value |
|-------|-------|
| **Target SDK** | 34 (Android 14) |
| **Min SDK** | 23 (Android 6.0 — covers 99% of active devices) |
| **Compile SDK** | 34 |
| **Build tools** | 34.0.0 |

### 10.2 Permissions (auto-injected by Capacitor plugins)

| Permission | Why | Plugin |
|------------|-----|--------|
| `android.permission.CAMERA` | Photo diagnostic of test strips + equipment | `@capacitor/camera` |
| `android.permission.READ_MEDIA_IMAGES` | Pick a photo from the gallery | `@capacitor/camera` |
| `android.permission.ACCESS_COARSE_LOCATION` | Local weather for pool | `@capacitor/geolocation` |
| `android.permission.POST_NOTIFICATIONS` | Local reminders + alerts | `@capacitor/local-notifications` |
| `android.permission.INTERNET` | API + AI inference | (default) |
| `android.permission.ACCESS_NETWORK_STATE` | Offline detection | `@capacitor/network` |
| `com.android.vending.BILLING` | In-app subscriptions | `@revenuecat/purchases-capacitor` |

### 10.3 Data collection declarations

> Auto-generated by Play Console from the Data safety form (§6).

- **No background location**: app only requests coarse location while in foreground
- **No microphone access**
- **No SMS / call log access**
- **No background data sync beyond RevenueCat entitlement refresh** (triggered on app open)

---

## 11. Release management

### 11.1 Internal testing track

- Create a closed testing track named "Internal"
- Add 5 internal testers (AQWELIA team emails)
- Upload the first `.aab` to this track before promoting

### 11.2 Closed testing track (beta)

- Track name: "Beta"
- Add 20–50 external testers via email list
- Collect feedback via in-app feedback form (`/legal/support` link)

### 11.3 Production rollout

- Initial rollout: 10% → 50% → 100% over 2 weeks
- Monitor crash rate (target: < 0.5%), ANR rate (target: < 0.2%)
- Respond to Play Store reviews within 24h

---

## 12. Submission checklist (final pre-flight)

- [ ] Build the web export: `bun run mobile:build`
- [ ] Run `npx cap add android` on a machine with Android Studio
- [ ] Run `npx cap sync android` — copies web assets + plugin configs into the native project
- [ ] Open `npx cap open android` → set versionCode 1 + versionName "1.0.0" in app/build.gradle
- [ ] Generate signed `.aab` (Build → Generate Signed Bundle / APK → Android App Bundle)
- [ ] Use production keystore (stored securely, NOT in the repo — `~/.android/aqwelia.keystore`)
- [ ] Enroll in Play App Signing (Google manages the app signing key)
- [ ] Create Play Console app record (Application ID `com.aqwelia.app`)
- [ ] Create the 8 In-App Products in Play Console (§9)
- [ ] Fill all Play Console metadata fields from this doc
- [ ] Upload screenshots (8 frames, 1080 × 1920 min) + feature graphic (1024 × 500)
- [ ] Fill the Data safety form (§6) + App content declarations (§8)
- [ ] Upload the `.aab` to Internal testing track first
- [ ] After smoke testing on 3 devices, promote to Closed testing (Beta)
- [ ] After beta validation, promote to Production with 10% staged rollout

---

## 13. Mobile assets inventory (`public/mobile/android/`)

> Asset list verified at the P5-STORE milestone. Capacitor's Android project
> has not been scaffolded yet (`npx cap add android` must run on a machine
> with Android Studio); the assets below are pre-staged so `npx cap sync`
> will copy them as soon as the native project exists.

### 13.1 Launcher icons — present ✅

| File | Size (px) | Density bucket | Role |
|------|-----------|----------------|------|
| `mdpi.png` | 48 × 48 | mdpi (1x) | Launcher icon |
| `hdpi.png` | 72 × 72 | hdpi (1.5x) | Launcher icon |
| `xhdri.png` | 96 × 96 | xhdpi (2x) | Launcher icon |
| `xxhdri.png` | 144 × 144 | xxhdpi (3x) | Launcher icon |
| `xxxhdri.png` | 192 × 192 | xxxhdpi (4x) | Launcher icon |
| `ic_launcher_foreground.png` | 432 × 432 | all densities | Adaptive icon foreground (alpha-masked) |
| `splash.png` | 1080 × 1920 | all densities | Splash screen (used by `@capacitor/splash-screen`) |

### 13.2 Missing Android assets ⚠️

| Required asset | Size (px) | Purpose | Priority |
|----------------|-----------|---------|----------|
| `ic_launcher_background.png` (or XML color) | 432 × 432 | Adaptive icon background (currently uses Capacitor default `#003B4A`) | **Low** — color background works, PNG only needed if a textured background is desired |
| Play Store listing icon | 512 × 512 | Play Console app icon (uploaded separately from the launcher icon) | **High** — required to publish. Can be down-scaled from the iOS `icon-1024.png` |
| Feature graphic | 1024 × 500 | Play Store banner (see §5.3) | **High** — required for the listing |
| Tablet launcher icons | 72 / 96 / 144 / 192 (already covered by density buckets) | Optional — the density buckets above cover tablets too | n/a |
| Splash screen density variants | 1080 × 1920 base + per-density variants | Optional — Capacitor auto-scales the single `splash.png` to all densities | **Low** |

> **Action**: Generate the Play Store listing icon (512 × 512, can be downscaled
> from the iOS 1024 source) + feature graphic (1024 × 500) before Play Console
> submission. The adaptive-icon background defaults to brand `#003B4A` and does
> not strictly require a PNG.

### 13.3 Dark mode variants

> Android 13+ supports themed icons (monochrome variant for the adaptive icon).
> A monochrome launcher icon is **not** provided. Add one (`ic_launcher_monochrome.png`
> at 432 × 432, alpha-only) if themed-icon support is desired for v1.1.

---

## 14. Reference

- Internal dashboard: [`/store`](/store) — live status of every item in this doc
- Apple App Store counterpart: [`docs/APP_STORE_METADATA.md`](./APP_STORE_METADATA.md)
- Technical Capacitor layer: [`docs/MOBILE_READINESS.md`](./MOBILE_READINESS.md)
- Pre-Capacitor audit: [`STORE_READINESS.md`](../STORE_READINESS.md) (legacy)
- Mobile billing wrapper: `src/lib/billing/revenuecat.ts`
- App lifecycle + deep links: `src/lib/native/app-config.ts`
