# ARQWELIA — Lot 1 (Visual prototype & acquisition tunnel)

> Status: **Draft PR** — do not merge. Lot 1 is a visible, testable tranche.
> Branch: `feature/arqwelia-lot1-visual-poc` (off `main` @ `87a76ea`).

## What Lot 1 is

ARQWELIA is a sub-product by AQWELIA. Lot 1 lets a homeowner:

1. Discover the concept on a public landing (`/arqwelia`).
2. Add up to 4 photos of their yard (client-side only — never uploaded to a server).
3. Fill a questionnaire (type / timeline / budget / style + optional measurement).
4. Watch a **simulated** analysis (clearly labelled "Démo — analyse simulée").
5. Compare two concepts (A — Réaliste / B — Inspiration), select one.
6. Submit contact info + explicit (non-pre-checked) consent → a **Project Passport**
   is created with a non-sequential public id, a demo Reality Score, and three
   actions (keep private / share later / find pros soon).
7. A pisciniste can join a **partner pilot waitlist** on the landing.
8. A signed-in Pro user can view a **demo opportunity preview** at
   `/pro/arqwelia/opportunities` (contact not revealed, "Express interest"
   disabled).

## What Lot 1 is NOT (do not simulate as real)

- ❌ No real generative AI, no AR, no 3D geometry, no matching, no payment, no
  lead distribution. All "AI" in the copy is softened to "directions
  personnalisées" until a real AI service is wired in a later lot.
- ❌ No image is persisted server-side. Photos live in the browser session only.

## Feature flag

`NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED` (default `false`):
- `false`: landing still resolves but `robots` noindex + nav CTA hidden.
- `true`: routes are accessible and the primary CTA links to the wizard.

`NEXT_PUBLIC_ARQWELIA_DEMO_MODE` (default `true` in non-production):
- Shows the "Démo — analyse simulée" badge. The `?demo=1` query also triggers it.

## Routes (final URLs)

| Route | Type | Auth | Indexable |
|-------|------|------|-----------|
| `/arqwelia` | Landing (12 sections) | Public | Only if flag on |
| `/arqwelia/start/photos` | Wizard step | Public | noindex |
| `/arqwelia/start/project` | Wizard step | Public | noindex |
| `/arqwelia/start/analysis` | Wizard step | Public | noindex |
| `/arqwelia/start/concepts` | Wizard step | Public | noindex |
| `/arqwelia/start/contact` | Wizard step | Public | noindex |
| `/arqwelia/start/success` | Confirmation | Public | noindex |
| `/pro/arqwelia/opportunities` | Pro demo preview | Pro role | noindex |
| `POST /api/arqwelia/project` | Creates Project Passport | Public | n/a |
| `POST /api/arqwelia/partner-waitlist` | Pisciniste waitlist | Public | n/a |

## Data models (namespaced — additive)

Added to **both** `prisma/schema.prisma` (SQLite dev) and
`prisma/postgresql/schema.prisma` (PG prod):

- `ArqweliaProject` — public id, status, questionnaire, selected concept,
  reality score demo, expiry. Relation to consent.
- `ArqweliaLeadConsent` — firstName, email, phone, consentVersion, consentedAt,
  source. 1:1 with project.
- `ArqweliaPartnerWaitlist` — company, contact, professional email (unique),
  radius. Deduped by email.

No image blobs are stored. `db push` was run against the dev SQLite DB; a
proper migration should be generated against a clean migration baseline (the
existing dev DB has drift, so `prisma migrate dev` would request a reset —
deferred to avoid wiping dev data).

## Design tokens (namespaced, additive)

Added to `src/app/globals.css` `:root` and `tailwind.config.ts`:
`--arqwelia-navy/aqua/cyan/sand/mist/ink` → Tailwind utilities `arq-navy`,
`arq-aqua`, `arq-cyan`, `arq-sand`, `arq-mist`, `arq-ink`. The existing AQWELIA
brand tokens (`--aqwelia-*`) are untouched.

## i18n

A new `arqwelia` namespace was added to all 7 locales (`fr`, `en`, `es`, `de`,
`it`, `pt`, `nl`). **FR is the canonical source. EN is fully translated.**
ES/DE/IT/PT/NL are currently seeded with FR values pending translation review
(an `arqwelia-lot1-i18n.test.ts` test enforces key-set parity across all
locales; values are not yet localised for those 5).

No component renders a raw visible string outside of `t()`. The only non-i18n
strings are: the ARQWELIA sub-brand mark, ASCII `✓`/`○` markers, and the
`ARQ-NNN-NNN` project id format.

## Analytics

Reuses the existing PostHog client/server modules. New events
(see `src/lib/arqwelia/analytics-{client,server}.ts`):
`arq_landing_view`, `arq_primary_cta_click`, `arq_demo_start`,
`arq_photo_added`, `arq_photo_step_completed`, `arq_questionnaire_completed`,
`arq_analysis_completed`, `arq_concept_selected`, `arq_contact_submitted`,
`arq_project_created`, `arq_pro_waitlist_submitted`. **Never** sends email,
phone, photos, or addresses.

