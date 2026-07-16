# AQWELIA — Project handoff

Last updated: 2026-07-15

## Start here

This repository and its `main` branch are the technical source of truth for AQWELIA. Before changing anything:

1. Read this file and the root `README.md`.
2. Inspect the latest commits, open pull requests, and GitHub Actions results.
3. Audit the actual code before relying on an old chat summary.
4. Never place credentials, database URLs, API keys, customer data, or private chat exports in this public repository.

## Current product state

The P0 foundation through P0-I has established the security baseline, billing protections, PostgreSQL staging, authenticated onboarding, and the B2C pricing presentation, and has connected the B2C checkout flow to Stripe end-to-end. The current runtime stack includes Next.js, React, TypeScript, Prisma, NextAuth, Stripe, RevenueCat, next-intl, PostHog, and Capacitor.

Infrastructure currently used:

- Vercel staging deployment;
- Neon PostgreSQL staging database;
- Stripe test catalogue and signed webhook endpoint (test mode);
- GitHub Actions quality and database checks.

This document deliberately contains no secret values.

## Validated B2C catalogue

| Offer | 1 month | 3 months | 6 months | 12 months |
|---|---:|---:|---:|---:|
| Pool (`oasis`) | €6.99 | €19.99 | €34.99 | €64.99 |
| Spa (`spa365`) | €4.99 | €13.99 | €24.99 | €44.99 |
| Complete (`wellness`) | €10.99 | €29.99 | €54.99 | €99.99 |

The Free offer is permanent, not a seven-day premium trial. Paid access must be activated only by a verified provider webhook or an audited administrative process—never by a client-side request.

Web product IDs follow this exact convention:

- `oasis_monthly`, `oasis_quarterly`, `oasis_seasonal`, `oasis_yearly`;
- `spa365_monthly`, `spa365_quarterly`, `spa365_seasonal`, `spa365_yearly`;
- `wellness_monthly`, `wellness_quarterly`, `wellness_seasonal`, `wellness_yearly`.

These names, prices, and identifiers are invariants. Do not reintroduce the « Pass Urgence », a seven-day premium trial, or a weekly duration.

## P0-I — Terminé

Pull Request #14 (`P0-I hotfix — connect paid pricing to Stripe Checkout`) has been merged into `main` and validated end-to-end in the Vercel staging environment.

Validated acceptance sequence:

1. CI and preview deployment are green.
2. An anonymous paid click redirects to sign-in.
3. An authenticated Free account opens the correct Stripe test Checkout for the selected plan and duration, in the AQWELIA-selected locale.
4. A successful test payment reaches the signed Stripe webhook.
5. The webhook signature is validated; the event is processed idempotently.
6. The resulting subscription and entitlements are activated in PostgreSQL.
7. The settings page displays the active plan correctly.

A preexisting frontend bug was also fixed during P0-I: `getEntitlements()` compared `sub.plan` (which can be the full plan object) with plan-id strings, causing the settings page to display Free despite an active paid subscription. The fix reads the plan id from `sub.subscription.plan`.

Temporary debug endpoints and console logs introduced during P0-I diagnosis have been removed before merge.

## Last validated release state

| Field | Value |
|---|---|
| `main` SHA at start of P0-J | `c01dc46` |
| Verification date | 2026-07-15 |
| Last merged PR | #14 — P0-I hotfix — connect paid pricing to Stripe Checkout |
| Lint | PASS (0 errors, 0 warnings) |
| TypeScript (`tsc --noEmit`) | PASS in `src/` (preexisting errors only in `examples/websocket/` — missing `socket.io-client` / `socket.io`, not introduced by P0-I) |
| i18n hardcoded-string check | PASS |
| `tests/b2c-pricing.test.ts` | 6/6 PASS |
| Production build | PASS for the app (preexisting `examples/websocket` type error is outside the app build path) |
| Staging deployment | Verified through end-to-end Stripe test payment |

## Current work — P0-J

