# Sakeni Security Audit

Date: 2026-07-16
Branch: `security/full-hardening`
Scope: repository-level review of the Sakeni web application, Supabase database, Supabase Edge Functions, storage policies, CI, and launch documentation.

## Baseline

Required pre-change commands were run before edits:

| Command | Result |
| --- | --- |
| `git status` | Clean on `main`; later switched to `security/full-hardening`. |
| `git branch --show-current` | `main` at baseline; active work branch is `security/full-hardening`. |
| `git log --oneline --decorate -n 10` | Latest baseline commit: `450b4c3 (main, origin/main, origin/HEAD) Fix signup persistence and chat access`. |
| `git diff --stat` | Empty before changes. |
| `npm ci` | Passed. Windows cleanup warnings only. |
| `npm run check` | Passed at baseline: lint, 8 tests, production build, npm audit. |
| Secret scan | No tracked high-confidence secrets in source/history. Placeholders only in `.env.example` and config templates. A generated `.next` source map contained a dependency-like `re_` pattern; no value is reported here. |

## Architecture Summary

| Area | Evidence |
| --- | --- |
| Application type | Next.js web app in `Sakeni_Platform_Build/Phase_3_AdminDashboard/admin`. |
| Frontend | React 18, Next.js canary, Tailwind CSS, lucide icons. |
| Backend | Next.js server actions plus Supabase Edge Functions. |
| Database | Supabase PostgreSQL with RLS migrations in `Sakeni_Platform_Build/Phase_1_Database/supabase/migrations`. |
| Auth provider | Supabase Auth for production; local prototype KYC flow still uses localStorage for demo mode. |
| Session mechanism | Supabase SSR cookie client in `admin/lib/supabase-server.ts`. |
| Authorization model | Supabase RLS, admin role in `public.profiles.role`, server-action role checks. |
| Storage | Supabase Storage buckets: `listing-photos`, `profile-photos`, `government-ids`. |
| External services | OpenAI recommendations/fraud scan, face-match provider, Stripe, Resend, Firebase placeholders. |
| CI/CD | Added `.github/workflows/security-ci.yml`; Vercel deployment expected from admin app directory. |
| Test tools | Vitest, ESLint, TypeScript, Next production build, npm audit. |

## Trust Boundaries

- Browser/localStorage demo state is untrusted.
- `NEXT_PUBLIC_*` values are public.
- Supabase anon key is public but constrained by Auth and RLS.
- Supabase service-role key is privileged and must only exist in server/edge environments.
- Edge functions are public network entry points and must validate JWTs, origins, payloads, and rate limits.
- Storage object paths are user-controlled unless constrained by storage RLS.
- Admin operations must derive identity from the verified session, never request body fields.

## Sensitive Assets

- Auth users, sessions, refresh tokens, and Supabase JWTs.
- Profiles, phone numbers, universities, national ID metadata, government ID URLs, selfie URLs, face-match scores.
- Listing moderation state, applications, chat messages, reports, contracts, subscription records.
- Supabase service-role key, Stripe secrets, OpenAI key, face-match key, webhook secrets, Resend/Firebase keys.
- Audit logs and webhook replay records.

## Roles And Major Authorization Rules

| Role | Expected access |
| --- | --- |
| Anonymous | Public active listings only; no private profile, application, chat, or admin access. |
| Student | Own profile, own applications, saved listings/searches, active listings, relevant landlord profiles. |
| Landlord | Own listings, applications for own listings, applicant profiles for own listings, own subscriptions/ads. |
| Admin | Manage profiles, listings, applications, chats, reports, broadcasts, contracts, subscriptions, featured ads, audit visibility. |
| Service role | Edge/server-only privileged operations; never browser-exposed. |

## Findings And Remediation

