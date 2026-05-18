# Security Audit

## Status

Overall status: **Pass with operational verification required**

## Server Secrets

Reviewed references to:

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`

Findings:

- Service role is accessed through `lib/supabase/admin.ts`.
- Stripe secret access is in server payment modules.
- Stripe webhook secret is read only inside webhook verification code.
- Resend is lazily initialized and skipped when not configured.
- No client component imports of `createAdminClient` were found by the added static smoke script.

Command:

```bash
npm run smoke:launch
```

## Public Data Boundaries

Public event pages should only expose:

- public event metadata
- public sponsorship categories
- public memory posts
- masked or public-safe contribution summaries
- public event updates

Public pages must not expose:

- transactions
- payment events
- payout requests
- budget internals
- private tasks
- AI memory
- orchestration logs
- private org funds

## Admin Controls

Admin pages reviewed:

- `/admin/reviews`
- `/admin/payouts`
- `/admin/ai-ops`

These routes call `requireAdmin()`, which checks authenticated user profile role for `admin` or `support`.

## Payment Security

Stripe Checkout is created server-side. Webhooks verify the `stripe-signature` header before processing. Duplicate provider events are tracked in `payment_events`.

Action required before launch:

- Create the Stripe webhook endpoint for `/api/payments/webhook/stripe`.
- Confirm the production webhook secret is in Vercel.
- Replay `checkout.session.completed` and `payment_intent.succeeded` events and confirm no double-count.

## AI/Data Privacy

AI operations are deterministic by default unless `AI_PROVIDER` is configured. AI memory and orchestration logs are event-ops scoped by RLS and displayed only on protected dashboards/admin diagnostics.

## Risks To Monitor

- Some public insert routes intentionally allow unauthenticated contribution/memory workflows. Keep validation strict and rate-limit at the edge/WAF if public traffic grows.
- Hosted Supabase policies must be verified after linking the project.
- Organization fund public visibility should stay summary-level until org payments are fully designed.
