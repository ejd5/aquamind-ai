# AQWELIA — Project handoff

Last updated: 2026-07-14

## Start here

This repository and its `main` branch are the technical source of truth for AQWELIA. Before changing anything:

1. Read this file and the root `README.md`.
2. Inspect the latest commits, open pull requests, and GitHub Actions results.
3. Audit the actual code before relying on an old chat summary.
4. Never place credentials, database URLs, API keys, customer data, or private chat exports in this public repository.

## Current product state

The P0 foundation through P0-I has established the security baseline, billing protections, PostgreSQL staging, authenticated onboarding, and the B2C pricing presentation. The current runtime stack includes Next.js, React, TypeScript, Prisma, NextAuth, Stripe, RevenueCat, next-intl, PostHog, and Capacitor.

Infrastructure currently used:

- Vercel staging deployment;
- Neon PostgreSQL staging database;
- Stripe test catalogue and signed webhook endpoint;
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

## Current work

Branch `fix/p0-i-stripe-checkout` connects paid CTAs on both pricing surfaces to the authenticated Stripe Checkout API. It also prevents an existing Free account from being sent back into the app when the user intended to subscribe.

Acceptance sequence:

1. CI and preview deployment are green.
2. An anonymous paid click redirects to sign-in.
3. An authenticated Free account opens the correct Stripe test Checkout for the selected plan and duration.
4. A successful test payment reaches the signed webhook.
5. The resulting subscription and entitlements are verified in PostgreSQL.

## Non-negotiable safeguards

- Never commit `.env` files or real credentials.
- Never expose internal subscription fields to clients unnecessarily.
- Never grant paid access based solely on browser state.
- Keep SQLite and PostgreSQL behavior explicit and tested.
- Validate migrations on an isolated database before production use.
- Do not scrape Google Maps or build owner-address databases from its imagery.

## Product direction after the B2C launch gate

AQWELIA Pro / Growth OS should help pool professionals work daily and grow without becoming another heavy ERP:

- technician planning and optimized routes;
- detailed customer, pool, intervention, stock, quote, and maintenance records;
- ergonomic CRM and automated follow-up;
- AI-assisted incoming calls, email replies, qualification, and prospecting;
- Growth Radar based on lawfully licensed or compatible open imagery, producing anonymous opportunity heatmaps and route-density insights;
- geographic campaigns using non-personalized mail, local advertising, landing pages, QR codes, referrals, and inbound lead tracking.

Growth Radar must not scrape Google Maps, identify private owners from satellite imagery, or create an unlawful personal prospecting database.

## Recommended next priorities

1. Complete and validate the Stripe Checkout branch.
2. Run a real end-to-end Stripe test payment and verify webhook/database state.
3. Reproduce the final catalogue in Stripe production only after staging passes.
4. Align RevenueCat products for mobile distribution.
5. Resume the AQWELIA Pro / Growth OS discovery and prototype work.

## Resume prompt for a new ChatGPT account

Use this prompt after granting the new account access to the repository:

> Open or clone `https://github.com/ejd5/aquamind-ai`. Read `docs/PROJECT_HANDOFF.md`, the root `README.md`, the recent `main` history, open pull requests, and CI results. Audit the current code before editing. Never request or display secret values. Continue from the first unfinished acceptance item in `Current work`, using a clean branch and a draft pull request; do not merge without my explicit approval.

## Conversation backup

This file is a sanitized project checkpoint, not a verbatim archive of private conversations. Keep private ChatGPT exports outside this public repository. Update this checkpoint after each merged milestone so another account or collaborator can resume from the repository without reconstructing the entire history.
