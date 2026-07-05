# Testing Guide

## Local Checks

From `Sakeni_Platform_Build/Phase_3_AdminDashboard/admin`:

```bash
npm ci
npm run lint
npm run test:run
npm run build
npm run audit
```

Run everything with:

```bash
npm run check
```

## Test Coverage Added

- Egyptian National ID parsing, including Cairo/Giza restrictions and invalid dates.
- Cairo/Giza-only university onboarding list.
- Password verifier creation and password verification failure cases.

## Manual Launch Smoke Test

1. Open `/portal`.
2. Sign up as a student with a Cairo or Giza university.
3. Upload a government ID image and selfie.
4. Confirm the KYC flow lands in pending review.
5. Sign out and sign back in with the same password.
6. Sign up as a landlord and create a listing with floor number and up to 15 images.
7. Confirm the new listing is `Under Review`.
8. In the admin dashboard, approve the listing.
9. In the student view, open the listing and swipe through the full gallery.
10. Submit an application and confirm the landlord can view the applicant profile.

## CI

Use `Sakeni_Platform_Build/GITHUB_ACTIONS_CI_TEMPLATE.yml` as the GitHub Actions workflow. It runs `npm run check` on push to `main` and on pull requests using Node 22.
