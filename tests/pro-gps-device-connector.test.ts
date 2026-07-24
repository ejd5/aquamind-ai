import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const sqliteSchema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8')
const postgresSchema = readFileSync(join(root, 'prisma/postgresql/schema.prisma'), 'utf8')
const sqliteMigration = readFileSync(join(root, 'prisma/migrations/20260725020000_p1_c_gps_devices/migration.sql'), 'utf8')
const postgresMigration = readFileSync(join(root, 'prisma/postgresql/migrations/20260725020000_p1_c_gps_devices/migration.sql'), 'utf8')
const helper = readFileSync(join(root, 'src/lib/pro/gps-device.ts'), 'utf8')
const management = readFileSync(join(root, 'src/app/api/pro/dispatch/devices/route.ts'), 'utf8')
const revocation = readFileSync(join(root, 'src/app/api/pro/dispatch/devices/[id]/route.ts'), 'utf8')
const phoneSession = readFileSync(join(root, 'src/app/api/pro/location/session/route.ts'), 'utf8')
const phonePoints = readFileSync(join(root, 'src/app/api/pro/location/points/route.ts'), 'utf8')
const ingestion = readFileSync(join(root, 'src/app/api/pro/location/device/route.ts'), 'utf8')
const component = readFileSync(join(root, 'src/components/pro/gps-device-settings.tsx'), 'utf8')
const localeCopy = readFileSync(join(root, 'src/i18n/locales/pro-gps-device-copy.ts'), 'utf8')
const workspace = readFileSync(join(root, 'src/components/pro/dispatch-live-workspace.tsx'), 'utf8')
const privacy = readFileSync(join(root, 'docs/pro/DISPATCH_LIVE_PRIVACY.md'), 'utf8')
const connectorDocs = readFileSync(join(root, 'docs/pro/GPS_DEVICE_CONNECTOR.md'), 'utf8')

function expectDeviceSchema(source: string) {
  expect(source).toContain('model ProTrackingDevice')
  expect(source).toContain('tokenHash        String   @unique')
  expect(source).toContain('externalDeviceId String')
  expect(source).toContain('deviceId        String?')
  expect(source).toContain('externalEventId String?')
  expect(source).toContain('@@unique([sessionId, externalEventId])')
  expect(source).toContain('@@unique([organizationId, provider, externalDeviceId])')
  expect(source).toContain('@@index([deviceId, recordedAt])')
}

describe('AQWELIA Pro vehicle GPS connector', () => {
  it('keeps SQLite and PostgreSQL schemas aligned', () => {
    expectDeviceSchema(sqliteSchema)
    expectDeviceSchema(postgresSchema)
    for (const migration of [sqliteMigration, postgresMigration]) {
      expect(migration).toContain('CREATE TABLE "ProTrackingDevice"')
      expect(migration).toContain('ProTrackingDevice_tokenHash_key')
      expect(migration).toContain('ProLocationPoint_sessionId_externalEventId_key')
    }
  })

  it('creates a one-time high-entropy token and stores only its SHA-256 hash', () => {
    expect(helper).toContain("randomBytes(32).toString('base64url')")
    expect(helper).toContain("createHash('sha256')")
    expect(management).toContain('tokenShownOnce: true')
    expect(management).toContain('tokenHash')
    expect(management).not.toContain('select: { tokenHash: true')
  })

  it('requires manager registration and an authorized informed technician', () => {
    expect(management).toContain('access.canManage')
    expect(management).toContain('locationSharingEnabled')
    expect(management).toContain('locationNoticeAcknowledgedAt')
    expect(management).toContain('register_tracking_device')
  })

  it('strictly separates browser smartphone sessions from vehicle device sessions', () => {
    expect(phoneSession).toContain("source: 'mobile'")
    expect(phonePoints).toContain("source: 'mobile'")
    expect(ingestion).toContain("source: 'vehicle'")
    expect(phonePoints).toContain('Active smartphone tracking session not found')
  })

  it('ingests signed device points without a user browser session', () => {
    expect(ingestion).toContain("req.headers.get('authorization')")
    expect(ingestion).toContain('hashDeviceToken(token)')
    expect(ingestion).not.toContain('getServerSession')
    expect(ingestion).toContain('externalEventId')
    expect(ingestion).toContain('duplicate: true')
  })

  it('limits public payload type, size, frequency and concurrent replay', () => {
    expect(ingestion).toContain("includes('application/json')")
    expect(ingestion).toContain('MAX_DEVICE_BODY_BYTES')
    expect(ingestion).toContain('MIN_DEVICE_INTERVAL_MS')
    expect(ingestion).toContain("'Retry-After': '5'")
    expect(ingestion).toContain("code === 'P2002'")
  })

  it('rejects vehicle positions outside configured work windows', () => {
    expect(helper).toContain('validateTechnicianSchedule')
    expect(helper).toContain('parseWorkingDays')
    expect(ingestion).toContain('devicePointWithinWorkWindow')
    expect(ingestion).toContain('Location rejected outside configured working hours')
    expect(connectorDocs).toContain('hors des jours ou horaires de travail')
  })

  it('supports generic and Traccar payload shapes without claiming automatic vendor sync', () => {
    expect(helper).toContain("provider === 'traccar'")
    expect(helper).toContain('candidate.fixTime')
    expect(helper).toContain('attributes.batteryLevel')
    expect(connectorDocs).toContain('format normalisé AQWELIA')
  })

  it('keeps visible device settings copy in the canonical seven-language source', () => {
    expect(component).toContain('PRO_GPS_DEVICE_COPY')
    for (const locale of ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl']) {
      expect(localeCopy).toContain(`  ${locale}: {`)
    }
  })

  it('lets managers view, copy once and revoke device access from Dispatch Live', () => {
    expect(component).toContain('navigator.clipboard.writeText')
    expect(component).toContain("method: 'DELETE'")
    expect(workspace).toContain('<GpsDeviceSettings')
    expect(revocation).toContain("status: 'revoked'")
    expect(revocation).toContain('revoke_tracking_device')
  })

  it('documents that vehicle tracking follows the same visible privacy boundaries', () => {
    expect(privacy).toContain('## Balises GPS véhicules')
    expect(privacy).toContain('jeton révocable affiché une seule fois')
    expect(connectorDocs).toContain('ne crée aucune position exploitable')
  })
})
