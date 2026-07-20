# AQWELIA — Plan de Production Figma

> Phase 2 du Masterplan Visuel — Architecture du fichier Figma
> Date : 2026-07-21 | Branche : docs/visual-preproduction-phase-2

---

## Résumé

| Métrique | Valeur |
|----------|--------|
| **Pages Figma** | 12 |
| **Sections** | 36 |
| **Composants** | 114 |
| **Variables** | 48 |
| **Modes** | 3 (Light, Dark, RTL) |
| **Styles** | 24 |
| **Écrans** | 71 |
| **Variantes** | 24 |
| **Prototypes** | 8 |

---

## 1. PAGES FIGMA

| Page | Contenu | Ordre |
|------|---------|-------|
| 00-Foundations | Design tokens, typographie, couleurs, espacement, icônes | 1 |
| 01-Components | Composants UI (shadcn/ui + custom) | 2 |
| 02-Homepage | Landing marketing principale | 3 |
| 03-Particuliers | Dashboard B2C, modules, fonctionnalités | 4 |
| 04-Mobile-Particuliers | App mobile B2C | 5 |
| 05-Pro | Dashboard Pro, CRM, planning | 6 |
| 06-Mobile-Technicien | App mobile technicien | 7 |
| 07-Growth | Dashboard Growth, pipeline, analytics | 8 |
| 08-Brain | Brain workspace, timeline, métriques | 9 |
| 09-Tarifs | Pages tarifaires B2C, Pro, Growth | 10 |
| 10-Responsive | Variantes tablette et mobile | 11 |
| 11-States | États UI (loading, empty, error, etc.) | 12 |

---

## 2. SECTIONS PAR PAGE

### 00-Foundations

| Section | Contenu |
|---------|---------|
| Colors | Tokens couleur (lagoon, deep-teal, night, mist, champagne) |
| Typography | Cormorant Garamond, system sans |
| Spacing | 4px grid, scale 0-64 |
| Icons | Lucide icons (48) |
| Shadows | elevation-1 à elevation-4 |
| Border radius | sm, md, lg, xl |

### 01-Components

| Section | Contenu |
|---------|---------|
| Buttons | Button, Button Ghost, Button Outline |
| Forms | Input, Select, Checkbox, Radio, Switch |
| Cards | Card, Card Header, Card Content, Card Footer |
| Navigation | Header, Sidebar, Bottom Nav, Tabs |
| Feedback | Toast, Alert, Skeleton, Progress |
| Overlay | Dialog, Drawer, Sheet, Popover |
| Data | Table, DataTable, Chart |

### 02-Homepage

| Section | Contenu |
|---------|---------|
| Hero | Hero section principale |
| Avantages | Grille 5 avantages |
| Fonctionnalités | Grille 11 modules |
| Témoignages | Carrousel témoignages |
| CTA | Call to action final |
| Footer | Footer complet |

### 03-Particuliers

| Section | Contenu |
|---------|---------|
| Dashboard | Dashboard principal |
| Water Test | Module analyse eau |
| Weather | Module météo |
| Brain | Module Brain |
| Maintenance | Module maintenance |
| Health Log | Module historique |
| Reminders | Module rappels |
| Guides | Module guides |
| Assistant | Module assistant |
| Settings | Paramètres |

### 04-Mobile-Particuliers

| Section | Contenu |
|---------|---------|
| Home | Accueil mobile |
| Modules | Tous modules mobile |
| Navigation | Bottom nav |
| Onboarding | Wizard mobile |

### 05-Pro

| Section | Contenu |
|---------|---------|
| Dashboard | Dashboard Pro |
| Clients | Liste + détail clients |
| Piscines | Liste + détail piscines |
| Planning | Calendrier interventions |
| Interventions | Liste + détail interventions |
| Reports | Rapports |
| Settings | Paramètres Pro |

### 06-Mobile-Technicien

| Section | Contenu |
|---------|---------|
| Planning | Planning du jour |
| Intervention | Fiche intervention |
| Actions | Actions rapides |
| Photo | Photo avant/après |

### 07-Growth

| Section | Contenu |
|---------|---------|
| Dashboard | Dashboard Growth |
| Leads | Liste + détail leads |
| Qualification | Board qualification |
| Matching | Interface matching |
| RDV | Calendrier RDV |
| Devis | Liste devis |
| Analytics | Graphiques + KPIs |
| Audit | Journal agents |
| Settings | Paramètres Growth |

### 08-Brain

| Section | Contenu |
|---------|---------|
| Workspace | Vue principale Brain |
| Timeline | Timeline événements |
| Métriques | Header métriques |
| Recommandations | Liste recommandations |
| Actions | Tracker actions |
| Connaissances | Base connaissances |

### 09-Tarifs

| Section | Contenu |
|---------|---------|
| B2C | Grille 4 plans Particuliers |
| Pro | Grille 4 plans Pro |
| Growth | Grille 3 plans Growth |
| Comparaison | Tableau comparatif |

### 10-Responsive

| Section | Contenu |
|---------|---------|
| Desktop | 12 colonnes |
| Tablette | 8 colonnes |
| Mobile | 4 colonnes |

### 11-States

| Section | Contenu |
|---------|---------|
| Loading | Spinner, skeleton |
| Empty | États vides avec CTA |
| Error | États erreur avec retry |
| Success | États succès |
| Warning | États attention |
| Critical | États critiques |
| Offline | État hors-ligne |
| Locked | Fonctionnalité verrouillée |
| Upgrade | Upgrade plan |

