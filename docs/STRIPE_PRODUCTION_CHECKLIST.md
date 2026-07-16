# AQWELIA — Stripe Production checklist

This document describes the steps required to move the AQWELIA B2C
billing from Stripe **test mode** to Stripe **production (live)**.

It contains **no secret values**. All placeholders must be replaced with
real production values by the project owner before activation.

## Prerequisites

- The B2C flow has been validated end-to-end on staging with Stripe test
  mode (P0-I and P0-J merged).
- The Stripe account is verified for live payments.
- The Vercel project has separate environments for Production and
  Preview.

## 1. Create the 12 live Price IDs

In the Stripe Dashboard (production mode, not test mode), create 3
products and 4 recurring prices per product, using exactly the validated
prices and durations:

| Product | 1 month | 3 months | 6 months | 12 months |
|---|---:|---:|---:|---:|
| AQWELIA Pool (`oasis`) | €6.99 | €19.99 | €34.99 | €64.99 |
| AQWELIA Spa (`spa365`) | €4.99 | €13.99 | €24.99 | €44.99 |
| AQWELIA Complete (`wellness`) | €10.99 | €29.99 | €54.99 | €99.99 |

Each price must be:
- recurring (subscription)
- in EUR
- with the exact matching interval (month / 3 months / 6 months / year)
- with `price_...` ids that you will copy into Vercel (see step 3)

## 2. Create a separate production webhook endpoint

In the Stripe Dashboard (production mode), add a new webhook endpoint:

- URL: `https://aqwelia-staging.vercel.app/api/stripe/webhook`
  (or the final production domain when ready)
- Events to send:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `charge.refunded`
- Copy the **production** signing secret (`whsec_...`).

The production webhook endpoint must be **separate** from the preview
endpoint. Never reuse a preview webhook secret for production, and never
reuse a production webhook secret for preview.

## 3. Configure Vercel Production environment variables

In the Vercel project settings, add or update the following variables
**scoped to the Production environment only**:

| Key | Value (placeholder) |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (production endpoint) |
| `STRIPE_PRICE_OASIS_MONTHLY` | `price_...` |
| `STRIPE_PRICE_OASIS_QUARTERLY` | `price_...` |
| `STRIPE_PRICE_OASIS_SEASONAL` | `price_...` |
| `STRIPE_PRICE_OASIS_YEARLY` | `price_...` |
| `STRIPE_PRICE_SPA365_MONTHLY` | `price_...` |
| `STRIPE_PRICE_SPA365_QUARTERLY` | `price_...` |
| `STRIPE_PRICE_SPA365_SEASONAL` | `price_...` |
| `STRIPE_PRICE_SPA365_YEARLY` | `price_...` |
| `STRIPE_PRICE_WELLNESS_MONTHLY` | `price_...` |
| `STRIPE_PRICE_WELLNESS_QUARTERLY` | `price_...` |
| `STRIPE_PRICE_WELLNESS_SEASONAL` | `price_...` |
| `STRIPE_PRICE_WELLNESS_YEARLY` | `price_...` |

Keep the existing **Preview** environment variables unchanged (they use
the test-mode keys and the preview webhook secret).

## 4. Configure the Stripe Customer Portal

In the Stripe Dashboard (production mode), enable the Customer Portal
with:

- cancellation allowed
- invoice history visible
- payment method update allowed
- subscription update/downgrade allowed (optional)

The `/api/stripe/portal` route uses `stripe.billingPortal.sessions.create`
with a `return_url` built from `req.nextUrl.origin`, so no additional
configuration is needed on the AQWELIA side.

## 5. Test with an internal account before public opening

Before opening payments to the public:

1. Use a real internal credit card on the production deployment.
2. Complete a checkout for each of the 3 plans and 4 durations (12
   combinations if feasible, at least one per plan).
3. Verify that the webhook is received (HTTP 200) on the production
   deployment logs.
4. Verify that the subscription is created in PostgreSQL.
5. Verify that the settings page shows the correct active plan.
6. Verify that the Customer Portal opens correctly.
7. Cancel the test subscription from the portal and verify that the
   entitlement is revoked after the period ends.

## 6. Taxes, VAT, invoices, legal mentions

Before opening to the public, ensure that:

- VAT is correctly configured in Stripe Tax (or manually handled per
  country).
- Invoices include the required legal mentions (company name, address,
  VAT number, SIRET for France).
- The CGV page (`/legal/cgv`) is up to date with the production prices
  and terms.
- The privacy policy (`/legal/privacy`) mentions Stripe as a payment
  processor.
- The cookie policy (`/legal/cookies`) mentions the Stripe cookie if
  applicable.

## 7. Test cancellation

1. Subscribe to a plan.
2. Open the Customer Portal via `/settings` → « Gérer ».
3. Cancel the subscription.
4. Verify that access remains until the end of the paid period.
5. Verify that after the period ends, the plan reverts to Free.

## 8. Test refund

1. Subscribe to a plan.
2. In the Stripe Dashboard, refund the latest invoice (full refund).
3. Verify that the webhook `charge.refunded` is received.
4. Verify that the entitlement is revoked immediately (full refund of
   the latest invoice revokes access).

## 9. Environment isolation

Never mix preview and production secrets:

- Preview `STRIPE_SECRET_KEY` = test key (`sk_test_...`)
- Production `STRIPE_SECRET_KEY` = live key (`sk_live_...`)
- Preview `STRIPE_WEBHOOK_SECRET` = preview endpoint secret
- Production `STRIPE_WEBHOOK_SECRET` = production endpoint secret

Using a preview webhook secret with a production endpoint (or the
reverse) will cause signature verification failures and break billing.

## 10. Go-live checklist

Before opening payments to the public:

- [ ] 12 live Price IDs created
- [ ] Production webhook endpoint created
- [ ] Vercel Production environment variables set
- [ ] Customer Portal configured
- [ ] Internal test payment successful
- [ ] Webhook received on production
- [ ] Subscription created in PostgreSQL
- [ ] Settings page shows correct plan
- [ ] Cancellation tested
- [ ] Refund tested
- [ ] Taxes/VAT configured
- [ ] Legal pages updated
- [ ] Preview and Production secrets are separate
