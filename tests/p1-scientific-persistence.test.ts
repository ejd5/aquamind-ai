import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  MeasurementProvenanceError,
  MEASUREMENT_PROVENANCE_METHOD_VERSION,
  normalizeMeasurementProvenance,
} from '@/lib/pool/measurement-provenance'

const root = process.cwd()

describe('P1 Scientific persistence', () => {
  it('normalizes trusted measurement provenance', () => {
    const measuredAt = new Date('2026-07-26T12:00:00.000Z')
    const provenance = normalizeMeasurementProvenance(
      {
        measuredAt: measuredAt.toISOString(),
        measurementMethod: 'photometer',
        measurementMetadata: {
          deviceBrand: 'AQWELIA Lab',
          deviceModel: 'P-1',
          calibrationAt: '2026-07-20T08:00:00.000Z',
          ignoredNestedValue: { unsafe: true },
        },
      },
      new Date('2026-07-26T12:05:00.000Z'),
    )

    expect(provenance.methodVersion).toBe(MEASUREMENT_PROVENANCE_METHOD_VERSION)
    expect(provenance.measuredAt).toEqual(measuredAt)
    expect(provenance.measurementMethod).toBe('photometer')
    expect(JSON.parse(provenance.measurementMetadata ?? '{}')).toEqual({
      deviceBrand: 'AQWELIA Lab',
      deviceModel: 'P-1',
      calibrationAt: '2026-07-20T08:00:00.000Z',
    })
  })

  it('maps existing sources to a compatible measurement method', () => {
    expect(normalizeMeasurementProvenance({ source: 'strip_photo' }).measurementMethod).toBe('strip')
    expect(normalizeMeasurementProvenance({ source: 'device' }).measurementMethod).toBe('device')
    expect(normalizeMeasurementProvenance({ source: 'imported' }).measurementMethod).toBe('imported')
    expect(normalizeMeasurementProvenance({ source: 'manual' }).measurementMethod).toBe('manual')
  })

  it('rejects future dates, unknown methods and non-object metadata', () => {
    expect(() => normalizeMeasurementProvenance(
      { measuredAt: '2026-07-27T00:00:00.000Z' },
      new Date('2026-07-26T12:00:00.000Z'),
    )).toThrowError(MeasurementProvenanceError)

    try {
      normalizeMeasurementProvenance({ measurementMethod: 'guess' })
      throw new Error('Expected invalid method')
    } catch (error) {
      expect(error).toBeInstanceOf(MeasurementProvenanceError)
      expect((error as MeasurementProvenanceError).code).toBe('INVALID_MEASUREMENT_METHOD')
    }

    expect(() => normalizeMeasurementProvenance({ measurementMetadata: ['not', 'an', 'object'] }))
      .toThrowError(MeasurementProvenanceError)
  })

  it('keeps SQLite and PostgreSQL schemas synchronized', () => {
    const sqliteSchema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8')
    const postgresSchema = readFileSync(join(root, 'prisma/postgresql/schema.prisma'), 'utf8')
    for (const field of [
      'manufacturerSaltMin',
      'manufacturerSaltMax',
      'manufacturerChlorineMax',
      'totalDissolvedSolids',
      'measuredAt',
      'measurementMethod',
      'measurementMetadata',
      'scientificQualityScore',
      'scientificMethodVersion',
      'scientificLimitations',
      'lsiMethodVersion',
      'dosageMethodVersion',
      'swimSafetyMethodVersion',
    ]) {
      expect(sqliteSchema).toContain(field)
      expect(postgresSchema).toContain(field)
    }
  })

  it('ships parallel incremental migrations without editing the baseline', () => {
    const sqliteMigration = readFileSync(
      join(root, 'prisma/migrations/20260726170000_scientific_measurement_persistence/migration.sql'),
      'utf8',
    )
    const postgresMigration = readFileSync(
      join(root, 'prisma/postgresql/migrations/20260726170000_scientific_measurement_persistence/migration.sql'),
      'utf8',
    )
    for (const field of [
      'manufacturerSaltMin',
      'manufacturerSaltMax',
      'manufacturerChlorineMax',
      'totalDissolvedSolids',
      'measuredAt',
      'scientificQualityScore',
      'dosageMethodVersion',
      'swimSafetyMethodVersion',
    ]) {
      expect(sqliteMigration).toContain(`ADD COLUMN "${field}"`)
      expect(postgresMigration).toContain(`ADD COLUMN "${field}"`)
    }
    expect(postgresMigration).toContain('DOUBLE PRECISION')
    expect(postgresMigration).toContain('TIMESTAMP(3)')
  })

  it('persists provenance and method versions through the water-test API', () => {
    const route = readFileSync(join(root, 'src/app/api/pool/water-test/route.ts'), 'utf8')
    expect(route).toContain('normalizeMeasurementProvenance')
    expect(route).toContain('totalDissolvedSolids: scientificTest.totalDissolvedSolids')
    expect(route).toContain('measuredAt: provenance.measuredAt')
    expect(route).toContain('measurementMethod: provenance.measurementMethod')
    expect(route).toContain('scientificQualityScore: standaloneQuality.score')
    expect(route).toContain('scientificLimitations: JSON.stringify(standaloneQuality.limitations)')
    expect(route).toContain('lsiMethodVersion: lsiCalculation.methodVersion')
    expect(route).toContain('dosageMethodVersion: qualifiedPlan.dosageMethodVersion')
    expect(route).toContain('swimSafetyMethodVersion: qualifiedPlan.contextualSwimSafety.methodVersion')
  })

  it('uses persisted manufacturer limits from the owned pool profile', () => {
    const waterTestRoute = readFileSync(join(root, 'src/app/api/pool/water-test/route.ts'), 'utf8')
    const profileRoute = readFileSync(join(root, 'src/app/api/pool/profile/route.ts'), 'utf8')
    expect(waterTestRoute).toContain('profile?.manufacturerSaltMin')
    expect(waterTestRoute).toContain('profile?.manufacturerSaltMax')
    expect(waterTestRoute).toContain('profile?.manufacturerChlorineMax')
    expect(profileRoute).toContain('validateManufacturerLimits')
    expect(profileRoute).toContain("code: 'INCOMPLETE_SALT_RANGE'")
    expect(profileRoute).toContain("code: 'INVALID_SALT_RANGE'")
  })
})
