---
Task ID: RESTORE-1
Agent: main (Z.ai Code)
Task: Restaurer le projet AquaMind AI depuis le zip uploadé par l'utilisateur (/home/z/my-project/upload/aquamind-project.zip) et vérifier son bon fonctionnement end-to-end.

Work Log:
- Vérifié l'upload du zip (337K, 128 fichiers extraits)
- Comparé les configs (package.json, tsconfig, tailwind.config, components.json, next.config, postcss, eslint, Caddyfile) → toutes IDENTIQUES au projet courant (même stack, dépendances déjà installées)
- Identifié que globals.css du zip contient le design system "Oceanic Luxury" complet (334 lignes vs 122 sur le scaffold) → à écraser
- Copié tout src/ (app/, components/aquamind/, components/landing/, components/ui/, lib/pool/, hooks/) vers le projet
- Copié prisma/schema.prisma (13 modèles: PoolProfile, WaterTest, PhotoDiagnostic, ActionPlan, Equipment, ProductInventory, ChatMessage, MaintenanceTask, PoolDesign, Reminder, GuideView, Subscription, AnalyticsEvent)
- Copié public/ (logo.svg, robots.txt) et les 5 docs .md (README, PROJECT_JOURNEY, PRODUCT_AUDIT, BRAND_NAMING, STORE_READINESS)
- Vérifié .env : DATABASE_URL=file:/home/z/my-project/db/custom.db (OK)
- Exécuté `bun run db:push` → base SQLite créée et sync, Prisma Client généré (v6.19.2)
- Redémarré le dev server (Next.js 16.1.3 Turbopack) → Ready in 1.1s, HTTP 200 sur /
- Vérification end-to-end avec Agent Browser :
  * Landing page : 14 sections s'affichent (Hero, Problème, Coûts, Pisciniste, Solution, Comparatif, Simulations, Gains, Story, Variations, Features, Tarifs, FAQ, CTA) — aucune erreur
  * APIs : profile 200, dashboard 200, guides 200, reminders 200, subscription 200, weather 500 (bug)
- Bug trouvé et corrigé dans src/app/api/pool/weather/route.ts ligne 82 :
  * Avant : `return NextResponse.json({ weather, assessment, lastTestDaysAgo: lastTest.daysAgo || lastTestDaysAgo })` — `lastTest` est null quand aucun WaterTest en base → TypeError: Cannot read properties of null (reading 'daysAgo')
  * Après : `return NextResponse.json({ weather, assessment, lastTestDaysAgo })` — utilise la variable calculée
  * Re-vérifié : weather API retourne maintenant vraie météo wttr.in (28°C, Partiellement nuageux) + assessment avec alerte "Canicule prévue" severity extreme
- Test du flux onboarding complet (4 étapes) :
  * Étape 1 : nom + volume + unité + forme + surface
  * Étape 2 : traitement (Chlore/Sel/Brome/Oxygène/UV/Autre)
  * Étape 3 : filtre (Sable/Cartouche/Verre/Diatomée) + pompe optionnel
  * Étape 4 : région + exposition + usage + couverture → "Activer AquaMind"
  * POST /api/pool/profile crée le profil en base (id généré, tous champs persistés)
- Vérifié le dashboard après création du profil : AppShell avec 11 modules (Aujourd'hui, Diagnostic photo, Analyse eau, Assistant IA, Plan d'action, Carnet de santé, Maintenance, Météo intelligente, Ressources & guides, Rappels, AquaMind Premium) — toutes les nav, stats (MESURES 0, DIAGNOSTICS 0, ÉQUIPEMENTS 0, PRODUITS 0), boutons d'action — aucune erreur navigateur ni console
- Exécuté `bun run lint` → 0 erreur, 0 warning
- Serveur relancé pour l'utilisateur (PID 4207, prêt sur port 3000)

