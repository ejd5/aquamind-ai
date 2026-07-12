import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const sourcePath = resolve(root, 'prisma/schema.prisma')
const targetPath = resolve(root, 'prisma/postgresql/schema.prisma')
const write = process.argv.includes('--write')

const source = await readFile(sourcePath, 'utf8')
const generated = source
  .replace(
    /\/\/ Provider: SQLite[\s\S]*?\/\/ Auth:/,
    '// Provider: PostgreSQL for staging and production.\n// Generated from prisma/schema.prisma — do not edit manually.\n// Auth:'
  )
  .replace(
    /\s*\/\/ P0-FIX Bug 6:[\s\S]*?provider = "sqlite"/,
    '\n  provider = "postgresql"'
  )

if (!generated.includes('provider = "postgresql"') || generated.includes('provider = "sqlite"')) {
  throw new Error('Unable to generate the PostgreSQL Prisma schema safely')
}

let current = ''
try { current = await readFile(targetPath, 'utf8') } catch {}

if (!write) {
  if (current !== generated) {
    console.error('PostgreSQL schema is out of sync. Run: bun run db:pg:sync')
    process.exit(1)
  }
  console.log('PostgreSQL schema is synchronized')
  process.exit(0)
}

await mkdir(dirname(targetPath), { recursive: true })
await writeFile(targetPath, generated)
console.log(`Generated ${targetPath}`)
