# AQWELIA — Inventaire des Composants UI

> Phase 1 du Masterplan Visuel — Inventaire des composants
> Date : 2026-07-20 | Branche : feat/aqwelia-brain-foundation

---

## Résumé

| Métrique | Valeur |
|----------|--------|
| **Composants total** | 114 |
| **Composants custom** | 66 |
| **Composants shadcn/ui** | 48 |

---

## 1. COMPOSANTS SHADCN/UI (48)

> Emplacement : `src/components/ui/`
> Style : New York, Radix UI primitives, Tailwind CSS
> Personnalisation : `lib/utils.ts` (cn), thème via CSS variables

| Composant | Fichier | Dernière utilisation |
|-----------|---------|---------------------|
| Accordion | `accordion.tsx` | — |
| Alert | `alert.tsx` | — |
| Alert Dialog | `alert-dialog.tsx` | — |
| Aspect Ratio | `aspect-ratio.tsx` | — |
| Avatar | `avatar.tsx` | — |
| Badge | `badge.tsx` | — |
| Breadcrumb | `breadcrumb.tsx` | — |
| Button | `button.tsx` | — |
| Calendar | `calendar.tsx` | Pro planning |
| Card | `card.tsx` | — |
| Carousel | `carousel.tsx` | — |
| Chart | `chart.tsx` | Growth analytics |
| Checkbox | `checkbox.tsx` | — |
| Collapsible | `collapsible.tsx` | — |
| Command | `command.tsx` | — |
| Context Menu | `context-menu.tsx` | — |
| Data Table | `data-table.tsx` | Pro tables |
| Date Picker | `date-picker.tsx` | — |
| Dialog | `dialog.tsx` | — |
| Drawer | `drawer.tsx` | — |
| Dropdown Menu | `dropdown-menu.tsx` | — |
| Form | `form.tsx` | — |
| Hover Card | `hover-card.tsx` | — |
| Input | `input.tsx` | — |
| Input OTP | `input-otp.tsx` | — |
| Label | `label.tsx` | — |
| Menubar | `menubar.tsx` | — |
| Navigation Menu | `navigation-menu.tsx` | — |
| Popover | `popover.tsx` | — |
| Progress | `progress.tsx` | — |
| Radio Group | `radio-group.tsx` | — |
| Resizable | `resizable.tsx` | — |
| Scroll Area | `scroll-area.tsx` | — |
| Select | `select.tsx` | — |
| Separator | `separator.tsx` | — |
| Sheet | `sheet.tsx` | — |
| Skeleton | `skeleton.tsx` | — |
| Slider | `slider.tsx` | — |
| Sonner | `sonner.tsx` | — |
| Switch | `switch.tsx` | — |
| Table | `table.tsx` | — |
| Tabs | `tabs.tsx` | — |
| Textarea | `textarea.tsx` | — |
| Toast | `toast.tsx` | — |
| Toggle | `toggle.tsx` | — |
| Toggle Group | `toggle-group.tsx` | — |
| Tooltip | `tooltip.tsx` | — |

---

## 2. COMPOSANTS CUSTOM (66)

> Emplacement : `src/components/`
> Patterns : React functional components, hooks custom, API fetch, Sonner toast, framer-motion

### 2.1 Aquamind (27 composants)

| Composant | Fichier | Lignes | Statut | États UI |
|-----------|---------|--------|--------|----------|
| DiagnosticActionPlan | `diagnostic-action-plan.tsx` | 1674 | Complet | loading, skeleton, error, pdf CTA |
| ModuleWaterTest | `module-water-test.tsx` | 800+ | Complet | skeleton, history, analytics |
| ModuleMaintenance | `module-maintenance.tsx` | — | Complet | — |
| ModuleHealthLog | `module-health-log.tsx` | — | Complet | skeleton |
| ModuleWeather | `module-weather.tsx` | — | **Bug** | — |
| ModuleReminders | `module-reminders.tsx` | — | Complet | — |
| ModuleActionPlan | `module-action-plan.tsx` | — | Complet | skeleton, loading |
| ModuleDiagnostic | `module-diagnostic.tsx` | — | Partiel | loading |
| ModuleAssistant | `module-assistant.tsx` | — | Complet | — |
| ModuleGuides | `module-guides.tsx` | — | Complet | — |
| ModulePaywall | `module-paywall.tsx` | — | Complet | — |
| ModuleBrain | `module-brain.tsx` | — | Complet | loading (null) |
| StripScanner | `strip-scanner.tsx` | — | Complet | — |
| EmergencyMode | `emergency-mode.tsx` | — | Complet | — |
| BrainActionTracker | `brain-action-tracker.tsx` | — | Complet | — |
| CalendarHeatmap | `calendar-heatmap.tsx` | — | Complet | — |
| ChartPH | `chart-ph.tsx` | — | Complet | — |
| ChartTrend | `chart-trend.tsx` | — | Complet | — |
| ConsentBanner | `consent-banner.tsx` | — | Complet | — |
| DashboardNav | `dashboard-nav.tsx` | — | Complet | — |
| FeedbackWidget | `feedback-widget.tsx` | — | Complet | — |
| OfflineBanner | `offline-banner.tsx` | — | Complet | — |
| RestockWidget | `restock-widget.tsx` | — | Complet | — |
| Header | `header.tsx` | — | Complet | — |
| Onboarding | `onboarding.tsx` | — | Complet | — |
| FamilyManager | `family-manager.tsx` | — | Complet | — |
| IotSettings | `iot-settings.tsx` | — | Complet | — |

