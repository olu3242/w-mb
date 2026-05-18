# Owambe OS — Code Audit Report

---

## 1. Build & Compilation Issues

### 🔴 **P0: types/database.ts is Empty**

| Aspect | Detail |
|--------|--------|
| **File** | `types/database.ts` |
| **Current** | Empty file (0 bytes) |
| **Expected** | Generated Supabase types from migrations |
| **Impact** | 50+ files fail to import `Database` type; 129 TS errors |
| **Root Cause** | `npm run db:types` never executed, or local Supabase not running |
| **Fix** | `supabase gen types typescript --linked > types/database.ts` (if Supabase linked) OR `supabase gen types typescript --local > types/database.ts` |
| **Beta Blocker** | YES |

---

### 🔴 **P0: next.config.ts Should be .js**

| Aspect | Detail |
|--------|--------|
| **File** | `next.config.ts` |
| **Current** | TypeScript config file |
| **Expected** | `next.config.js` |
| **Build Error** | `Error: Configuring Next.js via 'next.config.ts' is not supported` |
| **Impact** | Build fails immediately |
| **Fix** | Rename to `next.config.js` (Next.js 16 requires .js) |
| **Beta Blocker** | YES |

---

### 🟡 **P1: ESLint Babel Parser Missing**

| Aspect | Detail |
|--------|--------|
| **File** | `eslint.config.mjs` |
| **Error** | `Cannot find module 'next/dist/compiled/babel/eslint-parser'` |
| **Current** | ESLint config references missing parser |
| **Impact** | `npm run lint` fails; no code quality checks |
| **Fix** | Run `npm install` to restore node_modules OR update eslint config to use Flat Config API |
| **Workaround** | Skip lint in CI until fixed |

---

## 2. TypeScript Compilation Errors (129 total)

### 🟡 **P2: Link Component Children Type Errors** (80+ instances)

| Aspect | Detail |
|--------|--------|
| **Pattern** | All Link components with string children fail type check |
| **Files Affected** | app/(dashboard)/events/[slug]/page.tsx (17 errors) Footer, Navbar, layout components, organization pages |
| **Current** | `<Link href={...}>{children}</Link>` — children as string |
| **Expected** | `<Link href={...}><span>{children}</span></Link>` or use proper typing |
| **Example Error** | `Property 'children' does not exist on type IntrinsicAttributes` |
| **Fix** | Wrap all string children in span/div or update Next.js Link import |
| **PR Count** | ~40 replacements |
| **Effort** | 1-2 hours automated fix |

---

### 🟡 **P2: Module Not Found Errors** (40+ instances)

| Pattern | Count | Examples |
|---------|-------|----------|
| `Cannot find module 'next/navigation'` | 20 | auth routes, event pages, dashboard layout |
| `Cannot find module 'next/server'` | 15 | all API routes |
| `Cannot find module 'next/headers'` | 2 | supabase/server.ts, session.ts |
| `Cannot find module 'next/image'` | 2 | HeroScene, Navbar components |
| `Cannot find module 'next/og'` | 1 | opengraph-image.tsx |

**Root Cause**: TypeScript not finding Next.js type definitions (likely build artifact issue)

**Fix**: 
1. Delete `.next/` directory
2. Run `npm run typecheck` again
3. If still fails, check `tsconfig.json` includes

---

### 🟡 **P2: Database Type Import Failures** (10 instances)