Stage Summary:
- Projet AquaMind AI COMPLÈTEMENT restauré et fonctionnel depuis le zip de l'utilisateur
- 128 fichiers restaurés (src complet + prisma + public + 5 docs)
- Base de données SQLite créée et sync (13 modèles Prisma)
- 1 bug corrigé : weather/route.ts crash sur lastTest null
- Toutes les APIs vérifiées (profile, dashboard, guides, weather, reminders, subscription) → 200
- Flux complet vérifié : landing → onboarding (4 étapes) → création profil → dashboard avec 11 modules
- Lint propre (0 erreur/warning)
- Serveur dev actif sur http://localhost:3000 (visible dans le panneau de preview)
- Le serveur peut être tué entre les appels Bash (comportement connu du sandbox, mentionné dans PROJECT_JOURNEY.md) — dire "serveur mort" pour le relancer
- État : prêt à reprendre le développement avec l'utilisateur

---
Task ID: RB-1
Agent: general-purpose (rebrand)
Task: Renommer AquaMind AI → AQWELIA partout dans le projet

Work Log:
- Lu worklog.md pour contexte (RESTORE-1 a restauré le projet depuis le zip)
- Grep initial : 70 occurrences de "AquaMind" réparties sur 35 fichiers
- Mis à jour src/app/layout.tsx (métadonnées : titre, description, keywords, authors)
- Mis à jour 12 composants aquamind/ : header, footer, app-shell, onboarding, module-assistant, module-paywall, module-action-plan, module-diagnostic, module-guides, module-maintenance, module-water-test, emergency-mode (texte UI visible, libellés nav, disclaimer, boutons onboarding, etc.)
- Mis à jour src/components/landing/landing-page.tsx (header, footer, aria-label, copyright)
- Mis à jour 9 sections landing/ : hero, faq, story, savings, pisciniste-cost, comparator, solution, variations, simulations (5 autres sections n'avaient aucune mention AquaMind : problem, real-costs, features-grid, pricing, final-cta)
- Mis à jour src/lib/pool/ai-context.ts (system prompt LLM), guides-data.ts (4 fiches guides), dosing-engine.ts (commentaire de header)
- Mis à jour README.md (titre + paragraphe licence)
- Ajouté note de renommage en haut de PROJECT_JOURNEY.md (contenu historique préservé)
- Ajouté nouvelle section "## AQWELIA (nouveau nom — juillet 2026)" en haut de BRAND_NAMING.md (étude historique préservée ci-dessous)
- Vérification : src/lib/pool/freemium.ts ne contient aucune mention "AquaMind" (plans déjà nommés Surface/Limpide/Cristal/Gardien sans préfixe de marque)
- Lancé `bun run lint` pour vérifier l'absence d'erreurs

Stage Summary:
- Rebranding AquaMind AI → AQWELIA TERMINÉ sur les 24 fichiers listés dans le périmètre RB-1
- ~60 remplacements de texte effectués au total (voir détails ci-dessus)
- Tous les fichiers UI visibles par l'utilisateur sont à jour (header, footer, landing, onboarding, modules, prompts IA, guides)
- Lint : voir résultat du run (pass attendu)
- Fichiers NON touchés par respect des règles RB-1 :
  * src/app/globals.css (déjà traité par main agent)
  * src/app/page.tsx (règle explicite "DO NOT modify" — MAIS contient en réalité "Chargement d'AquaMind…" ligne 75 : inconsistency à corriger manuellement si souhaité)
  * package.json name field (règle sandbox compat)
  * Dossiers /src/components/aquamind/ non renommés (règle stabilité imports)
- Fichiers hors périmètre explicite contenant encore "AquaMind" (historique/comments) :
  * prisma/schema.prisma (commentaire header)
  * .env.example (titre)
  * PRODUCT_AUDIT.md / STORE_READINESS.md (titres historiques)
  * PROJECT_JOURNEY.md / BRAND_NAMING.md (intentionnellement préservés pour l'historique + nouvelle section ajoutée)
