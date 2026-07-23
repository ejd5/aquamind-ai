from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_model(text: str, model_name: str, replacement: str) -> str:
    pattern = rf"model {re.escape(model_name)} \{{.*?\n\}}\n"
    updated, count = re.subn(pattern, replacement.rstrip() + "\n", text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"Expected one {model_name} model, replaced {count}")
    return updated


PRO_CLIENT_MODEL = r'''
model ProClient {
  id               String    @id @default(cuid())
  proUserId        String
  firstName        String
  lastName         String
  companyName      String?
  email            String?
  phone            String?
  address          String?
  city             String?
  zipCode          String?
  status           String    @default("active") // prospect | active | paused | archived
  source           String?
  preferredContact String    @default("email") // email | phone | sms | whatsapp
  tags             String?   // JSON array of short labels
  lastContactAt    DateTime?
  nextFollowUpAt   DateTime?
  notes            String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  pools         ProPool[]
  interventions ProIntervention[]
  activities    ProClientActivity[]

  user User @relation(fields: [proUserId], references: [id], onDelete: Cascade)

  @@index([proUserId])
  @@index([status])
  @@index([nextFollowUpAt])
  @@index([lastName])
  @@index([firstName])
}
'''

PRO_POOL_MODEL = r'''
model ProPool {
  id                 String    @id @default(cuid())
  proClientId        String
  name               String
  type               String    @default("pool") // pool | spa | both
  status             String    @default("active") // active | seasonal | inactive
  volume             Float?
  unit               String    @default("m3")
  shape              String?
  surface            String?
  treatmentType      String?
  saltSystem         Boolean   @default(false)
  filterType         String?
  brand              String?
  model              String?
  serialNumber       String?
  installedAt        DateTime?
  address            String?
  accessInstructions String?
  equipmentNotes     String?
  lastServiceAt      DateTime?
  nextServiceAt      DateTime?
  notes              String?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  client        ProClient         @relation(fields: [proClientId], references: [id], onDelete: Cascade)
  interventions ProIntervention[]
  waterTests    ProWaterTest[]

  @@index([proClientId])
  @@index([status])
  @@index([nextServiceAt])
}
'''

PRO_INTERVENTION_MODEL = r'''
model ProIntervention {
  id            String    @id @default(cuid())
  proClientId   String
  proPoolId     String?
  technicianId  String?
  type          String    @default("maintenance") // maintenance | repair | opening | closing | emergency
  status        String    @default("scheduled") // scheduled | in_progress | completed | cancelled
  priority      String    @default("normal") // low | normal | high | urgent
  scheduledAt   DateTime
  startedAt     DateTime?
  completedAt   DateTime?
  duration      Int?
  summary       String?
  customerNotes String?
  internalNotes String?
  notes         String?
  photos        String?
  actions       String?
  productsUsed  String?
  billable      Boolean   @default(true)
  amount        Float?
  currency      String    @default("EUR")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  client ProClient @relation(fields: [proClientId], references: [id], onDelete: Cascade)
  pool   ProPool?  @relation(fields: [proPoolId], references: [id], onDelete: SetNull)

  @@index([proClientId])
  @@index([proPoolId])
  @@index([status])
  @@index([priority])
  @@index([scheduledAt])
  @@index([technicianId])
}
'''

PRO_ACTIVITY_MODEL = r'''
model ProClientActivity {
  id           String   @id @default(cuid())
  proClientId  String
  actorUserId  String?
  type         String   @default("note") // note | call | email | sms | visit | follow_up | status_change | system
  title        String
  details      String?
  occurredAt   DateTime @default(now())
  createdAt    DateTime @default(now())

  client ProClient @relation(fields: [proClientId], references: [id], onDelete: Cascade)

  @@index([proClientId, occurredAt])
  @@index([type])
}
'''

for schema_path in [ROOT / "prisma/schema.prisma", ROOT / "prisma/postgresql/schema.prisma"]:
    text = schema_path.read_text(encoding="utf-8")
    text = replace_model(text, "ProClient", PRO_CLIENT_MODEL)
    text = replace_model(text, "ProPool", PRO_POOL_MODEL)
    text = replace_model(text, "ProIntervention", PRO_INTERVENTION_MODEL)
    marker = "\n// ───────────────────────────────────────────────────────────────────────────\n// AQWELIA FAMILY"
    if "model ProClientActivity {" not in text:
        if marker not in text:
            raise RuntimeError(f"Family marker missing in {schema_path}")
        text = text.replace(marker, "\n" + PRO_ACTIVITY_MODEL.rstrip() + "\n" + marker, 1)
    schema_path.write_text(text, encoding="utf-8")

