import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const userId = session.user.id

  const equipment = await db.equipment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ equipment })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const body = await req.json()
    const eq = await db.equipment.create({
      data: {
        userId,
        type: body.type || 'pump',
        brand: body.brand || null,
        model: body.model || null,
        installedAt: body.installedAt ? new Date(body.installedAt) : null,
        lastMaintenanceAt: body.lastMaintenanceAt ? new Date(body.lastMaintenanceAt) : null,
        nextMaintenanceAt: body.nextMaintenanceAt ? new Date(body.nextMaintenanceAt) : null,
        photoUrl: body.photoUrl || null,
        status: body.status || 'ok',
        notes: body.notes || null,
      },
    })
    return NextResponse.json({ equipment: eq })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const body = await req.json()
    const { id, ...rest } = body
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
    // Only update if it belongs to the authenticated user
    const existing = await db.equipment.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ error: 'Équipement introuvable' }, { status: 404 })

    const data: any = { ...rest }
    if (rest.lastMaintenanceAt) data.lastMaintenanceAt = new Date(rest.lastMaintenanceAt)
    if (rest.nextMaintenanceAt) data.nextMaintenanceAt = new Date(rest.nextMaintenanceAt)
    // Never allow userId override via PATCH body
    delete data.userId
    const eq = await db.equipment.update({ where: { id }, data })
    return NextResponse.json({ equipment: eq })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const userId = session.user.id

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (id) {
    // Only delete if it belongs to the authenticated user
    const existing = await db.equipment.findFirst({ where: { id, userId } })
    if (existing) {
      await db.equipment.delete({ where: { id } })
    }
  }
  return NextResponse.json({ success: true })
}
