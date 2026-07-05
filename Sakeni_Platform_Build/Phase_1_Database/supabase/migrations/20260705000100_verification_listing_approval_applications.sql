-- ============================================================
-- Sakeni (سكني) v1.1 - verification, applications, uploads, approvals
-- ============================================================

-- Official government-issued identity documents only.
do $$
begin
  create type public.identity_document_type as enum (
    'egyptian_national_id',
    'passport',
    'residence_permit'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.application_status as enum ('pending', 'approved', 'declined', 'withdrawn');
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists government_id_type public.identity_document_type,
  add column if not exists government_id_url text,
  add column if not exists selfie_url text,
  add column if not exists face_match_score numeric(4,3),
  add column if not exists face_match_status public.verification_status default 'pending',
  add column if not exists face_match_checked_at timestamptz;

update public.profiles
set government_id_type = 'egyptian_national_id',
    government_id_url = coalesce(government_id_url, national_id_url)
where government_id_type is null
  and national_id_url is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_face_match_score_range'
  ) then
    alter table public.profiles
      add constraint profiles_face_match_score_range
      check (face_match_score is null or (face_match_score >= 0 and face_match_score <= 1));
  end if;
end $$;

-- Existing rows without a floor are treated as ground floor so the column can be enforced.
update public.listings set floor_number = 0 where floor_number is null;
alter table public.listings
  alter column floor_number set default 0,
  alter column floor_number set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'listings_floor_number_range'
  ) then
    alter table public.listings
      add constraint listings_floor_number_range
      check (floor_number between -2 and 200);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'listings_photos_max_15'
  ) then
    alter table public.listings
      add constraint listings_photos_max_15
      check (coalesce(array_length(photos, 1), 0) <= 15);
  end if;
end $$;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  status public.application_status not null default 'pending',
  move_in date,
  lease_duration text,
  message text,
  applicant_snapshot jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (listing_id, student_id)
);

create index if not exists applications_listing_idx on public.applications(listing_id);
create index if not exists applications_student_idx on public.applications(student_id);
create index if not exists applications_landlord_idx on public.applications(landlord_id);

create or replace function public.set_application_landlord_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select landlord_id into new.landlord_id
  from public.listings
  where id = new.listing_id;

  if new.landlord_id is null then
    raise exception 'Cannot create application for a missing listing';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_application_landlord_id on public.applications;
create trigger trg_set_application_landlord_id
before insert or update of listing_id on public.applications
for each row execute function public.set_application_landlord_id();

alter table public.applications enable row level security;

-- Rebuild profile policies so landlords can read applicant profiles without exposing all users.
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Landlords can view applicant profiles" on public.profiles;
drop policy if exists "Students can view relevant landlords" on public.profiles;

create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can manage all profiles" on public.profiles
  for all using (
    exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  );

create policy "Landlords can view applicant profiles" on public.profiles
  for select using (
    exists (
      select 1
      from public.applications a
      join public.listings l on l.id = a.listing_id
      where a.student_id = profiles.id
        and l.landlord_id = auth.uid()
    )
  );

create policy "Students can view relevant landlords" on public.profiles
  for select using (
    exists (
      select 1
      from public.listings l
      where l.landlord_id = profiles.id
        and (
          l.status = 'active'
          or exists (
            select 1 from public.applications a
            where a.listing_id = l.id and a.student_id = auth.uid()
          )
        )
    )
  );

-- Rebuild listing policies so only admins can publish active listings.
drop policy if exists "Anyone can view active listings" on public.listings;
drop policy if exists "Landlords manage own listings" on public.listings;
drop policy if exists "Admins manage all listings" on public.listings;
drop policy if exists "Landlords can view own listings" on public.listings;
drop policy if exists "Landlords can insert pending listings" on public.listings;
drop policy if exists "Landlords can update own review listings" on public.listings;
drop policy if exists "Landlords can delete own non-active listings" on public.listings;

create policy "Anyone can view active listings" on public.listings
  for select using (status = 'active');

create policy "Landlords can view own listings" on public.listings
  for select using (auth.uid() = landlord_id);

