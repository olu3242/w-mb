# Payment Webhook Checklist

## Architecture

Payment strategy: **Stripe Checkout Sessions**

This matches the current Stripe best-practice path for hosted one-time payments. The app does not collect raw card details.

## Required Stripe Setup

1. Create a Stripe webhook endpoint:

```text
https://<production-domain>/api/payments/webhook/stripe
```

2. Subscribe to these events:

- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `charge.dispute.created`

3. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

4. Confirm `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are from the same Stripe mode.

## Checkout Readiness

Expected flow:

1. Public user opens `/e/[slug]`.
2. User enters contribution details.
3. `POST /api/payments/checkout` creates a pending contribution.
4. Server creates Stripe Checkout Session.
5. Checkout URL is returned.
6. User completes Stripe hosted payment.
7. Stripe webhook marks contribution paid.

## Webhook Processing Readiness

Expected behavior:

- Signature is verified before processing.
- Provider event is inserted into `payment_events`.
- Duplicate processed events return success without double-counting.
- `contributions.status` moves from `pending` to `paid`, `failed`, `refunded`, or `disputed`.
- `sponsorship_categories.funded_amount` updates through an idempotent RPC.
- `transactions` and `audit_logs` are inserted.
- Resend receipt email is best-effort and non-blocking when not configured.

## Manual Stripe Test

Use Stripe test card:

```text
4242 4242 4242 4242
```

Then verify:

- Success page loads.
- Contribution becomes `paid`.
- Sponsorship category funded amount increases once.
- Replaying webhook does not increase funded amount again.
- Dashboard totals update.

## Known Pre-Launch Check

`lib/payments/stripe.ts` currently pins Stripe API version `2025-02-24.acacia`. Before final production go-live, decide whether to upgrade to the latest Stripe API version supported by the installed SDK and Stripe account after testing webhooks in staging.
