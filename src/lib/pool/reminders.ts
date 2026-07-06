// Smart Reminder Engine — génère des rappels intelligents à partir des données réelles
// (pas juste calendrier fixe : météo, historique, inventaire, équipements, tests)

import type { WeatherAssessment } from './weather-engine'

export type ReminderType =
  | 'test_water'
  | 'retest_after_product'
  | 'after_storm'
  | 'before_vacation'
  | 'filter_clean'
  | 'cell_clean'
  | 'skimmer_clean'
  | 'winterize'
  | 'startup'
  | 'low_product'
  | 'uv_check'

export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Reminder {
  id: string
  type: ReminderType
  title: string
  detail: string
  action: string
  priority: ReminderPriority
  dueInHours: number  // dans combien d'heures agir
  source: 'weather' | 'test_history' | 'inventory' | 'equipment' | 'schedule' | 'manual'
}

export interface ReminderContext {
  lastTestDaysAgo: number | null
  lastTestHadProductAdded: boolean
  weather?: WeatherAssessment | null
  hasSaltSystem: boolean
  filterType: string
  lowStockProducts: { name: string; category: string }[]
  equipmentDueForMaintenance: { type: string; daysOverdue: number }[]
  season: 'spring' | 'summer' | 'autumn' | 'winter'
}

