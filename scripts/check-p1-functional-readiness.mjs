import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const reportPath = resolve(
  root,
  process.env.P1_READINESS_REPORT ?? 'artifacts/p1-functional-readiness.json',
)

const requiredFiles = {
  repository: [
    '.env.example',
    'package.json',
    'prisma/schema.prisma',
    'prisma/postgresql/schema.prisma',
    '.github/workflows/p1-mobile-quality.yml',
    '.github/workflows/p1-scientific-quality.yml',
  ],
  mobile: [
    'capacitor.config.ts',
    'scripts/build-mobile.mjs',
    'src/mobile-app/layout.tsx',
    'src/mobile-app/auth/signin/page.tsx',
    'src/mobile-app/pro/app/today/page.tsx',
    'src/mobile-app/pro/app/report/page.tsx',
    'src/components/pro/pro-mobile-shell.tsx',
    'src/components/pro/technician-today-workspace.tsx',
    'src/lib/offline/idempotency.ts',
    'tests/p1-mobile-technician-journey.test.ts',
    'docs/release/P1_MOBILE_TECHNICIAN.md',
  ],
  scientific: [
    'src/app/api/pool/water-test/route.ts',
    'src/lib/pool/scientific-quality.ts',
    'src/lib/pool/scientific-action-plan.ts',
    'src/lib/pool/contextual-targets.ts',
    'src/lib/pool/contextual-swim-safety.ts',
    'src/lib/pool/dosage-readiness.ts',
    'src/lib/pool/measurement-provenance.ts',
    'src/lib/pool/measurement-confidence.ts',
    'src/lib/pool/water-balance.ts',
    'prisma/migrations/20260726170000_scientific_measurement_persistence/migration.sql',
    'prisma/postgresql/migrations/20260726170000_scientific_measurement_persistence/migration.sql',
    'tests/p1-scientific-quality.test.ts',
    'tests/p1-scientific-contextual-targets.test.ts',
    'tests/p1-scientific-safety-readiness.test.ts',
    'tests/p1-scientific-persistence.test.ts',
    'tests/p1-scientific-confidence-provenance.test.ts',
    'docs/release/P1_SCIENTIFIC_QUALITY.md',
    'docs/release/P1_SCIENTIFIC_CONTEXTUAL_TARGETS.md',
    'docs/release/P1_SCIENTIFIC_SAFETY_READINESS.md',
    'docs/release/P1_SCIENTIFIC_PERSISTENCE.md',
    'docs/release/P1_SCIENTIFIC_CONFIDENCE_PROVENANCE.md',
  ],
  commercial: [
    'src/lib/pro/commercial.ts',
    'src/app/api/pro/commercial/catalog/route.ts',
    'src/app/api/pro/commercial/documents/route.ts',
    'src/app/api/pro/commercial/documents/[id]/route.ts',
    'src/app/api/pro/commercial/documents/[id]/convert/route.ts',
    'src/app/api/pro/commercial/documents/[id]/remind/route.ts',
    'tests/p1-commercial-pro.test.ts',
    'docs/release/P1_COMMERCIAL_PRO_FOUNDATION.md',
  ],
  maps: [
    'src/lib/pro/google-maps.ts',
    'src/app/api/pro/maps/status/route.ts',
    'src/app/api/pro/maps/geocode/route.ts',
    'src/app/api/pro/maps/route-plan/route.ts',
    'tests/p1-pro-geolocation-maps.test.ts',
    'docs/release/P1_PRO_GEOLOCATION_MAPS.md',
  ],
}

const requiredPackageScripts = [
  'build',
  'lint',
  'typecheck',
  'test',
  'test:postgresql',
  'db:generate:all',
  'db:pg:deploy',
  'mobile:build',
  'mobile:sync',
]

const requiredEnvironmentPlaceholders = [
  'DATABASE_URL',
  'DATABASE_PROVIDER',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_API_BASE_URL',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  'GOOGLE_MAPS_SERVER_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_REVENUECAT_IOS_KEY',
  'NEXT_PUBLIC_REVENUECAT_ANDROID_KEY',
  'REVENUECAT_API_KEY',
  'REVENUECAT_WEBHOOK_SECRET',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
  'NEXT_PUBLIC_PRO_GPS_ENABLED',
  'NEXT_PUBLIC_LEGAL_PUBLISHER_NAME',
  'NEXT_PUBLIC_LEGAL_ADDRESS',
  'NEXT_PUBLIC_LEGAL_SIREN',
  'NEXT_PUBLIC_LEGAL_HOST_NAME',
]

