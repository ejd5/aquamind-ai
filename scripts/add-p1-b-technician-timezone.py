from pathlib import Path

for schema_name in ['prisma/schema.prisma', 'prisma/postgresql/schema.prisma']:
    path = Path(schema_name)
    text = path.read_text(encoding='utf-8')
    old = '  dayEnd                String   @default("18:00")\n  dailyCapacityMinutes Int      @default(480)'
    new = '  dayEnd                String   @default("18:00")\n  timeZone              String   @default("Europe/Paris")\n  dailyCapacityMinutes Int      @default(480)'
    if old not in text:
        raise RuntimeError(f'OrganizationMember time marker missing in {schema_name}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')

for migration_name in [
    'prisma/migrations/20260724014500_p1_b_team_dispatch/migration.sql',
    'prisma/postgresql/migrations/20260724014500_p1_b_team_dispatch/migration.sql',
]:
    path = Path(migration_name)
    text = path.read_text(encoding='utf-8')
    old = 'ALTER TABLE "OrganizationMember" ADD COLUMN "dayEnd" TEXT NOT NULL DEFAULT \'18:00\';\n'
    new = old + 'ALTER TABLE "OrganizationMember" ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT \'Europe/Paris\';\n'
    if old not in text:
        raise RuntimeError(f'Migration time marker missing in {migration_name}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')

print('P1-B technician timezone added')