---

## 3. COMPOSANTS FIGMA

| Catégorie | Nombre | Composants |
|-----------|--------|------------|
| Primitives | 12 | Button, Input, Select, Checkbox, Radio, Switch, Textarea, Label, Badge, Avatar, Separator, Skeleton |
| Layout | 8 | Card, Sheet, Dialog, Drawer, Tabs, Accordion, Collapsible, Resizable |
| Navigation | 6 | Header, Sidebar, BottomNav, Breadcrumb, Menubar, NavigationMenu |
| Data | 6 | Table, DataTable, Chart, Calendar, DatePicker, Progress |
| Feedback | 6 | Toast, Alert, AlertDialog, Tooltip, Popover, HoverCard |
| Forms | 6 | Form, InputOTP, Slider, RadioGroup, Toggle, ToggleGroup |
| Overlay | 4 | Command, ContextMenu, DropdownMenu, ScrollArea |
| Custom AQWELIA | 66 | Tous les composants custom |
| **Total** | **114** | — |

---

## 4. VARIABLES

| Catégorie | Nombre | Variables |
|-----------|--------|-----------|
| Couleurs | 24 | primary, secondary, accent, muted, destructive, foreground, background, card, popover, border, input, ring |
| Espacement | 12 | space-0 à space-12 |
| Typography | 8 | font-size, font-weight, line-height, letter-spacing |
| Border radius | 4 | sm, md, lg, xl |
| **Total** | **48** | — |

---

## 5. MODES

| Mode | Description |
|------|-------------|
| Light | Mode clair (défaut) |
| Dark | Mode sombre |
| RTL | Droite à gauche (arabe) |

---

## 6. STYLES

| Style | Catégorie | Description |
|-------|-----------|-------------|
| heading-1 | Typography | Titre principal |
| heading-2 | Typography | Titre secondaire |
| heading-3 | Typography | Titre tertiaire |
| body | Typography | Corps de texte |
| caption | Typography | Légende |
| label | Typography | Étiquette |
| primary | Color | Couleur principale |
| secondary | Color | Couleur secondaire |
| accent | Color | Couleur d'accent |
| muted | Color | Couleur atténuée |
| destructive | Color | Couleur d'erreur |
| foreground | Color | Couleur de texte |
| background | Color | Couleur de fond |
| card | Color | Couleur carte |
| border | Color | Couleur bordure |
| elevation-1 | Shadow | Ombre légère |
| elevation-2 | Shadow | Ombre moyenne |
| elevation-3 | Shadow | Ombre forte |
| elevation-4 | Shadow | Ombre très forte |
| space-1 | Spacing | 4px |
| space-2 | Spacing | 8px |
| space-3 | Spacing | 12px |
| space-4 | Spacing | 16px |
| space-6 | Spacing | 24px |

---

## 7. NOMENCLATURE FIGMA

| Élément | Format | Exemple |
|---------|--------|---------|
| Écran | `{UNIVERSE}-{SCREEN}-{NUMBER}` | `B2C-HOME-001` |
| Composant | `{Category}/{Name}` | `Button/Primary` |
| Variable | `{category}/{name}` | `color/primary` |
| Style | `{category}/{name}` | `typography/heading-1` |
| Frame | `{screen}/{section}` | `B2C-HOME-001/hero` |
| Variant | `{component}/{property}/{value}` | `Button/Size/Large` |

---

## 8. ORDRE DE CONCEPTION

| Étape | Page | Priorité | Écrans | Durée estimée |
|-------|------|----------|--------|---------------|
| 1 | 00-Foundations | P0 | — | 2 jours |
| 2 | 01-Components | P0 | — | 3 jours |
| 3 | 02-Homepage | P0 | 1 | 2 jours |
| 4 | 03-Particuliers | P0 | 10 | 4 jours |
| 5 | 04-Mobile-Particuliers | P0 | 8 | 3 jours |
| 6 | 05-Pro | P0 | 10 | 4 jours |
| 7 | 06-Mobile-Technicien | P0 | 4 | 2 jours |
| 8 | 07-Growth | P0 | 10 | 4 jours |
| 9 | 08-Brain | P1 | 6 | 3 jours |
| 10 | 09-Tarifs | P0 | 4 | 2 jours |
| 11 | 10-Responsive | P1 | 24 | 3 jours |
| 12 | 11-States | P1 | 18 | 3 jours |
| **Total** | | | **95** | **35 jours** |

---

## 9. PROCESSUS D'ÉTAT

| État | Description | Action |
|------|-------------|--------|
| DRAFT | Brouillon en cours | Création |
| REVIEW | En revue | Revue interne |
| APPROVED | Approuvé | Prêt pour itération |
| LOCKE | Verrouillé | Plus de modifications |
| READY FOR CODE | Prêt pour développement | Export dev |

---

## 10. PROTOTYPES

| Prototype | Écrans | Objectif |
|-----------|--------|----------|
| Onboarding → Dashboard | 5 | Flow complet onboarding |
| Dashboard → Water Test → Results | 3 | Flow analyse eau |
| Dashboard → Scan → Results | 3 | Flow scan bandelette |
| Pro Dashboard → Client → Intervention | 3 | Flow Pro |
| Growth Dashboard → Lead → Qualification | 3 | Flow Growth |
| Paywall → Upgrade → Success | 3 | Flow upgrade |
| Auth → Onboarding → Dashboard | 5 | Flow inscription |
| Settings → Billing → Portal | 3 | Flow abonnement |