| ID | Severity | Component | Finding | Remediation | Verification |
| --- | --- | --- | --- | --- | --- |
| SAK-001 | Critical | Admin server actions | `approveListing`/`rejectListing` trusted caller-supplied `adminId`. | Server action now derives user via `supabase.auth.getUser()`, checks admin profile, validates listing UUID, redacts audit metadata. | `npm run typecheck`, `admin-security.test.ts`. |
| SAK-002 | Critical | Profiles RLS | Own-profile update could allow protected field or role tampering. | Added DB trigger to preserve role, verification, ID, and activation fields unless admin/service role. | Migration review; requires Supabase migration verification. |
| SAK-003 | High | Applications RLS | Students could submit applications to non-active listings; landlords had broad update surface. | Application insert now requires active listing; trigger preserves protected application fields. | Migration review; requires Supabase migration verification. |
| SAK-004 | High | Edge functions | Loose JSON parsing, unbounded arrays, forged IDs, generic CORS fallback. | Added shared strict parsing, body limits, exact CORS allowlist behavior, request IDs, UUID validation, and rate limits. | Source review; Deno unavailable locally. |
| SAK-005 | High | Identity verification | Face-match fallback could pass in production if provider env was absent. | Production now fails closed unless explicit non-production fallback flag is set. | Source review; Deno unavailable locally. |
| SAK-006 | High | Webhooks | Listing fraud webhook lacked replay protection and bounded input. | Requires event id/timestamp, records event id in DB, validates listing payload and secret in constant-time style. | Migration/source review; requires deployed webhook smoke test. |
| SAK-007 | High | Database functions | `SECURITY DEFINER` trigger function retained default public execute grant. | Revoked public/anon/authenticated execute on trigger functions. | Migration review. |
| SAK-008 | Medium | Browser headers | No CSP. | Added CSP and security headers in `next.config.mjs`. | `security-headers.test.ts`, lint/typecheck. |
| SAK-009 | Medium | Upload UX/security | Direct photo URL accepted insecure remote HTTP and broad `data:image/*`. | Restricted remote photo URLs to HTTPS or localhost and data URLs to JPG/PNG/WebP. | `local-upload.test.ts`. |
| SAK-010 | Medium | Audit logging | No protected audit table. | Added `audit_events` table with admin read/insert policy and redaction helper. | `security-log.test.ts`; DB migration pending external verification. |
| SAK-011 | Medium | CI/CD | No active workflow in `.github/workflows`. | Added least-privilege Security CI with npm checks and high-confidence secret scan. | Workflow file review; GitHub run pending push. |
| SAK-012 | Medium | Storage | `listing-photos` and `profile-photos` are public buckets. Pending listing images can be exposed if object URLs leak. | Kept compatible for current UI; documented signed URL/private-bucket migration as remaining risk. | Documentation only; production blocker if pre-approval image secrecy is mandatory. |

## Endpoint Security Matrix

| Endpoint | Auth | Authorization | Validation | Rate limit | Audit |
| --- | --- | --- | --- | --- | --- |
| `recommend-listings` | Bearer Supabase JWT | `student_id` must match verified token user | Exact keys, UUID arrays, bounded filters, body limit | 30/user/minute in worker memory | Not yet persisted |
| `verify-identity` | Bearer Supabase JWT | `user_id` must match verified token user | Exact keys, official ID type allowlist, HTTPS URLs, body limit | 8/user/hour in worker memory | Profile verification fields updated |
| `flag-listing` | Webhook secret | Server-to-server only; service role update | Event id, timestamp replay window, bounded listing record | Replay table via unique event id | `webhook_events` row |
| `approveListing` server action | Supabase cookie session | Current user must be active admin | Listing UUID | No app-level limit yet | `audit_events` row |
| `rejectListing` server action | Supabase cookie session | Current user must be active admin | Listing UUID, bounded reason | No app-level limit yet | `audit_events` row |

## Database Security Matrix

