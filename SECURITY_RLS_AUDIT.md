# Owambe OS — Security & RLS Audit

---

## Executive Summary

**Security Posture**: 🟡 **MODERATE RISK**  
**RLS Coverage**: 🟡 **PARTIAL**  
**Production Ready**: ❌ **NO**  

**Critical Issues**:
1. ❌ Service role key stored in environment (not vault)
2. ⚠️ RLS policies incomplete for organization isolation
3. ⚠️ Webhook signature verification implemented but secrets not rotated
4. ✅ Escrow system uses `security definer` functions (good)
5. ✅ Stripe Connect account validation present
6. ⚠️ Admin panel not protected (no admin UI exists)

---

## 1. Service Role & Admin Client Security

### 🔴 **P1: Service Role Key in Environment**

| Aspect | Status |
|--------|--------|
| **Current** | `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` |
| **Risk** | If .env is committed or logged, service role key exposed |
| **Impact** | Attacker can bypass all RLS policies |
| **Usage** | 40+ API routes use `createAdminClient()` |
| **Files** | `lib/supabase/admin.ts` |

**Affected Routes** (40+):
- `/api/contributions` — inserts contributions without RLS
- `/api/escrow/*` — allocates/releases escrow without RLS
- `/api/payments/webhook/stripe` — processes payments
- `/api/verify-payment` — verifies payments
- `/api/rsvps` — processes RSVPs
- `/api/pledges` — processes pledges
- `/api/payout-requests` — creates payout requests
- `/api/organizations` — creates organizations

**Mitigation**:
1. ✅ These routes ARE server-only (not exposed to client)
2. ⚠️ But no middleware enforces server-only constraint
3. ⚠️ Shared hosting could leak environment variables

**Fix**:
- [ ] Move to Supabase Vault (Production)
- [ ] Add middleware to verify routes aren't called from client
- [ ] Implement request signing (not just auth header)
- [ ] Rotate keys monthly
- [ ] Use short-lived tokens if possible

**Effort**: 1-2 days

---

### 🟡 **P2: Admin Routes Unprotected**

| Aspect | Status |
|--------|--------|
| **Current** | No role-based access control on admin routes |
| **Example** | `/api/payout-requests` available to any authenticated user (checks only user auth, not role) |
| **Impact** | Event owner could try to approve own payouts |
| **Affected** | Payout request flow, admin reviews |

**Code Review** of `app/api/payout-requests/route.ts`:
```ts
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
// Only checks user exists, not role
// Should check: is_admin() or has_role('finance')
```

**Fix**:
- [ ] Add role check: `if (!is_admin(user)) return 403`
- [ ] Create `is_admin()` function that checks user metadata
- [ ] Add middleware for all admin routes

---

## 2. RLS Policy Audit

### Organization Isolation Risk 🔴

| Table | Org Check | Policy | Risk |
|-------|-----------|--------|------|
| `events` | ✅ | owner_id check | User can only access own events |
| `event_tasks` | Via event | owner check | Inherits from event |
| `contributions` | ⚠️ | No org check | Can user A see org B's contributions? |
| `escrow_accounts` | ⚠️ | No org check | Can see any org's escrow? |
| `payout_requests` | ⚠️ | No org check | Can see any org's payouts? |
| `organizations` | ⚠️ | No org check | Can user see other orgs? |
| `organization_members` | ❌ | Unknown | Need to verify |
| `vendor_allocations` | ⚠️ | No org check | Cross-org vendor visibility? |

**Current RLS Policy Example** (from 002_rls.sql):
```sql
create policy "managers read contributions" on contributions for select
  using (can_manage_event(occasion_id));

create policy "contributors read own contributions" on contributions for select
  using (current_user_id = contributor_id);
```

**Gap**: No org_id check. A manager of org A can see org B contributions if they know the event_id.

**Fix Pattern**:
```sql
-- Add org_id check
create policy "managers read contributions" on contributions for select
  using (
    can_manage_event(occasion_id) AND 
    (SELECT org_id FROM events WHERE id = occasion_id) = current_user_org()
  );
```

**Impact**: 🔴 **P1** — Multi-tenant data leakage risk

---

### Escrow Account RLS 🟡

**Current Policy**:
```sql
create policy "escrow_owner" on escrow_accounts for all using (
  can_manage_event(event_id)
);
```

**Issue**: Only checks event ownership, not organization isolation.

**Scenario**:
1. Org A has event E1
2. User from Org B somehow authenticates as org A user
3. User can access E1 escrow account (if user in same org)

**Assessment**: Medium risk (requires compromised user, but possible if identity federation misconfigured)

---

### Payment Flow Security ✅

**Positive Findings**:

1. **Stripe Webhook Signature Verification** ✅
   ```ts
   const sig = request.headers.get('stripe-signature')
   const event = stripe.webhooks.constructEvent(rawBody, sig, endpoint_secret)
   ```
   - Signature verified before processing
   - Raw body used (correct pattern)

2. **Paystack Webhook Signature Verification** ✅
   ```ts
   if (!verifyPaystackSignature(rawBody, signature)) {
     return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
   }
   ```
   - HMAC-SHA512 verification
   - Rejects unsigned webhooks

