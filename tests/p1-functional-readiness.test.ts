import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('P1 functional readiness gate', () => {
  it('executes the repository gate and produces a passing JSON report', () => {
    const directory = mkdtempSync(join(tmpdir(), 'aqwelia-p1-readiness-'))
    temporaryDirectories.push(directory)
    const reportPath = join(directory, 'report.json')

    const output = execFileSync(
      process.execPath,
      ['scripts/check-p1-functional-readiness.mjs'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          P1_READINESS_REPORT: reportPath,
          GITHUB_SHA: 'test-sha',
        },
        encoding: 'utf8',
      },
    )

    const report = JSON.parse(readFileSync(reportPath, 'utf8'))
    expect(output).toContain('P1 functional code readiness passed')
    expect(report).toMatchObject({
      schemaVersion: 'p1-functional-readiness-v1',
      gitSha: 'test-sha',
      status: 'pass',
    })
    expect(report.summary.failed).toBe(0)
    expect(report.summary.checks).toBeGreaterThan(10)
    expect(report.productionBlockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'database-production-deploy' }),
      expect.objectContaining({ id: 'google-cloud-maps' }),
      expect.objectContaining({ id: 'commercial-delivery-provider' }),
      expect.objectContaining({ id: 'mobile-signing-and-stores' }),
      expect.objectContaining({ id: 'stacked-pr-merge-authorization' }),
    ]))
  })

  it('keeps production configuration separate from code readiness', () => {
    const script = readFileSync('scripts/check-p1-functional-readiness.mjs', 'utf8')
    expect(script).toContain("status: failures.length === 0 ? 'pass' : 'fail'")
    expect(script).toContain('productionBlockers')
    expect(script).toContain('This gate never merges automatically')
    expect(script).not.toContain('merge_pull_request')
    expect(script).not.toContain('GOOGLE_MAPS_SERVER_API_KEY=')
  })
})
