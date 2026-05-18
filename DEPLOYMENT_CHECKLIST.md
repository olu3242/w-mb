# Deployment Checklist

## Supabase

1. Link project:

```bash
supabase link --project-ref <project-ref>
```

2. Check migration state:

```bash
supabase migration list --linked
```

3. Apply pending migrations if expected:

```bash
supabase migration up --linked
```

4. Run lint:

```bash
supabase db lint --linked
```

5. Regenerate types:

```bash
supabase gen types typescript --linked > types/database.ts
```

## Vercel

1. Set required env vars from `ENVIRONMENT_CHECKLIST.md`.
2. Set Supabase auth redirect URLs:

```text
https://<production-domain>/api/auth/callback
https://<preview-domain>/api/auth/callback
```

3. Deploy preview.
4. Run:

```bash
npm run typecheck
npm run lint
npm run build
npm run smoke:launch
```

5. Run `MANUAL_SMOKE_TEST.md` against preview.

## Stripe

1. Configure webhook endpoint.
2. Add webhook secret to Vercel.
3. Use test mode in preview.
4. Use live mode only after webhook replay passes.

## Email

1. Configure `RESEND_API_KEY` if receipts are required at launch.
2. Verify sender domain for production receipts.
3. Confirm webhook does not fail when email sending is unavailable.

## Cutover

1. Deploy production.
2. Run auth callback test.
3. Run one Stripe test or live low-value contribution depending on environment.
4. Confirm admin diagnostics.
5. Monitor Vercel logs, Supabase logs, and Stripe webhook delivery for the first launch window.
