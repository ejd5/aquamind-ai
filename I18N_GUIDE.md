# AQWELIA — Guide de Traduction (i18n)

## Architecture actuelle

- **Framework i18n** : [next-intl](https://next-intl-docs.vercel.app/) (standard Next.js 16)
- **Fichiers de locale** : `src/i18n/locales/{fr,en,es,de,it,pt,nl}.json`
- **Langue source** : Français (`fr.json`)
- **Nombre de clés** : ~2750 par langue
- **Règle d'or** : **Zéro texte visible codé en dur dans les composants** — tout passe par `t("key")`

## Structure des namespaces

| Namespace | Description | Exemple |
|-----------|-------------|---------|
| `common` | Textes partagés (boutons, erreurs, noms) | `common.errors.unauthorized` |
| `nav` | Navigation principale | `nav.solution` |
| `landing` | Page d'accueil marketing | `landing.heroTitle` |
| `modules` | UI des modules de l'app | `modules.dashboard.weatherRisk` |
| `diagnostic` | Diagnostic eau | `diagnostic.balanced` |
| `diagnosticActionPlan` | Plans d'action détaillés | `diagnosticActionPlan.greenS1Title` |
| `actionPlan` | Plans d'action générés | `actionPlan.iaAdjustTac` |
| `weather` | Météo + codes wttr.in | `weather.codes.113`, `weather.alerts.storm_soon.title` |
| `reminders` | Rappels intelligents | `reminders.test_overdue.title` |
| `guidesData` | Guides pédagogiques | `guidesData.green-water.title` |
| `targets` | Cibles paramètres eau | `targets.ph.label` |
| `spaData` | Données spa | `spaData.freq_daily` |
| `plans` | Plans tarifaires | `plans.free.name` |
| `settings` | Page paramètres | `settings.accountSection` |
| `onboarding` | Configuration initiale | `onboarding.step1Title` |
| `legal` | CGU, confidentialité, support | `legal.cgu.article1Title` |
| `metadata` | SEO | `metadata.title` |

## Règles de développement

### ✅ À FAIRE
```tsx
// Utiliser t() pour tout texte visible
const t = useTranslations('modules.dashboard')
return <h1>{t('weatherRisk')}</h1>

// Pour les données dynamiques avec clés
<p>{t(alert.titleKey as any)}</p>
<p>{t(alert.messageKey as any, alert.messageParams || {})}</p>
```

### ❌ À NE PAS FAIRE
```tsx
// Texte codé en dur — BLOQUÉ par pre-commit hook
return <h1>Risque météo</h1>

// Erreur API en français — BLOQUÉ
return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
```

### ✅ Routes API (server-side)
```typescript
import { pickLocale, translate } from '@/lib/i18n-api'

export async function GET(req: Request) {
  const locale = pickLocale(req)
  if (!session) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
}
```

## Pre-commit hook

Le hook `scripts/i18n/check-hardcoded-strings.py` s'exécute avant chaque commit :
- **Bloque** les chaînes avec accents français non passées par `t()`
- **Ignore** les fallbacks dans `lib/pool/*` (à côté des `*Key` fields)
- **Ignore** les patterns de détection multilingue (IA)
- **Ignore** les noms propres (pays, marques)

Pour bypasser (non recommandé) : `git commit --no-verify`

---

## Phase 2 — Mise en place de Crowdin

### Étape 1 : Créer un compte Crowdin
1. Aller sur https://crowdin.com
2. Créer un compte (gratuit jusqu'à 6000 chaînes — AQWELIA en a ~2750)
3. Créer un projet "AQWELIA"

### Étape 2 : Configurer les langues
- **Langue source** : French (fr)
- **Langues cibles** : English (en), Spanish (es), German (de), Italian (it), Portuguese (pt), Dutch (nl)

### Étape 3 : Connecter GitHub
1. Dans Crowdin → **Integrations** → **GitHub**
2. Autoriser l'accès au dépôt `ejd5/aquamind-ai`
3. Configurer la synchronisation :
   - **Fichier source** : `src/i18n/locales/fr.json`
   - **Fichiers cibles** : `src/i18n/locales/{en,es,de,it,pt,nl}.json`
   - **Branche** : `main`
   - **Sens** : Crowdin ↔ GitHub (bidirectionnel)

### Étape 4 : Créer le glossaire AQWELIA
Ajouter ces termes au glossaire (traduction cohérente) :

| Terme FR | EN | ES | DE | IT | PT | NL |
|----------|----|----|----|----|----|-----|
| AQWELIA | AQWELIA | AQWELIA | AQWELIA | AQWELIA | AQWELIA | AQWELIA |
| copilote | copilot | copiloto | Copilot | copilota | copiloto | copiloot |
| piscine | pool | piscina | Pool | piscina | piscina | zwembad |
| électrolyseur | electrolyzer | electrolizador | Elektrolysegerät | elettrolizzatore | eletrolisador | elektrolyseapparaat |
| chlore | chlorine | cloro | Chlor | cloro | cloro | chloor |
| stabilisant | stabilizer | estabilizante | Stabilisator | stabilizzante | estabilizante | stabilisator |
| floculant | flocculant | floculante | Flockungsmittel | flocculante | floculante | vlokmiddel |
| backwash | backwash | contralavado | Rückspülung | contro-lavaggio | contralavagem | backwash |
| skimmer | skimmer | skimmer | Skimmer | skimmer | skimmer | skimmer |
| TAC | TAC | TAC | TAC | TAC | TAC | TAC |
| CYA | CYA | CYA | CYA | CYA | CYA | CYA |

### Étape 5 : Activer la traduction IA
1. **Settings** → **MT (Machine Translation)** → Activer
2. Sélectionner le moteur IA (Crowdin MT ou Google Translate)
3. Activer "Auto-translate new strings"
4. Les nouvelles clés ajoutées à `fr.json` seront automatiquement traduites

### Étape 6 : Configurer les contrôles QA
Dans **Settings** → **Quality Assurance**, activer :
- ✅ **Missing translations** — détecte les clés non traduites
- ✅ **Unused keys** — détecte les clés plus utilisées dans le code
- ✅ **Broken variables** — détecte les `{param}` cassés
- ✅ **Length limits** — alerte si traduction trop longue (UI overflow)
- ✅ **Glossary compliance** — vérifie l'utilisation du glossaire

### Étape 7 : Workflow de validation
1. **Développeur** ajoute une clé à `fr.json` + pousse sur GitHub
2. **Crowdin** détecte la nouvelle clé → traduit automatiquement via IA
3. **Relecteur** valide la traduction dans l'aperçu "in-context"
4. **Crowdin** pousse les traductions validées vers GitHub
5. **Pre-commit hook** vérifie qu'aucun texte codé en dur n'est ajouté

### Étape 8 : Aperçu "in-context"
1. Dans Crowdin → **In-Context Preview**
2. Entrer l'URL : `http://localhost:3000` (dev) ou l'URL de production
3. Naviguer dans l'app — Crowdin surligne les textes traduisibles
4. Cliquer sur un texte → éditer la traduction directement

---

## Maintenance quotidienne

### Ajouter une nouvelle clé
1. Ajouter la clé dans `src/i18n/locales/fr.json`
2. Le pre-commit hook vérifie qu'elle est utilisée via `t("key")`
3. Crowdin traduit automatiquement vers les 6 autres langues
4. Valider dans Crowdin si nécessaire

### Vérifier la couverture
```bash
# Compter les clés par langue
python3 -c "
import json
for lang in ['fr','en','es','de','it','pt','nl']:
    d = json.load(open(f'src/i18n/locales/{lang}.json'))
    def count(x):
        return sum(count(v) if isinstance(v, dict) else 1 for v in x.values())
    print(f'{lang}: {count(d)} keys')
"

# Vérifier qu'aucun texte codé en dur n'existe
python3 scripts/i18n/check-hardcoded-strings.py
```

### Ajouter une nouvelle langue
1. Créer `src/i18n/locales/{lang}.json` (copier de `en.json`)
2. Ajouter la langue dans `src/lib/preferences/store.ts` (LANGUAGES array)
3. Ajouter la langue dans `src/i18n/config.ts`
4. Dans Crowdin, ajouter la langue cible
5. Crowdin traduit automatiquement