Branch: `fix/p0-j-b2c-release-readiness` (draft PR toward `main`).

P0-J is a hardening and release-readiness lot. It does **not** introduce new features. Its goal is to transform the working staging B2C flow into a consistent, robust, testable, and maintainable flow that is ready for future Stripe Production configuration and future RevenueCat mobile alignment.

P0-J acceptance criteria:

1. `PROJECT_HANDOFF.md` reflects the real state.
2. The old Crowdin pull request is not merged and a clear recommendation is produced.
3. The selected plan and duration survive sign-in via validated URL parameters.
4. Invalid URL parameters are rejected.
5. The web catalogue exposes exactly the 12 validated paid products.
6. No Free or weekly product is exposed in the catalogue.
7. An unknown plan id does not grant any paid entitlement (no silent fallback to Pool).
8. Stripe Checkout never trusts a client-supplied Price ID.
9. Entitlements always depend on the webhook and the database.
10. No temporary debug endpoint remains.
11. Critical translations are consistent across the seven locales.
12. Old plan names and old prices have been removed from the B2C surfaces.
13. Lint, TypeScript, tests, and build pass (or any failure is clearly preexisting).
14. No secret is added.
15. A draft PR is open and not merged.

## Non-negotiable safeguards

- Never commit `.env` files or real credentials.
- Never expose internal subscription fields to clients unnecessarily.
- Never grant paid access based solely on browser state.
- Keep SQLite and PostgreSQL behavior explicit and tested.
- Validate migrations on an isolated database before production use.
- Do not scrape Google Maps or build owner-address databases from its imagery.
- Never merge a branch into `main` without the owner's explicit approval.
- Never disable a security protection without a documented justification.
- Never trust client-supplied Stripe Price IDs; always resolve them server-side from the validated catalogue.
- Never reactivate a plan from browser metadata alone.

## Recommended next steps after P0-J

1. **Stripe Production** — create the 12 live Price IDs, a separate live webhook endpoint, and configure Vercel Production secrets (see `docs/STRIPE_PRODUCTION_CHECKLIST.md`).
2. **RevenueCat and mobile stores** — create the 12 mobile products in App Store Connect and Google Play Console, configure RevenueCat entitlements, and align the RevenueCat webhook (see `docs/REVENUECAT_MOBILE_ALIGNMENT.md`).
3. **Final QA** — full regression pass on staging with production-like data.
4. **Controlled B2C launch** — soft launch with a limited audience before broad distribution.
5. **AQWELIA Pro / Growth OS** — resume the B2B discovery and prototype work after the B2C launch is stable.

## Product direction after the B2C launch gate

AQWELIA Pro / Growth OS should help pool professionals work daily and grow without becoming another heavy ERP:

- technician planning and optimized routes;
- detailed customer, pool, intervention, stock, quote, and maintenance records;
- ergonomic CRM and automated follow-up;
- AI-assisted incoming calls, email replies, qualification, and prospecting;
- Growth Radar based on lawfully licensed or compatible open imagery, producing anonymous opportunity heatmaps and route-density insights;
- geographic campaigns using non-personalized mail, local advertising, landing pages, QR codes, referrals, and inbound lead tracking.

Growth Radar must not scrape Google Maps, identify private owners from satellite imagery, or create an unlawful personal prospecting database.

## Resume prompt for a new ChatGPT account

Use this prompt after granting the new account access to the repository:

> Open or clone `https://github.com/ejd5/aquamind-ai`. Read `docs/PROJECT_HANDOFF.md`, the root `README.md`, the recent `main` history, open pull requests, and CI results. Audit the current code before editing. Never request or display secret values. Continue from the first unfinished acceptance item in `Current work`, using a clean branch and a draft pull request; do not merge without my explicit approval.

## Conversation backup

This file is a sanitized project checkpoint, not a verbatim archive of private conversations. Keep private ChatGPT exports outside this public repository. Update this checkpoint after each merged milestone so another account or collaborator can resume from the repository without reconstructing the entire history.
