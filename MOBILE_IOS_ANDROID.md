# MOBILE_IOS_ANDROID — Documentation technique iOS & Android

> **AQWELIA** — Application mobile native (iOS + Android) pour la gestion intelligente de piscine.
>
> Ce document décrit l'architecture, l'installation, la configuration, le build, la publication et la maintenance des applications mobiles Aqwelia construites avec **Capacitor 8** sur une base **Next.js 16** (export statique) communiquant avec un backend HTTPS distant.
>
> **Stack mobile** : Next.js 16 (export statique) · Capacitor 8.4 · RevenueCat 13.2 · Stripe 22.3 · Prisma 6.11 (PostgreSQL).
>
> **Bundle ID** : `com.aqwelia.app` (iOS + Android).
>
> **Branch** : `mobile/capacitor-ios-android`.

---

## Sommaire

1. [Architecture mobile](#1-architecture-mobile)
2. [Commandes d'installation](#2-commandes-dinstallation)
3. [Variables d'environnement](#3-variables-denvironnement)
4. [Procédure de build Web](#4-procédure-de-build-web)
5. [Procédure de synchronisation Capacitor](#5-procédure-de-synchronisation-capacitor)
6. [Procédure d'ouverture dans Xcode](#6-procédure-douverture-dans-xcode)
7. [Procédure d'ouverture dans Android Studio](#7-procédure-douverture-dans-android-studio)
8. [Configuration Apple](#8-configuration-apple)
9. [Configuration Google Play](#9-configuration-google-play)
10. [Configuration RevenueCat](#10-configuration-revenuecat)
11. [Configuration des notifications](#11-configuration-des-notifications)
12. [Configuration des deep links](#12-configuration-des-deep-links)
13. [Tests sandbox](#13-tests-sandbox)
14. [Procédure de publication](#14-procédure-de-publication)
15. [Procédure de mise à jour](#15-procédure-de-mise-à-jour)
16. [Problèmes connus](#16-problèmes-connus)
17. [Checklist App Store](#17-checklist-app-store)
18. [Checklist Google Play](#18-checklist-google-play)

---

## 1. Architecture mobile

### 1.1 Vue d'ensemble

Aqwelia mobile est une **application hybride** : un front React/Next.js buildé en HTML/CSS/JS statique, encapsulé dans une WebView native via Capacitor. Les APIs natives (caméra, haptics, notifications, etc.) sont exposées au JavaScript via la **Capacitor bridge**. Le backend (API REST + PostgreSQL) est hébergé sur un serveur distant, atteint en HTTPS.

```
┌─────────────────────────────────────────────────────────────────┐
│                       APPLICATION MOBILE                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Native Shell (Swift / Kotlin)                │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │              WebView (WKWebView / Chrome)            │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │     Next.js Static Export (HTML/CSS/JS)       │  │  │  │
│  │  │  │  React 19 · Tailwind 4 · shadcn/ui · Zustand  │  │  │  │
│  │  │  │      src/components/mobile/* (UI mobile)       │  │  │  │
│  │  │  └─────────────────┬─────────────────────────────┘  │  │  │
│  │  └────────────────────┼────────────────────────────────┘  │  │
│  │                       │ Capacitor bridge                  │  │
│  │  ┌────────────────────┴────────────────────────────────┐  │  │
│  │  │  Plugins natifs : Camera, Haptics, LocalNotif,      │  │  │
│  │  │  Keyboard, Network, Preferences, Browser, App,      │  │  │
│  │  │  StatusBar, SplashScreen, RevenueCat                │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ HTTPS (JSON)
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND AQWELIA                            │
│   Next.js 16 (Node.js standalone) · prisma/schema.prisma        │
│   ┌─────────────────────────────────────────────────────┐       │
│   │  Routes API : /api/auth/* · /api/pool/* · /api/chat │       │
│   │  /api/dashboard · /api/guides · /api/subscription   │       │
│   │  /api/stripe/* · /api/revenuecat/webhook            │       │
│   └─────────────────────┬───────────────────────────────┘       │
│                         │ Prisma Client                          │
│                         ▼                                        │
│   ┌─────────────────────────────────────────────────────┐       │
│   │              PostgreSQL (Neon / Supabase)            │       │
│   │   15 modèles : User, PoolProfile, WaterTest,         │       │
│   │   PhotoDiagnostic, ActionPlan, Equipment, Reminder,  │       │
│   │   Subscription, etc.                                 │       │
│   └─────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Flux principal

| # | Source | Action | Destination |
|---|--------|--------|-------------|
| 1 | UI React (WebView) | `takePhoto()` | `@capacitor/camera` → bridge → Camera native |
| 2 | UI React (WebView) | `fetch('/api/dashboard')` | WebView → HTTPS → `aqwelia.app/api/dashboard` → Prisma → PostgreSQL |
| 3 | UI React (WebView) | `billing.purchase(id)` | `@revenuecat/purchases-capacitor` → App Store / Play Store |
| 4 | RevenueCat (serveur) | webhook POST | `https://api.aqwelia.app/api/revenuecat/webhook` (Bearer secret) |
| 5 | Stripe (serveur) | webhook POST | `https://api.aqwelia.app/api/stripe/webhook` (signature Stripe) |
| 6 | Native (background) | `LocalNotifications.schedule()` | Capacitor → iOS UNUserNotificationCenter / Android AlarmManager |

### 1.3 Répertoires clés du projet

| Répertoire | Rôle | Fichiers notables |
|------------|------|-------------------|
| `src/lib/native/` | Wrappers SSR-safe autour des plugins Capacitor (11 modules + barrel `index.ts`) | `camera.ts`, `haptics.ts`, `keyboard.ts`, `back-button.ts`, `links.ts`, `network.ts`, `lifecycle.ts`, `storage.ts`, `status-bar.ts`, `app-exit.ts` |
| `src/lib/billing/` | Abstraction multi-plateforme du billing (RevenueCat mobile + Stripe web) | `revenuecat.ts`, `stripe-web.ts`, `index.ts`, `types.ts` |
| `src/lib/offline/` | Mode hors-ligne : cache IndexedDB + state Zustand persisté | `cache.ts`, `api-cache.ts`, `offline-store.ts`, `index.ts` |
| `src/components/mobile/` | UI mobile (shell, header, bottom tabs, 5 écrans) | `mobile-app-shell.tsx`, `mobile-header.tsx`, `bottom-tabs.tsx`, `screens/*.tsx`, `types.ts` |
| `src/lib/platform.ts` | Détection plateforme (`isNative()`, `isWeb()`, `isIOS()`, `isAndroid()`, `isMobile()`) | — |
| `src/lib/api-client.ts` | Client fetch unifié (web relatif / mobile absolu via `NEXT_PUBLIC_API_BASE_URL`) | — |
| `capacitor.config.ts` | Config Capacitor (appId, webDir, plugins) | — |
| `next.config.mobile.ts` | Config Next.js pour export statique (`output: 'export'`) | — |
| `scripts/switch-db.sh` | Bascule provider Prisma (`sqlite` ↔ `postgresql`) | — |

### 1.4 Spécificités de l'export statique

Contrairement au build web classique (`next build` standalone avec server Node), le build mobile (`next.config.mobile.ts`) produit un export **100% statique** dans `out/` :

- `output: 'export'` — pas de server Node, pas d'API routes dans le bundle.
- `images.unoptimized: true` — pas d'optimisation server-side d'images.
- Les routes API ne sont PAS incluses ; l'app mobile appelle le backend distant via `NEXT_PUBLIC_API_BASE_URL`.

---

## 2. Commandes d'installation

### 2.1 Prérequis système

| Outil | Version min | Rôle |
|-------|-------------|------|
| Node.js | 20+ | Runtime JS |
| Bun | 1.1+ | Package manager + runtime (recommandé) |
| Git | 2.40+ | Clone du repo |
| Xcode | 15+ | Build iOS (macOS only) |
| CocoaPods | 1.15+ | Dépendances iOS |
| Android Studio | Hedgehog+ | Build Android |
| JDK | 17+ | Compilation Android |
| Android SDK | API 34 | Cible Android 14+ |

### 2.2 Procédure de clone et démarrage

```bash
# 1. Cloner le dépôt
git clone https://github.com/ejd5/aquamind-ai.git
cd aquamind-ai

# 2. Basculer sur la branche mobile
git checkout mobile/capacitor-ios-android

# 3. Installer les dépendances
bun install

# 4. Copier le template d'environnement
cp .env.example .env

# 5. Éditer .env avec vos valeurs (voir section 3)
#    - DATABASE_URL (PostgreSQL local ou distant)
#    - NEXTAUTH_SECRET (générer avec : openssl rand -base64 32)
#    - NEXTAUTH_URL (http://localhost:3000 en dev)
#    - Stripe + RevenueCat keys si tests billing

# 6. Basculer le schéma Prisma vers SQLite (dev sandbox)
#    ou PostgreSQL (prod / tests multi-tenant)
./scripts/switch-db.sh sqlite    # ou: postgres

# 7. Pousser le schéma en base
bun run db:push

# 8. Démarrer le dev server (web)
bun run dev
# → http://localhost:3000
```

### 2.3 Vérifications post-install

```bash
# Lint (doit retourner 0 erreur)
bun run lint

# Type-check (5 erreurs résiduelles pré-existantes hors scope mobile)
bunx tsc --noEmit

# Prisma Client généré
bunx prisma generate

# Tester la landing page
open http://localhost:3000
```

### 2.4 Préparation des plateformes natives (première fois uniquement)

```bash
# Ajouter les plateformes iOS et Android (crée ios/ et android/)
bun run mobile:add:ios
bun run mobile:add:android

# Ensuite, premier build + ouverture des IDE
bun run mobile:ios       # build + sync + open Xcode
bun run mobile:android   # build + sync + open Android Studio
```

> ⚠️ Les dossiers `ios/` et `android/` ne sont créés qu'après `mobile:add:ios` / `mobile:add:android`. Avant cela, `mobile:ios` et `mobile:android` échoueront avec `cap sync: No such directory`.

---

## 3. Variables d'environnement

### 3.1 Tableau complet

Toutes les variables sont définies dans `.env.example` et documentées ci-dessous. Copiez `.env.example` en `.env` puis adaptez les valeurs.

| Variable | Description | Où l'obtenir | Exemple |
|----------|-------------|--------------|---------|
| `DATABASE_URL` | URL de connexion PostgreSQL (prod) ou SQLite (dev) | Neon / Supabase / Railway / Docker local | `postgresql://user:pwd@host:5432/aqwelia?schema=public` |
| `NEXTAUTH_SECRET` | Secret JWT pour NextAuth (32+ caractères aléatoires) | Générer : `openssl rand -base64 32` | `k7Hq2b...` |
| `NEXTAUTH_URL` | URL de base de l'app web (callback NextAuth) | URL du deploiement Vercel / local | `http://localhost:3000` ou `https://aqwelia.app` |
| `NEXT_PUBLIC_API_BASE_URL` | URL de base de l'API backend (vide = relatif web, URL absolue = mobile Capacitor) | URL du backend déployé | `https://api.aqwelia.app` (mobile) ou `""` (web) |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (test ou live) | Dashboard Stripe → Developers → API keys | `sk_test_51H...` |
| `STRIPE_WEBHOOK_SECRET` | Secret du webhook Stripe (signature) | Dashboard Stripe → Developers → Webhooks → endpoint | `whsec_abc123...` |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | Price ID Stripe pour Premium mensuel | Dashboard Stripe → Products → `aqwelia_premium_monthly` | `price_1PxYz...` |
| `STRIPE_PRICE_PREMIUM_YEARLY` | Price ID Stripe pour Premium annuel | Dashboard Stripe → Products → `aqwelia_premium_yearly` | `price_1PxZ0...` |
| `STRIPE_PRICE_EXPERT_MONTHLY` | Price ID Stripe pour Expert mensuel | Dashboard Stripe → Products → `aqwelia_expert_monthly` | `price_1PxZ1...` |
| `STRIPE_PRICE_EXPERT_YEARLY` | Price ID Stripe pour Expert annuel | Dashboard Stripe → Products → `aqwelia_expert_yearly` | `price_1PxZ2...` |
| `NEXT_PUBLIC_REVENUECAT_IOS_KEY` | Clé publique RevenueCat (app iOS) | Dashboard RC → Project Settings → API Keys → Apple | `appl_XXXXXXXXXXXXX` |
| `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY` | Clé publique RevenueCat (app Android) | Dashboard RC → Project Settings → API Keys → Google | `goog_XXXXXXXXXXXXX` |
| `REVENUECAT_API_KEY` | Clé secrète serveur RevenueCat (REST API) | Dashboard RC → Project Settings → API Keys → Secret | `sk_XXXXXXXXXXXXX` |
| `REVENUECAT_WEBHOOK_SECRET` | Bearer token du webhook RevenueCat | Dashboard RC → Integrations → Webhook (à définir) | `rc_wh_XXXXXXXXXXXXX` |
| `WTTR_IN_BASE_URL` | URL de base du service météo (proxy si wttr.in bloqué) | wttr.in (par défaut) ou proxy self-hosted | `https://wttr.in` |

### 3.2 Notes importantes

- Les variables préfixées `NEXT_PUBLIC_` sont **embarquées dans le bundle client** (mobile + web). Ne JAMAIS y mettre de secrets.
- Les clés `sk_*` Stripe et RevenueCat sont **serveur uniquement** (routes API Next.js).
- `REVENUECAT_WEBHOOK_SECRET` doit être **défini côté RevenueCat dashboard** avec la même valeur que dans `.env` (voir section 10).
- `NEXT_PUBLIC_API_BASE_URL` doit rester **vide en dev web** (URLs relatives) et contenir `https://api.aqwelia.app` en **build mobile**.
- Le schéma Prisma utilise `postgresql` par défaut (branche mobile). Pour revenir à SQLite (dev sandbox), exécuter `./scripts/switch-db.sh sqlite` puis `bun run db:push`.

### 3.3 Génération des secrets

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# REVENUECAT_WEBHOOK_SECRET (string aléatoire)
openssl rand -hex 24

# Vérifier la cohérence entre .env et le dashboard RevenueCat
# (le webhook bearer doit matcher exactement)
```

---

## 4. Procédure de build Web

### 4.1 Deux builds, deux cibles

Le projet dispose de **deux configurations Next.js distinctes** :

| Commande | Config utilisée | Output | Cible |
|----------|-----------------|--------|-------|
| `bun run build` | `next.config.ts` (implicite) | `.next/standalone/` (Node server) | Déploiement web (Vercel, Caddy, Node) |
| `bun run mobile:build` | `next.config.mobile.ts` (explicite via `-c`) | `out/` (HTML/CSS/JS statique) | Application mobile Capacitor |

### 4.2 Build web (standalone)

```bash
bun run build
# Équivalent à :
#   next build
#   cp -r .next/static .next/standalone/.next/
#   cp -r public .next/standalone/
```

Produit :
- `.next/standalone/server.js` — serveur Node autonome (à lancer avec `bun .next/standalone/server.js`)
- `.next/static/` — assets JS/CSS chunkés
- `public/` — fichiers statiques copiés à la racine

> ✅ Utilisé pour déployer le backend mobile (`api.aqwelia.app`).

### 4.3 Build mobile (export statique)

```bash
bun run mobile:build
# Équivalent à :
#   MOBILE_BUILD=true next build -c next.config.mobile.ts
```

Produit :
- `out/` — répertoire contenant tous les fichiers HTML/CSS/JS statiques
- Pas de `server.js`, pas d'API routes
- `images.unoptimized: true` (pas de serveur d'optimisation d'images)
- `trailingSlash: false` (routing Capacitor propre)

> ✅ Ce répertoire `out/` est celui que Capacitor synchronise dans les projets Xcode et Android Studio via `cap sync`.

### 4.4 Différences clés entre les deux configs

| Aspect | `next.config.ts` (web) | `next.config.mobile.ts` (mobile) |
|--------|------------------------|----------------------------------|
| `output` | `standalone` (implicite via script) | `"export"` |
| API routes | ✅ Incluses (server Node) | ❌ Exclues (statique) |
| Image optimization | ✅ Activée | ❌ Désactivée (`unoptimized: true`) |
| Server Node | ✅ Requis (`server.js`) | ❌ Aucun (WebView uniquement) |
| Backend | Co-localisé | Distant via `NEXT_PUBLIC_API_BASE_URL` |

---

## 5. Procédure de synchronisation Capacitor

### 5.1 Commande `mobile:sync`

```bash
bun run mobile:sync
# Équivalent à :
#   next build -c next.config.mobile.ts
#   npx cap sync ios android
```

### 5.2 Ce que fait `cap sync`

1. **Copie les fichiers web** : `out/` → `ios/App/App/public/` et `android/app/src/main/assets/public/`
2. **Met à jour les plugins natifs** : résout les versions Capacitor, exécute `pod install` (iOS) et update Gradle (Android)
3. **Régénère les bridges natifs** : si un plugin a été ajouté/supprimé dans `package.json`

### 5.3 Configuration `webDir`

Dans `capacitor.config.ts` (ligne 7) :

```ts
const config: CapacitorConfig = {
  appId: 'com.aqwelia.app',
  appName: 'Aqwelia',
  webDir: 'out',           // ← dossier source synchronisé dans les projets natifs
  backgroundColor: '#003B4A',
  // ...
}
```

> ⚠️ `webDir` doit correspondre au dossier de sortie de `next.config.mobile.ts` (`out/`). Si vous modifiez l'un, modifiez l'autre.

### 5.4 Quand exécuter `mobile:sync`

- Après **toute modification du code TypeScript/React** (`src/**/*`) qui doit être visible dans l'app native.
- Après **ajout/suppression de package Capacitor** (`bun add @capacitor/X`).
- Avant chaque **build de release** (archive Xcode / AAB Android Studio).

### 5.5 Cas particuliers

```bash
# Build mobile "propre" (supprime .next et out avant de rebuilder)
bun run mobile:clean
# Équivalent à : rm -rf out .next && next build -c next.config.mobile.ts && npx cap sync

# Sync iOS uniquement
npx cap sync ios

# Sync Android uniquement
npx cap sync android

# Re-sync sans rebuild web (si seul le native a changé)
npx cap sync
```

---

## 6. Procédure d'ouverture dans Xcode

### 6.1 Prérequis

| Prérequis | Détail |
|-----------|--------|
| Machine | macOS 13+ (Ventura ou ultérieur) |
| Xcode | 15.0+ (App Store) |
| CocoaPods | 1.15+ (`sudo gem install cocoapods` ou via Homebrew) |
| Compte Apple Developer | Program membership 99 €/an requis pour publication |
| Bundle ID | `com.aqwelia.app` (doit être enregistré dans Apple Developer Portal) |

### 6.2 Premier lancement (création du projet Xcode)

```bash
# 1. Ajouter la plateforme iOS (crée le dossier ios/)
bun run mobile:add:ios
# Équivalent : npx cap add ios

# 2. Premier build + sync + ouverture Xcode
bun run mobile:ios
# Équivalent : next build -c next.config.mobile.ts && npx cap sync ios && npx cap open ios
```

### 6.3 Lancements ultérieurs

```bash
# Si ios/ existe déjà et que vous voulez juste ouvrir Xcode
bun run mobile:open:ios
# Équivalent : npx cap open ios
```

### 6.4 Configuration dans Xcode

Une fois Xcode ouvert sur le projet `ios/App/App.xcworkspace` (PAS `.xcodeproj`) :

1. **Sélectionner la target `App`** dans le navigateur de gauche.
2. **Onglet "Signing & Capabilities"** :
   - **Team** : sélectionner votre équipe Apple Developer.
   - **Bundle Identifier** : vérifier `com.aqwelia.app` (doit matcher `capacitor.config.ts`).
   - **Automatically manage signing** : coché (recommandé).
   - **Provisioning Profile** : "Automatically manage" génère le profil au premier build.
3. **Onglet "General"** :
   - **Version** : `1.0.0`
   - **Build** : `1`
   - **Deployment Target** : iOS 14.0+ (recommandé pour Capacitor 8).
4. **Capabilities à ajouter** (via "+ Capability") :
   - **In-App Purchase** (requis pour RevenueCat)
   - **Push Notifications** (si push natif — optionnel si RevenueCat gère)
   - **Background Modes** → "Remote notifications" (si push)
5. **Info.plist** — vérifier la présence des clés de permission (voir section 8.5).

### 6.5 Premier build & run

1. Sélectionner un **simulateur** (iPhone 15 Pro recommandé) ou un **appareil physique** (requis pour tester IAP et notifications push).
2. `Cmd + R` ou bouton ▶ pour compiler et lancer.
3. Attendre : `pod install` est exécuté automatiquement par Capacitor au premier `cap sync ios`.

### 6.6 Problèmes fréquents Xcode

| Problème | Solution |
|----------|----------|
| `Pod install` échoue | `cd ios/App && pod repo update && pod install` |
| Signing : "No profiles for 'com.aqwelia.app' were found" | Vérifier Team + Bundle ID dans Signing & Capabilities |
| Build error : `Module 'Capacitor' not found` | `bun run mobile:sync` puis `cd ios/App && pod install` |
| App crash au lancement : écran blanc | Vérifier `out/` est bien rempli par `mobile:build` |
| Status bar blanche sur splash | `capacitor.config.ts` déjà configuré à `#003B4A` — relancer `cap sync` |

---

## 7. Procédure d'ouverture dans Android Studio

### 7.1 Prérequis

| Prérequis | Détail |
|-----------|--------|
| OS | macOS / Linux / Windows |
| Android Studio | Hedgehog (2023.1)+ ou plus récent |
| JDK | 17+ (Android Studio embarque généralement JBR 17) |
| Android SDK | API 34 (Android 14) + Build-Tools 34.0.0 |
| Compte Google Play Console | 25 $ (inscription unique) |

### 7.2 Premier lancement (création du projet Android)

```bash
# 1. Ajouter la plateforme Android (crée le dossier android/)
bun run mobile:add:android
# Équivalent : npx cap add android

# 2. Premier build + sync + ouverture Android Studio
bun run mobile:android
# Équivalent : next build -c next.config.mobile.ts && npx cap sync android && npx cap open android
```

### 7.3 Lancements ultérieurs

```bash
# Si android/ existe déjà
bun run mobile:open:android
# Équivalent : npx cap open android
```

### 7.4 Configuration dans Android Studio

Une fois Android Studio ouvert sur le dossier `android/` :

1. **Gradle sync** : se déclenche automatiquement à l'ouverture. Attendre la fin (peut prendre 5-10 min au premier lancement).
2. **`app/build.gradle`** — vérifier :
   - `applicationId "com.aqwelia.app"` (doit matcher `capacitor.config.ts`)
   - `versionCode 1`
   - `versionName "1.0.0"`
   - `minSdkVersion 23` (Android 6.0 — requis pour Capacitor 8)
   - `targetSdkVersion 34`
3. **Signing Config** (build de release) :
   - Générer un keystore : `keytool -genkey -v -keystore aqwelia.keystore -alias aqwelia -keyalg RSA -keysize 2048 -validity 10000`
   - Ajouter `signingConfigs.release` dans `app/build.gradle` (voir section 9.4).
4. **`AndroidManifest.xml`** — vérifier les permissions (voir section 9.5).

### 7.5 Premier build & run

1. Sélectionner un **émulateur** (Pixel 7 Pro, API 34) ou un **appareil physique** (USB debugging activé).
2. Bouton ▶ ou `Shift + F10` pour compiler et lancer.
3. Le premier build Gradle peut prendre 5-10 minutes (téléchargement des dépendances).

### 7.6 Problèmes fréquents Android Studio

| Problème | Solution |
|----------|----------|
| Gradle sync failed : `JDK version mismatch` | File → Project Structure → SDK Location → utiliser JBR 17 |
| `Namespace not specified` | Ajouter `namespace "com.aqwelia.app"` dans `android/build.gradle` |
| App crash : `Cleartext HTTP traffic not permitted` | `capacitor.config.ts` a `allowMixedContent: false` — utilisez HTTPS en prod |
| Build error : `out/ directory missing` | Exécuter `bun run mobile:build` avant `cap sync` |
| IAP : "Billing unavailable" | Utiliser un appareil physique avec compte Google connecté ; les émulateurs n'ont pas Google Play |

---

## 8. Configuration Apple

### 8.1 Apple Developer Portal — App ID

1. Se connecter à [developer.apple.com](https://developer.apple.com) → Account → Certificates, Identifiers & Profiles.
2. **Identifiers** → `+` → App IDs → App.
3. **Description** : `Aqwelia`.
4. **Bundle ID** : Explicit → `com.aqwelia.app`.
5. **Capabilities** à cocher :
   - In-App Purchase
   - Push Notifications (si push natif)
   - App Groups (si partage de données entre apps/extensions)
6. **Continue** → **Register**.

### 8.2 App Store Connect — Création de l'app

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → My Apps → `+` → New App.
2. **Platforms** : iOS.
3. **Name** : `Aqwelia`.
4. **Primary Language** : French.
5. **Bundle ID** : `com.aqwelia.app` (sélectionner celui créé en 8.1).
6. **SKU** : `aqwelia.ios` (interne, non visible).
7. **Full Access** : oui.

### 8.3 Signing (dans Xcode)

Voir section 6.4 — `Automatically manage signing` avec Team sélectionné génère le provisioning profile automatiquement. Alternative : profil manuel via Apple Developer Portal → Profiles → `+` → App Store → `com.aqwelia.app`.

### 8.4 In-App Purchases (4 produits)

Dans App Store Connect → votre app → **Monetization → In-App Purchases** → `+` Create :

| Product ID | Reference Name | Type | Price (FR) |
|------------|----------------|------|------------|
| `aqwelia_premium_monthly` | Aqwelia Premium Mensuel | Auto-Renewable Subscription | 12,99 € |
| `aqwelia_premium_yearly` | Aqwelia Premium Annuel | Auto-Renewable Subscription | 99,00 € |
| `aqwelia_expert_monthly` | Aqwelia Expert Mensuel | Auto-Renewable Subscription | 24,99 € |
| `aqwelia_expert_yearly` | Aqwelia Expert Annuel | Auto-Renewable Subscription | 199,00 € |

**Subscription Group** : créer un groupe `Aqwelia Subscriptions` et y attacher les 4 produits.

**App Store Localizations** (FR) pour chaque produit :
- **Display Name** : ex. "Premium Mensuel"
- **Description** : ex. "Le copilote complet : 3 piscines, scans illimités, météo avancée, PDF, support prioritaire."

> ⚠️ Les products IDs doivent matcher **exactement** ceux configurés dans RevenueCat (section 10).

### 8.5 App Groups (optionnel)

Si vous prévoyez des extensions (Widget, Share Extension) :
1. Apple Developer Portal → Identifiers → App Groups → `+`.
2. **Group ID** : `group.com.aqwelia.app`.
3. Attacher l'App ID `com.aqwelia.app` à ce groupe.

### 8.6 Push Notifications (APNs key)

1. Apple Developer Portal → Keys → `+`.
2. **Name** : `AqweliaAPNs`.
3. Cocher **Apple Push Notifications service (APNs)**.
4. **Continue** → **Register** → **Download** le fichier `.p8`.
5. Conserver le **Key ID** et le **Team ID** (visible en haut à droite du portal).
6. Uploader la clé `.p8` dans RevenueCat (Project Settings → Integrations → Apple Push Notifications) OU l'utiliser directement via un script serveur.

### 8.7 Privacy Policy URL

- URL : **`https://aqwelia.app/legal/privacy`**
- Doit être publiquement accessible (HTTPS, pas de redirection 302 vers un autre domaine).
- Mentionner : données collectées (email, photos, mesures d'eau, météo), finalité, hébergement, droit d'accès/modification/suppression.

### 8.8 App Review Information

Dans App Store Connect → votre app → App Information → App Review :

- **Demo account** : `demo@aqwelia.app` / `aqwelia-demo-2026`
- **Notes** : expliquer le flux principal (onboarding → saisie mesures → action plan → chat). Préciser que les IAP peuvent être testés en environnement Sandbox.

### 8.9 Info.plist — permissions requises

Vérifier la présence de ces clés dans `ios/App/App/Info.plist` (Capacitor les ajoute automatiquement via plugins) :

```xml
<key>NSCameraUsageDescription</key>
<string>Aqwelia utilise la caméra pour diagnostiquer votre eau de piscine.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Aqwelia accède à vos photos pour importer des images de diagnostic.</string>

<key>NSUserTrackingUsageDescription</key>
<string>Cette donnée sera utilisée pour mesurer l'efficacité des rappels et améliorer vos recommandations.</string>
```

---

## 9. Configuration Google Play

### 9.1 Création de l'app

1. [play.google.com/console](https://play.google.com/console) → **Create app**.
2. **App name** : `Aqwelia`.
3. **Default language** : French (France).
4. **App type** : Application.
5. **Pricing** : Free (les IAP sont séparés).
6. **Declarations** : cocher les 2 (US export laws + content policy).

### 9.2 Application ID

Vérifier dans `android/app/build.gradle` :

```gradle
android {
    namespace "com.aqwelia.app"
    defaultConfig {
        applicationId "com.aqwelia.app"
        // ...
    }
}
```

### 9.3 Signing — keystore de release

```bash
# 1. Générer le keystore (une seule fois, à conserver précieusement)
keytool -genkey -v \
  -keystore aqwelia-release.keystore \
  -alias aqwelia \
  -keyalg RSA -keysize 2048 \
  -validity 10000

# 2. Placer le keystore dans android/app/aqwelia-release.keystore
# 3. Créer android/key.properties :
#   storePassword=********
#   keyPassword=********
#   keyAlias=aqwelia
#   storeFile=aqwelia-release.keystore
```

Ajouter dans `android/app/build.gradle` :

```gradle
def keystoreProperties = new Properties()
keystoreProperties.load(new FileInputStream(rootProject.file("key.properties")))

android {
    signingConfigs {
        release {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

> ✅ Activer **Play App Signing** (Google Play Console → App integrity) pour confier la signature d'upload à Google.

### 9.4 In-app products (4 produits)

Play Console → votre app → **Monetize → Products → In-app products** → Create product :

| Product ID | Name | Type | Price (FR) |
|------------|------|------|------------|
| `aqwelia_premium_monthly` | Premium Mensuel | Subscription | 12,99 € |
| `aqwelia_premium_yearly` | Premium Annuel | Subscription | 99,00 € |
| `aqwelia_expert_monthly` | Expert Mensuel | Subscription | 24,99 € |
| `aqwelia_expert_yearly` | Expert Annuel | Subscription | 199,00 € |

Pour chaque produit, remplir :
- **Description** (FR)
- **Benefits** (FR) — ex. "3 piscines, scans illimités, météo avancée…"
- **Base plan** : Auto-renewing, monthly ou yearly
- **Grace period** : 3 jours
- **Account hold** : activé

> ⚠️ Les Product IDs doivent matcher exactement ceux d'iOS et de RevenueCat.

### 9.5 Push — Firebase Cloud Messaging (FCM)

1. [console.firebase.google.com](https://console.firebase.google.com) → Add project → `aqwelia`.
2. Add app → Android → package name `com.aqwelia.app` → Download `google-services.json`.
3. Placer `google-services.json` dans `android/app/`.
4. Vérifier dans `android/app/build.gradle` (header) :
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```
5. Vérifier `android/build.gradle` (classpath) :
   ```gradle
   classpath 'com.google.gms:google-services:4.4.0'
   ```
6. Configurer la clé serveur FCM dans RevenueCat (Project Settings → Integrations → Google Push Notifications) ou dans votre serveur push custom.

### 9.6 Privacy Policy URL

- URL : **`https://aqwelia.app/legal/privacy`** (même que iOS).
- À saisir dans : Play Console → App content → Privacy Policy.

### 9.7 Content rating questionnaire

Play Console → App content → Content rating → Start questionnaire :

- **Select category** : Utilities.
- Répondre : violence **None**, sexual content **None**, language **None**, controlled substances **None**, etc.
- Résultat attendu : **Everyone** (PEGI 3 / ESRB E).

### 9.8 Data safety form

Play Console → App content → Data safety → Start :

| Data type | Collected? | Purpose |
|-----------|------------|---------|
| Email address | Yes | Account, communications |
| Photos and videos | Yes | App functionality (diagnostic) |
| App activity (taps, history) | Yes | Analytics, personalization |
| Product interactions (purchases) | Yes | App functionality (subscriptions) |
| Identifiers (user ID) | Yes | App functionality |
| Diagnostic (crash logs) | Yes | Analytics |

Cochez :
- **Data is encrypted in transit** : Yes
- **Users can request data deletion** : Yes (via `aqwelia.app/account/delete`)
- **Data is shared with third parties** : Yes (RevenueCat, Stripe — pour la facturation uniquement)

### 9.9 App Review (internal testing)

- **Internal testing track** : créer une trace "Internal Testing" → ajouter `demo@aqwelia.app` comme testeur.
- **Review notes** : identifiant `demo@aqwelia.app` / `aqwelia-demo-2026`, expliquer le flux onboarding → mesures → action plan → chat.

---

## 10. Configuration RevenueCat

### 10.1 Création du projet

1. [app.revenuecat.com](https://app.revenuecat.com) → **New project**.
2. **Project name** : `Aqwelia`.
3. **Apps** : connecter Apple App Store app + Google Play app.

### 10.2 Clés publiques (embarquées dans l'app)

Dashboard RevenueCat → Project settings → API keys :

| Platform | Préfixe | Variable `.env` |
|----------|---------|------------------|
| iOS (Apple) | `appl_` | `NEXT_PUBLIC_REVENUECAT_IOS_KEY` |
| Android (Google) | `goog_` | `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY` |

Copier les deux clés dans `.env` :

```bash
NEXT_PUBLIC_REVENUECAT_IOS_KEY=appl_XXXXXXXXXXXXX
NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=goog_XXXXXXXXXXXXX
```

### 10.3 Entitlements

Dashboard → Product catalog → **Entitlements** → créer 2 entitlements :

| Entitlement ID | Description |
|----------------|-------------|
| `premium` | Accès aux fonctionnalités Premium |
| `expert` | Accès aux fonctionnalités Expert (inclut Premium) |

### 10.4 Association produits → entitlements

Dashboard → Product catalog → **Products** → ajouter les 4 products IDs (avec leurs metadata prix) → les attacher aux entitlements :

| Product ID | Entitlement |
|------------|-------------|
| `aqwelia_premium_monthly` | premium |
| `aqwelia_premium_yearly` | premium |
| `aqwelia_expert_monthly` | expert |
| `aqwelia_expert_yearly` | expert |

> Le code dans `src/lib/billing/revenuecat.ts` mappe le product ID vers le plan via `id.includes('premium')` / `id.includes('expert')`. Les product IDs doivent donc contenir l'un de ces deux mots.

### 10.5 Offering

Dashboard → Product catalog → **Offerings** → créer l'offering **`default`** (utilisé automatiquement par `Purchases.getOfferings()`).

Ajouter les 4 packages (`$rc_monthly`, `$rc_annual` pour chaque plan) dans l'offering `default`.

### 10.6 Clé secrète serveur

Dashboard → Project settings → API keys → **Secret API key** :

```bash
REVENUECAT_API_KEY=sk_XXXXXXXXXXXXX
```

Utilisée côté serveur pour les appels REST (grant, refund, user lookup). Actuellement, le webhook n'utilise PAS cette clé (authentification par Bearer du webhook secret, voir 10.7), mais elle est disponible pour de futurs usages (ex. sync manuelle des subscriptions).

### 10.7 Webhook

1. Dashboard → Project settings → **Integrations → Webhook**.
2. **Webhook URL** : `https://api.aqwelia.app/api/revenuecat/webhook`
3. **Authorization header** : définir un Bearer secret et le copier.
4. Coller ce secret dans `.env` :
   ```bash
   REVENUECAT_WEBHOOK_SECRET=rc_wh_XXXXXXXXXXXXX
   ```
5. Sauvegarder.

Le webhook route (`src/app/api/revenuecat/webhook/route.ts`) vérifie le header `Authorization: Bearer <secret>` puis :

- Lit `event.app_user_id` (= l'`userId` Aqwelia passé à `Purchases.configure`).
- Détermine le plan depuis `event.product_id` (`includes('premium')` → premium, `includes('expert')` → expert).
- Détermine l'état depuis `event.event_type` (`CANCELLATION`, `EXPIRATION`, `BILLING_ISSUE` → inactif).
- Met à jour la table `Subscription` (désactive les anciennes, crée la nouvelle si active).

### 10.8 Configuration côté app

Dans `src/lib/billing/revenuecat.ts`, l'initialisation est **lazy** via `ensureInitialized()` :

```ts
await Purchases.configure({ apiKey })
// apiKey = NEXT_PUBLIC_REVENUECAT_IOS_KEY sur iOS
//         NEXT_PUBLIC_REVENUECAT_ANDROID_KEY sur Android
```

> ⚠️ Note : le code actuel ne passe pas explicitement `appUserID` à `configure()`. RevenueCat génère alors un `$RCAnonymousID`. Pour attacher les achats à un utilisateur connecté Aqwelia, il faut appeler `Purchases.logIn({ appUserID: userId })` après le login NextAuth. À implémenter dans le `MobileAppShell` ou le `useSession` hook.

### 10.9 Sandbox testers

- **iOS** : App Store Connect → Users and Access → Sandbox → Testers → ajouter un compte email.
- **Android** : Play Console → Setup → License Testing → ajouter `demo@aqwelia.app` avec "RESPOND_NORMALLY".

---

## 11. Configuration des notifications

### 11.1 Notifications locales

Plugin : `@capacitor/local-notifications` (v8.2).

Aucune configuration native n'est requise — le plugin demande la permission à la première `schedule()`. La config Capacitor (`capacitor.config.ts`) définit l'icône et le son :

```ts
LocalNotifications: {
  smallIcon: 'ic_stat_icon',
  iconColor: '#004D5A',
  sound: 'bell.wav',
},
```

> ⚠️ Le wrapper `src/lib/native/local-notifications.ts` est **référencé dans `index.ts` mais le fichier n'existe pas encore** (voir section 16, problèmes connus). L'implémentation est à créer.

### 11.2 Notifications push

#### iOS (APNs)

1. Créer une clé APNs `.p8` (voir section 8.6).
2. Uploader la clé dans RevenueCat (Project Settings → Integrations → Apple Push Notifications).
3. Alternative : gérer l'envoi côté serveur via `apns2` (Node.js).

#### Android (FCM)

1. Créer un projet Firebase + `google-services.json` (voir section 9.5).
2. Récupérer la **Server Key** FCM (Project settings → Cloud Messaging).
3. Uploader la Server Key dans RevenueCat (Integrations → Google Push Notifications).

### 11.3 Stratégie de permission

> Ne pas demander la permission au lancement de l'app. La demander **lors de la création du premier rappel** (`ModuleReminders → addManual` ou `scheduleForNextTest`).

```ts
// Pattern recommandé dans le module reminders
async function onAddReminder() {
  const granted = await requestNotificationPermission()
  if (!granted) {
    toast.info("Activez les notifications pour être alerté de vos rappels.")
    // Continuer quand même : le rappel sera stocké en base, juste pas notifié
  }
  await scheduleLocalNotification({ ... })
}
```

### 11.4 Types de notifications

| Type | Trigger | Fréquence |
|------|---------|-----------|
| `measure_water` | 7 jours sans mesure | Hebdo |
| `retest_after_product` | 24h après ajout de produit | Ponctuel |
| `after_storm` | Détection orage via météo (wttr.in) | Ponctuel |
| `filter_clean` | Tous les 30 jours | Mensuel |
| `salt_cell_check` | Tous les 90 jours (si électrolyseur) | Trimestriel |
| `winterizing` | 15 octobre (hémisphère nord) | Annuel |
| `subscription_expiring` | 3 jours avant expiration (via webhook RevenueCat) | Ponctuel |

---

## 12. Configuration des deep links

### 12.1 Universal Links (iOS)

Fichier à servir sur `https://aqwelia.app/.well-known/apple-app-site-association` :

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appIDs": ["TEAM_ID.com.aqwelia.app"],
        "components": [
          {
            "/": "/open/*",
            "?": { "tab": "*" }
          }
        ]
      }
    ]
  }
}
```

Remplacer `TEAM_ID` par votre Apple Team ID (10 caractères, visible dans Apple Developer Portal).

> Le fichier doit être servi en HTTPS avec `Content-Type: application/json` et **sans redirection**.

### 12.2 App Links (Android)

Fichier à servir sur `https://aqwelia.app/.well-known/assetlinks.json` :

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.aqwelia.app",
      "sha256_cert_fingerprints": [
        "SHA256_DU_CERTIFICAT_DE_SIGNING"
      ]
    }
  }
]
```

Calculer le SHA256 :

```bash
keytool -list -v -keystore aqwelia-release.keystore -alias aqwelia | grep SHA256
```

Déclarer les intent filters dans `AndroidManifest.xml` (Capacitor le fait automatiquement avec `@capacitor/app`).

### 12.3 URL Scheme personnalisé

Schéma : `aqwelia://`

Configuré automatiquement par Capacitor (ajouté à `Info.plist` iOS et `AndroidManifest.xml` Android).

### 12.4 Paths supportés

| URL | Action |
|-----|--------|
| `aqwelia://open?tab=home` | Ouvre l'écran Accueil |
| `aqwelia://open?tab=analyses&sub=mesures` | Ouvre Analyses → Mesures |
| `aqwelia://open?tab=analyses&sub=photo` | Ouvre Analyses → Photo |
| `aqwelia://open?tab=analyses&sub=carnet` | Ouvre Analyses → Carnet |
| `aqwelia://open?tab=assistant` | Ouvre l'Assistant |
| `aqwelia://open?tab=maintenance&sub=actions` | Ouvre Entretien → Actions |
| `aqwelia://open?tab=maintenance&sub=rappels` | Ouvre Entretien → Rappels |
| `aqwelia://open?tab=maintenance&sub=meteo` | Ouvre Entretien → Météo |
| `aqwelia://open?tab=profile` | Ouvre le Profil |
| `https://aqwelia.app/open?tab=...` | Universal Link / App Link (même format) |

### 12.5 Côté code — `setupDeepLinks()`

Implémenté dans `src/lib/native/links.ts` (exporté depuis `src/lib/native/index.ts`).

Utilisation dans `src/components/mobile/mobile-app-shell.tsx` :

```ts
import { setupDeepLinks } from '@/lib/native/links'

useEffect(() => {
  const cleanupDeepLinks = setupDeepLinks((url) => {
    try {
      const u = new URL(url)
      const tab = u.searchParams.get('tab') as MobileScreen | null
      if (tab && ['home', 'analyses', 'assistant', 'maintenance', 'profile'].includes(tab)) {
        setActiveScreen(tab)
        const sub = u.searchParams.get('sub')
        if (tab === 'analyses' && sub) setAnalysesSubTab(sub as AnalysesSubTab)
        if (tab === 'maintenance' && sub) setMaintenanceSubTab(sub as MaintenanceSubTab)
      }
    } catch {}
  })
  return () => { cleanupDeepLinks?.() }
}, [])
```

> Le handler gère aussi le **cold-start** : si l'app a été lancée via deep link, `App.getLaunchUrl()` est appelé automatiquement pour récupérer l'URL initiale.

---

## 13. Tests sandbox

### 13.1 Stripe (web)

1. Dashboard Stripe → **Developers → Test mode** (basculer le toggle en haut à droite).
2. Utiliser les **cartes de test** :
   - `4242 4242 4242 4242` — paiement réussi
   - `4000 0000 0000 9995` — carte refusée (insufficient funds)
   - `4000 0027 6000 3184` — 3DSecure required
3. Date d'expiration : n'importe quelle future (ex. `12/30`), CVC : n'importe quel 3 chiffres.
4. Webhook local : `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
5. Vérifier les événements reçus dans `src/app/api/stripe/webhook/route.ts` (logs serveur).

### 13.2 RevenueCat (mobile)

#### iOS — Sandbox testers

1. App Store Connect → Users and Access → **Sandbox → Testers** → `+`.
2. Créer un tester (email, prénom, nom) — doit être différent du compte Apple ID principal.
3. Sur l'appareil de test : **Réglages → App Store → Sandbox Account** (en bas) → se connecter avec ce compte.
4. Lancer l'app → déclencher un achat → confirmer dans la sheet native.

#### Android — License testing

1. Play Console → Setup → **License Testing**.
2. Ajouter `demo@aqwelia.app` avec réponse `RESPOND_NORMALLY`.
3. Sur l'appareil : compte Google = `demo@aqwelia.app`.
4. Lancer l'app depuis le **track Internal Testing** (sinon les IAP ne sont pas visibles).

### 13.3 Compte de démo Aqwelia

- **Email** : `demo@aqwelia.app`
- **Password** : `aqwelia-demo-2026`

Créé en base via `POST /api/auth/register` avec ces credentials. Utilisé pour :
- Tests sandbox IAP (le `app_user_id` RevenueCat doit matcher le `userId` Aqwelia).
- Revue App Store / Play Console (voir sections 8.8 et 9.9).

### 13.4 Bonnes pratiques sandbox

- **Ne jamais** utiliser de vraies cartes bancaires ou de vrais achats en dev.
- **Vider le cache RevenueCat** entre les tests (Dashboard → Customers → search by `app_user_id` → delete).
- **iOS Simulator** ne supporte PAS les IAP — utiliser un appareil physique.
- **Émulateur Android** sans Google Play Store ne supporte PAS les IAP — utiliser un émulateur "Google Play" ou un appareil physique.

---

## 14. Procédure de publication

### 14.1 iOS — Archive & Upload

1. Dans Xcode, sélectionner **Generic iOS Device** comme target (pas un simulateur).
2. Menu **Product → Archive** (Cmd + Shift + B ne suffit pas — Archive est dans Product).
3. Une fois l'archive créée, l'Organizer s'ouvre → **Distribute App → App Store Connect → Upload**.
4. Suivre les étapes :
   - **App Thinning** : None (Capacitor gère les assets).
   - **Bitcode** : non requis (Capacitor le désactive).
   - **Upload symbols** : oui (pour crash logs symbolication).
5. **Upload** → attendre la validation (5-15 min).
6. App Store Connect → votre app → **TestFlight** → build en processing (15-30 min) → disponible pour testeurs internes.
7. **Submit for Review** : sélectionner le build → remplir les metadata finales → **Submit**.
8. **Review time** : 2-7 jours en moyenne (jusqu'à 14 jours pour un premier rejet).

### 14.2 Android — Build AAB & Upload

1. Dans Android Studio : menu **Build → Generate Signed Bundle / APK → Android App Bundle**.
2. Sélectionner le keystore `aqwelia-release.keystore` (voir section 9.3).
3. Sélectionner **release** build variant.
4. Output : `android/app/release/app-release.aab`.
5. Play Console → votre app → **Production → Create release**.
6. Upload `app-release.aab` → ajouter les release notes (FR) → **Save → Review release → Start rollout**.
7. **Review time** : 1-3 jours en moyenne.

### 14.3 Assets de soumission

| Asset | iOS | Android |
|-------|-----|---------|
| App icon | 1024×1024 px (PNG, no alpha) | 512×512 px (PNG) + adaptive icon |
| Screenshots — phone 6.7" | 1290×2796 px | — |
| Screenshots — phone 5.5" | 1242×2208 px | — |
| Screenshots — tablet 12.9" | 2048×2732 px | — |
| Screenshots — Android phone | — | 1080×1920 px (min) |
| Screenshots — Android tablet | — | 1200×1920 px (min) |
| App Preview video | 15-30 sec, optionnel | Optionnel (YouTube URL) |
| Promo text | 170 chars (optionnel) | 80 chars |
| Description | 4000 chars | 4000 chars |
| Keywords | 100 chars, comma-separated | — |

### 14.4 Metadata FR (app description)

**Description courte** (80 chars) :

> Aqwelia, le copilote intelligent pour une eau de piscine toujours cristalline.

**Description longue** (extrait) :

> Aqwelia est l'application mobile qui transforme l'entretien de votre piscine en expérience simple, prédictive et économique. Saisissez vos mesures d'eau, photographiez votre bassin, recevez un plan d'action personnalisé, et laissez l'assistant IA vous guider à chaque étape…

**Keywords** (iOS) :

> piscine, eau, entretien, analyse, ph, chlore, sel, électrolyse, aquarium, spa

### 14.5 URLs requises

| URL | Cible |
|-----|-------|
| Support | `https://aqwelia.app/support` |
| Privacy Policy | `https://aqwelia.app/legal/privacy` |
| Terms of Service | `https://aqwelia.app/legal/terms` |
| Marketing (optionnel) | `https://aqwelia.app` |

---

## 15. Procédure de mise à jour

### 15.1 OTA vs Full update — Capacitor ne supporte PAS l'OTA natif

Contrairement à React Native (CodePush) ou Expo Updates, **Capacitor ne propose pas de mécanisme d'OTA intégré**. Toute modification du code JS/TS nécessite :

1. `bun run mobile:sync` (rebuild `out/` + sync dans `ios/` et `android/`).
2. Rebuild de l'app native dans Xcode / Android Studio.
3. Re-soumission aux stores (App Store + Google Play).

> Pour activer l'OTA, installer un service tiers comme **Capgo** (`@capgo/capacitor-updater`) — hors scope du projet actuel.

### 15.2 Types de changements

| Type de changement | Procédure | Store resubmission ? |
|--------------------|-----------|----------------------|
| **JS/TS only** (`src/**/*`) | `mobile:sync` + rebuild + resubmit | ✅ Oui |
| **Native (permissions, plugins)** | `mobile:sync` + rebuild + resubmit | ✅ Oui |
| **Capacitor config** (`capacitor.config.ts`) | `mobile:sync` + rebuild + resubmit | ✅ Oui |
| **Backend (routes API, schema Prisma)** | Deploy serveur uniquement | ❌ Non |
| **Metadata store** (description, screenshots) | Store Console uniquement | ❌ Non |
| **In-App Products** (prix, description) | Store Console + RevenueCat | ❌ Non |

### 15.3 Versioning

Deux endroits à mettre à jour à chaque release :

1. **`package.json`** :
   ```json
   { "version": "1.0.1" }
   ```
2. **`capacitor.config.ts`** — optionnel (Capacitor ne lit pas la version, mais c'est une bonne pratique) :

   > ⚠️ Capacitor 8 ne supporte pas de champ `version` dans la config. La version native est gérée dans :
   > - **iOS** : Xcode → target `App` → Version + Build
   > - **Android** : `android/app/build.gradle` → `versionCode` (int) + `versionName` (string)

3. **iOS** — Xcode :
   - **Version** (CFBundleShortVersionString) : `1.0.1` (format semver)
   - **Build** (CFBundleVersion) : incrémenter de 1 à chaque upload (1, 2, 3…)

4. **Android** — `android/app/build.gradle` :
   ```gradle
   defaultConfig {
       versionCode 2         // int, incrémenté à chaque release
       versionName "1.0.1"   // string, semver
   }
   ```

### 15.4 Backend changes — pas de mise à jour app

Si la modification ne touche que le backend (routes API, schema Prisma, logique serveur) :

1. Deploy sur le serveur (`bun .next/standalone/server.js` ou Vercel/Caddy).
2. L'app mobile détecte automatiquement les changements (les routes API sont distantes).
3. Si le schéma de réponse API change d'une manière cassante, prévoir une période de transition (v2 de l'endpoint) ou forcer une mise à jour app.

---

## 16. Problèmes connus

### 16.1 Dev server (sandbox)

- **Instabilité** : le dev server Next.js 16 (Turbopack) peut nécessiter un redémarrage après modification de fichiers de config (`next.config*.ts`, `tsconfig.json`).
- **Solution** : `bun run dev` → Ctrl+C → `bun run dev`.

### 16.2 SQLite ↔ PostgreSQL switching

Le schéma Prisma (`prisma/schema.prisma`) utilise `postgresql` par défaut (branche mobile). Pour basculer :

```bash
./scripts/switch-db.sh sqlite     # dev sandbox (pas de serveur Postgres requis)
bun run db:push                   # créer/migrer la base
# ... travailler ...
./scripts/switch-db.sh postgres   # revenir en mode prod
```

> ⚠️ Le script fait un simple `sed` sur `provider = "..."`. Ne pas committer le `schema.prisma` modifié (garder `postgresql` dans la branche).

### 16.3 RevenueCat sandbox — cache 5 min

RevenueCat met en cache les entitlements côté serveur pendant **~5 minutes**. Après un achat sandbox, le webhook peut mettre jusqu'à 5 min à se déclencher.

- **Solution** : attendre 5 min, ou appeler `Purchases.syncPurchases()` manuellement pour forcer la sync.
- Vider le cache customer : Dashboard RC → Customers → search `app_user_id` → **Delete customer** (irréversible).

### 16.4 iOS Simulator — pas de push

L'iOS Simulator ne peut pas recevoir de **notifications push** (APNs).

- **Solution** : tester les notifications locales (`@capacitor/local-notifications`) sur le simulateur. Tester les push sur un **appareil physique**.

### 16.5 Android back button

Le bouton retour matériel Android doit être intercepté sur **chaque écran** via `setupBackButton(handler)` (`src/lib/native/back-button.ts`).

- Le `MobileAppShell` installe un handler global (voir `mobile-app-shell.tsx` lignes 73-83) qui ferme les sheets (emergency mode) puis revient à l'écran `home`.
- Pour les sous-écrans avec navigation interne (modals, drawers), installer un handler local via `useEffect`.

### 16.6 Keyboard overlap

Sur les petits écrans, le clavier virtuel peut masquer les inputs focalisés. `setupKeyboard()` (`src/lib/native/keyboard.ts`) :

- Pose la classe `keyboard-open` sur `<body>` quand le clavier est visible.
- Expose la CSS var `--keyboard-height` pour adapter le layout (`padding-bottom: var(--keyboard-height)`).
- Configure le `KeyboardResize.Body` (le body entier resize, pas seulement le scroll).

### 16.7 Offline cache TTL

Définies dans `src/lib/offline/api-cache.ts` (constante `CACHE_TTL`) :

| Endpoint | TTL | Raison |
|----------|-----|--------|
| `/api/dashboard` | 5 min | Données frequently-changing (latest test, trend, counts) |
| `/api/pool/profile` | 1 h | Profil piscine change rarement |
| `/api/pool/water-test` | 5 min | Nouvelles mesures possibles à tout moment |
| `/api/pool/photo-diagnostic` | 5 min | Idem |
| `/api/pool/weather` | 30 min | Météo change toutes les 30 min |
| `/api/pool/reminders` | 5 min | Rappels peuvent être ajoutés/modifiés |
| `/api/guides` | 24 h | Contenu statique (guides pédagogiques) |
| `/api/pool/equipment` | 1 h | Équipements changent peu |
| `/api/pool/inventory` | 1 h | Inventaire change peu |
| `/api/subscription` | 1 h | Plan change rarement |

### 16.8 Pending actions — replay au reconnect

Les actions en écriture (POST/PATCH/DELETE) exécutées hors ligne sont **mises en file** dans le store Zustand `useOfflineStore` (`src/lib/offline/offline-store.ts`).

Au retour du réseau (détecté par `useNetworkStatus()`), `flushPending()` rejoue chaque action via `api.post/patch/delete`. Les actions qui échouent à nouveau (erreur serveur) restent dans la file pour la prochaine tentative.

- **Indicateur UI** : `<OfflineBanner />` affiche "Hors connexion — données en cache" + bouton "Synchroniser (N)" si N > 0 pending actions.
- **Limitation** : les POST qui créent une ressource génèrent un `id` local (`local-${Date.now()}`) en mode offline. Le serveur renvoie un vrai `id` au replay, mais l'UI ne met pas à jour l'id local → si l'utilisateur essaie de PATCH/DELETE l'item juste après, ça peut échouer.

### 16.9 Module `local-notifications.ts` manquant

> ⚠️ **Gap identifié** : `src/lib/native/index.ts` exporte `requestNotificationPermission`, `scheduleLocalNotification`, `cancelLocalNotification`, `getPendingNotifications` et le type `LocalNotificationPayload` depuis `./local-notifications`, mais **le fichier `src/lib/native/local-notifications.ts` n'existe pas** dans le codebase actuel. Cela provoquera une erreur d'import à l'utilisation. À créer dans un lot ultérieur (peut-être L4-C ou similaire).

### 16.10 `Purchases.logIn` non implémenté

Le code `src/lib/billing/revenuecat.ts` appelle `Purchases.configure({ apiKey })` sans `appUserID`. Pour attacher les achats au user Aqwelia connecté, ajouter après login NextAuth :

```ts
import { Purchases } from '@revenuecat/purchases-capacitor'
await Purchases.logIn({ appUserID: session.user.id })
```

À implémenter dans le `MobileAppShell` ou dans un wrapper autour de `useSession`.

### 16.11 Apple-app-site-association à déployer

Le fichier `apple-app-site-association` doit être servi par le backend Aqwelia sur `https://aqwelia.app/.well-known/apple-app-site-association`. Vérifier que la route existe côté serveur (actuellement non implémentée — à ajouter dans `src/app/.well-known/` ou via Caddy).

---

## 17. Checklist App Store

Checklist de pré-soumission **iOS spécifique** :

- [ ] **Bundle ID** : `com.aqwelia.app` (Xcode → target App → Bundle Identifier)
- [ ] **Version** : `1.0.0` (Xcode → target App → Version)
- [ ] **Build** : `1` (Xcode → target App → Build, incrémenté à chaque upload)
- [ ] **App icon** : 1024×1024 px PNG sans canal alpha (Xcode → App Icons)
- [ ] **Launch screen** : configuré (Storyboard Xcode, fond `#003B4A` + logo Aqwelia)
- [ ] **Info.plist** : `NSCameraUsageDescription` (caméra pour diagnostic)
- [ ] **Info.plist** : `NSPhotoLibraryUsageDescription` (galerie pour import photos)
- [ ] **Privacy Policy URL** : `https://aqwelia.app/legal/privacy` (saisir dans App Store Connect)
- [ ] **Terms of Service URL** : `https://aqwelia.app/legal/terms`
- [ ] **Support URL** : `https://aqwelia.app/support`
- [ ] **Demo account** : `demo@aqwelia.app` / `aqwelia-demo-2026` (saisir dans App Review Information)
- [ ] **4 IAP products** créés et approuvés : `aqwelia_premium_monthly`, `aqwelia_premium_yearly`, `aqwelia_expert_monthly`, `aqwelia_expert_yearly`
- [ ] **Subscription Group** créé avec les 4 produits
- [ ] **Restore Purchases** button présent (dans `ProfileScreen` → `ModulePaywall`)
- [ ] **Manage Subscription** link présent (`revenueCatClient.manageSubscription()` ouvre `apps.apple.com/account/subscriptions`)
- [ ] **Account deletion** feature (Settings → "Supprimer mon compte")
- [ ] **Data export** feature (Settings → "Exporter mes données")
- [ ] **No forced login** : landing page accessible sans compte (page d'accueil `/`)
- [ ] **Screenshots 6.7" iPhone** (1290×2796) : au moins 1, max 10
- [ ] **Screenshots 5.5" iPhone** (1242×2208) : au moins 1, max 10
- [ ] **Screenshots 12.9" iPad** (2048×2732) : requis si Universal app activée
- [ ] **App Preview video** : 15-30 sec, optionnel
- [ ] **Age rating** : `4+` (pas de contenu inapproprié)
- [ ] **Category** : `Lifestyle` (primary) + `Utilities` (secondary)
- [ ] **App Review Notes** : expliciter le flux principal + compte démo

---

## 18. Checklist Google Play

Checklist de pré-soumission **Android spécifique** :

- [ ] **Application ID** : `com.aqwelia.app` (`android/app/build.gradle` → `defaultConfig.applicationId`)
- [ ] **Version** : `1.0.0` (`versionName`)
- [ ] **Version code** : `1` (`versionCode`, int incrémenté à chaque release)
- [ ] **App icon** : 512×512 px PNG (Play Console) + adaptive icon (mipmap-anydpi-v26)
- [ ] **AndroidManifest.xml** : permission `android.permission.CAMERA`
- [ ] **AndroidManifest.xml** : permission `android.permission.INTERNET` (implicite via Capacitor)
- [ ] **AndroidManifest.xml** : permission `android.permission.POST_NOTIFICATIONS` (API 33+)
- [ ] **Privacy Policy URL** : `https://aqwelia.app/legal/privacy` (Play Console → App content)
- [ ] **Terms of Service URL** : `https://aqwelia.app/legal/terms`
- [ ] **Support email** : `support@aqwelia.app` (Play Console → App content)
- [ ] **Demo account** : `demo@aqwelia.app` / `aqwelia-demo-2026` (App Review Notes)
- [ ] **4 in-app products** créés et **Active** : `aqwelia_premium_monthly`, `aqwelia_premium_yearly`, `aqwelia_expert_monthly`, `aqwelia_expert_yearly`
- [ ] **Restore Purchases** button présent (même code iOS — `revenueCatClient.manageSubscription()`)
- [ ] **Manage Subscription** link présent (ouvre `play.google.com/store/account/subscriptions`)
- [ ] **Account deletion** feature (même que iOS)
- [ ] **Data safety form** complétée (voir section 9.8)
- [ ] **Content rating questionnaire** complété (voir section 9.7)
- [ ] **Target audience** : 18+ ou all ages (l'app ne cible pas spécifiquement les mineurs)
- [ ] **Data collection declaration** : email, photos, usage data, purchases, identifiers
- [ ] **Screenshots phone** : au moins 2 (1080×1920 min)
- [ ] **Screenshots tablet** : au moins 2 si app tablet-optimized (1200×1920 min)
- [ ] **App signing** : Play App Signing activé (recommended — Google garde la clé de signature finale)
- [ ] **Build format** : AAB (`.aab`), PAS APK
- [ ] **Min SDK** : `23` (Android 6.0 — requis pour Capacitor 8)
- [ ] **Target SDK** : `34` (Android 14 — requis pour les nouvelles soumissions Google Play 2024+)
- [ ] **Keystore** : `aqwelia-release.keystore` sécurisé (backup chiffré, NOT dans le repo git)
- [ ] **google-services.json** présent dans `android/app/` (si push FCM activé)
- [ ] **Proguard rules** : configurées si R8/Proguard activé (par défaut Capacitor n'active pas la minification)

---

## Annexe — Commandes récapitulatives

```bash
# === Setup ===
git clone https://github.com/ejd5/aquamind-ai.git
cd aquamind-ai && git checkout mobile/capacitor-ios-android
bun install
cp .env.example .env && $EDITOR .env
./scripts/switch-db.sh sqlite && bun run db:push

# === Dev ===
bun run dev                    # http://localhost:3000
bun run lint                   # 0 erreur attendue
bunx tsc --noEmit              # ~5 erreurs résiduelles hors scope

# === Build ===
bun run build                  # web standalone → .next/standalone/
bun run mobile:build           # mobile statique → out/
bun run mobile:sync            # build + cap sync ios android
bun run mobile:clean           # rm -rf out .next && mobile:build && cap sync

# === Native (première fois) ===
bun run mobile:add:ios         # npx cap add ios
bun run mobile:add:android     # npx cap add android

# === Native (récurrence) ===
bun run mobile:ios             # build + sync + open Xcode
bun run mobile:android         # build + sync + open Android Studio
bun run mobile:open:ios        # npx cap open ios (si déjà synchronisé)
bun run mobile:open:android    # npx cap open android

# === DB ===
bun run db:push                # prisma db push
bun run db:generate            # prisma generate
bun run db:migrate             # prisma migrate dev
bun run db:reset               # prisma migrate reset (⚠️ destructif)
./scripts/switch-db.sh sqlite  # bascule provider Prisma
./scripts/switch-db.sh postgres
```

---

## Annexe — Architecture des dossiers

```
/home/z/my-project/
├── capacitor.config.ts              # Config Capacitor (appId, webDir, plugins)
├── next.config.mobile.ts            # Config Next.js export statique
├── next.config.ts                   # Config Next.js web (standalone)
├── package.json                     # Scripts mobile:*, dépendances Capacitor/RC/Stripe
├── .env.example                     # Template variables d'environnement
├── scripts/
│   └── switch-db.sh                 # Bascule Prisma sqlite ↔ postgresql
├── prisma/
│   └── schema.prisma                # 15 modèles (User, PoolProfile, Subscription, etc.)
├── ios/                             # Projet Xcode (créé par cap add ios)
│   └── App/
│       ├── App.xcworkspace          # ⚠️ Ouvrir CELUI-CI, pas .xcodeproj
│       ├── App/
│       │   ├── Info.plist           # Permissions NSCameraUsageDescription, etc.
│       │   └── public/              # Fichiers web syncés depuis out/
│       └── Podfile                  # Dépendances CocoaPods
├── android/                         # Projet Android Studio (créé par cap add android)
│   ├── app/
│   │   ├── build.gradle             # applicationId, versionCode, versionName
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml  # Permissions CAMERA, INTERNET, etc.
│   │   │   ├── assets/public/       # Fichiers web syncés depuis out/
│   │   │   └── res/                 # Icônes, splash, strings
│   │   ├── google-services.json     # Config Firebase (FCM) — à ajouter
│   │   └── aqwelia-release.keystore # Keystore de signature — à générer
│   ├── key.properties               # Chemin + passwords du keystore
│   └── build.gradle                 # Config Gradle racine
├── out/                             # Build mobile statique (généré par mobile:build)
├── public/                          # Assets statiques (logos, icons)
└── src/
    ├── lib/
    │   ├── platform.ts              # isNative(), isIOS(), isAndroid(), isMobile()
    │   ├── api-client.ts            # Client fetch unifié (api.get/post/patch/delete)
    │   ├── api-routes.ts            # 14 routes business + 2 auth
    │   ├── auth.ts                  # NextAuth options (JWT, Credentials)
    │   ├── password.ts              # hashPassword/verifyPassword (crypto.scrypt)
    │   ├── db.ts                    # Singleton PrismaClient
    │   ├── stripe.ts                # Client Stripe singleton + 4 Price IDs
    │   ├── native/                  # 11 modules Capacitor (SSR-safe)
    │   │   ├── index.ts             # Barrel export
    │   │   ├── camera.ts            # takePhoto, pickFromGallery
    │   │   ├── haptics.ts           # hapticLight/Medium/Heavy/Success/Error/Warning
    │   │   ├── keyboard.ts          # setupKeyboard, hideKeyboard
    │   │   ├── back-button.ts       # setupBackButton (Android)
    │   │   ├── links.ts             # openExternalLink, setupDeepLinks
    │   │   ├── network.ts           # getNetworkState, onNetworkChange
    │   │   ├── lifecycle.ts         # onAppStateChange, getCurrentAppState
    │   │   ├── storage.ts           # setPref, getPref, removePref, clearPrefs
    │   │   ├── status-bar.ts        # setStatusBarDark/Light, show/hide
    │   │   ├── app-exit.ts          # exitApp (Android)
    │   │   └── local-notifications.ts # ⚠️ MANQUANT — référencé dans index.ts
    │   ├── billing/                 # Abstraction multi-platform
    │   │   ├── index.ts             # getBillingClient() → stripe | revenueCat
    │   │   ├── types.ts             # PlanId, Product, Entitlement, BillingClient
    │   │   ├── stripe-web.ts        # Client web (Stripe Checkout + Portal)
    │   │   └── revenuecat.ts        # Client mobile (Purchases.configure + IAP)
    │   ├── offline/                 # Mode hors-ligne
    │   │   ├── index.ts             # Barrel
    │   │   ├── cache.ts             # IndexedDB wrapper (setCached, getCached)
    │   │   ├── api-cache.ts         # offlineApi.{dashboard, profile, ...}
    │   │   └── offline-store.ts     # Zustand persist (pendingActions, flushPending)
    │   └── pool/                    # Logique métier piscine
    │       └── freemium.ts          # 3 plans (free, premium, expert)
    ├── components/
    │   ├── mobile/                  # UI mobile
    │   │   ├── mobile-app-shell.tsx # Shell principal (header + content + tabs)
    │   │   ├── mobile-header.tsx    # Header compact (logo + pool pill)
    │   │   ├── bottom-tabs.tsx      # 5 tabs (Accueil, Analyses, Assistant, Entretien, Profil)
    │   │   ├── types.ts             # MobileScreen, AnalysesSubTab, MaintenanceSubTab
    │   │   └── screens/
    │   │       ├── home-screen.tsx          # ModuleDashboard
    │   │       ├── analyses-screen.tsx      # WaterTest + Diagnostic + HealthLog
    │   │       ├── assistant-screen.tsx     # Assistant chat
    │   │       ├── maintenance-screen.tsx   # Maintenance + Reminders + Weather
    │   │       └── profile-screen.tsx       # Profile + Paywall + Settings
    │   ├── aquamind/                # Modules desktop (réutilisés par mobile)
    │   │   ├── module-dashboard.tsx
    │   │   ├── module-water-test.tsx
    │   │   ├── module-diagnostic.tsx
    │   │   ├── module-health-log.tsx
    │   │   ├── module-action-plan.tsx
    │   │   ├── module-assistant.tsx
    │   │   ├── module-maintenance.tsx
    │   │   ├── module-reminders.tsx
    │   │   ├── module-weather.tsx
    │   │   ├── module-guides.tsx
    │   │   ├── module-paywall.tsx
    │   │   ├── onboarding.tsx
    │   │   ├── emergency-mode.tsx
    │   │   └── app-shell.tsx
    │   └── offline-banner.tsx       # Banner "Hors ligne" + bouton sync
    ├── hooks/
    │   ├── use-session.ts           # Wrapper NextAuth useSession
    │   └── use-network-status.ts    # Hook navigator.onLine + sync Zustand
    └── app/
        ├── api/
        │   ├── auth/[...nextauth]/route.ts   # NextAuth handler
        │   ├── auth/me/route.ts              # GET session courante
        │   ├── auth/register/route.ts        # POST inscription
        │   ├── dashboard/route.ts            # GET dashboard agrégé
        │   ├── pool/{profile,water-test,photo-diagnostic,action-plan,equipment,inventory,reminders,weather}/route.ts
        │   ├── chat/route.ts                 # POST chat IA (Z.ai)
        │   ├── guides/route.ts               # GET guides pédagogiques
        │   ├── subscription/route.ts         # GET/POST subscription
        │   ├── analytics/route.ts            # POST events analytics
        │   ├── stripe/{checkout,portal,webhook}/route.ts  # Stripe web billing
        │   └── revenuecat/webhook/route.ts   # Webhook RevenueCat (Bearer secret)
        ├── middleware.ts             # withAuth protection API business
        ├── layout.tsx                # Layout racine (SessionProvider, fonts)
        └── page.tsx                  # Landing page (mobile-aware via isMobile())
```

---

## Références

- **Worklog projet** : `worklog.md` (historique complet Lots 1, 2, 3, 3.5)
- **Capacitor 8 docs** : https://capacitorjs.com/docs/v8
- **RevenueCat Capacitor** : https://www.revenuecat.com/docs/capacitor
- **Next.js static export** : https://nextjs.org/docs/app/building-your-application/deploying/static-exports
- **Apple App Store Connect** : https://appstoreconnect.apple.com
- **Google Play Console** : https://play.google.com/console
- **Stripe Test Cards** : https://docs.stripe.com/testing

---

*Document généré pour la branche `mobile/capacitor-ios-android` — Task ID L4-B.*
