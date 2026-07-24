from pathlib import Path

SCHEMAS = [Path('prisma/schema.prisma'), Path('prisma/postgresql/schema.prisma')]

old_point = '''model ProLocationPoint {
  id             String   @id @default(cuid())
  sessionId      String
  organizationId String
  userId         String
  latitude       Float
  longitude      Float
  accuracy       Float?
  altitude       Float?
  speed          Float?
  heading        Float?
  battery        Float?
  source         String   @default("mobile")
  recordedAt     DateTime
  receivedAt     DateTime @default(now())

  @@index([organizationId, recordedAt])
  @@index([userId, recordedAt])
  @@index([sessionId, recordedAt])
}
'''

new_point = '''model ProLocationPoint {
  id              String   @id @default(cuid())
  sessionId       String
  organizationId  String
  userId          String
  deviceId        String?
  externalEventId String?
  latitude        Float
  longitude       Float
  accuracy        Float?
  altitude        Float?
  speed           Float?
  heading         Float?
  battery         Float?
  source          String   @default("mobile")
  recordedAt      DateTime
  receivedAt      DateTime @default(now())

  @@unique([sessionId, externalEventId])
  @@index([organizationId, recordedAt])
  @@index([userId, recordedAt])
  @@index([sessionId, recordedAt])
  @@index([deviceId, recordedAt])
}

model ProTrackingDevice {
  id               String   @id @default(cuid())
  organizationId   String
  assignedUserId   String
  provider         String   @default("generic") // generic | traccar | samsara | geotab | webfleet
  externalDeviceId String
  label            String
  vehicle          String?
  tokenHash        String   @unique
  status           String   @default("active") // active | revoked
  lastSeenAt       DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@unique([organizationId, provider, externalDeviceId])
  @@index([organizationId, status])
  @@index([assignedUserId, status])
}
'''

for path in SCHEMAS:
    source = path.read_text(encoding='utf-8')
    if 'model ProTrackingDevice' not in source:
        if old_point not in source:
            raise RuntimeError(f'ProLocationPoint marker missing in {path}')
        source = source.replace(old_point, new_point, 1)
        path.write_text(source, encoding='utf-8')

workspace_path = Path('src/components/pro/dispatch-live-workspace.tsx')
workspace = workspace_path.read_text(encoding='utf-8')
import_marker = "import { LiveDispatchMap } from '@/components/pro/live-dispatch-map'\n"
import_line = "import { GpsDeviceSettings } from '@/components/pro/gps-device-settings'\n"
if import_line not in workspace:
    if import_marker not in workspace:
        raise RuntimeError('LiveDispatchMap import marker missing')
    workspace = workspace.replace(import_marker, import_marker + import_line, 1)

settings_marker = '      <section className="rounded-[1.75rem] border border-border/60 bg-card/80 p-5">\n        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Settings2'
device_section = '      <GpsDeviceSettings members={settings?.members ?? []} />\n\n'
if device_section not in workspace:
    if settings_marker not in workspace:
        raise RuntimeError('Dispatch settings section marker missing')
    workspace = workspace.replace(settings_marker, device_section + settings_marker, 1)
workspace_path.write_text(workspace, encoding='utf-8')

privacy_path = Path('docs/pro/DISPATCH_LIVE_PRIVACY.md')
privacy = privacy_path.read_text(encoding='utf-8')
section = '''

## Balises GPS véhicules

Les balises utilisent les mêmes finalités et restrictions que le suivi smartphone. AQWELIA refuse côté serveur toute position reçue en dehors des jours et horaires de travail configurés, même si le matériel continue à transmettre.

Chaque boîtier dispose d’un jeton révocable affiché une seule fois. Seule son empreinte SHA-256 est conservée. Son attribution à un technicien, sa révocation et les consultations de la carte sont journalisées.
'''
if '## Balises GPS véhicules' not in privacy:
    privacy_path.write_text(privacy.rstrip() + section + '\n', encoding='utf-8')

print('P1-C GPS device schemas, workspace and privacy documentation finalized')
