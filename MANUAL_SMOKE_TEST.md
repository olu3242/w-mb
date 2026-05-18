# Manual Smoke Test

Run this against a Vercel preview or staging deployment with staging Supabase and Stripe test mode.

## Auth

1. Open `/signup`.
2. Create an account.
3. Confirm email if Supabase email confirmation is enabled.
4. Confirm `/api/auth/callback?next=/dashboard` lands on `/dashboard`.
5. Sign out.
6. Sign in at `/login`.
7. Open `/dashboard` while signed out and confirm redirect to `/login`.

## Event Lifecycle

1. Create a wedding/owambe occasion.
2. Confirm theme activation and AI starter workspace generation.
3. Confirm event dashboard shows checklist, budget, vendors, AI assistant summary, diaspora context, operations center, and WhatsApp actions.
4. Save an AI memory snapshot and confirm it appears in the memory panel.

## Public Page

1. Open `/e/[slug]`.
2. Confirm public-safe event story, sponsorship categories, contribution form, and memory wall render.
3. Confirm no transactions, payout requests, private tasks, AI memory, or budget internals appear.

## Contributions/Stripe

1. Select a sponsorship category.
2. Enter amount, name, email, optional message, anonymous toggle.
3. Start Stripe Checkout.
4. Pay with `4242 4242 4242 4242`.
5. Return to success page.
6. Confirm dashboard paid totals and sponsorship funded amount update.
7. Replay webhook and confirm funded amount does not double-count.
8. Cancel a second checkout and confirm the cancel page is friendly.

## Vendors

1. Browse suggested vendors from event dashboard.
2. Submit a vendor quote request.
3. Confirm organizer dashboard shows inquiry.
4. Sign in as vendor owner if available and confirm `/vendors` CRM only shows owned listings/leads.

## Organizations

1. Create an organization.
2. Add/link an event.
3. Create an organization fund.
4. Invite/add a member.
5. Confirm organization dashboard analytics render.
6. Confirm a non-member cannot load private org details.

## AI/WhatsApp

1. Confirm AI assistant summary renders without OpenAI/Claude keys.
2. Click WhatsApp RSVP link and confirm generated text is public-safe.
3. Click contribution/reminder/vendor check-in links and confirm no private financial details are included.

## Admin

1. As non-admin, confirm `/admin/reviews`, `/admin/payouts`, and `/admin/ai-ops` are blocked.
2. As admin/support, confirm pages load.
3. Confirm AI ops page shows logs/snapshots without exposing to non-admins.