3. **Payment Event Idempotency** ✅
   ```ts
   const { data: existing } = await admin
     .from('payment_events').select('id').eq('reference', ref).maybeSingle()
   
   if (existing?.processed_at) return { status: 'already_processed' }
   ```
   - Duplicate payment detection
   - Prevents double-crediting

4. **Event Ownership Check** ✅
   ```ts
   const { data: event } = await supabase
     .from('events').select('id').eq('id', event_id).eq('owner_id', user.id).single()
   if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
   ```
   - Payment routes verify user owns event

---

### RLS Function Audit 🟡

**Key Functions**:
1. `can_manage_event(event_id)` — Checks user is event owner or organizer
2. `is_admin()` — Checks if user is admin (only for admin reviews)
3. `can_view_event_ops(event_id)` — Used for operations tables (checkins, alerts)

**Issue**: `can_view_event_ops()` used without organization check.

```sql
create policy "ops manage emergency alerts" on event_emergency_alerts for all
  using (can_view_event_ops(occasion_id))
```

**Should be**:
```sql
create policy "ops manage emergency alerts" on event_emergency_alerts for all
  using (can_view_event_ops(occasion_id) AND check_org_access(occasion_id))
```

---

## 3. Data Leakage Risks

### 🟡 **P1: Contribution Data Visible Across Orgs**

**Scenario**:
1. Organization A has Event E1 with contributions
2. User U from Organization B somehow gains Org A role
3. User U authenticates and calls: `SELECT * FROM contributions WHERE occasion_id = E1`
4. **Result**: U can see all contribution details (amounts, names, emails)

**Current Mitigation**:
- ✅ User must be authenticated
- ⚠️ But if authenticated to wrong org, RLS doesn't catch org boundary
- ✅ Would need compromised or misconfigured identity provider

**Risk Level**: Medium (requires identity provider compromise)

---

### 🟡 **P2: Escrow Balance Exposure**

**Data Sensitivity**: Escrow balance reveals event funding level (sensitive competitive info)

**Current RLS**:
```sql
select 'manager can read escrow' on escrow_accounts for select using (
  can_manage_event(event_id)
);
```

**Issue**: Doesn't prevent reading other orgs' events (if RLS org check fails)

---

### ✅ **P0: Vendor Data Protected**

**Positive Finding**: Vendor quotes and allocations tied to `event_id`, which has owner check.

---

## 4. Admin & Audit Trail Security

### ✅ Audit Logging Implemented

**Tables**:
- `audit_logs` — All payout/admin actions logged
- `activity_feed` — Event activity tracked
- `orchestration_logs` — AI orchestration logged

**Example Audit Entry**:
```sql
INSERT INTO audit_logs (user_id, action, subject_id, metadata)
VALUES (current_user_id(), 'payout_created', payout_id, {...})
```

**Strength**: Full audit trail for compliance

**Weakness**: No real-time alerting on suspicious actions

---

### ⚠️ Admin Review System

**Current**:
- Admin reviews exist in `admin_reviews` table
- Payout requires admin approval before processing
- Reviews tied to `user_id` (which admin reviewed)

**Issue**: No actual admin dashboard (no admin UI exists to approve/reject)

**Current Flow**:
1. Event manager submits payout request
2. Payout request creates `admin_review` with `pending` status
3. **Admin needs code/API call to approve** (no UI)

**Risk**: Low (would require manual API calls to approve payouts, unlikely mistake)

---

## 5. Webhook Security

### 🟡 **P1: Webhook Secret Rotation**

| Provider | Secret Key | Rotation | Validation |
|----------|-----------|----------|------------|
| **Stripe** | `STRIPE_WEBHOOK_SECRET` | ❌ None | ✅ Signature verified |
| **Paystack** | `PAYSTACK_SECRET_KEY` | ❌ None | ✅ HMAC verified |

**Issue**: Secrets never rotated; if leaked, attacker can forge webhook events.

**Attack Scenario**:
1. Attacker obtains `PAYSTACK_SECRET_KEY` from GitHub history
2. Attacker crafts fake `charge.success` webhook with valid signature
3. Alice unlocking happens fraudulently
4. Event gets unlocked without payment

**Fix**:
- [ ] Rotate secrets monthly
- [ ] Use short-lived tokens where possible
- [ ] Monitor for webhook replays
- [ ] Add idempotency keys to webhooks

---

## 6. Payment Provider Security

### ✅ **Stripe Connect Account Validation**

**Good Pattern** from `app/api/stripe/connect/route.ts`:
```ts
const { data: event } = await supabase
  .from('events')
  .select('stripe_account_id')
  .eq('id', eventId)
  .eq('owner_id', user.id)  // Verify ownership
  .single()

const account = await stripe.accounts.retrieve(event.stripe_account_id)
```

**Strength**: Verifies user owns event before connecting account

---

### 🟡 **Paystack Recipient Code Storage**

**Current**:
```ts
await admin.from('vendors').update({ 
  paystack_recipient_code: recipientCode 
}).eq('id', alloc.vendor_id)
```

