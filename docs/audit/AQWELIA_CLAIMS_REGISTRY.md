# AQWELIA — Registre des Affirmations Commerciales

> Phase 0 Audit — Étape 6: Audit des Promesses Commerciales
> Date : 2026-07-23 | SHA : f85db85

---

## Légende

| Décision | Signification |
|----------|--------------|
| **KEEP** | Affirmation vérifiée, preuve technique présente |
| **REWRITE** | Affirmation partiellement vraie, nécessite reformulation |
| **REMOVE** | Affirmation fausse ou sans preuve, à supprimer |
| **MARK_AS_BETA** | Fonctionnalité existante mais immature, à qualifier |

---

## 1. « 10 agents autonomes »

| Champ | Détail |
|-------|--------|
| **Emplacement** | `src/app/growth/page.tsx` (hero + grille), multiples pages Growth |
| **Langue** | FR, EN (hardcoded Growth page) |
| **Texte exact** | « 10 agents dédiés à votre croissance » / « 10 specialized agents for your growth » |
| **Preuve technique** | 10 fonctions dans `src/lib/growth/agents.ts` : offer_builder, lead_capture, qualification, diagnostic, matching, appointment, nurturing, quote, attribution, compliance |
| **Preuve commerciale** | Les 10 existent et sont persistés en DB (AgentRun, AgentAction) |
| **Réalité** | Ce sont des **fonctions déterministes** (rule-based, scoring, regex), PAS des agents IA autonomes. Aucun LLM n'est appelé. Aucune action autonome n'est effectuée. |
| **Décision** | **REWRITE** — « 10 moteurs de traitement dédiés à votre croissance » ou « 10 outils d'automatisation » |
| **Risque** | Utilisation du terme « agent autonome » peut induire en erreur les utilisateurs et les régulateurs (AI Act) |

---

## 2. « 24/7 »

| Champ | Détail |
|-------|--------|
| **Emplacement** | `src/app/growth/page.tsx`, sections features |
| **Langue** | FR, EN |
| **Texte exact** | « Disponible 24h/24, 7j/7 » |
| **Preuve technique** | L'application web est accessible 24/7. L'assistant chat utilise NVIDIA NIM API (`@/lib/ai/nvidia`) — le modèle chat est `z-ai/glm-5.2` servi via NVIDIA NIM. |
| **Preuve commerciale** | L'uptime dépend de l'hébergement et de NVIDIA NIM. |
| **Réalité** | L'application web est techniquement disponible 24/7. **Mais** : (1) NVIDIA NIM n'a pas de SLA public documenté, (2) le chat peut être indisponible sans notification, (3) aucun monitoring de disponibilité n'est documenté. |
| **Décision** | **REWRITE** — « Application accessible en ligne. L'assistant IA nécessite une connexion internet. » |
| **Risque** | « 24/7 » implique une garantie d'uptime que le projet ne peut pas offrir sans monitoring et SLA |

---

## 3. « +38% »

| Champ | Détail |
|-------|--------|
| **Emplacement** | `src/app/growth/page.tsx:67` |
| **Langue** | FR (page Growth) |
| **Texte exact** | « +38% de conversion moyenne » |
| **Preuve technique** | **Aucune**. Pas de données de conversion dans le code. Pas d'A/B testing. Pas d'étude de cas. |
| **Preuve commerciale** | **Aucune**. |
| **Réalité** | Affirmation non vérifiable. Potentiellement basée sur une étude sectorielle non citée. |
| **Décision** | **REMOVE** ou **REWRITE** avec source citée |
| **Risque** | Affirmation trompeuse si non fondée |

---

## 4. « Moins de 2 minutes »

| Champ | Détail |
|-------|--------|
| **Emplacement** | Pages landing (tarifs, comment-ca-marche), sections features |
| **Langue** | FR, EN, ES, DE, IT, PT, NL |
| **Texte exact** | « Configuration en moins de 2 minutes » |
| **Preuve technique** | Le flow d'onboarding (`tests/entry-flow.test.ts`) existe. La création de profil piscine est un formulaire simple. |
| **Preuve commerciale** | Pas de mesure du temps réel d'onboarding. |
| **Réalité** | Plausible pour un pool profile simple. Moins réaliste pour un setup complet (équipements, historique, etc.) |
| **Décision** | **MARK_AS_BETA** — « Configuration de base en ~2 minutes » |
| **Risque** | Dépend du contexte utilisateur |

---

## 5. « QuickBooks intégré »

