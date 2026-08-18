---
name: aqwelia-release
description: Execute a safe AQWELIA coding/PR mission with strict branch, CI, staging, i18n, and human-approval checkpoints. Use for bug fixes, feature PRs, release preparation, or post-review corrections.
---

# AQWELIA Release Skill

## Mission contract

1. Read `AGENTS.md` first and obey it.
2. Confirm repository, branch, base SHA, and PR state before modifying code.
3. Work only on the requested scope. Do not perform a broad audit unless the observed failure requires it.
4. Diagnose the first real root cause before patching. Do not patch an assumption.
5. Keep Production untouched unless the user explicitly authorizes Production action.

## Implementation loop

- Inspect relevant source and tests.
- Make the smallest coherent fix.
- Preserve existing branding, i18n, billing gates, scientific/safety contracts, and unrelated features.
- Add or update regression tests for the actual cause.
- Run targeted tests and iterate until green.
- Run typecheck, lint, hardcoded-string check, and build.
- Rebase on `origin/main` only when needed; resolve conflicts without dropping already-merged fixes.
- Push only to the task branch.

## GitHub/Vercel checkpoint

After push, verify the workflows attached to the exact final SHA. When UI/API behavior is involved, verify the AQWELIA Staging deployment corresponding to that exact SHA is READY. Ignore failures from obsolete/historical Vercel projects only when evidence shows the AQWELIA Staging project itself is healthy and the failure is unrelated.

## Human checkpoint

Never do any of the following unless the user gives an explicit command for the exact PR:

- mark Ready for review
- merge
- deploy Production manually
- modify Production data/configuration

For UI changes, request human visual validation on Staging before recommending Ready/merge.

## Final report

Return:

1. initial SHA/base
2. root cause or implementation objective
3. files changed
4. exact correction
5. i18n/branding/billing/safety impact
6. targeted test counts
7. typecheck/lint/hardcoded/build status
8. final SHA
9. GitHub workflows for final SHA
10. AQWELIA Staging state and URL when relevant
11. final PR state
12. explicit Production-touch statement

Then STOP.
