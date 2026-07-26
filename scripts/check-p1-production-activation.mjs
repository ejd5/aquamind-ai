import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'

const root = process.cwd()
const args = new Set(process.argv.slice(2))
const modeArg = process.argv.find((value) => value.startsWith('--mode='))
const outputArg = process.argv.find((value) => value.startsWith('--output='))
const mode = modeArg?.split('=')[1] ?? 'repository'
const output = resolve(root, outputArg?.slice('--output='.length) ?? 'artifacts/p1-production-activation.json')
const strict = args.has('--strict')

const REQUIRED_ENV = {
  database: ['DATABASE_PROVIDER', 'DATABASE_URL'],
  authentication: ['NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'NEXT_PUBLIC_SITE_URL'],
  billing: [
    'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_OASIS_MONTHLY', 'STRIPE_PRICE_OASIS_QUARTERLY', 'STRIPE_PRICE_OASIS_SEASONAL', 'STRIPE_PRICE_OASIS_YEARLY',
    'STRIPE_PRICE_WELLNESS_MONTHLY', 'STRIPE_PRICE_WELLNESS_QUARTERLY', 'STRIPE_PRICE_WELLNESS_SEASONAL', 'STRIPE_PRICE_WELLNESS_YEARLY',
    'STRIPE_PRICE_SPA365_MONTHLY', 'STRIPE_PRICE_SPA365_QUARTERLY', 'STRIPE_PRICE_SPA365_SEASONAL', 'STRIPE_PRICE_SPA365_YEARLY',
    'NEXT_PUBLIC_REVENUECAT_IOS_KEY', 'NEXT_PUBLIC_REVENUECAT_ANDROID_KEY', 'REVENUECAT_API_KEY', 'REVENUECAT_WEBHOOK_SECRET',
  ],
  maps: ['GOOGLE_MAPS_SERVER_API_KEY'],
  communications: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'],
  mobile: ['NEXT_PUBLIC_API_BASE_URL'],
  legal: [
    'NEXT_PUBLIC_LEGAL_PUBLISHER_NAME', 'NEXT_PUBLIC_LEGAL_FORM', 'NEXT_PUBLIC_LEGAL_ADDRESS',
    'NEXT_PUBLIC_LEGAL_SIREN', 'NEXT_PUBLIC_LEGAL_REGISTER', 'NEXT_PUBLIC_LEGAL_VAT',
    'NEXT_PUBLIC_LEGAL_EMAIL', 'NEXT_PUBLIC_LEGAL_PUBLICATION_DIRECTOR',
    'NEXT_PUBLIC_LEGAL_HOST_NAME', 'NEXT_PUBLIC_LEGAL_HOST_ADDRESS', 'NEXT_PUBLIC_LEGAL_HOST_CONTACT',
    'NEXT_PUBLIC_LEGAL_MEDIATOR_NAME', 'NEXT_PUBLIC_LEGAL_MEDIATOR_URL',
  ],
  operations: ['ADMIN_EMAILS', 'BILLING_RETRY_CRON_SECRET'],
}

const OPTIONAL_ENV = [
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'SENTRY_DSN', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY',
  'POSTHOG_KEY', 'NEXT_PUBLIC_POSTHOG_KEY', 'VERCEL_DEPLOY_HOOK_URL',
]

function placeholder(value) {
  const text = String(value ?? '').trim().toLowerCase()
  return !text || text.includes('xxxx') || text.includes('change-me') || text.includes('placeholder') || text === 'false'
}

function validProductionValue(name, value) {
  const text = String(value ?? '').trim()
  if (placeholder(text)) return false
  if (name === 'DATABASE_PROVIDER') return text === 'postgresql'
  if (name === 'DATABASE_URL') return /^(postgresql|postgres):\/\//.test(text)
  if (name === 'NEXTAUTH_SECRET' || name === 'BILLING_RETRY_CRON_SECRET') return text.length >= 32
  if (['NEXTAUTH_URL', 'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_API_BASE_URL'].includes(name)) return /^https:\/\//.test(text)
  if (name === 'STRIPE_SECRET_KEY') return text.startsWith('sk_live_')
  if (name.startsWith('STRIPE_PRICE_')) return text.startsWith('price_')
  if (name === 'NEXT_PUBLIC_REVENUECAT_IOS_KEY') return text.startsWith('appl_')
  if (name === 'NEXT_PUBLIC_REVENUECAT_ANDROID_KEY') return text.startsWith('goog_')
  return text.length > 0
}

function repositoryReport() {
  const envExample = readFileSync(resolve(root, '.env.example'), 'utf8')
  const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  const requiredFiles = [
    'prisma/postgresql/schema.prisma',
    'scripts/check-p1-functional-readiness.mjs',
    'docs/release/P1_FUNCTIONAL_READINESS.md',
    'docs/release/P1_PRO_GEOLOCATION_MAPS.md',
    'docs/release/P1_COMMERCIAL_PRO_FOUNDATION.md',
    'src/mobile-app/layout.tsx',
  ]
  const checks = [
    ...requiredFiles.map((path) => ({ id: `file:${path}`, ok: existsSync(resolve(root, path)) })),
    { id: 'script:db:pg:generate', ok: Boolean(packageJson.scripts?.['db:pg:generate']) },
    { id: 'script:db:pg:deploy', ok: Boolean(packageJson.scripts?.['db:pg:deploy']) },
    { id: 'script:test:postgresql', ok: Boolean(packageJson.scripts?.['test:postgresql']) },
    ...Object.values(REQUIRED_ENV).flat().map((name) => ({ id: `env-doc:${name}`, ok: envExample.includes(`${name}=`) })),
  ]
  return {
    version: 'p1-production-activation-v1',
    mode,
    generatedAt: new Date().toISOString(),
    status: checks.every((check) => check.ok) ? 'pass' : 'fail',
    checks,
    missing: checks.filter((check) => !check.ok).map((check) => check.id),
    productionSecretsInspected: false,
  }
}

function productionReport() {
  const groups = Object.entries(REQUIRED_ENV).map(([group, names]) => {
    const checks = names.map((name) => ({ name, ok: validProductionValue(name, process.env[name]) }))
    return { group, status: checks.every((check) => check.ok) ? 'ready' : 'blocked', checks }
  })
  const optional = OPTIONAL_ENV.map((name) => ({ name, configured: !placeholder(process.env[name]) }))
  const blockedGroups = groups.filter((group) => group.status === 'blocked').map((group) => group.group)
  return {
    version: 'p1-production-activation-v1',
    mode,
    generatedAt: new Date().toISOString(),
    status: blockedGroups.length === 0 ? 'pass' : 'blocked',
    groups,
    blockedGroups,
    optional,
    externalActions: [
      'Verify a restorable PostgreSQL backup before migration deployment.',
      'Clear the Vercel build-rate limit and redeploy the final main SHA.',
      'Validate Stripe and RevenueCat live webhooks with real provider dashboards.',
      'Enable and restrict Google Geocoding v4 and Routes v2 keys.',
      'Validate SPF, DKIM and DMARC for the selected transactional email domain.',
      'Install Apple certificates and the Android keystore outside the repository.',
      'Complete App Store and Play Store privacy declarations and metadata.',
      'Review legal notices, privacy policy and processor register with the responsible professionals.',
    ],
    secretValuesIncluded: false,
  }
}

if (!['repository', 'production'].includes(mode)) {
  console.error(`Unsupported mode: ${mode}`)
  process.exit(2)
}

const report = mode === 'production' ? productionReport() : repositoryReport()
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ status: report.status, mode, output, blockedGroups: report.blockedGroups ?? [], missing: report.missing ?? [] }))

if (strict && report.status !== 'pass') process.exit(1)