sqlite_migration = r'''-- AlterTable
ALTER TABLE "ProClient" ADD COLUMN "companyName" TEXT;
ALTER TABLE "ProClient" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "ProClient" ADD COLUMN "source" TEXT;
ALTER TABLE "ProClient" ADD COLUMN "preferredContact" TEXT NOT NULL DEFAULT 'email';
ALTER TABLE "ProClient" ADD COLUMN "tags" TEXT;
ALTER TABLE "ProClient" ADD COLUMN "lastContactAt" DATETIME;
ALTER TABLE "ProClient" ADD COLUMN "nextFollowUpAt" DATETIME;

-- AlterTable
ALTER TABLE "ProPool" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "ProPool" ADD COLUMN "brand" TEXT;
ALTER TABLE "ProPool" ADD COLUMN "model" TEXT;
ALTER TABLE "ProPool" ADD COLUMN "serialNumber" TEXT;
ALTER TABLE "ProPool" ADD COLUMN "installedAt" DATETIME;
ALTER TABLE "ProPool" ADD COLUMN "accessInstructions" TEXT;
ALTER TABLE "ProPool" ADD COLUMN "equipmentNotes" TEXT;
ALTER TABLE "ProPool" ADD COLUMN "lastServiceAt" DATETIME;
ALTER TABLE "ProPool" ADD COLUMN "nextServiceAt" DATETIME;

-- AlterTable
ALTER TABLE "ProIntervention" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "ProIntervention" ADD COLUMN "startedAt" DATETIME;
ALTER TABLE "ProIntervention" ADD COLUMN "summary" TEXT;
ALTER TABLE "ProIntervention" ADD COLUMN "customerNotes" TEXT;
ALTER TABLE "ProIntervention" ADD COLUMN "internalNotes" TEXT;
ALTER TABLE "ProIntervention" ADD COLUMN "billable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ProIntervention" ADD COLUMN "amount" REAL;
ALTER TABLE "ProIntervention" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR';

-- CreateTable
CREATE TABLE "ProClientActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proClientId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'note',
    "title" TEXT NOT NULL,
    "details" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProClientActivity_proClientId_fkey" FOREIGN KEY ("proClientId") REFERENCES "ProClient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ProClient_status_idx" ON "ProClient"("status");
CREATE INDEX "ProClient_nextFollowUpAt_idx" ON "ProClient"("nextFollowUpAt");
CREATE INDEX "ProPool_status_idx" ON "ProPool"("status");
CREATE INDEX "ProPool_nextServiceAt_idx" ON "ProPool"("nextServiceAt");
CREATE INDEX "ProIntervention_priority_idx" ON "ProIntervention"("priority");
CREATE INDEX "ProClientActivity_proClientId_occurredAt_idx" ON "ProClientActivity"("proClientId", "occurredAt");
CREATE INDEX "ProClientActivity_type_idx" ON "ProClientActivity"("type");
'''