## Tests

| File | Tests | What it covers |
|------|-------|-----------------|
| `tests/arqwelia-lot1.test.ts` | 7 | Fixtures, publicId, reality score, limits, consent versions |
| `tests/arqwelia-lot1-i18n.test.ts` | 8 | All 7 locales have the arqwelia key set |
| `tests/arqwelia-lot1-db.test.ts` | 3 | Project+consent nested write, waitlist dedup, publicId unique |
| `tests/arqwelia-lot1-api.test.ts` | 7 | Server-side validation, consent NOT pre-checked, dedup, happy path |

Run:
```bash
# unit + i18n (no DB)
npx vitest run tests/arqwelia-lot1.test.ts tests/arqwelia-lot1-i18n.test.ts

# DB + API (need a throwaway SQLite DB)
TEST_DB="/tmp/arq.db" && touch "$TEST_DB" \
  && DATABASE_URL="file:$TEST_DB" ./node_modules/.bin/prisma db push --skip-generate \
  && DATABASE_URL="file:$TEST_DB" npx vitest run tests/arqwelia-lot1-db.test.ts tests/arqwelia-lot1-api.test.ts
```

## Captures (desktop + mobile)

See `docs/design-vision/arqwelia-lot1/`:
- `01-landing.png` (1440×900), `01b-landing-mobile.png` (390×844)
- `02-photos.png` … `07-success.png` (mobile flow)
- `08-landing-desktop-full.png` (1440 wide full-page)
- `09-pro-preview.png`

Responsive verified: **no horizontal overflow** at 360, 768, 1024, 1440 px.

## Environment variables

| Var | Default | Purpose |
|-----|---------|---------|
| `NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED` | `false` | Show ARQWELIA in nav + index landing |
| `NEXT_PUBLIC_ARQWELIA_DEMO_MODE` | `true` (non-prod) | Show "Démo" badge + accept `?demo=1` |

No new server-side secrets. No new external services.

## Files changed / added

Modified: `prisma/schema.prisma`, `prisma/postgresql/schema.prisma`,
`src/app/globals.css`, `tailwind.config.ts`, `src/lib/features.ts`,
`src/i18n/locales/{fr,en,es,de,it,pt,nl}.json`.

Added: `src/app/(public)/arqwelia/**` (layout, landing, wizard pages),
`src/app/pro/arqwelia/opportunities/page.tsx`,
`src/app/api/arqwelia/{project,partner-waitlist}/route.ts`,
`src/components/arqwelia/partner-form.tsx`,
`src/lib/arqwelia/{types,fixtures,public-id,wizard-store,analytics-client,analytics-server}.ts`,
`tests/arqwelia-lot1{,-db,-i18n,-api}.test.ts`, this doc.

## Known limitations

1. ES/DE/IT/PT/NL `arqwelia` values are FR — need translation review.
2. A Prisma migration file was not generated (dev DB has pre-existing drift;
   `db push` was used instead). Generate one against a clean baseline before prod.
3. PDF download of the Project Passport summary is intentionally NOT included
   (the mission allowed it only if a reliable PDF infra already exists; the
   existing PDF path is built for Pro intervention reports, not consumer
   passports — wiring it would risk scope creep).
4. The Pro preview page signs in a Pro-role user via the existing NextAuth
   session, but role enforcement currently trusts the session; a stricter
   check against the `User.role` column is recommended before any real lead
   distribution (a later lot).
5. Photo previews use `URL.createObjectURL` / data URLs held in React state +
   sessionStorage; very large batches may hit sessionStorage quotas — handled
   gracefully (photos dropped, the rest kept) but not yet user-messaged.

## Recommended next tranche (Lot 2)

- Wire real AI vision for the analysis (replace the simulated progression with
  an actual model call). Keep the "Démo" badge switchable for staging.
- Generate a proper Prisma migration + add a weekly expiry cron for
  `ArqweliaProject.expiresAt`.
- Add PDF export of the Project Passport summary.
- Add the matching engine (opt-in): a Pro can request to contact a particular
  homeowner, who must approve. No automatic distribution.
- Translate ES/DE/IT/PT/NL.
- E2E tests (Playwright) for the demo path and the upload path.

## What is simulated (the honest list)

- The 4-step "analysis" progression → deterministic, time-based, no model.
- The "detected zone" / dimensions → derived from the questionnaire answers
  via `buildConcepts()`, not from the photos.
- The Reality Score → `demoRealityScore(q)`, a deterministic 0-100 from inputs.
- The Pro preview opportunity → a hardcoded fixture
  (`DEMO_PRO_OPPORTUNITY`), contact hidden, interest button disabled.