import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'

const root = process.cwd()
const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('P1 production activation', () => {
  it('passes the repository contract without inspecting production secrets', () => {
    const directory = mkdtempSync(join(tmpdir(), 'aqwelia-production-activation-'))
    temporaryDirectories.push(directory)
    const output = join(directory, 'report.json')
    const result = spawnSync(
      process.execPath,
      ['scripts/check-p1-production-activation.mjs', '--mode=repository', '--strict', `--output=${output}`],
      { cwd: root, encoding: 'utf8' },
    )

    expect(result.status, result.stderr || result.stdout).toBe(0)
    const report = JSON.parse(readFileSync(output, 'utf8')) as {
      status: string
      productionSecretsInspected: boolean
      missing: string[]
    }
    expect(report.status).toBe('pass')
    expect(report.productionSecretsInspected).toBe(false)
    expect(report.missing).toEqual([])
  })

  it('requires explicit confirmations for migrations and Vercel redeploys', () => {
    const workflow = readFileSync(join(root, '.github/workflows/p1-production-activation.yml'), 'utf8')
    expect(workflow).toContain("inputs.confirmation == 'DEPLOY_P1_MIGRATIONS'")
    expect(workflow).toContain("inputs.confirmation == 'REDEPLOY_P1_PRODUCTION'")
    expect(workflow).toContain('environment: production')
    expect(workflow).toContain('bun run db:pg:deploy')
    expect(workflow).toContain('VERCEL_DEPLOY_HOOK_URL')
  })

  it('never writes secret values into the production report contract', () => {
    const script = readFileSync(join(root, 'scripts/check-p1-production-activation.mjs'), 'utf8')
    expect(script).toContain('secretValuesIncluded: false')
    expect(script).not.toContain('value: process.env')
    expect(script).not.toContain('console.log(process.env')
  })
})
