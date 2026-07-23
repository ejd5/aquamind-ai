from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

MODEL = r'''
model OrganizationMember {
  id                   String   @id @default(cuid())
  organizationId       String
  userId               String
  role                 String   @default("member") // owner | admin | manager | technician | viewer
  status               String   @default("active") // active | invited | suspended | removed
  dispatchEnabled      Boolean  @default(true)
  skills               String?  // JSON array
  serviceZones         String?  // JSON array
  workingDays          String?  // JSON array, JavaScript days 0..6
  dayStart              String   @default("08:00")
  dayEnd                String   @default("18:00")
  dailyCapacityMinutes Int      @default(480)
  dispatchColor        String?
  phone                String?
  vehicle              String?
  createdAt            DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
  @@index([organizationId])
  @@index([userId])
  @@index([organizationId, dispatchEnabled])
}
'''

for schema_path in [ROOT / 'prisma/schema.prisma', ROOT / 'prisma/postgresql/schema.prisma']:
    text = schema_path.read_text(encoding='utf-8')
    pattern = r'model OrganizationMember \{.*?\n\}\n'
    updated, count = re.subn(pattern, MODEL.strip() + '\n', text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f'OrganizationMember replacement failed in {schema_path}: {count}')
    schema_path.write_text(updated, encoding='utf-8')

sqlite = r'''-- AlterTable
ALTER TABLE "OrganizationMember" ADD COLUMN "dispatchEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "OrganizationMember" ADD COLUMN "skills" TEXT;
ALTER TABLE "OrganizationMember" ADD COLUMN "serviceZones" TEXT;
ALTER TABLE "OrganizationMember" ADD COLUMN "workingDays" TEXT;
ALTER TABLE "OrganizationMember" ADD COLUMN "dayStart" TEXT NOT NULL DEFAULT '08:00';
ALTER TABLE "OrganizationMember" ADD COLUMN "dayEnd" TEXT NOT NULL DEFAULT '18:00';
ALTER TABLE "OrganizationMember" ADD COLUMN "dailyCapacityMinutes" INTEGER NOT NULL DEFAULT 480;
ALTER TABLE "OrganizationMember" ADD COLUMN "dispatchColor" TEXT;
ALTER TABLE "OrganizationMember" ADD COLUMN "phone" TEXT;
ALTER TABLE "OrganizationMember" ADD COLUMN "vehicle" TEXT;

CREATE INDEX "OrganizationMember_organizationId_dispatchEnabled_idx"
ON "OrganizationMember"("organizationId", "dispatchEnabled");
'''

postgres = r'''-- AlterTable
ALTER TABLE "OrganizationMember" ADD COLUMN "dispatchEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "OrganizationMember" ADD COLUMN "skills" TEXT;
ALTER TABLE "OrganizationMember" ADD COLUMN "serviceZones" TEXT;
ALTER TABLE "OrganizationMember" ADD COLUMN "workingDays" TEXT;
ALTER TABLE "OrganizationMember" ADD COLUMN "dayStart" TEXT NOT NULL DEFAULT '08:00';
ALTER TABLE "OrganizationMember" ADD COLUMN "dayEnd" TEXT NOT NULL DEFAULT '18:00';
ALTER TABLE "OrganizationMember" ADD COLUMN "dailyCapacityMinutes" INTEGER NOT NULL DEFAULT 480;
ALTER TABLE "OrganizationMember" ADD COLUMN "dispatchColor" TEXT;
ALTER TABLE "OrganizationMember" ADD COLUMN "phone" TEXT;
ALTER TABLE "OrganizationMember" ADD COLUMN "vehicle" TEXT;

CREATE INDEX "OrganizationMember_organizationId_dispatchEnabled_idx"
ON "OrganizationMember"("organizationId", "dispatchEnabled");
'''

name = '20260724014500_p1_b_team_dispatch'
for root, sql in [
    (ROOT / 'prisma/migrations', sqlite),
    (ROOT / 'prisma/postgresql/migrations', postgres),
]:
    path = root / name / 'migration.sql'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(sql, encoding='utf-8')

print('P1-B team dispatch schema and migrations applied')
