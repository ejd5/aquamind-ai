import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

describe('P1-A Pro CRM product truth', () => {
  it('does not expose report downloads before report routes exist', () => {
    const interventionPage = read('src/app/pro/app/interventions/[id]/page.tsx')
    const poolPage = read('src/app/pro/app/pools/[id]/page.tsx')

    expect(interventionPage).not.toContain('/api/pro/interventions/${id}/report')
    expect(poolPage).not.toContain('/api/pro/pools/${pool.id}/report')
    expect(interventionPage).not.toContain('<Download')
    expect(poolPage).not.toContain('<Download')
  })

  it('does not offer embedded photo capture without private object storage', () => {
    const interventionPage = read('src/app/pro/app/interventions/[id]/page.tsx')
    const createRoute = read('src/app/api/pro/interventions/route.ts')
    const updateRoute = read('src/app/api/pro/interventions/[id]/route.ts')

    expect(interventionPage).not.toContain('accept="image/*"')
    expect(interventionPage).not.toContain('canvas.toDataURL')
    expect(createRoute).toContain('Embedded service photos are not accepted')
    expect(updateRoute).toContain('Embedded service photos are not accepted')
    expect(createRoute).toContain('toSafePhotoReferences')
    expect(updateRoute).toContain('toSafePhotoReferences')
  })
})
