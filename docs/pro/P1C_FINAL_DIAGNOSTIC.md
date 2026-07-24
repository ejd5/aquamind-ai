# P1-C diagnostic

## PostgreSQL migration

```text
═══════════════════════════════════════════════════════
  AQWELIA — PostgreSQL Migration Scenario Tests
═══════════════════════════════════════════════════════
Database: postgresql://***:***@127.0.0.1:5432/aqwelia_ci

═══ Scenario A — Empty database ═══
  Created: aqwelia_test_a_6358d8e1
  Deploying all migrations...
    ✓ migrate deploy succeeds on empty database
    ✓ consentAt column exists — expected 1, got 1
    ✓ consentAt is nullable — expected "YES", got "YES"
    ✓ baseline present
    ✓ consentAt migration present
    ✓ Brain foundation migration present
    ✓ Brain index migration present
    ✓ lead with consentAt round-trips
    ✓ lead without consentAt = null — expected null, got null
  Dropped: aqwelia_test_a_6358d8e1

═══ Scenario B — Existing database upgrade ═══
  Created: aqwelia_test_b_e5227698
  Step 1: Deploying baseline only...
    ✓ baseline deploy succeeds
  Step 2: Creating pre-migration data...
  Dropped: aqwelia_test_b_e5227698

FATAL: 
Invalid `prisma.organization.create()` invocation:


The column `locationTrackingEnabled` does not exist in the current database.
PrismaClientKnownRequestError: 
Invalid `prisma.organization.create()` invocation:


The column `locationTrackingEnabled` does not exist in the current database.
    at ei.handleRequestError (/home/runner/work/aquamind-ai/aquamind-ai/generated/client-postgresql/runtime/library.js:125:7268)
    at ei.handleAndLogRequestError (/home/runner/work/aquamind-ai/aquamind-ai/generated/client-postgresql/runtime/library.js:125:6593)
    at ei.request (/home/runner/work/aquamind-ai/aquamind-ai/generated/client-postgresql/runtime/library.js:125:6300)
    at async a (/home/runner/work/aquamind-ai/aquamind-ai/generated/client-postgresql/runtime/library.js:134:9551)
    at async scenarioB (file:///home/runner/work/aquamind-ai/aquamind-ai/tests/test-consent-migration.mjs:168:19)
    at async file:///home/runner/work/aquamind-ai/aquamind-ai/tests/test-consent-migration.mjs:257:3

═══════════════════════════════════════════════════════
  Results: 10 passed, 1 failed
═══════════════════════════════════════════════════════

```

## Vitest