const requiredMarkers = [
  {
    file: 'src/lib/pro/commercial.ts',
    marker: "PRO_COMMERCIAL_FORMAT_VERSION = 'pro-commercial-v1'",
    purpose: 'versioned commercial storage contract',
  },
  {
    file: 'src/lib/pro/google-maps.ts',
    marker: "GOOGLE_MAPS_INTEGRATION_VERSION = 'google-maps-server-v1'",
    purpose: 'versioned Maps server integration',
  },
  {
    file: 'src/lib/pro/google-maps.ts',
    marker: "typeof window !== 'undefined'",
    purpose: 'server-runtime Maps guard',
  },
  {
    file: 'src/lib/pool/measurement-confidence.ts',
    marker: "MEASUREMENT_CONFIDENCE_METHOD_VERSION = 'measurement-confidence-v1'",
    purpose: 'versioned confidence policy',
  },
  {
    file: 'src/lib/pool/measurement-provenance.ts',
    marker: "MEASUREMENT_PROVENANCE_METHOD_VERSION = 'measurement-provenance-v1'",
    purpose: 'versioned measurement provenance',
  },
  {
    file: 'src/app/api/pro/maps/route-plan/route.ts',
    marker: 'matrixPersisted: false',
    purpose: 'Google route matrix non-persistence',
  },
  {
    file: 'src/app/api/pro/commercial/documents/[id]/remind/route.ts',
    marker: "deliveryStatus: 'recorded'",
    purpose: 'truthful reminder delivery state',
  },
]

function readText(path) {
  return readFileSync(resolve(root, path), 'utf8')
}

function listFilesRecursive(directory) {
  const absolute = resolve(root, directory)
  if (!existsSync(absolute)) return []
  const result = []
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = join(absolute, entry.name)
    if (entry.isDirectory()) result.push(...listFilesRecursive(relative(root, child)))
    else result.push(relative(root, child).replaceAll('\\', '/'))
  }
  return result
}

const checks = []
const failures = []
const warnings = []

for (const [area, files] of Object.entries(requiredFiles)) {
  const missing = files.filter((path) => !existsSync(resolve(root, path)))
  const check = {
    id: `files:${area}`,
    area,
    status: missing.length === 0 ? 'pass' : 'fail',
    requiredCount: files.length,
    missing,
  }
  checks.push(check)
  if (missing.length > 0) failures.push(check)
}

const packageJson = JSON.parse(readText('package.json'))
const missingScripts = requiredPackageScripts.filter((name) => !packageJson.scripts?.[name])
const packageCheck = {
  id: 'package:scripts',
  area: 'repository',
  status: missingScripts.length === 0 ? 'pass' : 'fail',
  missing: missingScripts,
}
checks.push(packageCheck)
if (missingScripts.length > 0) failures.push(packageCheck)

const envExample = readText('.env.example')
const missingEnvironmentPlaceholders = requiredEnvironmentPlaceholders.filter(
  (name) => !new RegExp(`^${name}=`, 'm').test(envExample),
)
const environmentCheck = {
  id: 'environment:placeholders',
  area: 'production-configuration',
  status: missingEnvironmentPlaceholders.length === 0 ? 'pass' : 'fail',
  missing: missingEnvironmentPlaceholders,
}
checks.push(environmentCheck)
if (missingEnvironmentPlaceholders.length > 0) failures.push(environmentCheck)

for (const requirement of requiredMarkers) {
  const present = existsSync(resolve(root, requirement.file)) &&
    readText(requirement.file).includes(requirement.marker)
  const check = {
    id: `marker:${requirement.file}:${requirement.purpose}`,
    area: 'contracts',
    status: present ? 'pass' : 'fail',
    file: requirement.file,
    purpose: requirement.purpose,
  }
  checks.push(check)
  if (!present) failures.push(check)
}

const workflowFiles = listFilesRecursive('.github/workflows')
const temporaryWorkflows = workflowFiles.filter((path) =>
  /(^|\/)_(apply|temporary|temp|diagnostic)_/i.test(path),
)
const workflowCheck = {
  id: 'repository:no-temporary-workflows',
  area: 'repository',
  status: temporaryWorkflows.length === 0 ? 'pass' : 'fail',
  unexpected: temporaryWorkflows,
}
checks.push(workflowCheck)
if (temporaryWorkflows.length > 0) failures.push(workflowCheck)

