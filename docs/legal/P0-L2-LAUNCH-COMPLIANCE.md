# P0-L2 — Legal, privacy and launch compliance

Date: 2026-07-26

## Implemented controls

- Versioned cookie preference with equal **accept** and **reject** actions.
- PostHog browser SDK downloaded only after analytics consent.
- Server analytics disabled by default and restricted to consenting users.
- Consent audit ledger with pseudonymised IP proof.
- Truthful cookie inventory; no Google Analytics or browser RevenueCat claims.
- Public legal notice driven by environment variables, with a visible launch blocker when mandatory identity fields are missing.
- Privacy policy aligned with account, pool, photo, AI, billing, support, Pro and optional analytics processing.
- Public processor inventory and AI transparency page.
- Visible AI notices in Lagoon and photo diagnostics.
- In-app account deletion plus a public web deletion-request path for store listings.
- Deletion explicitly handles non-relational location, commerce, audit and automation tables.
- Data export expanded and provider secrets excluded.
- Security and accessibility pages no longer claim unverified certifications, audit scores, bounty programmes or guaranteed response times.

## Hard launch blockers

The service must not be commercially launched until these values are verified and configured in Production:

- legal publisher name and legal form;
- registered office;
- SIREN/SIRET and registry details;
- publication director;
- hosting entity and legal contact details;
- consumer mediator name and URL;
- applicable VAT number, capital and business contact details where relevant;
- counsel-approved legal translations for every locale marketed at launch.

## Operational checklist

1. Obtain counsel validation of CGU, CGV, privacy, retention and withdrawal wording.
2. Execute and archive processor/data-processing agreements for active vendors.
3. Verify data-hosting regions and transfer safeguards in each vendor account.
4. Configure the legal environment variables and confirm `/legal/mentions-legales` has no warning.
5. Complete Apple App Privacy and Google Play Data safety declarations from the production configuration, including every SDK.
6. Enter `/legal/suppression-compte` as the Google Play external account-deletion URL.
7. Enable `POSTHOG_SERVER_ENABLED=true` only after confirming the consent ledger and production retention configuration.
8. Establish a periodic retention/deletion job for support, analytics, logs and inactive accounts.
9. Perform an independent accessibility audit before publishing a compliance percentage.
10. Obtain professional translations of every legal document for each locale marketed at launch; English fallback text is temporary and must not be treated as a validated local-law version.
11. Re-run legal review whenever a new AI, analytics, payment, location or marketing provider is activated.

## Scope statement

This engineering lot reduces compliance risk and makes the product behaviour match its disclosures. It is not a legal opinion and cannot replace verification by the future publisher and its legal adviser.