postgres_migration = r'''-- AlterTable
ALTER TABLE "ProClient" ADD COLUMN "companyName" TEXT;
ALTER TABLE "ProClient" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "ProClient" ADD COLUMN "source" TEXT;
ALTER TABLE "ProClient" ADD COLUMN "preferredContact" TEXT NOT NULL DEFAULT 'email';
ALTER TABLE "ProClient" ADD COLUMN "tags" TEXT;
ALTER TABLE "ProClient" ADD COLUMN "lastContactAt" TIMESTAMP(3);
ALTER TABLE "ProClient" ADD COLUMN "nextFollowUpAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProPool" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "ProPool" ADD COLUMN "brand" TEXT;
ALTER TABLE "ProPool" ADD COLUMN "model" TEXT;
ALTER TABLE "ProPool" ADD COLUMN "serialNumber" TEXT;
ALTER TABLE "ProPool" ADD COLUMN "installedAt" TIMESTAMP(3);
ALTER TABLE "ProPool" ADD COLUMN "accessInstructions" TEXT;
ALTER TABLE "ProPool" ADD COLUMN "equipmentNotes" TEXT;
ALTER TABLE "ProPool" ADD COLUMN "lastServiceAt" TIMESTAMP(3);
ALTER TABLE "ProPool" ADD COLUMN "nextServiceAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProIntervention" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "ProIntervention" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "ProIntervention" ADD COLUMN "summary" TEXT;
ALTER TABLE "ProIntervention" ADD COLUMN "customerNotes" TEXT;
ALTER TABLE "ProIntervention" ADD COLUMN "internalNotes" TEXT;
ALTER TABLE "ProIntervention" ADD COLUMN "billable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ProIntervention" ADD COLUMN "amount" DOUBLE PRECISION;
ALTER TABLE "ProIntervention" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR';

-- CreateTable
CREATE TABLE "ProClientActivity" (
    "id" TEXT NOT NULL,
    "proClientId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'note',
    "title" TEXT NOT NULL,
    "details" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProClientActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProClient_status_idx" ON "ProClient"("status");
CREATE INDEX "ProClient_nextFollowUpAt_idx" ON "ProClient"("nextFollowUpAt");
CREATE INDEX "ProPool_status_idx" ON "ProPool"("status");
CREATE INDEX "ProPool_nextServiceAt_idx" ON "ProPool"("nextServiceAt");
CREATE INDEX "ProIntervention_priority_idx" ON "ProIntervention"("priority");
CREATE INDEX "ProClientActivity_proClientId_occurredAt_idx" ON "ProClientActivity"("proClientId", "occurredAt");
CREATE INDEX "ProClientActivity_type_idx" ON "ProClientActivity"("type");

ALTER TABLE "ProClientActivity" ADD CONSTRAINT "ProClientActivity_proClientId_fkey"
FOREIGN KEY ("proClientId") REFERENCES "ProClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
'''

migration_name = "20260724004500_p1_a_pro_crm_foundation"
for base, content in [
    (ROOT / "prisma/migrations", sqlite_migration),
    (ROOT / "prisma/postgresql/migrations", postgres_migration),
]:
    target = base / migration_name / "migration.sql"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")

helper = r'''export const PRO_CLIENT_STATUSES = ['prospect', 'active', 'paused', 'archived'] as const
export const PRO_CONTACT_CHANNELS = ['email', 'phone', 'sms', 'whatsapp'] as const
export const PRO_POOL_STATUSES = ['active', 'seasonal', 'inactive'] as const
export const PRO_INTERVENTION_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export const PRO_ACTIVITY_TYPES = [
  'note',
  'call',
  'email',
  'sms',
  'visit',
  'follow_up',
  'status_change',
  'client_created',
  'intervention_scheduled',
  'intervention_started',
  'intervention_completed',
  'intervention_cancelled',
] as const

export type ProClientStatus = (typeof PRO_CLIENT_STATUSES)[number]
export type ProContactChannel = (typeof PRO_CONTACT_CHANNELS)[number]
export type ProPoolStatus = (typeof PRO_POOL_STATUSES)[number]
export type ProInterventionPriority = (typeof PRO_INTERVENTION_PRIORITIES)[number]
export type ProActivityType = (typeof PRO_ACTIVITY_TYPES)[number]

export function isOneOf<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value as T[number])
}

export function cleanOptionalText(value: unknown, maxLength = 10_000): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text ? text.slice(0, maxLength) : null
}

export function serializeShortStringArray(value: unknown, maxItems = 20): string | null {
  const items = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []
  const normalized = [...new Set(
    items
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().replace(/\s+/g, ' ').slice(0, 40))
      .filter(Boolean),
  )].slice(0, maxItems)
  return normalized.length ? JSON.stringify(normalized) : null
}

export function parseStoredStringArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
}

export type ParsedOptionalDate = {
  provided: boolean
  valid: boolean
  value: Date | null
}

export function parseOptionalDate(value: unknown): ParsedOptionalDate {
  if (value === undefined) return { provided: false, valid: true, value: null }
  if (value === null || value === '') return { provided: true, valid: true, value: null }
  const date = new Date(String(value))
  return {
    provided: true,
    valid: !Number.isNaN(date.getTime()),
    value: Number.isNaN(date.getTime()) ? null : date,
  }
}

export function parseOptionalAmount(value: unknown): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) return undefined
  return Math.round(amount * 100) / 100
}

export function normalizeCurrency(value: unknown): string {
  const currency = typeof value === 'string' ? value.trim().toUpperCase() : 'EUR'
  return /^[A-Z]{3}$/.test(currency) ? currency : 'EUR'
}
'''

helper_path = ROOT / "src/lib/pro/crm.ts"
helper_path.parent.mkdir(parents=True, exist_ok=True)
helper_path.write_text(helper, encoding="utf-8")

print("P1-A schema, migrations and CRM helper applied")