export function generateReminders(ctx: ReminderContext): Reminder[] {
  const reminders: Reminder[] = []

  // 1. Test d'eau périodique
  if (ctx.lastTestDaysAgo != null) {
    if (ctx.lastTestDaysAgo >= 7) {
      reminders.push({
        id: 'test_overdue',
        type: 'test_water',
        title: "Test d'eau à refaire",
        detail: `Dernier test il y a ${ctx.lastTestDaysAgo} jours. La qualité de l'eau change vite.`,
        action: 'Faites un test complet pH + chlore + TAC.',
        priority: 'high',
        dueInHours: 0,
        source: 'test_history',
      })
    } else if (ctx.lastTestDaysAgo >= 4) {
      reminders.push({
        id: 'test_soon',
        type: 'test_water',
        title: 'Test de routine',
        detail: `Dernier test il y a ${ctx.lastTestDaysAgo} jours.`,
        action: 'Vérifiez pH et chlore libre.',
        priority: 'medium',
        dueInHours: 24,
        source: 'test_history',
      })
    }
  } else {
    reminders.push({
      id: 'test_first',
      type: 'test_water',
      title: "Premier test d'eau",
      detail: 'Aucun test enregistré. Activez le suivi.',
      action: 'Entrez votre premier test (pH minimum).',
      priority: 'urgent',
      dueInHours: 0,
      source: 'test_history',
    })
  }

  // 2. Re-test après ajout de produit
  if (ctx.lastTestHadProductAdded && ctx.lastTestDaysAgo != null && ctx.lastTestDaysAgo < 1) {
    reminders.push({
      id: 'retest_product',
      type: 'retest_after_product',
      title: 'Re-test après traitement',
      detail: "Vous avez ajouté un produit récemment. Vérifiez l'effet.",
      action: 'Refaire un test pH + chlore dans les heures qui suivent.',
      priority: 'high',
      dueInHours: 3,
      source: 'test_history',
    })
  }

  // 3. Rappels météo
  if (ctx.weather) {
    for (const alert of ctx.weather.alerts) {
      if (alert.type === 'storm') {
        reminders.push({
          id: `wx_${alert.id}`,
          type: 'after_storm',
          title: alert.title,
          detail: alert.message,
          action: alert.action,
          priority: alert.severity === 'extreme' || alert.severity === 'high' ? 'urgent' : 'medium',
          dueInHours: 6,
          source: 'weather',
        })
      }
    }
    if (ctx.weather.testRecommended) {
      reminders.push({
        id: 'wx_test',
        type: 'test_water',
        title: 'Test recommandé (météo)',
        detail: ctx.weather.testReason,
        action: 'Testez pH et chlore.',
        priority: 'high',
        dueInHours: 12,
        source: 'weather',
      })
    }
  }

  // 4. Nettoyage filtre (selon type)
  const filterCleanDays = ctx.filterType === 'cartridge' ? 14 : 30 // cartouche plus souvent
  reminders.push({
    id: 'filter_clean',
    type: 'filter_clean',
    title: 'Nettoyage du filtre',
    detail: ctx.filterType === 'sand'
      ? 'Backwash du filtre à sable recommandé.'
      : ctx.filterType === 'cartridge'
      ? 'Rinçage de la cartouche recommandé.'
      : 'Vérification du filtre recommandée.',
    action: ctx.filterType === 'sand' ? 'Faites un backwash (contre-lavage).' : 'Démontez et rincez la cartouche.',
    priority: 'medium',
    dueInHours: filterCleanDays * 24,
    source: 'equipment',
  })

  // 5. Nettoyage cellule électrolyseur
  if (ctx.hasSaltSystem) {
    reminders.push({
      id: 'cell_clean',
      type: 'cell_clean',
      title: 'Nettoyage cellule électrolyseur',
      detail: "La cellule s'entartre avec le temps. Nettoyage acide tous les 3-6 mois.",
      action: 'Démontez la cellule, trempez dans solution acide diluée 10-15 min, rincez.',
      priority: 'medium',
      dueInHours: 90 * 24,
      source: 'equipment',
    })
  }

  // 6. Skimmer / panier pompe
  reminders.push({
    id: 'skimmer_clean',
    type: 'skimmer_clean',
    title: 'Vérifier skimmer et panier',
    detail: 'Débris, feuilles, insectes à retirer régulièrement.',
    action: 'Videz le panier du skimmer et celui de la pompe.',
    priority: 'low',
    dueInHours: 7 * 24,
    source: 'schedule',
  })

  // 7. Produits presque épuisés
  for (const p of ctx.lowStockProducts) {
    reminders.push({
      id: `low_${p.category}`,
      type: 'low_product',
      title: `Stock bas : ${p.name}`,
      detail: 'Il reste peu de ce produit.',
      action: 'Pensez à racheter avant de manquer.',
      priority: 'medium',
      dueInHours: 14 * 24,
      source: 'inventory',
    })
  }

  // 8. Équipements en retard de maintenance
  for (const eq of ctx.equipmentDueForMaintenance) {
    reminders.push({
      id: `eq_${eq.type}`,
      type: 'filter_clean',
      title: `Maintenance ${eq.type}`,
      detail: `Maintenance en retard de ${eq.daysOverdue} jours.`,
      action: 'Planifiez une maintenance de cet équipement.',
      priority: eq.daysOverdue > 30 ? 'high' : 'medium',
      dueInHours: 0,
      source: 'equipment',
    })
  }

  // 9. Saisonnier
  if (ctx.season === 'spring') {
    reminders.push({
      id: 'startup',
      type: 'startup',
      title: 'Remise en route de saison',
      detail: 'Le printemps arrive : préparez la piscine pour la saison.',
      action: 'Suivez le guide remise en route : nettoyage, traitement, filtration.',
      priority: 'high',
      dueInHours: 7 * 24,
      source: 'schedule',
    })
  } else if (ctx.season === 'autumn') {
    reminders.push({
      id: 'winterize',
      type: 'winterize',
      title: "Préparer l'hivernage",
      detail: "L'automne est là : anticipez l'hivernage.",
      action: "Suivez le guide hivernage : eau froide, produits d'hiver, couverture.",
      priority: 'high',
      dueInHours: 14 * 24,
      source: 'schedule',
    })
  }

  // Tri par priorité puis urgence
  const prioOrder: Record<ReminderPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
  return reminders.sort((a, b) => {
    if (prioOrder[a.priority] !== prioOrder[b.priority]) return prioOrder[a.priority] - prioOrder[b.priority]
    return a.dueInHours - b.dueInHours
  })
}

export function getCurrentSeason(): 'spring' | 'summer' | 'autumn' | 'winter' {
  const m = new Date().getMonth() + 1 // 1-12
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'autumn'
  return 'winter'
}