| Champ | Détail |
|-------|--------|
| **Emplacement** | Pages Pro (tarifs, features) |
| **Langue** | FR |
| **Texte exact** | « Intégration QuickBooks » |
| **Preuve technique** | **AUCUNE**. Aucun fichier, aucune route, aucune dépendance QuickBooks dans le code. |
| **Preuve commerciale** | **AUCUNE**. |
| **Réalité** | N'existe pas. |
| **Décision** | **REMOVE** |
| **Risque** | Affirmation mensongère |

---

## 6. « Xero intégré »

| Champ | Détail |
|-------|--------|
| **Emplacement** | Pages Pro (tarifs, features) |
| **Langue** | FR |
| **Texte exact** | « Intégration Xero » |
| **Preuve technique** | **AUCUNE**. Aucun fichier, aucune route, aucune dépendance Xero dans le code. |
| **Preuve commerciale** | **AUCUNE**. |
| **Réalité** | N'existe pas. |
| **Décision** | **REMOVE** |
| **Risque** | Affirmation mensongère |

---

## 7. « Offline complet »

| Champ | Détail |
|-------|--------|
| **Emplacement** | FAQ, pages features |
| **Langue** | FR, EN |
| **Texte exact** | « Fonctionne hors-ligne » / « Full offline support » |
| **Preuve technique** | Cache IndexedDB (15+ endpoints), outbox pattern (7 modules), network-first strategy |
| **Preuve commerciale** | L'offline fonctionne pour la lecture et écriture de données de base. |
| **Réalité** | **Partiellement vrai**. Lecture ✓, écriture ✓ (7 modules), photo ✗ (VLM requiert réseau), sync ✓ (basique, sans idempotence ni résolution de conflits). Pas de service worker ni PWA. |
| **Décision** | **REWRITE** — « Mode déconnecté pour les données de base : consultation, tests d'eau, rappels, équipements. La photo diagnostic et la synchronisation avancée nécessitent une connexion. » |
| **Risque** | « Offline complet » est trompeur |

---

## 8. « Routage optimisé »

| Champ | Détail |
|-------|--------|
| **Emplacement** | Pages Pro (features, tarifs) |
| **Langue** | FR |
| **Texte exact** | « Routage de tournées optimisé » |
| **Preuve technique** | **AUCUNE**. Aucun algorithme de routage dans le code. Pas de VRP, pas de TSP, pas de Google Maps API. |
| **Preuve commerciale** | **AUCUNE**. |
| **Réalité** | N'existe pas. Les interventions sont listées mais pas optimisées. |
| **Décision** | **REMOVE** |
| **Risque** | Affirmation mensongère |

---

## 9. « Facturation conforme »

| Champ | Détail |
|-------|--------|
| **Emplacement** | Pages Pro (features) |
| **Langue** | FR |
| **Texte exact** | « Facturation conforme aux normes » |
| **Preuve technique** | **AUCUNE**. Pas de module de facturation. Pas de TVA. Pas de numérotation. Pas de Factur-X. |
| **Preuve commerciale** | **AUCUNE**. |
| **Réalité** | N'existe pas. |
| **Décision** | **REMOVE** |
| **Risque** | Affirmation mensongère |

---

## 10. « Commission »

| Champ | Détail |
|-------|--------|
| **Emplacement** | `src/lib/growth/agents.ts` (attribution agent), pages Growth |
| **Langue** | FR, EN |
| **Texte exact** | « Calcul automatique des commissions (6-10%) » |
| **Preuve technique** | `attribution()` dans agents.ts : first-touch + multi-touch, taux configurables, min 25€ / max 150€, persisté en Commission DB |
| **Preuve commerciale** | L'algorithme existe et fonctionne. |
| **Réalité** | **Vrai** — le calcul de commission existe. Les taux 6-10% sont dans le code. |
| **Décision** | **KEEP** |
| **Risque** | Les bornes min/max ne sont peut-être pas mentionnées dans le marketing |

---

## 11. « Leads qualifiés »

| Champ | Détail |
|-------|--------|
| **Emplacement** | Pages Growth (features, qualification) |
| **Langue** | FR, EN |
| **Texte exact** | « Leads automatiquement qualifiés » |
| **Preuve technique** | `qualification()` dans agents.ts : scoring pondéré, 7 questions, 4 paliers |
| **Preuve commerciale** | L'algorithme existe. |
| **Réalité** | **Vrai** — la qualification est algorithmique et fonctionnelle. |
| **Décision** | **KEEP** |
| **Risque** | Qualité de la qualification dépend des questions et poids |

---

## 12. « Synchronisation comptable »

