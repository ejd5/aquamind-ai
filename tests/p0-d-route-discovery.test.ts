import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, it } from 'vitest'

const ROOT = process.cwd()

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

describe('P0-D route discovery', () => {
  it('reports offline queue producers once', () => {
    const matches: string[] = []
    for (const file of walk(join(ROOT, 'src'))) {
      if (!/\.(ts|tsx)$/.test(file)) continue
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, index) => {
        if (/queueAction|flushPending|pendingActions/.test(line)) {
          matches.push(`${relative(ROOT, file)}:${index + 1}:${line.trim()}`)
        }
      })
    }
    throw new Error(`P0D_ROUTE_MAP\n${matches.join('\n')}`)
  })
})
