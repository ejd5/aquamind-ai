# AQWELIA Agent Instructions

These rules apply to every coding agent working in this repository, including Pi/DeepSeek.

## Safety and Git

- Never work directly on `main`. Create or use a dedicated feature/fix branch.
- Never merge a pull request, mark it Ready for review, deploy Production, or modify Production data unless the human explicitly authorizes that exact action.
- Default stopping point: code + tests + push + Draft PR/report, then wait for human validation.
- Never force-push `main`. Use `--force-with-lease` only on a feature branch after an intentional rebase.
- Prefer one final functional commit when practical to avoid unnecessary Vercel builds.
- Do not add temporary GitHub workflows to make a patch execute. Do not weaken CI, use `continue-on-error`, skip tests, or delete tests to obtain green checks.

## Production boundaries

Without explicit human authorization, do not write to or reconfigure:

- Vercel Production deployments or Production environment variables
- Neon/Postgres Production data or schema
- Stripe Production products, prices, subscriptions, webhooks, or secrets
- DNS/domain settings
- authentication secrets or user passwords
- RevenueCat production configuration

Do not print secrets. Never commit `.env` files or API keys.

## AQWELIA product rules

- Preserve separation between customer-facing Pool features and Pro features.
- All user-visible strings must use `next-intl`; no new hardcoded UI strings.
- Supported locales are: `fr`, `en`, `es`, `pt`, `de`, `it`, `nl`. When adding a key, update all seven locales.
- Preserve official branding assets under `public/branding/`; do not recreate or replace official AQWELIA logos unless explicitly requested.
- For guided visual assets, keep language-neutral imagery and UI-managed text whenever possible.
- Do not silently change plan gates, billing limits, scientific thresholds, dosage logic, or safety warnings.

## Required validation

After code changes, run the smallest relevant targeted tests first, then the applicable quality checks. Unless the task is documentation-only, normally run:

```bash
bun run typecheck
bun run lint
python3 scripts/i18n/check-hardcoded-strings.py
bun run build
```

Also run targeted tests for every changed feature and broader tests when the change can affect shared contracts.

Never claim a check is green unless its command or CI result was actually observed.

## Pull request workflow

Before editing:

1. `git fetch origin`
2. verify the current branch and `origin/main`
3. inspect only the relevant code and existing tests
4. avoid repeating already completed audits unless a new failure justifies it

Before asking for merge:

1. targeted tests pass
2. typecheck passes
3. lint passes
4. hardcoded-string check passes
5. build passes
6. GitHub workflows for the exact final SHA are green
7. AQWELIA Staging deployment for the exact final SHA is READY when applicable
8. human visual/smoke validation is completed when UI or Production behavior changes

## Reporting

For implementation missions, finish with a compact factual report containing:

- initial and final SHA
- files changed
- root cause when fixing a bug
- exact tests/checks and results
- GitHub workflow status for the final SHA
- Staging status/URL when applicable
- PR state
- explicit confirmation that Production was not touched, unless Production work was specifically authorized

Then stop and wait for the human checkpoint.