create policy "Landlords can insert pending listings" on public.listings
  for insert with check (
    auth.uid() = landlord_id
    and status in ('draft', 'pending_review')
    and floor_number is not null
    and coalesce(array_length(photos, 1), 0) <= 15
  );

create policy "Landlords can update own review listings" on public.listings
  for update using (
    auth.uid() = landlord_id
    and status in ('draft', 'pending_review', 'rejected')
  )
  with check (
    auth.uid() = landlord_id
    and status in ('draft', 'pending_review')
    and floor_number is not null
    and coalesce(array_length(photos, 1), 0) <= 15
  );

create policy "Landlords can delete own non-active listings" on public.listings
  for delete using (
    auth.uid() = landlord_id
    and status <> 'active'
  );

create policy "Admins manage all listings" on public.listings
  for all using (
    exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  );

-- Application visibility and moderation.
drop policy if exists "Students can submit applications" on public.applications;
drop policy if exists "Students can view own applications" on public.applications;
drop policy if exists "Landlords can view applications for own listings" on public.applications;
drop policy if exists "Landlords can update applications for own listings" on public.applications;
drop policy if exists "Admins manage all applications" on public.applications;

create policy "Students can submit applications" on public.applications
  for insert with check (
    auth.uid() = student_id
    and status = 'pending'
  );

create policy "Students can view own applications" on public.applications
  for select using (auth.uid() = student_id);

create policy "Landlords can view applications for own listings" on public.applications
  for select using (
    exists (
      select 1 from public.listings l
      where l.id = applications.listing_id
        and l.landlord_id = auth.uid()
    )
  );

create policy "Landlords can update applications for own listings" on public.applications
  for update using (
    exists (
      select 1 from public.listings l
      where l.id = applications.listing_id
        and l.landlord_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = applications.listing_id
        and l.landlord_id = auth.uid()
    )
    and status in ('pending', 'approved', 'declined')
  );

create policy "Admins manage all applications" on public.applications
  for all using (
    exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  );

-- Chat visibility for admins and participants.
alter table public.conversations enable row level security;

drop policy if exists "Participants can view conversations" on public.conversations;
drop policy if exists "Participants can create conversations" on public.conversations;
drop policy if exists "Admins can view conversations" on public.conversations;
drop policy if exists "Admins can view messages" on public.messages;

create policy "Participants can view conversations" on public.conversations
  for select using (student_id = auth.uid() or landlord_id = auth.uid());

create policy "Participants can create conversations" on public.conversations
  for insert with check (student_id = auth.uid() or landlord_id = auth.uid());

create policy "Admins can view conversations" on public.conversations
  for select using (
    exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  );

create policy "Admins can view messages" on public.messages
  for select using (
    exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  );

drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.student_id = auth.uid() or c.landlord_id = auth.uid())
    )
  );

-- RLS coverage for remaining user data tables.
alter table public.saved_searches enable row level security;
alter table public.saved_listings enable row level security;
alter table public.reviews enable row level security;
alter table public.contracts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.featured_ads enable row level security;
alter table public.reports enable row level security;
alter table public.broadcasts enable row level security;
alter table public.events enable row level security;

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Students manage own saved searches" on public.saved_searches;
create policy "Students manage own saved searches" on public.saved_searches
  for all using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists "Students manage own saved listings" on public.saved_listings;
create policy "Students manage own saved listings" on public.saved_listings
  for all using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists "Users can view related reviews" on public.reviews;
create policy "Users can view related reviews" on public.reviews
  for select using (
    reviewer_id = auth.uid()
    or reviewee_id = auth.uid()
    or exists (
      select 1 from public.listings l
      where l.id = reviews.listing_id and l.status = 'active'
    )
  );

drop policy if exists "Users can write own reviews" on public.reviews;
create policy "Users can write own reviews" on public.reviews
  for insert with check (reviewer_id = auth.uid());

drop policy if exists "Contract participants can view contracts" on public.contracts;
create policy "Contract participants can view contracts" on public.contracts
  for select using (student_id = auth.uid() or landlord_id = auth.uid());