### 2.2 Pro (16 composants)

| Composant | Fichier | Lignes | Statut | États UI |
|-----------|---------|--------|--------|----------|
| AddClientModal | `pro/add-client-modal.tsx` | — | Complet | — |
| AddInterventionModal | `pro/add-intervention-modal.tsx` | — | Complet | — |
| AddPoolModal | `pro/add-pool-modal.tsx` | — | Complet | — |
| AgentHistoryLog | `pro/agent-history-log.tsx` | — | Complet | — |
| ClientCard | `pro/client-card.tsx` | — | Complet | — |
| ClientDetailWorkspace | `pro/client-detail-workspace.tsx` | — | Complet | — |
| ClientsList | `pro/clients-list.tsx` | — | Complet | — |
| DashboardWidgets | `pro/dashboard-widgets.tsx` | — | Complet | — |
| GrowthLeadDetail | `pro/growth-lead-detail.tsx` | — | Complet | — |
| GrowthLeadsList | `pro/growth-leads-list.tsx` | — | Complet | — |
| InterventionDetail | `pro/intervention-detail.tsx` | — | Complet | — |
| InterventionsList | `pro/interventions-list.tsx` | — | Complet | — |
| NewLeadForm | `pro/new-lead-form.tsx` | — | Complet | — |
| OnboardingChecklist | `pro/onboarding-checklist.tsx` | — | Complet | — |
| ProNav | `pro/pro-nav.tsx` | — | Complet | — |
| ProReportsWorkspace | `pro/pro-reports-workspace.tsx` | — | Complet | — |

### 2.3 Growth (11 composants)

| Composant | Fichier | Lignes | Statut | États UI |
|-----------|---------|--------|--------|----------|
| AnalyticsDashboard | `growth/analytics-dashboard.tsx` | — | Complet | — |
| CalendarWorkspace | `growth/calendar-workspace.tsx` | — | Complet | — |
| DiagnosticWorkspace | `growth/diagnostic-workspace.tsx` | — | Complet | — |
| GrowthCalendar | `growth/growth-calendar.tsx` | — | Complet | — |
| GrowthDashboard | `growth/growth-dashboard.tsx` | — | Complet | — |
| GrowthNav | `growth/growth-nav.tsx` | — | Complet | — |
| GrowthTaskManager | `growth/growth-task-manager.tsx` | — | Complet | — |
| LeadsWorkspace | `growth/leads-workspace.tsx` | — | Complet | — |
| MatchingInterface | `growth/matching-interface.tsx` | — | Complet | — |
| QuotesWorkspace | `growth/quotes-workspace.tsx` | — | Complet | — |
| SettingsWorkspace | `growth/settings-workspace.tsx` | — | Complet | — |

### 2.4 Brain (8 composants)

| Composant | Fichier | Lignes | Statut | États UI |
|-----------|---------|--------|--------|----------|
| BrainWorkspace | `brain/brain-workspace.tsx` | — | Complet | loading, empty |
| BrainActionsSection | `brain/brain-actions-section.tsx` | — | Complet | — |
| BrainMetricsHeader | `brain/brain-metrics-header.tsx` | — | Complet | — |
| BrainRecommendationsList | `brain/brain-recommendations-list.tsx` | — | Complet | — |
| BrainTabBar | `brain/brain-tab-bar.tsx` | — | Complet | — |
| BrainTimeline | `brain/brain-timeline.tsx` | — | Complet | — |
| BrainWellnessInsights | `brain/brain-wellness-insights.tsx` | — | Complet | — |
| KnowledgeWorkspace | `brain/knowledge-workspace.tsx` | — | Complet | loading, empty |

### 2.5 UI (4 composants)

| Composant | Fichier | Lignes | Statut | États UI |
|-----------|---------|--------|--------|----------|
| Logo | `ui/logo.tsx` | 39 | Complet | — |
| PulsingDot | `ui/pulsing-dot.tsx` | 12 | Complet | — |
| FeatureGateDemoButton | `ui/feature-gate-demo-button.tsx` | 101 | Complet | — |
| HelpPopover | `ui/help-popover.tsx` | 114 | Complet | — |

---

## 3. COMPOSANTS PAR MODULE

| Module | Nombre | shadcn/ui | Custom |
|--------|--------|-----------|--------|
| Aquamind | 27 | 0 | 27 |
| Pro | 16 | 0 | 16 |
| Growth | 11 | 0 | 11 |
| Brain | 8 | 0 | 8 |
| UI | 4 | 0 | 4 |
| shadcn/ui | 0 | 48 | 0 |
| **Total** | **66** | **48** | **66** |

---

## 4. COMPOSANTS PAR ÉTAT

| État | Nombre | Détails |
|------|--------|---------|
| Complet | 60 | Fonctionnels |
| Bug | 1 | Module Weather (crash client) |
| Partiel | 1 | Module Diagnostic (NVIDIA_API_KEY) |
| Non testé | 4 | Pro Reports, Growth Analytics |

---

## 5. INCOHÉRENCES DÉTECTÉES

| # | Problème | Détails |
|---|----------|---------|
| 1 | **DiagnosticActionPlan trop gros** | 1674 lignes — devrait être décomposé en sous-composants |
| 2 | **Module Weather bug client-side** | Crash JS sur certaines configs |
| 3 | **Aucun ErrorBoundary global** | Les erreurs JS crashent toute l'app |
| 4 | **États manquants** | Beaucoup de composants sans loading/empty/error |
