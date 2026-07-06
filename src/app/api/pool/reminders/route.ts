import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateReminders, getCurrentSeason, type ReminderContext } from '@/lib/pool/reminders'
import { assessWeather } from '@/lib/pool/weather-engine'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const [profile, lastTest, savedReminders, equipment, products] = await Promise.all([
      db.poolProfile.findFirst(),
      db.waterTest.findFirst({ orderBy: { createdAt: 'desc' }, include: { actionPlans: true } }),
      db.reminder.findMany({ where: { done: false }, orderBy: { createdAt: 'desc' }, take: 30 }),
      db.equipment.findMany(),
      db.productInventory.findMany(),
    ])

    // Dernier test : jours + si produit ajouté
    let lastTestDaysAgo: number | null = null
    let lastTestHadProductAdded = false
    if (lastTest) {
      lastTestDaysAgo = Math.floor((Date.now() - lastTest.createdAt.getTime()) / 86400000)
      const plans = lastTest.actionPlans || []
      if (plans.length > 0) {
        const plan = plans[plans.length - 1]
        try {
          const dosages = JSON.parse(plan.chemicalDosages || '[]')
          lastTestHadProductAdded = dosages.length > 0
        } catch {}
      }
    }

    // Équipements en retard de maintenance
    const equipmentDue = equipment
      .filter((e) => e.nextMaintenanceAt && e.nextMaintenanceAt < new Date())
      .map((e) => ({
        type: e.type,
        daysOverdue: Math.floor((Date.now() - e.nextMaintenanceAt!.getTime()) / 86400000),
      }))

    // Produits en stock bas (quantité < seuil par catégorie)
    const lowStock = products
      .filter((p) => {
        if (p.unit === 'kg' || p.unit === 'L') return p.quantity < 1
        if (p.unit === 'tablet') return p.quantity < 3
        return p.quantity < 1
      })
      .map((p) => ({ name: p.productName, category: p.category }))

    const ctx: ReminderContext = {
      lastTestDaysAgo,
      lastTestHadProductAdded,
      weather: null, // sera enrichi côté client si besoin
      hasSaltSystem: profile?.saltSystem || false,
      filterType: profile?.filterType || 'sand',
      lowStockProducts: lowStock,
      equipmentDueForMaintenance: equipmentDue,
      season: getCurrentSeason(),
    }

    const generated = generateReminders(ctx)

    // Fusionner avec rappels manuels persistés (source='manual')
    const manual = savedReminders.filter((r) => r.source === 'manual')

    return NextResponse.json({
      reminders: generated,
      manualReminders: manual,
      context: { lastTestDaysAgo, hasSaltSystem: ctx.hasSaltSystem, filterType: ctx.filterType, season: ctx.season },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Créer un rappel manuel
    const r = await db.reminder.create({
      data: {
        type: body.type || 'test_water',
        title: body.title || 'Rappel personnalisé',
        detail: body.detail || '',
        action: body.action || '',
        priority: body.priority || 'medium',
        source: 'manual',
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
      },
    })
    return NextResponse.json({ reminder: r })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, done, snoozed } = body
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
    const r = await db.reminder.update({
      where: { id },
      data: {
        done: typeof done === 'boolean' ? done : undefined,
        snoozed: typeof snoozed === 'boolean' ? snoozed : undefined,
        doneAt: done ? new Date() : undefined,
      },
    })
    return NextResponse.json({ reminder: r })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (id) await db.reminder.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
