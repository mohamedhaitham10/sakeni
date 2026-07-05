# Sakeni Platform: Deployment And Go-Live Checklist

Use this checklist before opening Sakeni (سكني) to real students and landlords.

## 1. Database And Backend

- [ ] Link the Supabase CLI to production:
  ```bash
  npx supabase link --project-ref your-ref-id
  ```
- [ ] Push every migration, including the listing approval, KYC, storage, application, floor number, and RLS migration:
  ```bash
  npx supabase db push
  ```
- [ ] Deploy all edge functions:
  ```bash
  npx supabase functions deploy recommend-listings
  npx supabase functions deploy flag-listing
  npx supabase functions deploy verify-identity
  ```
- [ ] Set Supabase secrets:
  - `OPENAI_API_KEY`
  - `ALLOWED_ORIGINS`
  - `FLAG_LISTING_WEBHOOK_SECRET`
  - `FACE_MATCH_API_URL`
  - `FACE_MATCH_API_KEY`
- [ ] Confirm RLS is enabled and tested for listings, applications, saved listings, messages, reports, subscriptions, contracts, broadcasts, and admin-only tables.
- [ ] Confirm storage buckets exist for listing photos, government IDs, and profile/selfie images.

## 2. Frontend And Vercel

- [ ] Point Vercel at `Sakeni_Platform_Build/Phase_3_AdminDashboard/admin`.
- [ ] Copy `Sakeni_Platform_Build/Phase_3_AdminDashboard/admin/.env.example` into Vercel environment variables and fill in real values.
- [ ] Run the local launch check before pushing:
  ```bash
  npm run check
  ```
- [ ] If GitHub Actions is enabled, copy `GITHUB_ACTIONS_CI_TEMPLATE.yml` to `.github/workflows/ci.yml` with a token that has `workflow` scope, then wait for CI to pass.
- [ ] Confirm Vercel deploys the latest commit.
- [ ] Confirm security headers are present on the production URL.

## 3. Approval Workflow

- [ ] Landlord listing creation defaults to `Under Review`.
- [ ] Listings are hidden from students until an admin approves them.
- [ ] Approved listings become `Active`.
- [ ] Rejected listings remain hidden from students.
- [ ] Student listing details show floor number and the full photo gallery.

## 4. Integrations

- [ ] Stripe webhook points to the production `/api/stripe-webhook` URL and uses the production `STRIPE_WEBHOOK_SECRET`.
- [ ] Resend domain is verified for Sakeni transactional email.
- [ ] Google Maps keys, if enabled, are restricted to the production domain.
- [ ] Face matching provider keys are server-only and never exposed to the browser.

## 5. Manual Smoke Test

- [ ] Student signup accepts only official government IDs and a selfie.
- [ ] Student university dropdown only includes Cairo and Giza universities.
- [ ] Student can sign out and sign back into the same account.
- [ ] Landlord can upload listing photos from the device and create a listing with floor number.
- [ ] Admin can approve the listing.
- [ ] Student can open the listing and swipe through all photos.
- [ ] Student can submit an application.
- [ ] Landlord can view the submitted application, applicant profile details, and profile photo.
- [ ] Admin chat profile drawer opens user profiles and posted listings.

## 6. Launch Day

- [ ] HTTPS is enforced.
- [ ] Monitoring is enabled for Vercel and Supabase.
- [ ] Error logs are checked after the first deployment.
- [ ] A rollback plan and database backup are ready.
