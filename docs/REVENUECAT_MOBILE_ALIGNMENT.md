# AQWELIA — RevenueCat mobile alignment

This document describes the expected mobile (iOS + Android) in-app
purchase configuration for AQWELIA, aligned with the validated B2C
catalogue. It contains **no secret values**.

## Catalogue

The mobile catalogue mirrors the web catalogue: 3 paid plans × 4
durations = 12 mobile products, plus the Free plan (no purchase
required).

### Plans and entitlements

| Plan | Internal id | RevenueCat entitlement |
|---|---|---|
| Pool | `oasis` | `oasis` |
| Spa | `spa365` | `spa365` |
| Complete | `wellness` | `wellness` |
| Free | `decouverte` | (none) |

### Mobile product ids (RevenueCat)

The RevenueCat product ids follow the convention
`aqwelia_<plan>_<duration>`:

| Plan | 1 month | 3 months | 6 months | 12 months |
|---|---|---|---|---|
| Pool (`oasis`) | `aqwelia_oasis_monthly` | `aqwelia_oasis_quarterly` | `aqwelia_oasis_seasonal` | `aqwelia_oasis_yearly` |
| Spa (`spa365`) | `aqwelia_spa365_monthly` | `aqwelia_spa365_quarterly` | `aqwelia_spa365_seasonal` | `aqwelia_spa365_yearly` |
| Complete (`wellness`) | `aqwelia_wellness_monthly` | `aqwelia_wellness_quarterly` | `aqwelia_wellness_seasonal` | `aqwelia_wellness_yearly` |

### Store product ids

For App Store Connect and Google Play Console, use the same
`aqwelia_<plan>_<duration>` ids as the RevenueCat product ids.

### Prices

The mobile prices must match the web prices exactly:

| Plan | 1 month | 3 months | 6 months | 12 months |
|---|---:|---:|---:|---:|
| Pool | €6.99 | €19.99 | €34.99 | €64.99 |
| Spa | €4.99 | €13.99 | €24.99 | €44.99 |
| Complete | €10.99 | €29.99 | €54.99 | €99.99 |

Apple and Google may adjust the localized prices per country; the EUR
tier must match the above values.

## Differences between Stripe web and Apple/Google IAP

| Aspect | Stripe (web) | Apple/Google (mobile) |
|---|---|---|
| Payment processor | Stripe | Apple/Google |
| Subscription management | Stripe Customer Portal | App Store / Play Store settings |
| Webhook | Stripe signed webhook | RevenueCat webhook |
| Free trial | Not configured | Not configured (Free is permanent, not a trial) |
| Refunds | Stripe Dashboard | Apple/Google refund flow |
| Cancellation | Stripe Portal | App Store / Play Store |

## Security

- A mobile purchase must **never** be activated solely from the client
  side. The mobile app sends the RevenueCat purchase receipt to the
  AQWELIA backend via the RevenueCat webhook.
- The AQWELIA backend (`/api/revenuecat/webhook`) verifies the
  RevenueCat webhook signature, resolves the plan and duration from the
  product id, and activates the subscription in PostgreSQL using the
  same `applyTransition` engine as the Stripe webhook.
- The client must not write to the `Subscription` table directly.
- `getEntitlements()` on mobile reads from `/api/subscription`, which
  reads from PostgreSQL — the same source of truth as web.

## RevenueCat webhook

The AQWELIA backend exposes `/api/revenuecat/webhook` which:

1. Verifies the RevenueCat webhook signature (Bearer token, constant-time
   comparison).
2. Extracts the event type, event id, and product id from the official
   RevenueCat payload.
3. Maps the product id to a plan + duration using
   `getPlanFromRCProductId`.
4. Processes the event idempotently using the same `BillingEvent` table
   as the Stripe webhook.
5. Calls `applyTransition` to activate, update, or revoke the
   subscription.

The RevenueCat webhook secret is stored in the
`REVENUECAT_WEBHOOK_AUTHORIZATION` environment variable on Vercel.

## Scenarios to test

| Scenario | Expected behavior |
|---|---|
| First purchase (Pool monthly) | Subscription created, plan = `oasis`, entitlement active |
| Restore purchases | Existing subscription found, entitlement active |
| Renewal (invoice paid) | Subscription extended, entitlement remains active |
| Cancellation | Subscription marked canceled, entitlement active until expiry |
| Expiry | Subscription marked expired, entitlement revoked |
| Plan change (upgrade) | Subscription updated to new plan, entitlement updated |
| Refund | Subscription revoked, entitlement revoked immediately |
| Web ↔ mobile sync | Purchase on web activates entitlement on mobile and vice versa |

## RevenueCat configuration steps (when ready)

1. Create a RevenueCat project and add the AQWELIA app (iOS + Android).
2. Configure App Store Connect and Google Play Console with the 12
   products each.
3. In RevenueCat, create 3 entitlements: `oasis`, `spa365`, `wellness`.
4. Associate each of the 12 products with its entitlement.
5. Configure the RevenueCat webhook to point to
   `https://aqwelia-staging.vercel.app/api/revenuecat/webhook` (or the
   production domain).
6. Copy the RevenueCat webhook authorization secret and set it as
   `REVENUECAT_WEBHOOK_AUTHORIZATION` on Vercel.
7. Set the RevenueCat public SDK key in the mobile app configuration
   (`REVENUECAT_IOS_KEY`, `REVENUECAT_ANDROID_KEY`).

No real store configuration or keys are included in this document.
