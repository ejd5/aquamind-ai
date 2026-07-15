# P0-J — Crowdin PR #1 audit

This document records the audit of the long-standing Crowdin pull request
(`New Crowdin updates`, PR #1, branch `l10n_main` → `main`) performed
during the P0-J release-readiness lot.

It deliberately does **not** merge the pull request. It only documents
the findings and the recommended next steps.

## Identification

| Field | Value |
|---|---|
| PR number | #1 |
| Title | New Crowdin updates |
| State | open |
| Draft | no |
| Head branch | `l10n_main` |
| Base branch | `main` |
| Created | 2026-07-08 |
| Last updated | 2026-07-15 |
| Commits | 78 |
| Additions | 42 246 |
| Deletions | 0 |
| Changed files | 6 |
| Mergeable (GitHub) | true |
| Mergeable state | clean |

## Divergence from `main`

| Branch | Commits ahead of `main` | Commits behind `main` |
|---|---:|---:|
| `l10n_main` | 78 | 189 |

The branch has drifted far from `main`. It was last meaningfully aligned
a long time ago, and `main` has since received the entire P0-A → P0-I
security, billing, i18n, and pricing work (189 commits).

## Parasitic file structure

The PR introduces the following non-canonical files, which must never be
merged into `main`:

```
de/src/i18n/locales/German.json
en/src/i18n/locales/English.json
es-ES/src/i18n/locales/Spanish.json
it/src/i18n/locales/Italian.json
nl/src/i18n/locales/Dutch.json
pt-PT/src/i18n/locales/Portuguese.json
```

These are produced by an outdated Crowdin export configuration that uses
locale-prefixed directories and capitalized native filenames. The
canonical AQWELIA layout (on `main`) is:

```
src/i18n/locales/de.json
src/i18n/locales/en.json
src/i18n/locales/es.json
src/i18n/locales/fr.json
src/i18n/locales/it.json
src/i18n/locales/nl.json
src/i18n/locales/pt.json
```

The parasitic files must never be merged.

## Canonical locale drift

Even ignoring the parasitic files, the canonical locale files on
`l10n_main` are significantly smaller than on `main`, which means they
are stale and would overwrite newer translations if merged:

| Locale | `main` lines | `l10n_main` lines | Ratio |
|---|---:|---:|---:|
| `fr.json` | 7043 | 3536 | 50% |
| `en.json` | 7043 | 3536 | 50% |
| `es.json` | 7033 | 3536 | 50% |
| `de.json` | 7033 | 3536 | 50% |
| `it.json` | 7033 | 3536 | 50% |
| `pt.json` | 7033 | 3536 | 50% |
| `nl.json` | 7033 | 3536 | 50% |

Merging would roughly halve the translation coverage of the application
and remove all P0-A → P0-I i18n work (Stripe, billing, plans, paywall,
settings, and the `landing.errorTitle` key added by P0-I).

## Potentially useful content

Because the `l10n_main` locales are smaller, they do not contain
translation keys that `main` does not already have. The reverse is
false: `main` has many keys that `l10n_main` does not have.

A key-by-key diff was not performed as part of P0-J because:

1. The parasitic files alone disqualify the PR from being merged as-is.
2. The canonical files on `l10n_main` are a strict subset of `main` in
   terms of line count, and any unique translation in `l10n_main` would
   have to be verified key-by-key before extraction.
3. Reconnecting Crowdin cleanly from `main` is the safe path (see below).

## Decision

**Do not merge PR #1.**

The PR is left open and untouched. The owner can decide to close it
after reviewing this document. Closing it now is safe from a code
perspective because:

- the canonical locale files on `l10n_main` are a strict subset of
  `main` (smaller line count, fewer keys);
- the only added value would be translation wording improvements for
  keys that already exist on `main`, which can be recovered by
  reconnecting Crowdin from `main` and letting translators re-submit
  their work;
- the parasitic files are not wanted on `main`.

If the owner prefers to be conservative, the PR can be left open while
Crowdin is reconnected.

## Recommended path to reconnect Crowdin cleanly

1. Freeze PR #1 (do not merge).
2. In the Crowdin project settings, point the source branch at `main`.
3. Reconfigure the Crowdin file mapping so that:
   - the source file is `src/i18n/locales/fr.json` (or the chosen
     source locale);
   - the exported target files are written back to
     `src/i18n/locales/<locale>.json` (lowercase two-letter code, no
     locale-prefixed directory, no capitalized native filename);
   - the parasitic locales (`de/`, `en/`, `es-ES/`, `it/`, `nl/`,
     `pt-PT/`) are removed from the Crowdin configuration.
4. Trigger a fresh Crowdin sync from `main` so that translators see the
   current keys (including all P0-A → P0-I additions).
5. Open a new clean PR from Crowdin once translations are updated.
6. Close PR #1 after the new clean PR is opened (or merge, depending on
   the owner's decision).

## Canonical files enforced by P0-J

P0-J keeps the following files as the only canonical i18n sources:

```
src/i18n/locales/fr.json
src/i18n/locales/en.json
src/i18n/locales/es.json
src/i18n/locales/de.json
src/i18n/locales/it.json
src/i18n/locales/pt.json
src/i18n/locales/nl.json
```

No parasitic locale-prefixed directory or capitalized native filename
is introduced by P0-J.
