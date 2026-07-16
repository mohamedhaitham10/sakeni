# Sakeni Security Operations Runbook

Backups protect recovery and availability. They do not prevent data theft. Access controls, logging, alerting, and credential hygiene are still required.

## Production Control Status

| Control | Status |
| --- | --- |
| Next.js security headers and CSP | Implemented and locally tested. |
| Admin server-action role derivation | Implemented and locally type/test verified. |
| Supabase RLS/trigger hardening migration | Implemented but not externally verified; run in staging before production. |
| Supabase Edge Function schema/CORS/replay hardening | Implemented but not Deno-verified locally. |
| GitHub Actions Security CI | Implemented but not externally verified until pushed. |
| Vercel environment variables | Manual action required. |
| Supabase production backups/PITR | Manual action required. |
| Shared/distributed rate limiting or WAF | Recommendation. |

## Required Production Setup

1. In Vercel, set the app root to `Sakeni_Platform_Build/Phase_3_AdminDashboard/admin`.
2. In Vercel, set only public values with `NEXT_PUBLIC_` prefixes. Do not set `SUPABASE_SERVICE_ROLE_KEY` as public.
3. In Supabase, set Edge Function secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ALLOWED_ORIGINS`
   - `FLAG_LISTING_WEBHOOK_SECRET`
   - `OPENAI_API_KEY`
   - `FACE_MATCH_API_URL`
   - `FACE_MATCH_API_KEY`
   - `APP_ENV=production`
   - `ALLOW_DEV_FACE_MATCH_FALLBACK=false`
4. Configure the listing fraud webhook to send:
   - `x-sakeni-webhook-secret`
   - `x-sakeni-event-id`
   - `x-sakeni-timestamp`
5. Run migrations in staging before production:
   ```bash
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```
6. Deploy Edge Functions:
   ```bash
   npx supabase functions deploy recommend-listings
   npx supabase functions deploy verify-identity
   npx supabase functions deploy flag-listing
   ```
7. Push this branch only when ready; then verify GitHub Actions passes.

## Credential Incidents

### Leaked Supabase Service Role Key

Status: manual action required.

1. Revoke/rotate the service-role key in Supabase immediately.
2. Update Supabase Edge Function secrets and any server-only deployment secret store.
3. Redeploy affected functions.
4. Review `audit_events`, Supabase API logs, storage object logs, and database logs for unusual access.
5. Preserve logs and the suspected Git/deployment version before deleting evidence.

### Leaked Public Anon Key

Status: manual action required.

The anon key is public by design, but rotate it if abuse is suspected. Confirm RLS is enabled on all exposed tables before considering the incident contained.

### Leaked Stripe, OpenAI, Face-Match, Resend, Firebase, Or Webhook Secret

Status: manual action required.

1. Rotate the provider credential.
2. Update Vercel/Supabase secrets.
3. Redeploy.
4. Review provider usage logs for unexpected spend, requests, or deliveries.
5. For webhook secrets, replay-test duplicate event IDs after rotation.

### Compromised Administrator Account

Status: manual action required.

1. Disable the admin profile by setting `is_active=false`.
2. Revoke active sessions in Supabase Auth.
3. Rotate credentials if the admin had access to deployment/provider consoles.
4. Review `audit_events`, listing approvals/rejections, profile changes, chat access, and reports.
5. Restore unauthorized changes from backup or audit evidence.

## Data Incidents

### Suspected Database Export

1. Preserve Supabase logs, Vercel logs, Git commit SHAs, and admin audit rows.
2. Identify the principal: anon, authenticated user, admin, service role, or provider integration.
3. Rotate any credential that could have enabled the export.
4. Check RLS policy changes and recent migrations.
5. Prepare breach notification with counsel if personal data or government ID data was exposed.

### Unauthorized File Access

1. Determine bucket and object path.
2. For `government-ids`, treat as high severity and rotate any signed URL mechanisms.
3. For `listing-photos`/`profile-photos`, assess whether public exposure was expected or due to leaked paths.
4. Consider migrating to private buckets with signed URLs if exposure is unacceptable.

### Malicious Deletion Or Data Corruption

1. Stop destructive access by disabling suspected accounts/keys.
2. Preserve current database state for evidence.
3. Restore from verified backup or point-in-time recovery.
4. Rotate credentials after restore.
5. Re-run application smoke tests and RLS checks.

## Recovery

Status: manual action required for production.

- Enable Supabase point-in-time recovery if available for the project tier.
- Define RPO and RTO before launch.
- Test restore into a separate staging project at least monthly.
- Back up storage buckets or document provider-level object retention.
- Restrict backup access to trusted administrators only.
- After restore, validate:
  - auth users and profiles align
  - RLS remains enabled
  - storage buckets and policies exist
  - Edge Function secrets are current
  - audit tables are append-only to ordinary users

## Evidence Preservation

- Do not delete suspicious rows, logs, deployment artifacts, or commits before capture.
- Record all timestamps in UTC.
- Preserve:
  - Git commit SHA
  - Vercel deployment id
  - Supabase project ref
  - affected user ids
  - relevant audit event ids
  - webhook event ids
  - provider request ids
- Create an incident timeline with who observed what and when.

## Manual Production Checklist

| Item | Status |
| --- | --- |
| Supabase migrations applied to staging and production | Manual action required |
| Edge Functions deployed after migration | Manual action required |
| Supabase Auth email confirmation/MFA policy reviewed | Manual action required |
| Supabase database backups/PITR enabled | Manual action required |
| Vercel environment variables reviewed for server/client exposure | Manual action required |
| GitHub branch protection and required checks enabled | Manual action required |
| GitHub secret scanning and push protection enabled | Manual action required |
| GitHub Actions workflow permissions reviewed | Implemented in workflow; repository setting manual |
| Vercel production deployment checked for CSP/security headers | Manual action required |
| OpenAI/face-match spend and error alerts configured | Recommendation |
| WAF/CDN rate limiting for auth, upload, and edge functions | Recommendation |