| Champ | Détail |
|-------|--------|
| **Emplacement** | Pages Pro (features) |
| **Langue** | FR |
| **Texte exact** | « Synchronisation comptable automatique » |
| **Preuve technique** | **AUCUNE**. Pas d'intégration QuickBooks, Xero, ni aucun logiciel comptable. |
| **Preuve commerciale** | **AUCUNE**. |
| **Réalité** | N'existe pas. |
| **Décision** | **REMOVE** |
| **Risque** | Affirmation mensongère |

---

## 13. « Moteur chimique déterministe, sans IA »

| Champ | Détail |
|-------|--------|
| **Emplacement** | `src/lib/pool/dosing-engine.ts` (ligne 1), `src/lib/pool/action-plan.ts` (ligne 1) |
| **Langue** | FR (commentaires code) |
| **Texte exact** | « Moteur de dosage DETERMINISTE (non-IA) », « Generateur de plan d'action DETERMINISTE » |
| **Preuve technique** | Aucun import LLM dans les chaînes de calcul. Toutes les fonctions sont pures (math + rules). |
| **Preuve commerciale** | Le code confirme le déterminisme. |
| **Réalité** | **Vrai** — le moteur chimique est 100% déterministe. L'IA est utilisée UNIQUEMENT pour la compréhension d'image (strip scan, diagnostic photo), PAS pour les dosages. |
| **Décision** | **KEEP** |
| **Risque** | Aucun |

---

## 14. « Diagnostic IA »

| Champ | Détail |
|-------|--------|
| **Emplacement** | `src/app/(public)/diagnostic-ia/page.tsx`, pages features |
| **Langue** | FR, EN |
| **Texte exact** | « Diagnostic par intelligence artificielle » |
| **Preuve technique** | NVIDIA VLM (Nemotron Nano 12B VL) analyse les photos. Retourne detectedIssues, probableIssues, confidence. |
| **Preuve commerciale** | Le VLM est réellement appelé. |
| **Réalité** | **Vrai** — mais limité à l'analyse d'image. Les dosages et recommandations qui suivent sont déterministes. |
| **Décision** | **KEEP** |
| **Risque** | Peut donner l'impression que toute la chaîne est IA |

---

## 15. « -550€/an » et « -1300€/an » (économies)

| Champ | Détail |
|-------|--------|
| **Emplacement** | `src/components/landing/sections/savings.tsx`, pages landing |
| **Langue** | FR, EN, + 5 langues |
| **Texte exact** | « Économisez jusqu'à -550€/an » (Pool), « -1300€/an » (Complet) |
| **Preuve technique** | `estimateCost()` dans dosing-engine.ts calcule le coût estimé. Module savings dans `/api/pool/savings`. |
| **Preuve commerciale** | Le calcul existe mais les chiffres marketing ne sont pas validés par le code. |
| **Réalité** | Les économies dépendent de l'usage réel. Les chiffres sont des estimations marketing. |
| **Décision** | **MARK_AS_BETA** — « Économies estimées selon usage moyen » |
| **Risque** | Chiffres non garantis |

---

## SYNTHÈSE

| Décision | Nombre | Affirmations |
|----------|--------|-------------|
| **KEEP** | 5 | Commission, Leads qualifiés, Moteur déterministe, Diagnostic IA, Brain |
| **REWRITE** | 4 | 10 agents, Offline complet, Moins de 2 minutes, 24/7 |
| **REMOVE** | 5 | +38%, QuickBooks, Xero, Routage optimisé, Facturation conforme, Synchronisation comptable |
| **MARK_AS_BETA** | 2 | Moins de 2 minutes, Économies -550€/-1300€ |

---

## ACTIONS RECOMMANDÉES

### URGENT (avant tout lancement commercial)
1. **Supprimer** les mentions QuickBooks, Xero, Factur-X, Routage optimisé, Facturation conforme, Synchronisation comptable
2. **Supprimer** ou sourcer l'affirmation « +38% de conversion »
3. **Reformuler** « 10 agents autonomes » en « 10 moteurs de traitement » ou « 10 outils d'automatisation »
4. **Qualifier** l'offline : « mode déconnecté pour les données de base »

### IMPORTANT (avant passage en production)
5. **Ajouter** des « * » ou mentions légales sur les économies estimées
6. **Documenter** les limites du mode offline dans la FAQ
7. **Sourcer** toute étude sectorielle citée (si elle existe)

### À PLANIFIER
8. **Construire** QuickBooks/Xero si souhaité (estimé: 2-3 semaines par intégration)
9. **Construire** le routage optimisé (estimé: 3-4 semaines)
10. **Construire** la facturation Pro (estimé: 2-3 semaines)
