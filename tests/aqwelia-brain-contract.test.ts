import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const sqliteSchema = read('prisma/schema.prisma')
const postgresqlSchema = read('prisma/postgresql/schema.prisma')
const sqliteIndexes = read(
  'prisma/migrations/20260722090000_aqwelia_brain_index_parity/migration.sql'
)
const postgresqlIndexes = read(
  'prisma/postgresql/migrations/20260722090000_aqwelia_brain_index_parity/migration.sql'
)
const outcomeRoute = read('src/app/api/brain/outcomes/route.ts')
const executionRoute = read('src/app/api/brain/executions/route.ts')
const automaticFollowup = read('src/lib/brain/record-followup.ts')
const appShell = read('src/components/aquamind/app-shell.tsx')
const waterTestModule = read('src/components/aquamind/module-water-test.tsx')
const diagnosticModule = read('src/components/aquamind/module-diagnostic.tsx')
const diagnosticPlan = read('src/components/aquamind/diagnostic-action-plan.tsx')
const offlineCache = read('src/lib/offline/api-cache.ts')
const previewWorkflow = read('.github/workflows/preview-visual-qa.yml')

const brainModels = [
  'RecommendationExecution',
  'RecommendationOutcome',
  'BrainFeedback',
  'KnowledgeArticle',
  'KnowledgeRevision',
  'BrainEventOutbox',
] as const

const requiredIndexes = [
  'RecommendationExecution_userId_idx',
  'RecommendationExecution_poolId_createdAt_idx',
  'RecommendationExecution_status_idx',
  'RecommendationOutcome_userId_idx',
  'RecommendationOutcome_poolId_createdAt_idx',
  'BrainFeedback_contextType_contextId_idx',
  'BrainFeedback_status_createdAt_idx',
  'KnowledgeArticle_status_audience_idx',
  'KnowledgeRevision_articleId_locale_idx',
  'BrainEventOutbox_aggregateType_aggregateId_idx',
  'BrainEventOutbox_type_createdAt_idx',
] as const

describe('AQWELIA Brain contracts', () => {
  it.each(brainModels)('keeps model %s in both Prisma schemas', (model) => {
    expect(sqliteSchema).toContain(`model ${model} {`)
    expect(postgresqlSchema).toContain(`model ${model} {`)
  })

  it('preserves the Growth consent timestamp during the Brain merge', () => {
    expect(sqliteSchema).toMatch(/consentAt\s+DateTime\?/)
    expect(postgresqlSchema).toMatch(/consentAt\s+DateTime\?/)
  })

  it.each(requiredIndexes)('creates index %s for SQLite and PostgreSQL', (index) => {
    expect(sqliteIndexes).toContain(`"${index}"`)
    expect(postgresqlIndexes).toContain(`"${index}"`)
  })

  it('rejects invalid follow-up tests and preserves a zero water index', () => {
    expect(outcomeRoute).toContain('Follow-up water test not found for this pool')
    expect(outcomeRoute).toContain('followupTest?.clearWaterIndex ?? undefined')
    expect(outcomeRoute).toContain('Rating must be an integer between 1 and 5')
  })

  it('waits for the scheduled retest and atomically claims the outcome', () => {
    expect(automaticFollowup).toContain("reminder?.status === 'pending'")
    expect(automaticFollowup).toContain(
      'reminder.nextAttemptAt.getTime() <= now.getTime()'
    )
    expect(automaticFollowup).toContain('recommendationOutcome.updateMany')
    expect(automaticFollowup).toContain("status: 'processed'")
  })

  it('cancels pending outcome data when all completed actions are reversed', () => {
    expect(executionRoute).toContain('remainingCompleted === 0')
    expect(executionRoute).toContain("status: 'cancelled'")
    expect(executionRoute).toContain('nextAttemptAt: null')
  })

  it('propagates the active pool through every diagnostic entry point', () => {
    expect(appShell).toContain('<ModuleDiagnostic activePoolId={activePoolId} />')
    expect(appShell).toContain('activePoolId={activePoolId}')
    expect(waterTestModule).toContain('offlineApi.waterTests(activePoolId)')
    expect(waterTestModule).toContain(
      '...(activePoolId ? { poolId: activePoolId } : {})'
    )
    expect(diagnosticModule).toContain('offlineApi.photoDiagnostic(activePoolId)')
    expect(diagnosticModule).toContain('poolId: activePoolId || undefined')
    expect(diagnosticPlan).toContain(
      '?poolId=${encodeURIComponent(activePoolId)}'
    )
    expect(diagnosticPlan).toContain(
      '...(activePoolId ? { poolId: activePoolId } : {})'
    )
    expect(offlineCache).toContain('waterTests: (poolId?: string | null)')
    expect(offlineCache).toContain('photoDiagnostic: (poolId?: string | null)')
  })

  it('resolves the Vercel Preview URL dynamically for every pull request', () => {
    expect(previewWorkflow).toContain('.user.login == "vercel[bot]"')
    expect(previewWorkflow).toContain('PREVIEW_URL=$preview_url')
    expect(previewWorkflow).not.toContain('feat-figma-design-fou')
  })

  it('does not ship temporary synchronization files or an npm lockfile', () => {
    expect(existsSync(resolve(process.cwd(), 'package-lock.json'))).toBe(false)
    expect(
      existsSync(resolve(process.cwd(), '.github/workflows/brain-self-sync.yml'))
    ).toBe(false)
    expect(
      existsSync(resolve(process.cwd(), '.github/workflows/sync-aqwelia-brain.yml'))
    ).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'docs/.brain-sync-trigger'))).toBe(false)
    expect(
      existsSync(resolve(process.cwd(), 'scripts/apply-brain-review-fixes.py'))
    ).toBe(false)
  })
})
