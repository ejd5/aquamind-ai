import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8')
const pgSchema = readFileSync(join(root, 'prisma/postgresql/schema.prisma'), 'utf8')
const sessionRoute = readFileSync(join(root, 'src/app/api/pro/location/session/route.ts'), 'utf8')
const pointsRoute = readFileSync(join(root, 'src/app/api/pro/location/points/route.ts'), 'utf8')
const liveRoute = readFileSync(join(root, 'src/app/api/pro/dispatch/live/route.ts'), 'utf8')
const recommendRoute = readFileSync(join(root, 'src/app/api/pro/dispatch/recommend/route.ts'), 'utf8')
const settingsRoute = readFileSync(join(root, 'src/app/api/pro/dispatch/settings/route.ts'), 'utf8')
const workspace = readFileSync(join(root, 'src/components/pro/dispatch-live-workspace.tsx'), 'utf8')
const locationControl = readFileSync(join(root, 'src/components/pro/location-sharing-control.tsx'), 'utf8')
const privacy = readFileSync(join(root, 'docs/pro/DISPATCH_LIVE_PRIVACY.md'), 'utf8')
const migrationScenario = readFileSync(join(root, 'tests/test-consent-migration.mjs'), 'utf8')

function expectSchema(source: string) {
  expect(source).toContain('model ProTrackingSession')
  expect(source).toContain('model ProLocationPoint')
  expect(source).toContain('model ProLocationAccessLog')
  expect(source).toContain('locationTrackingEnabled')
  expect(source).toContain('locationSharingEnabled')
  expect(source).toContain('locationNoticeAcknowledgedAt')
  expect(source).toContain('routeOrder')
  expect(source).toContain('latitude')
  expect(source).toContain('longitude')
}

describe('AQWELIA Pro Dispatch Live contract', () => {
  it('keeps SQLite and PostgreSQL tracking schemas aligned', () => {
    expectSchema(schema)
    expectSchema(pgSchema)
  })

  it('requires visible work sessions and acknowledged information', () => {
    expect(sessionRoute).toContain('acknowledgeNotice')
    expect(sessionRoute).toContain('LIVE_SESSION_MAX_MS')
    expect(sessionRoute).toContain("status: 'stopped'")
    expect(locationControl).toContain("sessionAction('stop')")
    expect(locationControl).toContain('foreground')
  })

  it('keeps the user-facing controls restricted to smartphone sessions', () => {
    expect(sessionRoute).toContain("source: 'mobile'")
    expect(sessionRoute).not.toContain("body?.source === 'vehicle'")
    expect(pointsRoute).toContain("source: 'mobile'")
    expect(pointsRoute).toContain('Active smartphone tracking session not found')
  })

  it('only lets the authenticated user upload points to their active opted-in session', () => {
    expect(pointsRoute).toContain('userId: session.user.id')
    expect(pointsRoute).toContain("status: 'active'")
    expect(pointsRoute).toContain('sessionId: trackingSession.id')
    expect(pointsRoute).toContain('locationTrackingEnabled')
    expect(pointsRoute).toContain('locationSharingEnabled')
    expect(pointsRoute).toContain('Location sharing was disabled and the tracking session was stopped')
    expect(pointsRoute).toContain('retentionCutoff')
  })

  it('stops the phone watcher when the server revokes or expires the session', () => {
    expect(locationControl).toContain('[404, 409, 410].includes(response.status)')
    expect(locationControl).toContain('sessionIdRef.current = null')
    expect(locationControl).toContain('activeSession: null')
  })

  it('limits exact team locations and configuration to managers', () => {
    expect(liveRoute).toContain('!access.canManage')
    expect(settingsRoute).toContain('!access.canManage')
    expect(liveRoute).toContain("action: 'view_live_dispatch'")
  })

  it('selects the freshest point across active phone and vehicle sessions', () => {
    expect(liveRoute).toContain('activeSessionById')
    expect(liveRoute).toContain('trackingSession.userId !== point.userId')
    expect(liveRoute).toContain('selectedSessionByUser')
    expect(liveRoute).toContain('member.locationSharingEnabled && selectedSession')
    expect(liveRoute).toContain("data: { status: 'stopped', endedAt: now }")
  })

  it('keeps emergency dispatch advisory, live-session-only and human-approved', () => {
    expect(recommendRoute).toContain('advisoryOnly: true')
    expect(recommendRoute).not.toContain('proIntervention.update')
    expect(recommendRoute).toContain('no_active_tracking_sessions')
    expect(recommendRoute).toContain('trackingSession.userId !== point.userId')
    expect(recommendRoute).toContain('locationTrackingEnabled')
    expect(workspace).toContain('/api/pro/interventions/')
    expect(privacy).toContain('validation humaine')
  })

  it('does not claim hidden or permanent background tracking', () => {
    expect(privacy).toContain('suivi désactivé par défaut')
    expect(privacy).toContain('arrêt automatique après 14 heures')
    expect(privacy).toContain('lorsque l’application est ouverte')
  })

  it('keeps the historical PostgreSQL fixture compatible with baseline Organization columns', () => {
    expect(migrationScenario).toContain('INSERT INTO "Organization"')
    expect(migrationScenario).toContain('const organizationId = `org-${randomUUID()}`')
  })
})
