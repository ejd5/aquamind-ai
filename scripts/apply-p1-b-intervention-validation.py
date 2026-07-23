from pathlib import Path

create_path = Path('src/app/api/pro/interventions/route.ts')
create = create_path.read_text(encoding='utf-8')
create = create.replace(
    "import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'",
    "import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'\nimport { DispatchAssignmentError, validateTechnicianAssignment } from '@/lib/pro/dispatch-server'",
    1,
)
old_create_member = '''  let technicianId = typeof body.technicianId === 'string' && body.technicianId
    ? body.technicianId
    : null
  if (!technicianId && access.role === 'technician') technicianId = session.user.id
  if (technicianId && technicianId !== access.ownerUserId) {
    const member = access.organizationId
      ? await db.organizationMember.findFirst({
          where: {
            organizationId: access.organizationId,
            userId: technicianId,
            status: 'active',
            role: { in: ['owner', 'admin', 'manager', 'technician'] },
          },
          select: { id: true },
        })
      : null
    if (!member) technicianId = null
  }
'''
new_create_member = '''  let technicianId = typeof body.technicianId === 'string' && body.technicianId.trim()
    ? body.technicianId.trim()
    : null
  if (!technicianId && access.role === 'technician') technicianId = session.user.id
'''
if old_create_member not in create:
    raise RuntimeError('Create route technician block missing')
create = create.replace(old_create_member, new_create_member, 1)
marker = '''  const actualStartedAt = startedAt.value ?? (
    status === 'in_progress' || status === 'completed' ? new Date() : null
  )

  try {'''
insert = '''  const actualStartedAt = startedAt.value ?? (
    status === 'in_progress' || status === 'completed' ? new Date() : null
  )

  if (technicianId && ['scheduled', 'in_progress'].includes(status)) {
    try {
      for (let index = 0; index < occurrences; index += 1) {
        await validateTechnicianAssignment({
          access,
          technicianId,
          scheduledAt: addRecurrence(scheduledAt.value, recurrence, index),
          durationMinutes: duration || 60,
        })
      }
    } catch (error) {
      if (error instanceof DispatchAssignmentError) {
        return NextResponse.json(
          { error: `dispatch.${error.code}`, code: error.code, details: error.details },
          { status: error.statusCode },
        )
      }
      throw error
    }
  }

  try {'''
if marker not in create:
    raise RuntimeError('Create route validation marker missing')
create = create.replace(marker, insert, 1)
create_path.write_text(create, encoding='utf-8')

update_path = Path('src/app/api/pro/interventions/[id]/route.ts')
update = update_path.read_text(encoding='utf-8')
update = update.replace(
    "import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'",
    "import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'\nimport { DispatchAssignmentError, validateTechnicianAssignment } from '@/lib/pro/dispatch-server'",
    1,
)
old_select = '''      status: true,
      startedAt: true,
      completedAt: true,'''
new_select = '''      status: true,
      technicianId: true,
      scheduledAt: true,
      duration: true,
      startedAt: true,
      completedAt: true,'''
if old_select not in update:
    raise RuntimeError('Update route select marker missing')
update = update.replace(old_select, new_select, 1)
old_update_member = '''  if (body.technicianId !== undefined) {
    const technicianId = typeof body.technicianId === 'string' ? body.technicianId.trim() : ''
    if (!technicianId) data.technicianId = null
    else if (technicianId === access.ownerUserId) data.technicianId = technicianId
    else {
      const member = access.organizationId
        ? await db.organizationMember.findFirst({
            where: {
              organizationId: access.organizationId,
              userId: technicianId,
              status: 'active',
              role: { in: ['owner', 'admin', 'manager', 'technician'] },
            },
            select: { id: true },
          })
        : null
      if (!member) {
        return NextResponse.json(
          { error: toolWorkspaceText(locale, 'technicianUnauthorized') },
          { status: 400 },
        )
      }
      data.technicianId = technicianId
    }
  }
'''
new_update_member = '''  if (body.technicianId !== undefined) {
    const technicianId = typeof body.technicianId === 'string' ? body.technicianId.trim() : ''
    data.technicianId = technicianId || null
  }
'''
if old_update_member not in update:
    raise RuntimeError('Update route technician block missing')
update = update.replace(old_update_member, new_update_member, 1)
validation_marker = '''  if (Object.keys(data).length === 0) {
    const msg = await translate(locale, 'common.errors.noFields', 'Aucun champ à mettre à jour')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {'''
validation_insert = '''  const nextTechnicianId = data.technicianId === undefined
    ? existing.technicianId
    : data.technicianId as string | null
  const nextScheduledAt = data.scheduledAt instanceof Date ? data.scheduledAt : existing.scheduledAt
  const nextDuration = typeof data.duration === 'number' ? data.duration : existing.duration || 60
  if (nextTechnicianId && ['scheduled', 'in_progress'].includes(nextStatus)) {
    try {
      await validateTechnicianAssignment({
        access,
        technicianId: nextTechnicianId,
        scheduledAt: nextScheduledAt,
        durationMinutes: nextDuration,
        excludeInterventionId: id,
      })
    } catch (error) {
      if (error instanceof DispatchAssignmentError) {
        return NextResponse.json(
          { error: `dispatch.${error.code}`, code: error.code, details: error.details },
          { status: error.statusCode },
        )
      }
      throw error
    }
  }

  if (Object.keys(data).length === 0) {
    const msg = await translate(locale, 'common.errors.noFields', 'Aucun champ à mettre à jour')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {'''
if validation_marker not in update:
    raise RuntimeError('Update route validation insertion marker missing')
update = update.replace(validation_marker, validation_insert, 1)
update_path.write_text(update, encoding='utf-8')

print('P1-B intervention dispatch validation applied')