| Object | Control | Remaining notes |
| --- | --- | --- |
| `profiles` | RLS, non-recursive `current_user_is_admin()`, protected-field trigger. | Admin creation must be service-role/manual only. |
| `listings` | RLS hides non-active listings from public; admin-only activation; protected-field trigger. | Active listing updates by landlords intentionally blocked by policy. |
| `applications` | RLS per student/landlord/admin; insert requires active listing; protected update trigger. | Needs integration test against isolated Supabase. |
| `conversations`/`messages` | Participant policies plus admin manage policies through helper. | Admin full chat access implemented in DB policy. |
| `audit_events` | Admin read/insert only; service role bypass for infrastructure. | No update/delete policy. |
| `webhook_events` | Service role insert, admin read; primary key prevents duplicate event ids. | Requires webhook to send event id/timestamp headers. |
| Trigger functions | `SECURITY DEFINER`, explicit search path, public execute revoked. | Requires `supabase db push` verification. |

## Storage Security Matrix

| Bucket | Public | Read | Write | Notes |
| --- | --- | --- | --- | --- |
| `listing-photos` | Yes | Public | Authenticated owner path only | Compatible, but leaked pending/rejected photo URLs are readable. |
| `profile-photos` | Yes | Public | Authenticated owner path only | Consider private signed URLs for stricter privacy. |
| `government-ids` | No | Owner or admin | Authenticated owner path only | Sensitive ID documents remain private. |

## Security Headers

Effective production CSP includes:

```text
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://js.stripe.com; frame-src 'self' https://js.stripe.com https://hooks.stripe.com; worker-src 'self' blob:; manifest-src 'self'; media-src 'self' blob: https:; upgrade-insecure-requests
```

`unsafe-inline` remains for Next.js runtime/style compatibility. `unsafe-eval` is development-only.

## Secrets Report

- No real privileged secrets were printed or committed during this audit.
- `.env.example` contains placeholders only.
- `.gitignore` now excludes env variants and signing/key material while allowing `.env.example`.
- If any real key was ever present outside this scan, rotate it; no tracked high-confidence secret was found in this pass.

## Dependency Report

- `npm audit --audit-level=moderate`: 0 vulnerabilities.
- Noted install warnings: deprecated `@react-email/*` package notices. No vulnerability reported; schedule dependency modernization after launch hardening.

## Verification Status

| Check | Status |
| --- | --- |
| `npm run lint` | Passed after changes. |
| `npm run typecheck` | Passed after changes. |
| `npm run test:run -- --reporter=dot` | Passed: 8 files, 21 tests. |
| `npm run audit` | Passed: 0 vulnerabilities. |
| `npm run build` | Passed as part of final `npm run check`; routes built: `/`, `/_not-found`, `/landlord`, `/portal`, `/student`. |
| Deno edge function check | Not run; `deno` unavailable locally. |
| Supabase migration reset/push | Not run; `npx supabase --version` returned `2.109.1`, but Docker is unavailable locally and no production project push is allowed in this branch. |
| Vercel deployment | Not run; no push/deploy allowed by current instructions. |

## Risk Register

| Risk | Severity | Scenario | Mitigation | Remaining remediation | Blocker |
| --- | --- | --- | --- | --- | --- |
| Public listing/profile photo buckets | Medium | Leaked object URL exposes image before approval. | Owner-scoped writes, active listing DB visibility. | Move to private buckets and signed URLs. | Conditional |
| In-memory edge rate limits | Medium | Multi-instance deployment bypasses per-worker counters. | Local abuse dampening. | Add Supabase/Redis/edge-gateway shared limiter or WAF. | No |
| Demo localStorage auth | Medium | Users mistake demo flow for production security. | Docs mark Supabase as production source of truth. | Wire UI fully to Supabase Auth/storage before real KYC data. | Yes for real KYC launch |
| Edge/migration not locally executed | Medium | Syntax/config issue appears during deploy. | Source review and app tests. | Run Supabase CLI migration reset and function deploy in staging. | Yes before production |
| CI workflow not externally verified | Low | Workflow syntax or permissions issue after push. | Minimal permissions and standard npm commands. | Push with workflow-scoped token and require passing checks. | No |
