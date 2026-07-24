from pathlib import Path
import json

server_path = Path('src/lib/pro/dispatch-server.ts')
server = server_path.read_text(encoding='utf-8')
old = '  const mapped = members.map((member) => ({'
new = '  const mapped: DispatchMember[] = members.map((member) => ({'
if old in server:
    server = server.replace(old, new, 1)
elif new not in server:
    raise RuntimeError('Dispatch member mapping marker missing')
server_path.write_text(server, encoding='utf-8')

required_schema_fields = [
    'dispatchEnabled', 'skills', 'serviceZones', 'workingDays', 'dayStart',
    'dayEnd', 'timeZone', 'dailyCapacityMinutes', 'dispatchColor', 'phone', 'vehicle',
]
for schema_name in ['prisma/schema.prisma', 'prisma/postgresql/schema.prisma']:
    schema = Path(schema_name).read_text(encoding='utf-8')
    for field in required_schema_fields:
        if field not in schema:
            raise RuntimeError(f'Missing {field} in {schema_name}')

for migration_name in [
    'prisma/migrations/20260724014500_p1_b_team_dispatch/migration.sql',
    'prisma/postgresql/migrations/20260724014500_p1_b_team_dispatch/migration.sql',
]:
    migration = Path(migration_name).read_text(encoding='utf-8')
    if 'OrganizationMember_organizationId_dispatchEnabled_idx' not in migration:
        raise RuntimeError(f'Missing dispatch index in {migration_name}')

for locale in ['de', 'en', 'es', 'fr', 'it', 'nl', 'pt']:
    data = json.loads(Path(f'src/i18n/locales/{locale}.json').read_text(encoding='utf-8'))
    messages = data.get('proApp', {})
    for key in ['navTeam', 'dispatchTeamTitle', 'dispatchErrorConflict', 'dispatchLeaveUnassigned']:
        if not messages.get(key):
            raise RuntimeError(f'Missing {locale}.proApp.{key}')

required_sources = {
    'src/app/api/pro/team/route.ts': ['access.canManage', 'access.ownerUserId'],
    'src/app/api/pro/interventions/route.ts': ['validateTechnicianAssignment'],
    'src/app/api/pro/interventions/[id]/route.ts': ['scheduleChanged', 'excludeInterventionId'],
    'src/app/pro/app/team/page.tsx': ['/api/pro/team'],
    'src/app/pro/app/planning/page.tsx': ['dispatchUnassigned', '/api/pro/team'],
    'src/components/pro/add-intervention-modal.tsx': ['dispatchErrorConflict', '/api/pro/team'],
}
for filename, markers in required_sources.items():
    source = Path(filename).read_text(encoding='utf-8')
    for marker in markers:
        if marker not in source:
            raise RuntimeError(f'Missing {marker} in {filename}')

print('P1-B final dispatch cleanup verified')
