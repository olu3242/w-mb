# Environment Checklist

## Required Vercel Variables

| Variable | Scope | Required | Notes |
|---|---|---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client/server | Yes | Supabase project URL. Public by design. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client/server | Yes | Supabase anon key. Public by design, protected by RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Yes | Never expose to client. Used by admin route handlers/server utilities. |
| `NEXT_PUBLIC_SITE_URL` | Client/server | Yes | Production origin, for example `https://app.owambe...`. |
| `STRIPE_SECRET_KEY` | Server only | Yes | Stripe live or test secret key by environment. |
| `STRIPE_WEBHOOK_SECRET` | Server only | Yes | Secret for `/api/payments/webhook/stripe`. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client/server | Yes | Stripe publishable key. Public by design. |
| `RESEND_API_KEY` | Server only | Optional | If absent, receipt email is skipped and webhook still succeeds. |

## Optional AI Variables

| Variable | Required | Notes |
|---|---:|---|
| `AI_PROVIDER` | No | Defaults to deterministic behavior when omitted. |
| `OPENAI_API_KEY` | No | Required only when `AI_PROVIDER=openai`. |
| `CLAUDE_API_KEY` | No | Required only when `AI_PROVIDER=claude`. |

## Existing `.env.example`

The repository includes placeholders for the required Supabase, Stripe, Resend, and site URL variables.

## Local Static Check

Run:

```bash
npm run smoke:launch
```

This fails when required env vars are absent in the shell. That is expected on machines without production/staging env loaded.

## Vercel Notes

- Set all server secrets as encrypted Vercel environment variables.
- Do not prefix secrets with `NEXT_PUBLIC_`.
- Set separate values for Preview and Production.
- `NEXT_PUBLIC_SITE_URL` should match the deployed URL used by Stripe success/cancel redirects and Supabase auth redirects.
