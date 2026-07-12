import { describe, expect, it } from 'vitest'
import { resolveDatabaseProvider } from '@/lib/database-provider'

describe('database provider selection', () => {
  it('keeps SQLite as the safe default', () => {
    expect(resolveDatabaseProvider(undefined, 'file:/tmp/aqwelia.db')).toBe('sqlite')
  })
  it('accepts an explicit PostgreSQL runtime', () => {
    expect(resolveDatabaseProvider('postgresql', 'postgresql://user:secret@localhost/db')).toBe('postgresql')
  })
  it.each([
    ['sqlite', 'postgresql://localhost/db'],
    ['postgresql', 'file:/tmp/aqwelia.db'],
    ['mysql', 'mysql://localhost/db'],
  ])('rejects mismatched or unsupported configuration %s', (provider, url) => {
    expect(() => resolveDatabaseProvider(provider, url)).toThrow()
  })
  it('rejects a missing database URL', () => {
    expect(() => resolveDatabaseProvider('sqlite', undefined)).toThrow('DATABASE_URL is required')
  })
})