**Issue**: Recipient code stored in plain text; if DB leaked, can be replayed for payouts

**Fix**: 
- [ ] Encrypt recipient codes at rest
- [ ] Use temporary codes per payout

---

## 7. Authentication & Session Security

### ✅ Supabase Auth with SSR

**Pattern** (lib/supabase/server.ts):
```ts
const cookieStore = await cookies()
return createServerClient<Database, 'public'>(url!, anonKey!, {
  cookies: { getAll, setAll }
})
```

**Strength**: 
- ✅ Uses `@supabase/ssr` (secure cookies)
- ✅ Anon key doesn't bypass RLS
- ✅ Session stored in secure cookie

**Weakness**:
- No CSRF protection visible
- No CORS configuration audit

---

### 🟡 **P2: OAuth Configuration**

**Current**: Google OAuth configured but not reviewed

**Questions**:
- [ ] Redirect URIs whitelisted?
- [ ] Client secret stored securely?
- [ ] Token expiration reasonable?

---

## 8. API Rate Limiting & DDoS

### ❌ **P2: No Rate Limiting**

**Risk**: Attackers can:
- Brute-force payment verification
- Spam contributions API
- Flood webhook receivers

**Missing**:
- [ ] Rate limit middleware
- [ ] Request throttling per user
- [ ] DDoS protection (Cloudflare, AWS Shield)

---

## 9. Data Validation & Input Sanitization

### ✅ Zod Validation Implemented

**Example** from `app/api/payout-requests/route.ts`:
```ts
const schema = z.object({
  amount: z.number().positive(),
  reason: z.string().max(500),
  // ...
})
```

**Strength**: Type-safe validation before processing

### 🟡 **P2: XSS Prevention**

**Issue**: Some event content rendered without sanitization

**Example**: Event `description` field rendered in HTML without escaping

**Risk**: Low (only event owner controls, but still risk)

**Fix**: Use `sanitize-html` library or Markdown sanitizer

---

## 10. Mobile App Security

### ❌ **P2: Mobile App Security Not Applicable**

**Status**: No mobile app exists yet

**Future Consideration**: When building mobile app:
- [ ] Use certificate pinning
- [ ] Implement deeplink validation
- [ ] Secure biometric auth
- [ ] Prevent jailbreak/rooting access

---

## 11. Compliance & Legal

### ✅ Audit Trail Exists
- Transaction logs for all payments
- Admin review logs for payouts
- Activity feed for event coordination

### ⚠️ **P2: GDPR Compliance Unclear**

**Missing**:
- [ ] Data retention policy
- [ ] Right-to-be-forgotten implementation
- [ ] Data export API
- [ ] Privacy policy in app

**Required for EU users**:
- Ability to delete account + associated data
- Data portability
- Consent management

### ⚠️ **P3: PCI-DSS Compliance**

**Current**: Using Stripe & Paystack (PCI-compliant providers)

**Good**: Direct card data NOT stored

**Consideration**: Payment event logs contain transaction amounts (not PII)

---

## 12. Security Recommendations Priority Matrix

| Priority | Issue | Action | Owner | Timeline |
|----------|-------|--------|-------|----------|
| **P0** | Build broken | Fix types/database.ts | Eng | Day 1 |
| **P1** | RLS org isolation gaps | Add org_id checks to policies | Security | Day 2 |
| **P1** | Admin client unprotected | Add middleware + role checks | Security | Day 2 |
| **P1** | Webhook secret rotation | Implement rotation policy | DevOps | Week 1 |
| **P1** | Service role in env | Move to Vault (prod) | DevOps | Week 1 |
| **P2** | No rate limiting | Add middleware | Backend | Week 1 |
| **P2** | XSS vulnerability | Sanitize event descriptions | Frontend | Week 1 |
| **P2** | GDPR compliance | Implement data deletion | Backend | Week 2 |
| **P3** | Mobile security | Plan for app launch | Architecture | Planning |

---

## 13. Security Score

| Category | Score | Status |
|----------|-------|--------|
| Authentication | 8/10 | ✅ Supabase SSR good |
| Authorization | 5/10 | 🟡 RLS gaps significant |
| Data Protection | 6/10 | 🟡 No encryption, secrets in env |
| Audit & Logging | 8/10 | ✅ Comprehensive logs |
| Payment Security | 8/10 | ✅ Webhook validation good |
| API Security | 5/10 | 🟡 No rate limiting |
| **Overall** | **6.7/10** | **🟡 MODERATE RISK** |

---

## 14. Pre-Production Checklist

- [ ] All RLS policies audit complete
- [ ] Organization isolation verified
- [ ] Admin routes role-protected
- [ ] Service role key secured (Vault or secrets manager)
- [ ] Webhook secrets rotated
- [ ] Rate limiting implemented
- [ ] XSS sanitization added
- [ ] GDPR compliance verified
- [ ] Security headers added (X-Frame-Options, CSP, etc.)
- [ ] CORS properly configured
- [ ] CSRF tokens implemented
- [ ] Penetration test passed