drop policy if exists "Contract participants can update contracts" on public.contracts;
create policy "Contract participants can update contracts" on public.contracts
  for update using (student_id = auth.uid() or landlord_id = auth.uid())
  with check (student_id = auth.uid() or landlord_id = auth.uid());

drop policy if exists "Landlords can view own subscriptions" on public.subscriptions;
create policy "Landlords can view own subscriptions" on public.subscriptions
  for select using (landlord_id = auth.uid());

drop policy if exists "Landlords can view own featured ads" on public.featured_ads;
create policy "Landlords can view own featured ads" on public.featured_ads
  for select using (landlord_id = auth.uid());

drop policy if exists "Users can create reports" on public.reports;
create policy "Users can create reports" on public.reports
  for insert with check (reporter_id = auth.uid());

drop policy if exists "Users can view own reports" on public.reports;
create policy "Users can view own reports" on public.reports
  for select using (reporter_id = auth.uid());

drop policy if exists "Admins manage reports" on public.reports;
create policy "Admins manage reports" on public.reports
  for all using (
    exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  );

drop policy if exists "Admins manage broadcasts" on public.broadcasts;
create policy "Admins manage broadcasts" on public.broadcasts
  for all using (
    exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  );

drop policy if exists "Users can insert own events" on public.events;
create policy "Users can insert own events" on public.events
  for insert with check (user_id = auth.uid() or user_id is null);

drop policy if exists "Admins view events" on public.events;
create policy "Admins view events" on public.events
  for select using (
    exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  );

drop policy if exists "Admins manage contracts" on public.contracts;
create policy "Admins manage contracts" on public.contracts
  for all using (
    exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  );

drop policy if exists "Admins manage subscriptions" on public.subscriptions;
create policy "Admins manage subscriptions" on public.subscriptions
  for all using (
    exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  );

drop policy if exists "Admins manage featured ads" on public.featured_ads;
create policy "Admins manage featured ads" on public.featured_ads
  for all using (
    exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  );

-- Storage buckets and policies for native file uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-photos', 'listing-photos', true, 10485760, array['image/jpeg','image/png','image/webp']),
  ('profile-photos', 'profile-photos', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('government-ids', 'government-ids', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read listing photos" on storage.objects;
drop policy if exists "Users upload own listing photos" on storage.objects;
drop policy if exists "Users update own listing photos" on storage.objects;
drop policy if exists "Users delete own listing photos" on storage.objects;
drop policy if exists "Public can read profile photos" on storage.objects;
drop policy if exists "Users upload own profile photos" on storage.objects;
drop policy if exists "Users read own government IDs" on storage.objects;
drop policy if exists "Users upload own government IDs" on storage.objects;
drop policy if exists "Admins read government IDs" on storage.objects;

create policy "Public can read listing photos" on storage.objects
  for select using (bucket_id = 'listing-photos');

create policy "Users upload own listing photos" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'listing-photos'
    and name like auth.uid()::text || '/%'
  );

create policy "Users update own listing photos" on storage.objects
  for update to authenticated using (
    bucket_id = 'listing-photos'
    and name like auth.uid()::text || '/%'
  )
  with check (
    bucket_id = 'listing-photos'
    and name like auth.uid()::text || '/%'
  );

create policy "Users delete own listing photos" on storage.objects
  for delete to authenticated using (
    bucket_id = 'listing-photos'
    and name like auth.uid()::text || '/%'
  );

create policy "Public can read profile photos" on storage.objects
  for select using (bucket_id = 'profile-photos');

create policy "Users upload own profile photos" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'profile-photos'
    and name like auth.uid()::text || '/%'
  );

create policy "Users read own government IDs" on storage.objects
  for select to authenticated using (
    bucket_id = 'government-ids'
    and name like auth.uid()::text || '/%'
  );

create policy "Users upload own government IDs" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'government-ids'
    and name like auth.uid()::text || '/%'
  );

create policy "Admins read government IDs" on storage.objects
  for select to authenticated using (
    bucket_id = 'government-ids'
    and exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and admin_profile.role = 'admin')
  );

