import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const roots = ['skills/image-edit', 'scripts', 'mini-services']
function hasTypeScriptFiles(path) {
  if (!existsSync(path)) return false
  return readdirSync(path, { withFileTypes: true }).some(entry =>
    entry.isDirectory() ? hasTypeScriptFiles(join(path, entry.name)) : entry.name.endsWith('.ts')
  )
}

if (!roots.some(hasTypeScriptFiles)) {
  console.log('No standalone TypeScript tools in this checkout — skipped')
  process.exit(0)
}

const executable = process.platform === 'win32' ? 'tsc.cmd' : 'tsc'
const result = spawnSync(join('node_modules', '.bin', executable), ['--noEmit', '--project', 'tsconfig.tools.json'], {
  stdio: 'inherit',
})
process.exit(result.status ?? 1)