const readinessWorkflow = readText('.github/workflows/p1-scientific-quality.yml')
for (const requiredTest of [
  'tests/p1-mobile-technician-journey.test.ts',
  'tests/p1-scientific-*.test.ts',
  'tests/p1-commercial-pro.test.ts',
  'tests/p1-pro-geolocation-maps.test.ts',
]) {
  const present = readinessWorkflow.includes(requiredTest)
  const check = {
    id: `workflow:${requiredTest}`,
    area: 'ci',
    status: present ? 'pass' : 'fail',
    requiredTest,
  }
  checks.push(check)
  if (!present) failures.push(check)
}

const productionBlockers = [
  {
    id: 'database-production-deploy',
    owner: 'operations',
    action: 'Configure the production PostgreSQL DATABASE_URL/DATABASE_PROVIDER and run the reviewed Prisma deployment chain.',
  },
  {
    id: 'authentication-secrets',
    owner: 'operations',
    action: 'Set strong production NEXTAUTH_SECRET, canonical HTTPS URLs and required OAuth credentials.',
  },
  {
    id: 'billing-live-configuration',
    owner: 'finance-operations',
    action: 'Replace test Stripe and RevenueCat identifiers with reviewed live products, prices, webhooks and store entitlements.',
  },
  {
    id: 'google-cloud-maps',
    owner: 'operations',
    action: 'Enable billing, Geocoding API v4 and Routes API v2; create restricted browser/server keys and set production environment variables.',
  },
  {
    id: 'commercial-delivery-provider',
    owner: 'operations',
    action: 'Connect and validate the SMTP/SMS/WhatsApp delivery provider. Current payment reminders are deliberately recorded, not sent.',
  },
  {
    id: 'mobile-signing-and-stores',
    owner: 'mobile-release',
    action: 'Configure Apple/Google signing, bundle identifiers, store products, privacy declarations and review credentials before store submission.',
  },
  {
    id: 'legal-publisher-data',
    owner: 'legal',
    action: 'Complete mandatory publisher, company, hosting, mediator and contact fields before commercial launch.',
  },
  {
    id: 'stacked-pr-merge-authorization',
    owner: 'repository-owner',
    action: 'Explicitly authorize and execute the reviewed stacked PR merge sequence. This gate never merges automatically.',
  },
]

warnings.push({
  id: 'maps-fallback',
  message: 'Without GOOGLE_MAPS_SERVER_API_KEY, route ordering remains available through Haversine estimates, but geocoding and road durations are unavailable.',
})
warnings.push({
  id: 'commercial-reminders',
  message: 'Payment reminders remain audit records until a delivery provider is configured and tested.',
})

const areas = Object.keys(requiredFiles).map((area) => {
  const areaChecks = checks.filter((check) => check.area === area || check.id === `files:${area}`)
  return {
    area,
    status: areaChecks.some((check) => check.status === 'fail') ? 'fail' : 'pass',
    checks: areaChecks.length,
  }
})

const report = {
  schemaVersion: 'p1-functional-readiness-v1',
  generatedAt: new Date().toISOString(),
  gitSha: process.env.GITHUB_SHA ?? null,
  status: failures.length === 0 ? 'pass' : 'fail',
  summary: {
    checks: checks.length,
    passed: checks.filter((check) => check.status === 'pass').length,
    failed: failures.length,
    productionConfigurationActions: productionBlockers.length,
  },
  areas,
  checks,
  warnings,
  productionBlockers,
}

mkdirSync(dirname(reportPath), { recursive: true })
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)

console.log(JSON.stringify({
  status: report.status,
  reportPath: relative(root, reportPath),
  checks: report.summary.checks,
  failed: report.summary.failed,
  productionConfigurationActions: report.summary.productionConfigurationActions,
}, null, 2))

if (failures.length > 0) {
  console.error('\nP1 functional readiness failed:')
  for (const failure of failures) console.error(`- ${failure.id}`)
  process.exit(1)
}

console.log('\nP1 functional code readiness passed. Production configuration actions remain explicit in the JSON report.')
