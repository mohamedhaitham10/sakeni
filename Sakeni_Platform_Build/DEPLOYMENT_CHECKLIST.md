# 🚀 Sakeni Platform: Deployment & Go-Live Checklist

Congratulations! The Sakeni MVP has been successfully scaffolded across all 6 phases. To deploy this to the Egyptian market, follow this production check-list:

## 1. Database & Backend (Supabase)
- [ ] Connect your local Supabase CLI to your cloud project using `npx supabase link --project-ref your-ref-id`.
- [ ] Push the Phase 1 schema (`20260331175433_init_schema.sql`) to production using `npx supabase db push`.
- [ ] Navigate into `Phase_1_Database/supabase/functions` and deploy the edge functions:
  ```bash
  npx supabase functions deploy recommend-listings
  npx supabase functions deploy flag-listing
  ```
- [ ] Set your `OPENAI_API_KEY` secret within your Supabase project dashboard so the Edge Functions can utilize GPT-4o-mini.

## 2. Frontend & PWA Monolith (Next.js)
- [ ] We chose a **Next.js PWA** (eliminating the need to push to Apple/Google App stores immediately).
- [ ] Create a new Vercel Project and point it to the GitHub repository containing `Phase_3_AdminDashboard/admin`.
- [ ] In Vercel, copy the contents of `.env.example` into the Environment Variables tab and populate the actual keys.
- [ ] Click **Deploy**. Vercel will build the Student Mobile views (`/student`), Landlord Web Portal (`/landlord`), and Admin Dashboard (`/`) natively.

## 3. Integrations Setup
- [ ] **Stripe Config**: Enable the webhook in the Stripe Developer console and point it to your Vercel URL `/api/stripe-webhook`. Replace local `STRIPE_WEBHOOK_SECRET`.
- [ ] **Resend**: Verify your custom Sakeni domain on Resend to ensure emails land in the inbox, not spam.
- [ ] **Google APIs**: If integrating Maps for strict filtering in the Student app, restrict the Maps API key strictly to your Vercel URL.

## 4. Launch Day
- [ ] Force HTTPS redirects.
- [ ] Execute an End-to-End test representing a Student signing up and favoring a listed property.
- [ ] Execute an End-to-End test for a Landlord submitting a National ID.
- [ ] **Go Live!**
