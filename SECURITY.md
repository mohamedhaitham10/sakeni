# Security Policy

## Launch Security Baseline

Sakeni now runs the following checks before release:

- `npm run lint`
- `npm run test:run`
- `npm run build`
- `npm run audit`
- `Sakeni_Platform_Build/GITHUB_ACTIONS_CI_TEMPLATE.yml` can be copied into `.github/workflows/ci.yml` by a GitHub token with `workflow` scope.

## Environment Secrets

Never commit real `.env`, `.env.local`, Supabase service-role keys, Stripe secrets, Resend keys, Firebase keys, OpenAI keys, or face-match provider keys. The template is:

`Sakeni_Platform_Build/Phase_3_AdminDashboard/admin/.env.example`

Required production secrets include:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_ORIGINS`
- `FLAG_LISTING_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `FACE_MATCH_API_URL`
- `FACE_MATCH_API_KEY`
- Stripe, Resend, and Firebase keys when those integrations are enabled.

## Authentication And Identity

- Signup accepts only official government-issued IDs.
- Egyptian National ID parsing accepts all valid Egyptian governorate codes; student university selection remains restricted to Cairo and Giza universities for launch.
- New demo-mode passwords are stored as PBKDF2-SHA256 verifiers, not plaintext.
- Production Supabase Auth should remain the source of truth for real accounts and sessions.
- Do not process real government ID images through browser-local demo mode. Production KYC documents must use the Supabase Storage buckets and RLS policies from the latest migration.

## Supabase Controls

Apply all migrations in `Sakeni_Platform_Build/Phase_1_Database/supabase/migrations`, then deploy these edge functions:

- `recommend-listings`
- `flag-listing`
- `verify-identity`

The hardened edge functions require authenticated requests, controlled origins through `ALLOWED_ORIGINS`, and webhook secrets where applicable.

## Reporting

For private security issues, contact the repository owner directly before opening a public GitHub issue.
