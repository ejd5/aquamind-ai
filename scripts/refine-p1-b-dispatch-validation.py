from pathlib import Path

# Pool technicians commonly work on Saturdays. Sunday remains outside the
# default profile until explicitly enabled.
dispatch_path = Path('src/lib/pro/dispatch.ts')
dispatch = dispatch_path.read_text(encoding='utf-8')
dispatch = dispatch.replace(
    'export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5] as const',
    'export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5, 6] as const',
    1,
)
dispatch_path.write_text(dispatch, encoding='utf-8')

server_path = Path('src/lib/pro/dispatch-server.ts')
server = server_path.read_text(encoding='utf-8')
server = server.replace(
    '    workingDays: [1, 2, 3, 4, 5],',
    '    workingDays: [1, 2, 3, 4, 5, 6],',
    1,
)
server_path.write_text(server, encoding='utf-8')

route_path = Path('src/app/api/pro/interventions/[id]/route.ts')
route = route_path.read_text(encoding='utf-8')
old = """  if (nextTechnicianId && ['scheduled', 'in_progress'].includes(nextStatus)) {
    try {
      await validateTechnicianAssignment({"""
new = """  const scheduleChanged = ['technicianId', 'scheduledAt', 'duration', 'status']
    .some((field) => body[field] !== undefined)
  if (scheduleChanged && nextTechnicianId && ['scheduled', 'in_progress'].includes(nextStatus)) {
    try {
      await validateTechnicianAssignment({"""
if old not in route:
    raise RuntimeError('PATCH dispatch validation marker missing')
route_path.write_text(route.replace(old, new, 1), encoding='utf-8')

page_path = Path('src/app/pro/app/interventions/[id]/page.tsx')
page = page_path.read_text(encoding='utf-8')
old_payload = """        duration: duration ? Number(duration) : null,
        priority,
        actions: lines(actions),
        productsUsed: lines(products),
        billable,
        amount: billable && amount ? Number(amount) : null,
        currency: 'EUR',
        technicianId: technicianId || null,
        ...extra,"""
new_payload = """        duration: Number(duration || 0) !== Number(intervention?.duration || 0)
          ? (duration ? Number(duration) : null)
          : undefined,
        priority,
        actions: lines(actions),
        productsUsed: lines(products),
        billable,
        amount: billable && amount ? Number(amount) : null,
        currency: 'EUR',
        technicianId: technicianId !== (intervention?.technicianId || '')
          ? (technicianId || null)
          : undefined,
        ...extra,"""
if old_payload not in page:
    raise RuntimeError('Intervention detail payload marker missing')
page_path.write_text(page.replace(old_payload, new_payload, 1), encoding='utf-8')

planning_path = Path('src/app/pro/app/planning/page.tsx')
planning = planning_path.read_text(encoding='utf-8')
planning = planning.replace('  UserRound,\n', '', 1)
planning_path.write_text(planning, encoding='utf-8')

print('P1-B dispatch validation refinements applied')
