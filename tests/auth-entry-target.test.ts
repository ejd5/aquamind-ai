import { describe, expect, it } from 'vitest'
import { workspaceEntryTarget } from '@/lib/auth-entry-target'

const base = {
  ownsProOrganization: false,
  proMembershipRole: null,
  ownsGrowthOrganization: false,
  hasGrowthMembership: false,
}

describe('workspaceEntryTarget', () => {
  it('routes a Pro technician to the operational intervention list', () => {
    expect(workspaceEntryTarget({ ...base, proMembershipRole: 'technician' }))
      .toBe('/pro/app/interventions')
  })

  it('routes Pro owners and managers to the Pro dashboard', () => {
    expect(workspaceEntryTarget({ ...base, ownsProOrganization: true }))
      .toBe('/pro/app')
    expect(workspaceEntryTarget({ ...base, proMembershipRole: 'manager' }))
      .toBe('/pro/app')
  })

  it('routes Growth members to Growth OS', () => {
    expect(workspaceEntryTarget({ ...base, hasGrowthMembership: true }))
      .toBe('/growth/app')
  })

  it('keeps consumer users on the consumer entry point', () => {
    expect(workspaceEntryTarget(base)).toBe('/')
  })
})