| Aspect | Detail |
|--------|--------|
| **Error** | `File '..../types/database.ts' is not a module` |
| **Files** | automation.ts, memory/engine.ts, facets.ts, notifications/engine.ts, workspace-generation.ts, ops/activity.ts, payments/trust.ts, supabase/*.ts |
| **Root Cause** | types/database.ts is empty (no exports) |
| **Fix** | Generate types from Supabase (see P0 issue above) |

---

### 🟡 **P2: Null Safety in Payment Routes**

| Aspect | Detail |
|--------|--------|
| **File** | `app/api/escrow/payout/route.ts` line 97 |
| **Error** | `Type 'string \| null' is not assignable to type 'string'` |
| **Code** | `recipientCode` passed to `initiateTransfer()` which requires non-null string |
| **Issue** | `recipientCode` can be null if Paystack recipient creation fails |
| **Fix** | Add null check or throw error before passing |
| **Example** | `if (!recipientCode) return NextResponse.json({ error: '...' })` |

---

### 🟡 **P2: Paystack Client Type Issues**

| Aspect | Detail |
|--------|--------|
| **File** | `lib/paystack/client.ts` lines 84, 99 |
| **Error** | `No overload matches this call` — `next: { revalidate: 0 }` unknown |
| **Cause** | `next` option not part of RequestInit type in this Node.js version |
| **Fix** | Use `fetch()` wrapper or update TypeScript/Node types |
| **Workaround** | Remove `next` key from fetch options (caching handled by defaults) |

---

### 🟡 **P3: Implicit Any Types**

| Aspect | Detail |
|--------|--------|
| **Examples** | line 129 [slug]/page.tsx: `item` parameter, line 557: `action, index` parameters, line 167 e/[slug]/page.tsx: `contribution` parameter |
| **Count** | ~5 instances |
| **Fix** | Add explicit types to function parameters |

---

## 3. Routes & API Endpoints Audit

### API Route Structure

| Endpoint | Method | Purpose | Status | Security Check |
|----------|--------|---------|--------|-----------------|
| `/api/events` | POST, GET | Create/list events | ✅ | User owned |
| `/api/contributions` | POST | Submit contribution | ✅ | Public (no auth) |
| `/api/payments/webhook/stripe` | POST | Stripe webhook | ✅ | Signature verified |
| `/api/paystack` | POST | Paystack webhook | ✅ | HMAC verified |
| `/api/verify-payment` | POST | Verify payment | ✅ | User auth + event ownership |
| `/api/escrow/allocate` | POST | Allocate to vendor | ⚠️ | User auth only (admin client) |
| `/api/escrow/payout` | POST, PATCH | Payout vendor | ⚠️ | User auth only (admin client) |
| `/api/rsvps` | POST | Submit RSVP | ✅ | Token-based |
| `/api/organizations` | POST, GET | Create/list orgs | ✅ | User owned |

### ⚠️ **Security: Admin Client Over-Usage**

**Files Using `createAdminClient()`**:
- `app/api/contributions/route.ts`
- `app/api/escrow/allocate/route.ts`
- `app/api/escrow/payout/route.ts`
- `app/api/escrow/release/route.ts`
- `app/api/rsvps/route.ts`
- `app/api/pledges/route.ts`
- `app/api/payout-requests/route.ts`
- `app/api/payments/webhook/stripe/route.ts`
- `app/api/verify-payment/route.ts`

**Issue**: Admin client bypasses RLS. If route is exposed to client-side caller, RLS is bypassed.

**Correct Pattern**:
- ✅ Routes are server-only (not called from client directly)
- ❌ But no middleware enforces this
- ❌ If caller code changes, could break

**Fix**:
1. Add middleware to verify routes are server-side only
2. Add `'use server'` to all server actions
3. Consider using `createClient()` with user context instead of admin in more places

---

## 4. Components Audit

### Authentication & Layout Components

| Component | File | Status | Issue |
|-----------|------|--------|-------|
| Dashboard Guard | `app/(dashboard)/layout.tsx` | ✅ | Redirects unauthenticated to /login |
| Auth Forms | `app/(auth)/login/page.tsx` | 🟡 | Form validation minimal |
| Signup | `app/(auth)/signup/page.tsx` | 🟡 | No email verification flow |
| Navigation | `components/layout/nav.tsx` | ✅ | Basic nav working |
| Sidebar | `components/layout/sidebar.tsx` | ✅ | Dashboard sidebar functional |

### Event Components

| Component | File | Status | Issue |
|-----------|------|--------|-------|
| Event Hub | `app/(dashboard)/events/[slug]/page.tsx` | ⚠️ | 17 TS errors, massive page (800+ lines) |
| Event Card | `components/events/event-card.tsx` | 🟡 | Link type error |
| Task Status Button | `components/events/task-status-button.tsx` | ✅ | Status selector working |
| Vendor Status Select | `components/events/vendor-status-select.tsx` | ✅ | Status selector working |

### AI Components (Not Integrated)

| Component | File | Status | Issue |
|-----------|------|--------|-------|
| Alice Chat Widget | `components/landing/alice-chat-widget.tsx` | ❌ | Exists but never called; no backend |
| Alice Alerts | `components/alice/alice-alerts.tsx` | ❌ | Component exists but not wired |
| Alice Budget View | `components/alice/alice-budget-view.tsx` | ❌ | Not integrated |
| Alice Unlock Card | `components/alice/alice-unlock-card.tsx` | ✅ | Payment card working |

---

## 5. Library & Service Audit

### Supabase Integration

| File | Purpose | Status | Issue |
|------|---------|--------|-------|
| `lib/supabase/client.ts` | Browser client | ✅ | Works (uses `createBrowserClient`) |
| `lib/supabase/server.ts` | Server client | ✅ | Works (RSC-safe) |
| `lib/supabase/admin.ts` | Service role | ✅ | Works but needs protection |
| `lib/supabase/session.ts` | Session middleware | ✅ | Middleware auth working |

### Payment Clients

| File | Status | Issue |
|------|--------|-------|
| `lib/stripe/client.ts` | ✅ | Stripe client configured |
| `lib/paystack/client.ts` | ⚠️ | Type issues with fetch options |

### AI & Orchestration

| File | Status | Integration |
|------|--------|-------------|
| `lib/ai/providers/index.ts` | ✅ | Provider factory working |
| `lib/ai/context.ts` | ✅ | Context builder complete |
| `lib/ai/orchestrator.ts` | ✅ | Orchestrator functional |
| `lib/ai/chat/assistant.ts` | ✅ | Chat methods exist but not called from anywhere |
| `lib/ai/memory/engine.ts` | ✅ | Memory persistence ready |
| `lib/ai/automation.ts` | ✅ | Automation rules ready |

**Issue**: All AI modules are complete but never called from user-facing routes or components.

---

## 6. Database Audit (Schema)

### 21 Migrations Present

| Migration | Purpose | Status |
|-----------|---------|--------|
| 001 | Core schema (events, tasks, gifts, vendors) | ✅ |
| 002 | RLS policies | ✅ |
| 003-004 | ALICE planning engine | ✅ |
| 005 | ALICE RLS | ✅ |
| 006-007 | Vendor scoring & RPCs | ✅ |
| 008 | Venues & timeline | ✅ |
| 009 | Payments & vendors | ✅ |
| 010-011 | Escrow system & RPCs | ✅ |
| 012 | Profiles & auth flow | ✅ |
| 013 | Event themes | ✅ |
| 014 | AI planning workspace | ✅ |
| 015 | Contributions & vendor memory | ✅ |
| 016 | Payments trust foundation | ✅ |
| 017 | Collaboration & guest ops | ✅ |
| 018 | AI operations layer | ✅ |
| 019 | AI orchestration engine | ✅ |
| 020 | Platform scale AI ops | ✅ |
| 021 | (Missing file) | ❌ |

**Issue**: Migration 021_platform_scale_org_vendor_ecosystem.sql not found. Need to verify what was intended.

---

## 7. RLS Policy Audit

### Coverage by Table

| Table | RLS Enabled | Policy Count | Gaps |
|-------|-------------|--------------|------|
| `events` | ✅ | 2 policies | Owner + public visibility OK |
| `event_tasks` | ✅ | 1 policy | Via event ownership |
| `contributions` | ✅ | 3 policies | Manager read, anyone insert, public view OK |
| `vendors` | ✅ | 1 policy | Via event ownership |
| `committee_roles` | ✅ | 1 policy | Via event ownership |
| `event_organizers` | ✅ | 2 policies | Owner + active organizer read OK |
| `vendor_allocations` | ✅ | 1 policy | Via event ownership |
| `escrow_accounts` | ✅ | 1 policy | Via event ownership |
| `admin_reviews` | ✅ | 1 policy | Admin-only OK |
| `audit_logs` | ✅ | 1 policy | Admin read + insert |
| **Gap Areas** | ⚠️ | | |
| `payout_accounts` | ✅ | 1 policy | Owners only but no org check |
| `payout_requests` | ✅ | 3 policies | Manager-scoped but no org isolation |
| `organizations` | ? | Unknown | Need to verify |
| `organization_members` | ? | Unknown | Need to verify |

**Key Gaps**:
1. **Organization Isolation**: Some tables may not enforce org_id in RLS
2. **Payout Request Access**: Can user from org A see payout requests from org B?
3. **Event Cross-Org**: Can user access events outside their organization?

**Audit Recommendation**: Run `select * from pg_policies;` on linked Supabase to verify all policies.

---

## 8. Environment & Config Audit

### Environment Variables Required

| Variable | Type | Location | Status |
|----------|------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | .env.local | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | .env.local | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | .env.local | ⚠️ |
| `STRIPE_SECRET_KEY` | Secret | .env.local | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Secret | .env.local | ⚠️ |
| `PAYSTACK_SECRET_KEY` | Secret | .env.local | ⚠️ |
| `ALICE_FEE_KOBO` | Config | .env.local | ✅ |
| `NEXT_PUBLIC_APP_URL` | Public | .env.local | ✅ |

**Issues**:
- Service role key stored in .env (should use Vault in production)
- Webhook secrets not rotated
- No secret rotation policy

---

## 9. File Organization & Code Quality

### Strengths
- ✅ Clear separation of concerns (app/, lib/, components/, types/)
- ✅ Server actions in `app/actions/`
- ✅ Consistent naming conventions
- ✅ Type-safe Zod validations in most routes

### Weaknesses
- ❌ Event hub page too large (800+ lines) — should split into sub-components
- ❌ No error boundary components
- ❌ Limited error handling in async operations
- ❌ No loading states in many async flows
- ❌ Some duplicate API call patterns (could extract to hooks)
- ❌ No comprehensive test suite (no tests/ directory)

---

## 10. Production Readiness Checklist

| Item | Status | Notes |
|------|--------|-------|
| TypeScript strict mode | ❌ | Errors block build |
| Linting | ❌ | ESLint broken |
| Unit tests | ❌ | No test files found |
| Integration tests | ❌ | No e2e test suite |
| Error tracking | ❌ | No Sentry/error service |
| Monitoring | ❌ | No APM or metrics |
| Health check endpoint | ❌ | No /api/health |
| Smoke test script | ❌ | smoke:launch not implemented |
| CI/CD pipeline | ⚠️ | Vercel configured, but local build fails |
| Database backup | ⚠️ | Supabase handles if hosted |
| Secrets management | ❌ | No vault; env vars in .local |
| Rate limiting | ❌ | No rate limit middleware |
| CORS config | ? | Need to verify vercel.json |
| Security headers | ⚠️ | Likely missing X-Frame-Options, etc. |

---

## 11. Critical Recommendations

| Priority | Issue | Action | Owner | Timeline |
|----------|-------|--------|-------|----------|
| **P0** | Empty types/database.ts | Generate: `supabase gen types typescript --linked > types/database.ts` | Backend | Day 1 |
| **P0** | next.config.ts → .js | Rename file | Build | Day 1 |
| **P0** | Delete .next/ build cache | Run: `rm -rf .next && npm run typecheck` | Build | Day 1 |
| **P1** | Fix Link component types | Update all Link usage or Next.js upgrade | Frontend | Day 2 |
| **P1** | Audit RLS policies | Query `pg_policies` view in Supabase | Security | Day 2 |
| **P1** | Add service role protection | Middleware check for server-side only routes | Security | Day 3 |
| **P1** | Fix Paystack null safety | Add guard: `if (!recipientCode) throw error` | Backend | Day 3 |
| **P2** | Wire AI to UI | Create chat endpoint + widget integration | Feature | Week 1 |
| **P2** | Add health check endpoint | `/api/health` with DB connection test | DevOps | Week 1 |
| **P2** | Integrate Sentry | Error tracking SDK setup | DevOps | Week 1 |
| **P3** | Add test suite | Create tests/ directory, write critical path tests | QA | Week 2 |

