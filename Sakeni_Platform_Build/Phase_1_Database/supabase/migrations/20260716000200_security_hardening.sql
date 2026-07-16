-- Sakeni security hardening: authorization helpers, protected audit logs,
-- field-level guards, and webhook replay tracking.

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and coalesce(p.is_active, true)
  );
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to anon, authenticated;

create table if not exists public.audit_events (
  id bigserial primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  outcome text not null check (outcome in ('success', 'failure', 'denied')),
  metadata jsonb not null default '{}',
  request_id text,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_actor_idx on public.audit_events(actor_id);
create index if not exists audit_events_action_idx on public.audit_events(action);
create index if not exists audit_events_created_idx on public.audit_events(created_at desc);
create index if not exists audit_events_target_idx on public.audit_events(target_type, target_id);

alter table public.audit_events enable row level security;

drop policy if exists "Admins can read audit events" on public.audit_events;
drop policy if exists "Admins can insert audit events" on public.audit_events;

create policy "Admins can read audit events" on public.audit_events
  for select to authenticated
  using (public.current_user_is_admin());

create policy "Admins can insert audit events" on public.audit_events
  for insert to authenticated
  with check (public.current_user_is_admin() and actor_id = auth.uid());

create table if not exists public.webhook_events (
  event_id text primary key,
  source text not null,
  action text not null,
  listing_id uuid references public.listings(id) on delete set null,
  received_at timestamptz not null default now()
);

create index if not exists webhook_events_received_idx on public.webhook_events(received_at desc);
create index if not exists webhook_events_listing_idx on public.webhook_events(listing_id);

alter table public.webhook_events enable row level security;

drop policy if exists "Admins can read webhook events" on public.webhook_events;
create policy "Admins can read webhook events" on public.webhook_events
  for select to authenticated
  using (public.current_user_is_admin());

revoke all on function public.set_application_landlord_id() from public;
revoke all on function public.set_application_landlord_id() from anon;
revoke all on function public.set_application_landlord_id() from authenticated;

alter table public.listings alter column status set default 'pending_review';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_full_name_length') then
    alter table public.profiles
      add constraint profiles_full_name_length
      check (char_length(full_name) between 1 and 200) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'listings_title_length') then
    alter table public.listings
      add constraint listings_title_length
      check (char_length(title) between 1 and 180) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'listings_description_length') then
    alter table public.listings
      add constraint listings_description_length
      check (description is null or char_length(description) <= 4000) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'listings_monthly_rent_range') then
    alter table public.listings
      add constraint listings_monthly_rent_range
      check (monthly_rent between 0 and 1000000) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'applications_message_length') then
    alter table public.applications
      add constraint applications_message_length
      check (message is null or char_length(message) <= 2000) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'messages_content_length') then
    alter table public.messages
      add constraint messages_content_length
      check (char_length(content) between 1 and 4000) not valid;
  end if;
end $$;

create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.current_user_is_admin() then
    return new;
  end if;

  new.role = old.role;
  new.national_id_url = old.national_id_url;
  new.national_id_status = old.national_id_status;
  new.government_id_type = old.government_id_type;
  new.government_id_url = old.government_id_url;
  new.selfie_url = old.selfie_url;
  new.face_match_score = old.face_match_score;
  new.face_match_status = old.face_match_status;
  new.face_match_checked_at = old.face_match_checked_at;
  new.is_active = old.is_active;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_security_fields on public.profiles;
create trigger trg_protect_profile_security_fields
before update on public.profiles
for each row execute function public.protect_profile_security_fields();

revoke all on function public.protect_profile_security_fields() from public;
revoke all on function public.protect_profile_security_fields() from anon;
revoke all on function public.protect_profile_security_fields() from authenticated;

create or replace function public.protect_listing_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.current_user_is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'pending_review') then
      new.status = 'pending_review';
    end if;
    new.admin_notes = null;
    new.flagged_reason = null;
    new.ai_flag_score = null;
    new.is_featured = false;
    return new;
  end if;

  new.landlord_id = old.landlord_id;
  new.admin_notes = old.admin_notes;
  new.flagged_reason = old.flagged_reason;
  new.ai_flag_score = old.ai_flag_score;
  new.is_featured = old.is_featured;

  if new.status not in ('draft', 'pending_review') then
    new.status = old.status;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_listing_security_fields on public.listings;
create trigger trg_protect_listing_security_fields
before insert or update on public.listings
for each row execute function public.protect_listing_security_fields();

revoke all on function public.protect_listing_security_fields() from public;
revoke all on function public.protect_listing_security_fields() from anon;
revoke all on function public.protect_listing_security_fields() from authenticated;

create or replace function public.protect_application_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.current_user_is_admin() then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.id = old.id;
    new.listing_id = old.listing_id;
    new.student_id = old.student_id;
    new.landlord_id = old.landlord_id;
    new.move_in = old.move_in;
    new.lease_duration = old.lease_duration;
    new.message = old.message;
    new.applicant_snapshot = old.applicant_snapshot;
    if auth.uid() <> old.landlord_id then
      new.status = old.status;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_application_security_fields on public.applications;
create trigger trg_protect_application_security_fields
before update on public.applications
for each row execute function public.protect_application_security_fields();

revoke all on function public.protect_application_security_fields() from public;
revoke all on function public.protect_application_security_fields() from anon;
revoke all on function public.protect_application_security_fields() from authenticated;

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert with check (
    auth.uid() = id
    and role in ('student', 'landlord')
    and coalesce(is_active, true)
  );

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role in ('student', 'landlord', 'admin')
  );

drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can manage all profiles" on public.profiles;
create policy "Admins can manage all profiles" on public.profiles
  for all using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

drop policy if exists "Admins manage all listings" on public.listings;
create policy "Admins manage all listings" on public.listings
  for all using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

drop policy if exists "Students can submit applications" on public.applications;
create policy "Students can submit applications" on public.applications
  for insert with check (
    auth.uid() = student_id
    and status = 'pending'
    and exists (
      select 1 from public.listings l
      where l.id = applications.listing_id
        and l.status = 'active'
    )
  );

drop policy if exists "Admins manage all applications" on public.applications;
create policy "Admins manage all applications" on public.applications
  for all using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

drop policy if exists "Admins can view conversations" on public.conversations;
drop policy if exists "Admins manage conversations" on public.conversations;
create policy "Admins manage conversations" on public.conversations
  for all using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

drop policy if exists "Admins can view messages" on public.messages;
drop policy if exists "Admins manage messages" on public.messages;
create policy "Admins manage messages" on public.messages
  for all using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

drop policy if exists "Admins manage reports" on public.reports;
create policy "Admins manage reports" on public.reports
  for all using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

drop policy if exists "Admins manage broadcasts" on public.broadcasts;
create policy "Admins manage broadcasts" on public.broadcasts
  for all using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

drop policy if exists "Admins view events" on public.events;
create policy "Admins view events" on public.events
  for select using (public.current_user_is_admin());

drop policy if exists "Admins manage contracts" on public.contracts;
create policy "Admins manage contracts" on public.contracts
  for all using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

drop policy if exists "Admins manage subscriptions" on public.subscriptions;
create policy "Admins manage subscriptions" on public.subscriptions
  for all using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

drop policy if exists "Admins manage featured ads" on public.featured_ads;
create policy "Admins manage featured ads" on public.featured_ads
  for all using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

drop policy if exists "Admins read government IDs" on storage.objects;
create policy "Admins read government IDs" on storage.objects
  for select to authenticated using (
    bucket_id = 'government-ids'
    and public.current_user_is_admin()
  );