```text
bun test v1.3.4 (5eb2145b)

::group::tests/p1-a-pro-crm-product-truth.test.ts:
(pass) P1-A Pro CRM product truth > does not expose report downloads before report routes exist [1.00ms]
(pass) P1-A Pro CRM product truth > does not offer embedded photo capture without private object storage

::endgroup::

::group::tests/aqwelia-brain.test.ts:
(pass) AQWELIA Brain — outcome > measures meaningful outcomes without overclaiming noise
(pass) AQWELIA Brain — outcome > keeps missing data inconclusive
(pass) AQWELIA Brain — outcome > treats identical values as stable (delta=0)
(pass) AQWELIA Brain — outcome > improves at exactly +5 threshold
(pass) AQWELIA Brain — outcome > worsens at exactly -5 threshold
(pass) AQWELIA Brain — outcome > handles NaN inputs as inconclusive
(pass) AQWELIA Brain — outcome > handles Infinity inputs as inconclusive
(pass) AQWELIA Brain — outcome > validates ratings [1.00ms]
(pass) AQWELIA Brain — parseJsonArray (pure) > parses valid JSON array
(pass) AQWELIA Brain — parseJsonArray (pure) > returns empty array for null
(pass) AQWELIA Brain — parseJsonArray (pure) > returns empty array for empty string
(pass) AQWELIA Brain — parseJsonArray (pure) > returns empty array for invalid JSON
(pass) AQWELIA Brain — parseJsonArray (pure) > returns empty array for non-array JSON
(pass) AQWELIA Brain — parseJsonArray (pure) > handles nested arrays
(pass) AQWELIA Brain — parseJsonArray (pure) > handles empty array

::endgroup::

::group::tests/p0-j.test.ts:
(pass) P0-J — B2C release readiness > web catalogue exposes exactly 12 paid products > exposes exactly 12 products [1.00ms]
(pass) P0-J — B2C release readiness > web catalogue exposes exactly 12 paid products > exposes only paid plans (no Free)
(pass) P0-J — B2C release readiness > web catalogue exposes exactly 12 paid products > exposes no weekly duration
(pass) P0-J — B2C release readiness > web catalogue exposes exactly 12 paid products > exposes no zero-price product
(pass) P0-J — B2C release readiness > web catalogue exposes exactly 12 paid products > exposes the 12 expected product ids [1.00ms]
(pass) P0-J — B2C release readiness > web catalogue exposes exactly 12 paid products > round-trips getWebProductId ↔ getPlanFromWebProductId
(pass) P0-J — B2C release readiness > web catalogue exposes exactly 12 paid products > exposes correct prices for each product
(pass) P0-J — B2C release readiness > parsePricingSelectionFromParams > accepts Pool monthly
(pass) P0-J — B2C release readiness > parsePricingSelectionFromParams > accepts Spa quarterly
(pass) P0-J — B2C release readiness > parsePricingSelectionFromParams > accepts Complete halfyear
(pass) P0-J — B2C release readiness > parsePricingSelectionFromParams > accepts Complete yearly
(pass) P0-J — B2C release readiness > parsePricingSelectionFromParams > rejects Free plan
(pass) P0-J — B2C release readiness > parsePricingSelectionFromParams > rejects unknown plan
(pass) P0-J — B2C release readiness > parsePricingSelectionFromParams > rejects week duration
(pass) P0-J — B2C release readiness > parsePricingSelectionFromParams > rejects unknown duration
(pass) P0-J — B2C release readiness > parsePricingSelectionFromParams > rejects null inputs
(pass) P0-J — B2C release readiness > parsePricingSelectionFromParams > rejects undefined inputs
(pass) P0-J — B2C release readiness > parsePricingSelectionFromParams > never falls back to a paid plan on invalid input
(pass) P0-J — B2C release readiness > entitlements reject unknown plan without fallback > PAID_PLAN_IDS does not include Free
(pass) P0-J — B2C release readiness > entitlements reject unknown plan without fallback > PAID_PLAN_IDS contains exactly the 3 paid plans
(pass) P0-J — B2C release readiness > entitlements reject unknown plan without fallback > an unknown plan id is not in PAID_PLAN_IDS
(pass) P0-J — B2C release readiness > entitlements reject unknown plan without fallback > WEB_DURATIONS does not include week
(pass) P0-J — B2C release readiness > entitlements reject unknown plan without fallback > WEB_DURATIONS contains exactly the 4 web durations
(pass) P0-J — B2C release readiness > catalogue invariants > publishes the validated commercial names and prices
(pass) P0-J — B2C release readiness > catalogue invariants > offers 1, 3, 6 and 12 month billing
(pass) P0-J — B2C release readiness > catalogue invariants > maps the exact RevenueCat product catalog
(pass) P0-J — B2C release readiness > catalogue invariants > keeps six months as the core value offer [1.00ms]
(pass) P0-J — B2C release readiness > catalogue invariants > keeps the Pool plan promise aligned with its one-pool limit
(pass) P0-J — B2C release readiness > catalogue invariants > exposes landing.errorTitle in every supported locale [17.00ms]
(pass) P0-J — B2C release readiness > catalogue invariants > all 7 locale JSON files are valid [14.00ms]
(pass) P0-J — B2C release readiness > catalogue invariants > DURATION_TO_PROVIDER maps web durations correctly
(pass) P0-J — B2C release readiness > stripeWebClient.getEntitlements() with mocked api.get() > returns oasis entitlement for active Pool subscription [1.00ms]
(pass) P0-J — B2C release readiness > stripeWebClient.getEntitlements() with mocked api.get() > returns spa365 entitlement for active Spa subscription
(pass) P0-J — B2C release readiness > stripeWebClient.getEntitlements() with mocked api.get() > returns wellness entitlement for active Complete subscription
(pass) P0-J — B2C release readiness > stripeWebClient.getEntitlements() with mocked api.get() > returns no entitlement for inactive subscription
(pass) P0-J — B2C release readiness > stripeWebClient.getEntitlements() with mocked api.get() > returns no entitlement for active Free subscription (anomaly)
(pass) P0-J — B2C release readiness > stripeWebClient.getEntitlements() with mocked api.get() > returns no entitlement for unknown plan id and logs warning
(pass) P0-J — B2C release readiness > stripeWebClient.getEntitlements() with mocked api.get() > returns no entitlement when api.get() throws [1.00ms]
(pass) P0-J — B2C release readiness > stripeWebClient.getEntitlements() with mocked api.get() > correctly converts expiresAt string to Date
(pass) P0-J — B2C release readiness > stripeWebClient.getEntitlements() with mocked api.get() > returns undefined expiresAt when not provided
(pass) P0-J — B2C release readiness > stripeWebClient.getEntitlements() with mocked api.get() > never falls back to oasis for an unknown plan

::endgroup::

::group::tests/figma-screen-layers.test.ts:
(pass) AQWELIA Figma screen layers > loads all scoped visual layers after the existing global theme
(pass) AQWELIA Figma screen layers > scopes the individual dashboard cockpit to the existing app shell
(pass) AQWELIA Figma screen layers > keeps onboarding and diagnostic behavior untouched while styling their stable hooks
(pass) AQWELIA Figma screen layers > uses an explicit scope for the professional workspace
(pass) AQWELIA Figma screen layers > does not introduce pricing, billing or database rules in visual CSS

::endgroup::

::group::tests/billing-db.test.ts:
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/auth/csrf",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) P0-B — DB-level billing tests > (unnamed) [12.00ms]
116 | 
117 | Example:
118 |   await prisma.$executeRawUnsafe(\`ALTER USER prisma WITH PASSWORD '\${password}'\`)
119 | 
120 | More Information: https://pris.ly/d/execute-raw
121 | `)}var So=({clientMethod:e,activeProvider:r})=>t=>{let n="",i;if(Vn(t))n=t.sql,i={values:Wr(t.values),__prismaRawParameters__:!0};else if(Array.isArray(t)){let[o,...s]=t;n=o,i={values:Wr(s||[]),__prismaRawParameters__:!0}}else switch(r){case"sqlite":case"mysql":{n=t.sql,i={values:Wr(t.values),__prismaRawParameters__:!0};break}case"cockroachdb":case"postgresql":case"postgres":{n=t.text,i={values:Wr(t.values),__prismaRawParameters__:!0};break}case"sqlserver":{n=Vl(t),i={values:Wr(t.values),__prismaRawParameters__:!0};break}default:throw new Error(`The ${r} provider does not support ${e}`)}return i?.values?Ql(`prisma.${e}(${n}, ${i.values})`):Ql(`prisma.${e}(${n})`),{query:n,parameters:i}},Wl={requestArgsToMiddlewareArgs(e){return[e.strings,...e.values]},middlewareArgsToRequestArgs(e){let[r,...t]=e;return new ie(r,t)}},Jl={requestArgsToMiddlewareArgs(e){return[e]},middlewareArgsToRequestArgs(e){return e[0]}};function Ro(e){return function(t,n){let i,o=(s=e)=>{try{return s===void 0||s?.kind==="itx"?i??=Kl(t(s)):K

PrismaClientKnownRequestError: 
Invalid `db.subscription.deleteMany()` invocation in
/home/runner/work/aquamind-ai/aquamind-ai/tests/billing-db.test.ts:40:25

  37 }
  38 
  39 async function clearSubscriptions(userId: string) {
→ 40   await db.subscription.deleteMany(
The table `main.Subscription` does not exist in the current database.
       meta: {
  modelName: "Subscription",
  table: "main.Subscription",
},
 clientVersion: "6.19.2",
       code: "P2021"

      at handleRequestError (/home/runner/work/aquamind-ai/aquamind-ai/node_modules/@prisma/client/runtime/library.js:121:7268)
      at handleAndLogRequestError (/home/runner/work/aquamind-ai/aquamind-ai/node_modules/@prisma/client/runtime/library.js:121:6593)
      at request (/home/runner/work/aquamind-ai/aquamind-ai/node_modules/@prisma/client/runtime/library.js:121:6300)

::error file=node_modules/@prisma/client/runtime/library.js,line=121,col=7268,title=PrismaClientKnownRequestError: ::/home/runner/work/aquamind-ai/aquamind-ai/tests/billing-db.test.ts:40:25%0A%0A  37 }%0A  38 %0A  39 async function clearSubscriptions(userId: string) {%0A 40   await db.subscription.deleteMany(%0AThe table `main.Subscription` does not exist in the current database.%0A      at handleRequestError (/home/runner/work/aquamind-ai/aquamind-ai/node_modules/@prisma/client/runtime/library.js:121:7268)%0A      at handleAndLogRequestError (/home/runner/work/aquamind-ai/aquamind-ai/node_modules/@prisma/client/runtime/library.js:121:6593)%0A      at request (/home/runner/work/aquamind-ai/aquamind-ai/node_modules/@prisma/client/runtime/library.js:121:6300)
(fail) P0-B — DB-level billing tests > (unnamed) [9.00ms]

::endgroup::

::group::tests/smoke.test.ts:
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/auth/csrf",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Auth & API baseline > GET /api/auth/csrf — returns a CSRF token
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/auth/session",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Auth & API baseline > GET /api/auth/session — returns empty session when unauthenticated [1.00ms]
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/pool/profile",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Auth & API baseline > GET /api/pool/profile — returns 401 JSON when unauthenticated
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/auth/signin",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Auth & API baseline > GET /auth/signin — returns 200
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Auth & API baseline > GET / — returns 200 (landing page)
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/auth/csrf",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Real auth flow > POST /api/auth/callback/credentials with valid credentials — creates a session [1.00ms]
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/auth/csrf",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Real auth flow > POST /api/auth/callback/credentials with invalid password — rejects with error (not 500)
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/auth/csrf",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Real auth flow > Authenticated session — GET /api/auth/session returns user
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/auth/csrf",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Real auth flow > Authenticated request — GET /api/pool/profile returns 200
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/auth/csrf",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Real auth flow > Logout — signout invalidates the session [1.00ms]
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/pool/profile",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Middleware (auth + public access) > Protected API route (anonymous) — returns 401 JSON
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/auth/csrf",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Middleware (auth + public access) > Protected API route (authenticated) — returns 200
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/auth/csrf",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Middleware (auth + public access) > /api/auth/* routes — accessible without session [1.00ms]
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/stripe/webhook",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Middleware (auth + public access) > Stripe webhook — returns 400 on missing signature (not 401, not 500)
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/revenuecat/webhook",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Middleware (auth + public access) > RevenueCat webhook — accessible without session, returns 401 from webhook verification (not middleware)
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/growth/leads",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Middleware (auth + public access) > Growth CRM leads — route-level authentication required
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/pro/early-access",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Middleware (auth + public access) > Public lead capture (Pro early-access) — POST without session returns business error (not 401) [1.00ms]
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/tarifs",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Public pages accessible > GET /tarifs — returns 200
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/faq",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Public pages accessible > GET /faq — returns 200
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/pro",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Public pages accessible > GET /pro — returns 200
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/care",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Public pages accessible > GET /care — returns 200
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/growth",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Public pages accessible > GET /growth — returns 200 [1.00ms]
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/business",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Public pages accessible > GET /business — returns 200
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/academy",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) Smoke — Public pages accessible > GET /academy — returns 200

::endgroup::

::group::tests/figma-design-primitives.test.ts:
(pass) AQWELIA reusable Figma primitives > exports the shared screen building blocks
(pass) AQWELIA reusable Figma primitives > keeps all actions at least 44 px high
(pass) AQWELIA reusable Figma primitives > renders the complete image above a diffuse full-bleed layer
(pass) AQWELIA reusable Figma primitives > retains an empty alt on the decorative duplicate only

::endgroup::

::group::tests/b2c-pricing.test.ts:
(pass) AQWELIA B2C launch pricing > publishes the validated commercial names and prices
(pass) AQWELIA B2C launch pricing > offers 1, 3, 6 and 12 month billing
(pass) AQWELIA B2C launch pricing > maps the exact RevenueCat product catalog
(pass) AQWELIA B2C launch pricing > keeps six months as the core value offer
(pass) AQWELIA B2C launch pricing > keeps the Pool plan promise aligned with its one-pool server limit [1.00ms]
(pass) AQWELIA B2C launch pricing > exposes landing.errorTitle in every supported locale [13.00ms]

::endgroup::

::group::tests/growth-delete-lead.test.ts:

# Unhandled error between tests
-------------------------------
1 | import { describe, it, expect, vi, beforeEach } from 'vitest'
2 | 
3 | const dbMock = vi.hoisted(() => ({
                      ^
TypeError: vi.hoisted is not a function. (In 'vi.hoisted(() => ({
  lead: {
    findFirst: vi.fn(),
    delete: vi.fn()
  },
  leadEvent: { deleteMany: vi.fn() },
  appointment: { deleteMany: vi.fn() },
  quote: { deleteMany: vi.fn() },
  commission: { deleteMany: vi.fn() },
  agentRun: { deleteMany: vi.fn() },
  $transaction: vi.fn(async (promises) => {
    for (const p of promises)
      await p;
  })
}))', 'vi.hoisted' is undefined)
      at /home/runner/work/aquamind-ai/aquamind-ai/tests/growth-delete-lead.test.ts:3:19
      at loadAndEvaluateModule (2:1)

::error file=tests/growth-delete-lead.test.ts,line=3,col=19,title=TypeError: vi.hoisted is not a function. (In 'vi.hoisted(() => ({::    findFirst: vi.fn(),%0A    delete: vi.fn()%0A  },%0A  leadEvent: { deleteMany: vi.fn() },%0A  appointment: { deleteMany: vi.fn() },%0A  quote: { deleteMany: vi.fn() },%0A  commission: { deleteMany: vi.fn() },%0A  agentRun: { deleteMany: vi.fn() },%0A  $transaction: vi.fn(async (promises) => {%0A    for (const p of promises)%0A      await p;%0A  })%0A}))', 'vi.hoisted' is undefined)%0A      at /home/runner/work/aquamind-ai/aquamind-ai/tests/growth-delete-lead.test.ts:3:19%0A      at loadAndEvaluateModule (2:1)
-------------------------------


::group::tests/postgresql.test.mjs:
120 | 
121 | Example:
122 |   await prisma.$executeRawUnsafe(\`ALTER USER prisma WITH PASSWORD '\${password}'\`)
123 | 
124 | More Information: https://pris.ly/d/execute-raw
125 | `)}var So=({clientMethod:e,activeProvider:r})=>t=>{let n="",i;if(Vn(t))n=t.sql,i={values:Wr(t.values),__prismaRawParameters__:!0};else if(Array.isArray(t)){let[o,...s]=t;n=o,i={values:Wr(s||[]),__prismaRawParameters__:!0}}else switch(r){case"sqlite":case"mysql":{n=t.sql,i={values:Wr(t.values),__prismaRawParameters__:!0};break}case"cockroachdb":case"postgresql":case"postgres":{n=t.text,i={values:Wr(t.values),__prismaRawParameters__:!0};break}case"sqlserver":{n=Vl(t),i={values:Wr(t.values),__prismaRawParameters__:!0};break}default:throw new Error(`The ${r} provider does not support ${e}`)}return i?.values?Ql(`prisma.${e}(${n}, ${i.values})`):Ql(`prisma.${e}(${n})`),{query:n,parameters:i}},Wl={requestArgsToMiddlewareArgs(e){return[e.strings,...e.values]},middlewareArgsToRequestArgs(e){let[r,...t]=e;return new ie(r,t)}},Jl={requestArgsToMiddlewareArgs(e){return[e]},middlewareArgsToRequestArgs(e){return e[0]}};function Ro(e){return function(t,n){let i,o=(s=e)=>{try{return s===void 0||s?.kind==="itx"?i??=Kl(t(s)):K

PrismaClientKnownRequestError: 
Invalid `prisma.user.create()` invocation in
/home/runner/work/aquamind-ai/aquamind-ai/tests/postgresql.test.mjs:25:36

  22 describe('PostgreSQL schema', () => {
  23   it('supports related records, defaults, uniqueness, cascades and rollback', async () => {
  24     const suffix = Date.now().toString(36)
→ 25     const user = await prisma.user.create(
The table `public.User` does not exist in the current database.
       meta: {
  modelName: "User",
  table: "public.User",
},
 clientVersion: "6.19.2",
       code: "P2021"

      at handleRequestError (/home/runner/work/aquamind-ai/aquamind-ai/generated/client-postgresql/runtime/library.js:125:7268)
      at handleAndLogRequestError (/home/runner/work/aquamind-ai/aquamind-ai/generated/client-postgresql/runtime/library.js:125:6593)
      at request (/home/runner/work/aquamind-ai/aquamind-ai/generated/client-postgresql/runtime/library.js:125:6300)

::error file=generated/client-postgresql/runtime/library.js,line=125,col=7268,title=PrismaClientKnownRequestError: ::/home/runner/work/aquamind-ai/aquamind-ai/tests/postgresql.test.mjs:25:36%0A%0A  22 describe('PostgreSQL schema', () => {%0A  23   it('supports related records, defaults, uniqueness, cascades and rollback', async () => {%0A  24     const suffix = Date.now().toString(36)%0A 25     const user = await prisma.user.create(%0AThe table `public.User` does not exist in the current database.%0A      at handleRequestError (/home/runner/work/aquamind-ai/aquamind-ai/generated/client-postgresql/runtime/library.js:125:7268)%0A      at handleAndLogRequestError (/home/runner/work/aquamind-ai/aquamind-ai/generated/client-postgresql/runtime/library.js:125:6593)%0A      at request (/home/runner/work/aquamind-ai/aquamind-ai/generated/client-postgresql/runtime/library.js:125:6300)
(fail) PostgreSQL schema > supports related records, defaults, uniqueness, cascades and rollback [62.00ms]

::endgroup::

::group::tests/figma-visual-assets.test.ts:
(pass) AQWELIA Figma landing assets > keeps public/aqwelia-hero-bg.png available and non-empty
(pass) AQWELIA Figma landing assets > keeps public/bloc04-bg.png available and non-empty
(pass) AQWELIA Figma landing assets > keeps public/modules-bg.png available and non-empty
(pass) AQWELIA Figma landing assets > keeps public/bloc-bas.png available and non-empty

::endgroup::

::group::tests/pro-technician-intervention-scope.test.ts:
(pass) Pro technician data scopes > keeps managers inside the owner workspace
(pass) Pro technician data scopes > restricts technicians to assigned interventions, clients and pools
(pass) Pro technician data scopes > applies mandatory scoping to every intervention delivery surface
(pass) Pro technician data scopes > filters nested intervention relations and relation counts [1.00ms]
(pass) Pro technician data scopes > prevents technicians from selecting or changing another assignee

::endgroup::

::group::tests/p0-b-secure-image.test.ts:
(pass) P0-B secure image normalization > normalizes orientation, bounds dimensions and removes metadata [166.00ms]
(pass) P0-B secure image normalization > rejects unsupported formats before any AI call
(pass) P0-B secure image normalization > rejects malformed base64 payloads
(pass) P0-B secure image normalization > rejects images above the server limit [31.00ms]
(pass) P0-B secure image normalization > never exposes legacy base64 or redacted references through history [1.00ms]
(pass) P0-B secure image normalization > routes never persist or forward the original image bytes

::endgroup::

::group::tests/database-provider.test.ts:
(pass) database provider selection > keeps SQLite as the safe default
(pass) database provider selection > accepts an explicit PostgreSQL runtime
(pass) database provider selection > rejects mismatched or unsupported configuration sqlite [1.00ms]
(pass) database provider selection > rejects mismatched or unsupported configuration postgresql
(pass) database provider selection > rejects mismatched or unsupported configuration mysql
(pass) database provider selection > rejects a missing database URL

::endgroup::

::group::tests/pro-live-dispatch-contract.test.ts:
(pass) AQWELIA Pro Dispatch Live contract > keeps SQLite and PostgreSQL tracking schemas aligned
(pass) AQWELIA Pro Dispatch Live contract > requires visible work sessions and acknowledged information [1.00ms]
(pass) AQWELIA Pro Dispatch Live contract > only lets the authenticated user upload points to their active session
(pass) AQWELIA Pro Dispatch Live contract > limits exact team locations and configuration to managers
(pass) AQWELIA Pro Dispatch Live contract > keeps emergency dispatch advisory and human-approved
61 |   })
62 | 
63 |   it('does not claim hidden or permanent background tracking', () => {
64 |     expect(privacy).toContain('suivi désactivé par défaut')
65 |     expect(privacy).toContain('arrêt automatique après 14 heures')
66 |     expect(privacy).toContain('lorsque l’application est ouverte')
                         ^
error: expect(received).toContain(expected)

Expected to contain: "lorsque l’application est ouverte"
Received: "# AQWELIA Pro — Dispatch Live, GPS et protection des salariés\n\n## Finalité produit\n\nDispatch Live sert exclusivement à organiser les interventions terrain, visualiser les tournées en cours et proposer au responsable le technicien le plus pertinent pour une urgence. Une recommandation ne réaffecte jamais automatiquement une intervention : une validation humaine reste obligatoire.\n\n## Sources de position\n\n1. **Application professionnelle AQWELIA** — source recommandée. Le technicien démarre et arrête une session visible.\n2. **Boîtier GPS du véhicule professionnel** — connecteur premium futur utilisant la même API d'ingestion.\n3. Les balises Bluetooth grand public de type AirTag ne sont pas une source métier supportée.\n\n## Garde-fous intégrés\n\n- suivi désactivé par défaut au niveau de l'organisation et de chaque membre ;\n- information affichée et versionnée avant le premier démarrage ;\n- démarrage, pause et arrêt visibles pour le technicien ;\n- arrêt automatique après 14 heures ;\n- accès à la carte réservé aux rôles propriétaire, administrateur et manager ;\n- journalisation des consultations et recommandations ;\n- conservation par défaut et maximale dans cette première version : 60 jours ;\n- aucune réaffectation automatique ;\n- positions exactes exclues des logs applicatifs et des outils d'analytics ;\n- purge opportuniste des points expirés.\n\n## Configuration nécessaire avant mise en service\n\nL'entreprise utilisatrice reste responsable de son information interne et de sa base juridique. Avant d'activer la fonctionnalité en production, elle doit notamment :\n\n- documenter la finalité et les personnes habilitées ;\n- informer individuellement les salariés ;\n- consulter les représentants du personnel lorsqu'ils existent ;\n- inscrire le traitement au registre et évaluer la nécessité d'une AIPD avec le DPO ;\n- définir les horaires de suivi et interdire le suivi hors temps de travail ;\n- limiter la durée de conservation au besoin réel ;\n- formaliser la procédure d'exercice des droits et de sécurité.\n\n## Variables d'environnement cartographiques\n\n- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` : carte web et tracé routier dans le navigateur.\n- `GOOGLE_MAPS_SERVER_API_KEY` : matrice routière serveur pour les recommandations d'urgence.\n\nLes deux clés doivent être séparées et restreintes dans Google Cloud : restrictions de domaine pour la clé navigateur et restrictions d'API/adresse serveur pour la clé serveur.\n\n## Limite du premier lot\n\nLe composant de partage fourni dans ce lot transmet la position lorsque l'application est ouverte. La collecte fiable en arrière-plan, les notifications permanentes Android et les autorisations iOS seront implémentées dans le client mobile natif. Le serveur, les sessions, la rétention, les droits et la carte web sont conçus pour recevoir cette seconde étape sans migration conceptuelle.\n"

      at <anonymous> (/home/runner/work/aquamind-ai/aquamind-ai/tests/pro-live-dispatch-contract.test.ts:66:21)

::error file=tests/pro-live-dispatch-contract.test.ts,line=66,col=21,title=error: expect(received).toContain(expected)::application est ouverte"%0Atape sans migration conceptuelle.\n"%0A%0A      at <anonymous> (/home/runner/work/aquamind-ai/aquamind-ai/tests/pro-live-dispatch-contract.test.ts:66:21)
(fail) AQWELIA Pro Dispatch Live contract > does not claim hidden or permanent background tracking

::endgroup::

::group::tests/p0-a-marketing-truth.test.ts:
(pass) P0-A marketing truth > removes unsupported Growth performance claims
(pass) P0-A marketing truth > uses supervised automation copy in fr [4.00ms]
(pass) P0-A marketing truth > uses supervised automation copy in en [2.00ms]
(pass) P0-A marketing truth > uses supervised automation copy in es [2.00ms]
(pass) P0-A marketing truth > uses supervised automation copy in de [2.00ms]
(pass) P0-A marketing truth > uses supervised automation copy in it [2.00ms]
(pass) P0-A marketing truth > uses supervised automation copy in pt [2.00ms]
(pass) P0-A marketing truth > uses supervised automation copy in nl [1.00ms]
(pass) P0-A marketing truth > does not advertise unsupported Pro integrations in fr [2.00ms]
(pass) P0-A marketing truth > does not advertise unsupported Pro integrations in en [2.00ms]
(pass) P0-A marketing truth > does not advertise unsupported Pro integrations in es [2.00ms]
(pass) P0-A marketing truth > does not advertise unsupported Pro integrations in de [1.00ms]
(pass) P0-A marketing truth > does not advertise unsupported Pro integrations in it [2.00ms]
(pass) P0-A marketing truth > does not advertise unsupported Pro integrations in pt [2.00ms]
(pass) P0-A marketing truth > does not advertise unsupported Pro integrations in nl [2.00ms]
(pass) P0-A marketing truth > enforces the advertised Discovery limits

::endgroup::

::group::tests/p0-c-dosing-single-source.test.ts:
(pass) P0-C diagnostic dosing single source > uses the central engine for capped pH corrections
(pass) P0-C diagnostic dosing single source > derives diagnostic protocol quantities from the central engine [1.00ms]
(pass) P0-C diagnostic dosing single source > formats the exact central-engine unit
(pass) P0-C diagnostic dosing single source > keeps all dosage coefficients out of the UI component

::endgroup::

::group::tests/billing.test.ts:
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/auth/csrf",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) P0-B — Billing security > POST /api/subscription returns 403 (direct activation blocked) [1.00ms]
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/auth/csrf",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) P0-B — Billing security > GET /api/subscription returns plan info for authenticated user
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/stripe/webhook",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) P0-B — Billing security > Stripe webhook — invalid signature returns 400
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/stripe/webhook",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) P0-B — Billing security > Stripe webhook — missing signature returns 400
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/revenuecat/webhook",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) P0-B — Billing security > RevenueCat webhook — invalid Bearer returns 401 [1.00ms]
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/revenuecat/webhook",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) P0-B — Billing security > RevenueCat webhook — no Authorization header returns 401
error: Unable to connect. Is the computer able to access the url?
  path: "http://localhost:3000/api/revenuecat/webhook",
 errno: 0,
  code: "ConnectionRefused"


::error title=error: Unable to connect. Is the computer able to access the url?::
(fail) P0-B — Billing security > RevenueCat webhook — valid Bearer with non-activation event type is accepted

::endgroup::

::group::tests/growth-access.test.ts:
(pass) getGrowthOrganization — strict type: growth isolation > returns Growth org when user owns it [1.00ms]
(pass) getGrowthOrganization — strict type: growth isolation > returns null when user owns only Pro org
(pass) getGrowthOrganization — strict type: growth isolation > returns null when user owns only Business org
(pass) getGrowthOrganization — strict type: growth isolation > returns Growth org when user also owns Pro org
(pass) getGrowthOrganization — strict type: growth isolation > returns Growth org via active membership
(pass) getGrowthOrganization — strict type: growth isolation > returns null for invited membership (status != active)
(pass) getGrowthOrganization — strict type: growth isolation > returns null for suspended membership
(pass) getGrowthOrganization — strict type: growth isolation > returns null when user has no Growth organization
(pass) getGrowthOrganization — strict type: growth isolation > prefers owned org over membership
(pass) getGrowthOrganization — strict type: growth isolation > returns custom select fields [1.00ms]
(pass) getGrowthOrganization — strict type: growth isolation > returns null for user with no organizations at all
(pass) getGrowthOrganization — strict type: growth isolation > returns Growth org when member of multiple orgs of different types

::endgroup::

::group::tests/auth-entry-target.test.ts:
(pass) workspaceEntryTarget > routes a Pro technician to the operational intervention list
(pass) workspaceEntryTarget > routes Pro owners and managers to the Pro dashboard
(pass) workspaceEntryTarget > routes Growth members to Growth OS
(pass) workspaceEntryTarget > keeps consumer users on the consumer entry point

::endgroup::

::group::tests/aqwelia-brain-contract.test.ts:
(pass) AQWELIA Brain contracts > keeps model RecommendationExecution in both Prisma schemas [1.00ms]
(pass) AQWELIA Brain contracts > keeps model RecommendationOutcome in both Prisma schemas
(pass) AQWELIA Brain contracts > keeps model BrainFeedback in both Prisma schemas
(pass) AQWELIA Brain contracts > keeps model KnowledgeArticle in both Prisma schemas
(pass) AQWELIA Brain contracts > keeps model KnowledgeRevision in both Prisma schemas
(pass) AQWELIA Brain contracts > keeps model BrainEventOutbox in both Prisma schemas
(pass) AQWELIA Brain contracts > preserves the Growth consent timestamp during the Brain merge
(pass) AQWELIA Brain contracts > creates index RecommendationExecution_userId_idx for SQLite and PostgreSQL
(pass) AQWELIA Brain contracts > creates index RecommendationExecution_poolId_createdAt_idx for SQLite and PostgreSQL
(pass) AQWELIA Brain contracts > creates index RecommendationExecution_status_idx for SQLite and PostgreSQL
(pass) AQWELIA Brain contracts > creates index RecommendationOutcome_userId_idx for SQLite and PostgreSQL
(pass) AQWELIA Brain contracts > creates index RecommendationOutcome_poolId_createdAt_idx for SQLite and PostgreSQL
(pass) AQWELIA Brain contracts > creates index BrainFeedback_contextType_contextId_idx for SQLite and PostgreSQL
(pass) AQWELIA Brain contracts > creates index BrainFeedback_status_createdAt_idx for SQLite and PostgreSQL
(pass) AQWELIA Brain contracts > creates index KnowledgeArticle_status_audience_idx for SQLite and PostgreSQL
(pass) AQWELIA Brain contracts > creates index KnowledgeRevision_articleId_locale_idx for SQLite and PostgreSQL
(pass) AQWELIA Brain contracts > creates index BrainEventOutbox_aggregateType_aggregateId_idx for SQLite and PostgreSQL
(pass) AQWELIA Brain contracts > creates index BrainEventOutbox_type_createdAt_idx for SQLite and PostgreSQL
(pass) AQWELIA Brain contracts > rejects invalid follow-up tests and preserves a zero water index
(pass) AQWELIA Brain contracts > waits for the scheduled retest and atomically claims the outcome
(pass) AQWELIA Brain contracts > cancels pending outcome data when all completed actions are reversed
(pass) AQWELIA Brain contracts > propagates the active pool through every diagnostic entry point
(pass) AQWELIA Brain contracts > resolves the Vercel Preview URL dynamically for every pull request
(pass) AQWELIA Brain contracts > does not ship temporary synchronization files or an npm lockfile

::endgroup::

::group::tests/figma-design-foundations.test.ts:
(pass) AQWELIA Figma visual foundations > keeps the approved brand palette stable
(pass) AQWELIA Figma visual foundations > uses the 4 px grid and the approved radius scale
(pass) AQWELIA Figma visual foundations > uses Playfair Display and Geist from the root layout
(pass) AQWELIA Figma visual foundations > preserves the no-destructive-crop media treatment [1.00ms]
(pass) AQWELIA Figma visual foundations > keeps accessibility safeguards in the shared layer

::endgroup::

::group::tests/pro-planning-dispatch-v2.test.ts:
(pass) AQWELIA Pro dispatch planning V2 > provides a full 24-hour vertically scrollable weekly agenda [1.00ms]
(pass) AQWELIA Pro dispatch planning V2 > provides a resource-week view with sticky technician names
(pass) AQWELIA Pro dispatch planning V2 > supports operational filters and persistent display preferences
(pass) AQWELIA Pro dispatch planning V2 > keeps the new planning controls available in every supported locale

::endgroup::

::group::tests/dosing-safety.test.ts:
(pass) Deterministic dosing safety > rejects an invalid pool volume (%s)
(pass) Deterministic dosing safety > rejects an invalid pool volume (%s)
(pass) Deterministic dosing safety > rejects an invalid pool volume (%s)
(pass) Deterministic dosing safety > rejects an invalid pool volume (%s)
(pass) Deterministic dosing safety > rejects non-finite measurements
(pass) Deterministic dosing safety > limits a pH correction to 0.3 per treatment
(pass) Deterministic dosing safety > converts US gallons before calculating a dose
(pass) Deterministic dosing safety > never calculates stabilizer above the 50 mg/L safety ceiling
(pass) Deterministic dosing safety > orders TAC before pH and chlorine treatment [1.00ms]
(pass) Bathing and escalation safety > forbids bathing for critical pH or excessive combined chlorine
(pass) Bathing and escalation safety > keeps a critical pH forbidden when chlorine is not measured
(pass) Bathing and escalation safety > recommends a professional for extreme readings

::endgroup::

::group::tests/p0-k-pricing-copy-consistency.test.ts:
(pass) P0-K: Pricing copy consistency across all locales > Commercial plan names never use Premium > fr: has no visible Premium plan or guide label [4.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Commercial plan names never use Premium > en: has no visible Premium plan or guide label [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Commercial plan names never use Premium > es: has no visible Premium plan or guide label [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Commercial plan names never use Premium > de: has no visible Premium plan or guide label [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Commercial plan names never use Premium > it: has no visible Premium plan or guide label [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Commercial plan names never use Premium > pt: has no visible Premium plan or guide label [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Commercial plan names never use Premium > nl: has no visible Premium plan or guide label [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No commercial keys in actionPlan > fr: actionPlan has no commercial/navigation keys [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No commercial keys in actionPlan > en: actionPlan has no commercial/navigation keys [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No commercial keys in actionPlan > es: actionPlan has no commercial/navigation keys [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No commercial keys in actionPlan > de: actionPlan has no commercial/navigation keys [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No commercial keys in actionPlan > it: actionPlan has no commercial/navigation keys [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No commercial keys in actionPlan > pt: actionPlan has no commercial/navigation keys [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No commercial keys in actionPlan > nl: actionPlan has no commercial/navigation keys [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Team/Fleet/Enterprise in B2C namespaces (recursive) > fr: B2C namespaces have no Team/Fleet/Enterprise (recursive, except narrative) [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Team/Fleet/Enterprise in B2C namespaces (recursive) > en: B2C namespaces have no Team/Fleet/Enterprise (recursive, except narrative) [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Team/Fleet/Enterprise in B2C namespaces (recursive) > es: B2C namespaces have no Team/Fleet/Enterprise (recursive, except narrative) [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Team/Fleet/Enterprise in B2C namespaces (recursive) > de: B2C namespaces have no Team/Fleet/Enterprise (recursive, except narrative) [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Team/Fleet/Enterprise in B2C namespaces (recursive) > it: B2C namespaces have no Team/Fleet/Enterprise (recursive, except narrative) [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Team/Fleet/Enterprise in B2C namespaces (recursive) > pt: B2C namespaces have no Team/Fleet/Enterprise (recursive, except narrative) [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Team/Fleet/Enterprise in B2C namespaces (recursive) > nl: B2C namespaces have no Team/Fleet/Enterprise (recursive, except narrative) [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Emergency Pass product remains visible > fr: no former Emergency Pass wording remains in commercial copy [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Emergency Pass product remains visible > en: no former Emergency Pass wording remains in commercial copy [5.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Emergency Pass product remains visible > es: no former Emergency Pass wording remains in commercial copy [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Emergency Pass product remains visible > de: no former Emergency Pass wording remains in commercial copy [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Emergency Pass product remains visible > it: no former Emergency Pass wording remains in commercial copy [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Emergency Pass product remains visible > pt: no former Emergency Pass wording remains in commercial copy [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Emergency Pass product remains visible > nl: no former Emergency Pass wording remains in commercial copy [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Plan names use canonical commercial names > fr: plans.premium.name is "Pool" [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Plan names use canonical commercial names > en: plans.premium.name is "Pool" [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Plan names use canonical commercial names > es: plans.premium.name is "Pool" [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Plan names use canonical commercial names > de: plans.premium.name is "Pool" [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Plan names use canonical commercial names > it: plans.premium.name is "Pool" [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Plan names use canonical commercial names > pt: plans.premium.name is "Pool" [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Plan names use canonical commercial names > nl: plans.premium.name is "Pool" [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No trial-related content in plans > fr: plans trial keys are empty or absent [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No trial-related content in plans > en: plans trial keys are empty or absent [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No trial-related content in plans > es: plans trial keys are empty or absent [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No trial-related content in plans > de: plans trial keys are empty or absent [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No trial-related content in plans > it: plans trial keys are empty or absent [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No trial-related content in plans > pt: plans trial keys are empty or absent [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No trial-related content in plans > nl: plans trial keys are empty or absent [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > fr: article6Body1 announces four offers [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > fr: article6Item1 contains Free [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > fr: article6Item2 contains Pool [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > fr: article6Item3 contains Spa [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > fr: article6Item4 contains Complete with 2 pools + 1 spa [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > fr: no B2C article6 item contains Expert [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > en: article6Body1 announces four offers [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > en: article6Item1 contains Free [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > en: article6Item2 contains Pool [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > en: article6Item3 contains Spa [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > en: article6Item4 contains Complete with 2 pools + 1 spa [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > en: no B2C article6 item contains Expert [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > es: article6Body1 announces four offers [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > es: article6Item1 contains Free [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > es: article6Item2 contains Pool [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > es: article6Item3 contains Spa [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > es: article6Item4 contains Complete with 2 pools + 1 spa [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > es: no B2C article6 item contains Expert [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > de: article6Body1 announces four offers [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > de: article6Item1 contains Free [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > de: article6Item2 contains Pool [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > de: article6Item3 contains Spa [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > de: article6Item4 contains Complete with 2 pools + 1 spa [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > de: no B2C article6 item contains Expert [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > it: article6Body1 announces four offers [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > it: article6Item1 contains Free [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > it: article6Item2 contains Pool [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > it: article6Item3 contains Spa [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > it: article6Item4 contains Complete with 2 pools + 1 spa [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > it: no B2C article6 item contains Expert [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > pt: article6Body1 announces four offers [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > pt: article6Item1 contains Free [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > pt: article6Item2 contains Pool [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > pt: article6Item3 contains Spa [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > pt: article6Item4 contains Complete with 2 pools + 1 spa [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > pt: no B2C article6 item contains Expert [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > nl: article6Body1 announces four offers [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > nl: article6Item1 contains Free [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > nl: article6Item2 contains Pool [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > nl: article6Item3 contains Spa [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > nl: article6Item4 contains Complete with 2 pools + 1 spa [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGU article 6 has exactly 4 B2C offers > nl: no B2C article6 item contains Expert [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Tarifs comparator title says 4 plans > fr: tarifs.cmpTitle mentions 4 plans [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Tarifs comparator title says 4 plans > en: tarifs.cmpTitle mentions 4 plans [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Tarifs comparator title says 4 plans > es: tarifs.cmpTitle mentions 4 plans [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Tarifs comparator title says 4 plans > de: tarifs.cmpTitle mentions 4 plans [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Tarifs comparator title says 4 plans > it: tarifs.cmpTitle mentions 4 plans [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Tarifs comparator title says 4 plans > pt: tarifs.cmpTitle mentions 4 plans [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Tarifs comparator title says 4 plans > nl: tarifs.cmpTitle mentions 4 plans [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > savings section uses complete ROI sentence > fr: landing.savingsRoiSentence exists and references Pool [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > savings section uses complete ROI sentence > fr: no fragmented ROI keys remain [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > savings section uses complete ROI sentence > en: landing.savingsRoiSentence exists and references Pool [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > savings section uses complete ROI sentence > en: no fragmented ROI keys remain [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > savings section uses complete ROI sentence > es: landing.savingsRoiSentence exists and references Pool [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > savings section uses complete ROI sentence > es: no fragmented ROI keys remain [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > savings section uses complete ROI sentence > de: landing.savingsRoiSentence exists and references Pool [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > savings section uses complete ROI sentence > de: no fragmented ROI keys remain [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > savings section uses complete ROI sentence > it: landing.savingsRoiSentence exists and references Pool [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > savings section uses complete ROI sentence > it: no fragmented ROI keys remain [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > savings section uses complete ROI sentence > pt: landing.savingsRoiSentence exists and references Pool [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > savings section uses complete ROI sentence > pt: no fragmented ROI keys remain [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > savings section uses complete ROI sentence > nl: landing.savingsRoiSentence exists and references Pool [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > savings section uses complete ROI sentence > nl: no fragmented ROI keys remain [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No artificial em dashes in commercial namespaces (recursive) > fr: no em-dashes in commercial namespace values (recursive, except narrative) [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No artificial em dashes in commercial namespaces (recursive) > en: no em-dashes in commercial namespace values (recursive, except narrative) [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No artificial em dashes in commercial namespaces (recursive) > es: no em-dashes in commercial namespace values (recursive, except narrative) [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No artificial em dashes in commercial namespaces (recursive) > de: no em-dashes in commercial namespace values (recursive, except narrative) [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No artificial em dashes in commercial namespaces (recursive) > it: no em-dashes in commercial namespace values (recursive, except narrative) [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No artificial em dashes in commercial namespaces (recursive) > pt: no em-dashes in commercial namespace values (recursive, except narrative) [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No artificial em dashes in commercial namespaces (recursive) > nl: no em-dashes in commercial namespace values (recursive, except narrative) [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No broken sentences from em-dash replacement (recursive) > fr: no ". [lowercase]" broken sentences (recursive) [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No broken sentences from em-dash replacement (recursive) > en: no ". [lowercase]" broken sentences (recursive) [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No broken sentences from em-dash replacement (recursive) > es: no ". [lowercase]" broken sentences (recursive) [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No broken sentences from em-dash replacement (recursive) > de: no ". [lowercase]" broken sentences (recursive) [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No broken sentences from em-dash replacement (recursive) > it: no ". [lowercase]" broken sentences (recursive) [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No broken sentences from em-dash replacement (recursive) > pt: no ". [lowercase]" broken sentences (recursive) [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No broken sentences from em-dash replacement (recursive) > nl: no ". [lowercase]" broken sentences (recursive) [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > settings.planPremium uses commercial names > fr: settings.planPremium does not contain "Premium" [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > settings.planPremium uses commercial names > en: settings.planPremium does not contain "Premium" [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > settings.planPremium uses commercial names > es: settings.planPremium does not contain "Premium" [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > settings.planPremium uses commercial names > de: settings.planPremium does not contain "Premium" [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > settings.planPremium uses commercial names > it: settings.planPremium does not contain "Premium" [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > settings.planPremium uses commercial names > pt: settings.planPremium does not contain "Premium" [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > settings.planPremium uses commercial names > nl: settings.planPremium does not contain "Premium" [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No "3 plans/subscriptions" for 4 offers > fr: no "3 plans" wording in legal or b2c [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No "3 plans/subscriptions" for 4 offers > en: no "3 plans" wording in legal or b2c [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No "3 plans/subscriptions" for 4 offers > es: no "3 plans" wording in legal or b2c [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No "3 plans/subscriptions" for 4 offers > de: no "3 plans" wording in legal or b2c [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No "3 plans/subscriptions" for 4 offers > it: no "3 plans" wording in legal or b2c [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No "3 plans/subscriptions" for 4 offers > pt: no "3 plans" wording in legal or b2c [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No "3 plans/subscriptions" for 4 offers > nl: no "3 plans" wording in legal or b2c [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Expert plan in B2C contexts > fr: no plans.expert or settings.planExpert keys [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Expert plan in B2C contexts > en: no plans.expert or settings.planExpert keys [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Expert plan in B2C contexts > es: no plans.expert or settings.planExpert keys [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Expert plan in B2C contexts > de: no plans.expert or settings.planExpert keys [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Expert plan in B2C contexts > it: no plans.expert or settings.planExpert keys [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Expert plan in B2C contexts > pt: no plans.expert or settings.planExpert keys [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No Expert plan in B2C contexts > nl: no plans.expert or settings.planExpert keys [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No "Comparez les 3 plans" > fr: tarifs.cmpTitle does not say "3 plans" [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No "Comparez les 3 plans" > en: tarifs.cmpTitle does not say "3 plans" [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No "Comparez les 3 plans" > es: tarifs.cmpTitle does not say "3 plans" [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No "Comparez les 3 plans" > de: tarifs.cmpTitle does not say "3 plans" [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No "Comparez les 3 plans" > it: tarifs.cmpTitle does not say "3 plans" [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No "Comparez les 3 plans" > pt: tarifs.cmpTitle does not say "3 plans" [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > No "Comparez les 3 plans" > nl: tarifs.cmpTitle does not say "3 plans" [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > nav.premium references Pool, SPA or Complete > fr: nav.premium does not contain standalone "Premium" [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > nav.premium references Pool, SPA or Complete > en: nav.premium does not contain standalone "Premium" [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > nav.premium references Pool, SPA or Complete > es: nav.premium does not contain standalone "Premium" [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > nav.premium references Pool, SPA or Complete > de: nav.premium does not contain standalone "Premium" [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > nav.premium references Pool, SPA or Complete > it: nav.premium does not contain standalone "Premium" [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > nav.premium references Pool, SPA or Complete > pt: nav.premium does not contain standalone "Premium" [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > nav.premium references Pool, SPA or Complete > nl: nav.premium does not contain standalone "Premium" [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Only 1, 3, 6 and 12 month paid durations are commercialized > fr: no visible weekly, seven-day or annual-not-live offer [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Only 1, 3, 6 and 12 month paid durations are commercialized > en: no visible weekly, seven-day or annual-not-live offer [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Only 1, 3, 6 and 12 month paid durations are commercialized > es: no visible weekly, seven-day or annual-not-live offer [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Only 1, 3, 6 and 12 month paid durations are commercialized > de: no visible weekly, seven-day or annual-not-live offer [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Only 1, 3, 6 and 12 month paid durations are commercialized > it: no visible weekly, seven-day or annual-not-live offer [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Only 1, 3, 6 and 12 month paid durations are commercialized > pt: no visible weekly, seven-day or annual-not-live offer [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Only 1, 3, 6 and 12 month paid durations are commercialized > nl: no visible weekly, seven-day or annual-not-live offer [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > onboarding.spaPremiumNote uses "SPA" not "Premium" > fr: onboarding.spaPremiumNote mentions SPA [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > onboarding.spaPremiumNote uses "SPA" not "Premium" > en: onboarding.spaPremiumNote mentions SPA [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > onboarding.spaPremiumNote uses "SPA" not "Premium" > es: onboarding.spaPremiumNote mentions SPA [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > onboarding.spaPremiumNote uses "SPA" not "Premium" > de: onboarding.spaPremiumNote mentions SPA [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > onboarding.spaPremiumNote uses "SPA" not "Premium" > it: onboarding.spaPremiumNote mentions SPA [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > onboarding.spaPremiumNote uses "SPA" not "Premium" > pt: onboarding.spaPremiumNote mentions SPA [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > onboarding.spaPremiumNote uses "SPA" not "Premium" > nl: onboarding.spaPremiumNote mentions SPA [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Legal CGV article3 disclaims trial > fr: legal.cgv.article3Title exists and mentions no trial [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Legal CGV article3 disclaims trial > en: legal.cgv.article3Title exists and mentions no trial [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Legal CGV article3 disclaims trial > es: legal.cgv.article3Title exists and mentions no trial [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Legal CGV article3 disclaims trial > de: legal.cgv.article3Title exists and mentions no trial [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Legal CGV article3 disclaims trial > it: legal.cgv.article3Title exists and mentions no trial [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Legal CGV article3 disclaims trial > pt: legal.cgv.article3Title exists and mentions no trial [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Legal CGV article3 disclaims trial > nl: legal.cgv.article3Title exists and mentions no trial [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Landing has no obsolete empty mod11 keys > fr: landing.mod11B1 and landing.mod11B2 are absent [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Landing has no obsolete empty mod11 keys > en: landing.mod11B1 and landing.mod11B2 are absent [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Landing has no obsolete empty mod11 keys > es: landing.mod11B1 and landing.mod11B2 are absent [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Landing has no obsolete empty mod11 keys > de: landing.mod11B1 and landing.mod11B2 are absent [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Landing has no obsolete empty mod11 keys > it: landing.mod11B1 and landing.mod11B2 are absent [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Landing has no obsolete empty mod11 keys > pt: landing.mod11B1 and landing.mod11B2 are absent [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Landing has no obsolete empty mod11 keys > nl: landing.mod11B1 and landing.mod11B2 are absent [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Complete plan = 2 pools + 1 spa (commercial decision) > wellness feature text mentions 2 pools [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Complete plan = 2 pools + 1 spa (commercial decision) > CGU article6Item4 mentions 2 pools + 1 spa across all locales [11.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Pool plan is limited to one pool in every locale > fr: Pool copy never promises 2 or 3 pools [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Pool plan is limited to one pool in every locale > fr: Pool is explicitly sold for exactly one pool [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Pool plan is limited to one pool in every locale > en: Pool copy never promises 2 or 3 pools [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Pool plan is limited to one pool in every locale > en: Pool is explicitly sold for exactly one pool [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Pool plan is limited to one pool in every locale > es: Pool copy never promises 2 or 3 pools [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Pool plan is limited to one pool in every locale > es: Pool is explicitly sold for exactly one pool [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Pool plan is limited to one pool in every locale > de: Pool copy never promises 2 or 3 pools [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Pool plan is limited to one pool in every locale > de: Pool is explicitly sold for exactly one pool [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Pool plan is limited to one pool in every locale > it: Pool copy never promises 2 or 3 pools [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Pool plan is limited to one pool in every locale > it: Pool is explicitly sold for exactly one pool [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Pool plan is limited to one pool in every locale > pt: Pool copy never promises 2 or 3 pools [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Pool plan is limited to one pool in every locale > pt: Pool is explicitly sold for exactly one pool [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Pool plan is limited to one pool in every locale > nl: Pool copy never promises 2 or 3 pools [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Pool plan is limited to one pool in every locale > nl: Pool is explicitly sold for exactly one pool [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGV prices match the canonical commercial matrix > fr: CGV lists every canonical price [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGV prices match the canonical commercial matrix > en: CGV lists every canonical price [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGV prices match the canonical commercial matrix > es: CGV lists every canonical price [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGV prices match the canonical commercial matrix > de: CGV lists every canonical price [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGV prices match the canonical commercial matrix > it: CGV lists every canonical price [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGV prices match the canonical commercial matrix > pt: CGV lists every canonical price [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > CGV prices match the canonical commercial matrix > nl: CGV lists every canonical price [1.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Commercial copy has no invalid currency or empty keys > fr: no double euro and no unexpected empty commercial strings [3.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Commercial copy has no invalid currency or empty keys > en: no double euro and no unexpected empty commercial strings [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Commercial copy has no invalid currency or empty keys > es: no double euro and no unexpected empty commercial strings [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Commercial copy has no invalid currency or empty keys > de: no double euro and no unexpected empty commercial strings [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Commercial copy has no invalid currency or empty keys > it: no double euro and no unexpected empty commercial strings [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Commercial copy has no invalid currency or empty keys > pt: no double euro and no unexpected empty commercial strings [2.00ms]
(pass) P0-K: Pricing copy consistency across all locales > Commercial copy has no invalid currency or empty keys > nl: no double euro and no unexpected empty commercial strings [2.00ms]

::endgroup::

::group::tests/p0-d-offline-idempotency.test.ts:
(pass) P0-D offline idempotency > allows only the six offline mutation APIs
(pass) P0-D offline idempotency > validates stable idempotency keys
(pass) P0-D offline idempotency > hashes semantically identical object bodies identically
(pass) P0-D offline idempotency > releases reservations for every non-success target response
68 |       method: 'POST',
69 |       path: '/api/pool/water-test',
70 |       requestHash: 'a'.repeat(64),
71 |       expiresAt: new Date(Date.now() + 60_000),
72 |     }
73 |     await db.offlineMutation.create({ data })
                  ^
TypeError: undefined is not an object (evaluating 'db.offlineMutation.create')
      at <anonymous> (/home/runner/work/aquamind-ai/aquamind-ai/tests/p0-d-offline-idempotency.test.ts:73:14)
      at <anonymous> (/home/runner/work/aquamind-ai/aquamind-ai/tests/p0-d-offline-idempotency.test.ts:63:50)

::error file=tests/p0-d-offline-idempotency.test.ts,line=73,col=14,title=TypeError: undefined is not an object (evaluating 'db.offlineMutation.create')::%0A      at <anonymous> (/home/runner/work/aquamind-ai/aquamind-ai/tests/p0-d-offline-idempotency.test.ts:73:14)%0A      at <anonymous> (/home/runner/work/aquamind-ai/aquamind-ai/tests/p0-d-offline-idempotency.test.ts:63:50)
(fail) P0-D offline idempotency > enforces one ledger row per user and key
(pass) P0-D offline idempotency > routes every queued retry through the replay ledger [1.00ms]
(pass) P0-D offline idempotency > never deletes a reservation after the target mutation succeeds
10 | } from '@/lib/offline/idempotency'
11 | 
12 | const userId = `p0-d-${Date.now()}`
13 | 
14 | afterAll(async () => {
15 |   await db.offlineMutation.deleteMany({ where: { userId } })
                ^
TypeError: undefined is not an object (evaluating 'db.offlineMutation.deleteMany')
      at <anonymous> (/home/runner/work/aquamind-ai/aquamind-ai/tests/p0-d-offline-idempotency.test.ts:15:12)
      at <anonymous> (/home/runner/work/aquamind-ai/aquamind-ai/tests/p0-d-offline-idempotency.test.ts:14:10)

::error file=tests/p0-d-offline-idempotency.test.ts,line=15,col=12,title=TypeError: undefined is not an object (evaluating 'db.offlineMutation.deleteMany')::%0A      at <anonymous> (/home/runner/work/aquamind-ai/aquamind-ai/tests/p0-d-offline-idempotency.test.ts:15:12)%0A      at <anonymous> (/home/runner/work/aquamind-ai/aquamind-ai/tests/p0-d-offline-idempotency.test.ts:14:10)
(fail) (unnamed)

::endgroup::

::group::tests/p1-a-pro-crm-foundation.test.ts:
17 | let otherId = ''
18 | let clientId = ''
19 | 
20 | beforeAll(async () => {
21 |   const [owner, other] = await Promise.all([
22 |     db.user.create({
            ^
TypeError: undefined is not an object (evaluating 'db.user.create')
      at <anonymous> (/home/runner/work/aquamind-ai/aquamind-ai/tests/p1-a-pro-crm-foundation.test.ts:22:8)
      at <anonymous> (/home/runner/work/aquamind-ai/aquamind-ai/tests/p1-a-pro-crm-foundation.test.ts:20:11)

::error file=tests/p1-a-pro-crm-foundation.test.ts,line=22,col=8,title=TypeError: undefined is not an object (evaluating 'db.user.create')::%0A      at <anonymous> (/home/runner/work/aquamind-ai/aquamind-ai/tests/p1-a-pro-crm-foundation.test.ts:22:8)%0A      at <anonymous> (/home/runner/work/aquamind-ai/aquamind-ai/tests/p1-a-pro-crm-foundation.test.ts:20:11)
(fail) (unnamed)

::endgroup::

::group::tests/p1-b-team-dispatch.test.ts:
(pass) P1-B technician dispatch > evaluates working hours in the technician timezone [13.00ms]
(pass) P1-B technician dispatch > rejects a day outside the configured working week [1.00ms]
(pass) P1-B technician dispatch > rejects an overlapping intervention [2.00ms]
(pass) P1-B technician dispatch > rejects a daily capacity overflow without inventing route optimization [2.00ms]
(pass) P1-B technician dispatch > normalizes profile arrays and invalid timezones safely
(pass) P1-B technician dispatch > keeps SQLite and PostgreSQL dispatch schemas aligned [1.00ms]
(pass) P1-B technician dispatch > enforces assignment rules in both intervention write routes
(pass) P1-B technician dispatch > does not claim geolocation or route optimization in the dispatch UI
(pass) P1-B technician dispatch > ships the dispatch vocabulary in all seven locales [13.00ms]

::endgroup::

::group::tests/pro-app-shell-layout.test.ts:
(pass) AQWELIA Pro authenticated workspace shell > does not render the marketing header or footer around /pro/app
(pass) AQWELIA Pro authenticated workspace shell > uses the available desktop width for operational screens
(pass) AQWELIA Pro authenticated workspace shell > uses a native-style mobile shell instead of a horizontally scrolling web menu
(pass) AQWELIA Pro authenticated workspace shell > portals viewport-fixed mobile layers outside the sticky blurred header
(pass) AQWELIA Pro authenticated workspace shell > keeps mobile content full-width and safe-area aware

::endgroup::

::group::tests/p1-b-team-dispatch-contract.test.ts:
(pass) P1-B dispatch contract > stores availability on existing organization members in both databases
(pass) P1-B dispatch contract > scopes team workload to the Pro owner and protects profile writes
(pass) P1-B dispatch contract > uses organization members for creation and dispatch data for reassignment
(pass) P1-B dispatch contract > validates only genuine schedule changes on update [1.00ms]
(pass) P1-B dispatch contract > does not advertise mapping or route optimization before it exists

::endgroup::

::group::tests/rate-limit.test.ts:
(pass) P0-C in-process rate limiter > allows requests up to the configured limit
(pass) P0-C in-process rate limiter > blocks excess requests and provides Retry-After
(pass) P0-C in-process rate limiter > separates endpoints and client addresses
(pass) P0-C in-process rate limiter > opens a fresh window after expiry

::endgroup::

::group::tests/billing-concurrency.test.ts:
116 | 
117 | Example:
118 |   await prisma.$executeRawUnsafe(\`ALTER USER prisma WITH PASSWORD '\${password}'\`)
119 | 
120 | More Information: https://pris.ly/d/execute-raw
121 | `)}var So=({clientMethod:e,activeProvider:r})=>t=>{let n="",i;if(Vn(t))n=t.sql,i={values:Wr(t.values),__prismaRawParameters__:!0};else if(Array.isArray(t)){let[o,...s]=t;n=o,i={values:Wr(s||[]),__prismaRawParameters__:!0}}else switch(r){case"sqlite":case"mysql":{n=t.sql,i={values:Wr(t.values),__prismaRawParameters__:!0};break}case"cockroachdb":case"postgresql":case"postgres":{n=t.text,i={values:Wr(t.values),__prismaRawParameters__:!0};break}case"sqlserver":{n=Vl(t),i={values:Wr(t.values),__prismaRawParameters__:!0};break}default:throw new Error(`The ${r} provider does not support ${e}`)}return i?.values?Ql(`prisma.${e}(${n}, ${i.values})`):Ql(`prisma.${e}(${n})`),{query:n,parameters:i}},Wl={requestArgsToMiddlewareArgs(e){return[e.strings,...e.values]},middlewareArgsToRequestArgs(e){let[r,...t]=e;return new ie(r,t)}},Jl={requestArgsToMiddlewareArgs(e){return[e]},middlewareArgsToRequestArgs(e){return e[0]}};function Ro(e){return function(t,n){let i,o=(s=e)=>{try{return s===void 0||s?.kind==="itx"?i??=Kl(t(s)):K

PrismaClientKnownRequestError: 
Invalid `db.user.findUniqueOrThrow()` invocation in
/home/runner/work/aquamind-ai/aquamind-ai/tests/billing-concurrency.test.ts:13:29

  10 
  11 describe('P0-B atomicity and convergence', () => {
  12   beforeAll(async () => {
→ 13     userId = (await db.user.findUniqueOrThrow(
The table `main.User` does not exist in the current database.
       meta: {
  modelName: "User",
  table: "main.User",
},
 clientVersion: "6.19.2",
       code: "P2021"

      at handleRequestError (/home/runner/work/aquamind-ai/aquamind-ai/node_modules/@prisma/client/runtime/library.js:121:7268)
      at handleAndLogRequestError (/home/runner/work/aquamind-ai/aquamind-ai/node_modules/@prisma/client/runtime/library.js:121:6593)
      at request (/home/runner/work/aquamind-ai/aquamind-ai/node_modules/@prisma/client/runtime/library.js:121:6300)

::error file=node_modules/@prisma/client/runtime/library.js,line=121,col=7268,title=PrismaClientKnownRequestError: ::/home/runner/work/aquamind-ai/aquamind-ai/tests/billing-concurrency.test.ts:13:29%0A%0A  10 %0A  11 describe('P0-B atomicity and convergence', () => {%0A  12   beforeAll(async () => {%0A 13     userId = (await db.user.findUniqueOrThrow(%0AThe table `main.User` does not exist in the current database.%0A      at handleRequestError (/home/runner/work/aquamind-ai/aquamind-ai/node_modules/@prisma/client/runtime/library.js:121:7268)%0A      at handleAndLogRequestError (/home/runner/work/aquamind-ai/aquamind-ai/node_modules/@prisma/client/runtime/library.js:121:6593)%0A      at request (/home/runner/work/aquamind-ai/aquamind-ai/node_modules/@prisma/client/runtime/library.js:121:6300)
(fail) P0-B atomicity and convergence > (unnamed) [3.00ms]
116 | 
117 | Example:
118 |   await prisma.$executeRawUnsafe(\`ALTER USER prisma WITH PASSWORD '\${password}'\`)
119 | 
120 | More Information: https://pris.ly/d/execute-raw
121 | `)}var So=({clientMethod:e,activeProvider:r})=>t=>{let n="",i;if(Vn(t))n=t.sql,i={values:Wr(t.values),__prismaRawParameters__:!0};else if(Array.isArray(t)){let[o,...s]=t;n=o,i={values:Wr(s||[]),__prismaRawParameters__:!0}}else switch(r){case"sqlite":case"mysql":{n=t.sql,i={values:Wr(t.values),__prismaRawParameters__:!0};break}case"cockroachdb":case"postgresql":case"postgres":{n=t.text,i={values:Wr(t.values),__prismaRawParameters__:!0};break}case"sqlserver":{n=Vl(t),i={values:Wr(t.values),__prismaRawParameters__:!0};break}default:throw new Error(`The ${r} provider does not support ${e}`)}return i?.values?Ql(`prisma.${e}(${n}, ${i.values})`):Ql(`prisma.${e}(${n})`),{query:n,parameters:i}},Wl={requestArgsToMiddlewareArgs(e){return[e.strings,...e.values]},middlewareArgsToRequestArgs(e){let[r,...t]=e;return new ie(r,t)}},Jl={requestArgsToMiddlewareArgs(e){return[e]},middlewareArgsToRequestArgs(e){return e[0]}};function Ro(e){return function(t,n){let i,o=(s=e)=>{try{return s===void 0||s?.kind==="itx"?i??=Kl(t(s)):K

PrismaClientKnownRequestError: 
Invalid `db.billingEvent.deleteMany()` invocation in
/home/runner/work/aquamind-ai/aquamind-ai/tests/billing-concurrency.test.ts:17:27

  14 })
  15 
  16 afterAll(async () => {
→ 17   await db.billingEvent.deleteMany(
The table `main.BillingEvent` does not exist in the current database.
       meta: {
  modelName: "BillingEvent",
  table: "main.BillingEvent",
},
 clientVersion: "6.19.2",
       code: "P2021"

      at handleRequestError (/home/runner/work/aquamind-ai/aquamind-ai/node_modules/@prisma/client/runtime/library.js:121:7268)
      at handleAndLogRequestError (/home/runner/work/aquamind-ai/aquamind-ai/node_modules/@prisma/client/runtime/library.js:121:6593)
      at request (/home/runner/work/aquamind-ai/aquamind-ai/node_modules/@prisma/client/runtime/library.js:121:6300)

::error file=node_modules/@prisma/client/runtime/library.js,line=121,col=7268,title=PrismaClientKnownRequestError: ::/home/runner/work/aquamind-ai/aquamind-ai/tests/billing-concurrency.test.ts:17:27%0A%0A  14 })%0A  15 %0A  16 afterAll(async () => {%0A 17   await db.billingEvent.deleteMany(%0AThe table `main.BillingEvent` does not exist in the current database.%0A      at handleRequestError (/home/runner/work/aquamind-ai/aquamind-ai/node_modules/@prisma/client/runtime/library.js:121:7268)%0A      at handleAndLogRequestError (/home/runner/work/aquamind-ai/aquamind-ai/node_modules/@prisma/client/runtime/library.js:121:6593)%0A      at request (/home/runner/work/aquamind-ai/aquamind-ai/node_modules/@prisma/client/runtime/library.js:121:6300)
(fail) P0-B atomicity and convergence > (unnamed) [1.00ms]

::endgroup::

::group::tests/entry-flow.test.ts:
(pass) web entry authentication guard > does not restore the app view for an anonymous visitor
(pass) web entry authentication guard > restores the app view after authentication
(pass) web entry authentication guard > sends an anonymous CTA click to sign-up
(pass) web entry authentication guard > opens the app for an authenticated user

::endgroup::

41 tests failed:
(fail) P0-B — DB-level billing tests > (unnamed) [12.00ms]
(fail) P0-B — DB-level billing tests > (unnamed) [9.00ms]
(fail) Smoke — Auth & API baseline > GET /api/auth/csrf — returns a CSRF token
(fail) Smoke — Auth & API baseline > GET /api/auth/session — returns empty session when unauthenticated [1.00ms]
(fail) Smoke — Auth & API baseline > GET /api/pool/profile — returns 401 JSON when unauthenticated
(fail) Smoke — Auth & API baseline > GET /auth/signin — returns 200
(fail) Smoke — Auth & API baseline > GET / — returns 200 (landing page)
(fail) Smoke — Real auth flow > POST /api/auth/callback/credentials with valid credentials — creates a session [1.00ms]
(fail) Smoke — Real auth flow > POST /api/auth/callback/credentials with invalid password — rejects with error (not 500)
(fail) Smoke — Real auth flow > Authenticated session — GET /api/auth/session returns user
(fail) Smoke — Real auth flow > Authenticated request — GET /api/pool/profile returns 200
(fail) Smoke — Real auth flow > Logout — signout invalidates the session [1.00ms]
(fail) Smoke — Middleware (auth + public access) > Protected API route (anonymous) — returns 401 JSON
(fail) Smoke — Middleware (auth + public access) > Protected API route (authenticated) — returns 200
(fail) Smoke — Middleware (auth + public access) > /api/auth/* routes — accessible without session [1.00ms]
(fail) Smoke — Middleware (auth + public access) > Stripe webhook — returns 400 on missing signature (not 401, not 500)
(fail) Smoke — Middleware (auth + public access) > RevenueCat webhook — accessible without session, returns 401 from webhook verification (not middleware)
(fail) Smoke — Middleware (auth + public access) > Growth CRM leads — route-level authentication required
(fail) Smoke — Middleware (auth + public access) > Public lead capture (Pro early-access) — POST without session returns business error (not 401) [1.00ms]
(fail) Smoke — Public pages accessible > GET /tarifs — returns 200
(fail) Smoke — Public pages accessible > GET /faq — returns 200
(fail) Smoke — Public pages accessible > GET /pro — returns 200
(fail) Smoke — Public pages accessible > GET /care — returns 200
(fail) Smoke — Public pages accessible > GET /growth — returns 200 [1.00ms]
(fail) Smoke — Public pages accessible > GET /business — returns 200
(fail) Smoke — Public pages accessible > GET /academy — returns 200
(fail) PostgreSQL schema > supports related records, defaults, uniqueness, cascades and rollback [62.00ms]
(fail) AQWELIA Pro Dispatch Live contract > does not claim hidden or permanent background tracking
(fail) P0-B — Billing security > POST /api/subscription returns 403 (direct activation blocked) [1.00ms]
(fail) P0-B — Billing security > GET /api/subscription returns plan info for authenticated user
(fail) P0-B — Billing security > Stripe webhook — invalid signature returns 400
(fail) P0-B — Billing security > Stripe webhook — missing signature returns 400
(fail) P0-B — Billing security > RevenueCat webhook — invalid Bearer returns 401 [1.00ms]
(fail) P0-B — Billing security > RevenueCat webhook — no Authorization header returns 401
(fail) P0-B — Billing security > RevenueCat webhook — valid Bearer with non-activation event type is accepted
(fail) P0-D offline idempotency > enforces one ledger row per user and key
(fail) (unnamed)
(fail) (unnamed)
(fail) P0-B atomicity and convergence > (unnamed) [3.00ms]
(fail) P0-B atomicity and convergence > (unnamed) [1.00ms]

 425 pass
 41 fail
 1 error
 1231 expect() calls
Ran 466 tests across 33 files. [1134.00ms]

```
