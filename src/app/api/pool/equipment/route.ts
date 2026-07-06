import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const equipment = await db.equipment.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ equipment })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const eq = await db.equipment.create({
      data: {
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
  try {
    const body = await req.json()
    const { id, ...rest } = body
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
    const data: any = { ...rest }
    if (rest.lastMaintenanceAt) data.lastMaintenanceAt = new Date(rest.lastMaintenanceAt)
    if (rest.nextMaintenanceAt) data.nextMaintenanceAt = new Date(rest.nextMaintenanceAt)
    const eq = await db.equipment.update({ where: { id }, data })
    return NextResponse.json({ equipment: eq })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (id) await db.equipment.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
