-- ============================================================
-- SAKENI DATABASE SCHEMA v1.0
-- Run in Supabase SQL Editor
-- ============================================================

-- EXTENSIONS
create extension if not exists postgis;
create extension if not exists pg_trgm;

-- ============================================================
-- USERS
-- ============================================================
create type user_role as enum ('student', 'landlord', 'admin');
create type verification_status as enum ('pending', 'verified', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'student',
  full_name text not null,
  phone text unique,
  avatar_url text,
  university text,                          -- e.g. 'Al-Azhar', 'Ain Shams', '6th October'
  national_id_url text,                     -- landlords only (private storage)
  national_id_status verification_status default 'pending',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- LISTINGS
-- ============================================================
create type listing_status as enum ('draft', 'pending_review', 'active', 'flagged', 'rejected', 'archived');
create type listing_type as enum ('room', 'studio', 'apartment', 'shared_room');
create type gender_preference as enum ('male', 'female', 'mixed');

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  status listing_status not null default 'pending_review',
  title text not null,
  description text,
  listing_type listing_type not null,
  gender_preference gender_preference default 'mixed',
  
  -- Location
  address text not null,
  city text not null default 'Cairo',
  area text not null,                       -- e.g. '6th October City'
  location geography(point, 4326),          -- PostGIS point for map queries
  nearest_university text,
  distance_to_university_km numeric(4,2),

  -- Pricing
  monthly_rent integer not null,            -- in EGP
  security_deposit integer,
  utilities_included boolean default false,
  
  -- Details
  bedrooms integer,
  bathrooms integer,
  floor_number integer,
  is_furnished boolean default true,
  has_wifi boolean default false,
  has_ac boolean default false,
  has_elevator boolean default false,
  allows_pets boolean default false,
  
  -- Media
  photos text[] default '{}',              -- Cloudinary URLs
  virtual_tour_url text,
  
  -- Admin
  admin_notes text,
  flagged_reason text,
  ai_flag_score numeric(3,2),              -- 0.00–1.00 risk score from AI
  
  -- Availability
  available_from date,
  is_featured boolean default false,
  
  view_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Full text search index
create index listings_fts_idx on public.listings
  using gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(area,'')));

-- Location index
create index listings_location_idx on public.listings using gist(location);

alter table public.listings enable row level security;
create policy "Anyone can view active listings" on public.listings
  for select using (status = 'active');
create policy "Landlords manage own listings" on public.listings
  for all using (auth.uid() = landlord_id);
create policy "Admins manage all listings" on public.listings
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- SAVED SEARCHES & ALERTS
-- ============================================================
create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  name text,
  filters jsonb not null,                  -- {area, max_rent, type, university, ...}
  alert_enabled boolean default true,
  last_alerted_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- SAVED LISTINGS (Bookmarks)
-- ============================================================
create table public.saved_listings (
  student_id uuid references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  saved_at timestamptz default now(),
  primary key (student_id, listing_id)
);

-- ============================================================
-- MESSAGES (In-App Chat)
-- ============================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  student_id uuid not null references public.profiles(id),
  landlord_id uuid not null references public.profiles(id),
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(listing_id, student_id, landlord_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  content text not null,
  is_flagged boolean default false,        -- AI-flagged for phone numbers / off-platform contact
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;
-- Only conversation participants can read messages
create policy "Participants can view messages" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.student_id = auth.uid() or c.landlord_id = auth.uid())
    )
  );

-- ============================================================
-- RATINGS & REVIEWS
-- ============================================================
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.profiles(id),
  reviewee_id uuid not null references public.profiles(id),
  listing_id uuid references public.listings(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique(reviewer_id, reviewee_id, listing_id)
);

-- ============================================================
-- CONTRACTS
-- ============================================================
create type contract_status as enum ('draft', 'sent', 'signed_student', 'signed_landlord', 'fully_executed', 'cancelled');

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  student_id uuid not null references public.profiles(id),
  landlord_id uuid not null references public.profiles(id),
  status contract_status default 'draft',
  terms_json jsonb,                        -- Structured contract terms
  pdf_url text,                            -- Generated PDF URL
  student_signed_at timestamptz,
  landlord_signed_at timestamptz,
  lease_start date,
  lease_end date,
  monthly_rent integer,
  created_at timestamptz default now()
);

-- ============================================================
-- SUBSCRIPTIONS (Landlord Billing)
-- ============================================================
create type subscription_status as enum ('trial', 'active', 'past_due', 'cancelled');
create type subscription_plan as enum ('basic', 'featured');

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan subscription_plan default 'basic',
  status subscription_status default 'trial',
  trial_ends_at timestamptz default (now() + interval '3 months'),
  current_period_start timestamptz,
  current_period_end timestamptz,
  monthly_amount integer,                  -- in EGP equivalent
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- FEATURED ADS
-- ============================================================
create table public.featured_ads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  landlord_id uuid not null references public.profiles(id),
  stripe_payment_intent_id text,
  amount_paid integer not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz default now()
);

-- ============================================================
-- REPORTS (User Reports)
-- ============================================================
create type report_type as enum ('scam', 'fake_listing', 'harassment', 'wrong_info', 'other');
create type report_status as enum ('open', 'investigating', 'resolved', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  listing_id uuid references public.listings(id),
  reported_user_id uuid references public.profiles(id),
  type report_type not null,
  description text,
  status report_status default 'open',
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- PUSH NOTIFICATION BROADCASTS
-- ============================================================
create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  title text not null,
  body text not null,
  target_audience text default 'all',      -- 'all', 'students', 'landlords'
  sent_at timestamptz default now(),
  recipient_count integer
);

-- ============================================================
-- ANALYTICS EVENTS (lightweight)
-- ============================================================
create table public.events (
  id bigserial primary key,
  user_id uuid references public.profiles(id),
  event_name text not null,               -- 'listing_view', 'search', 'contact_initiated', etc.
  properties jsonb,
  created_at timestamptz default now()
);
create index events_name_idx on public.events(event_name);
create index events_created_idx on public.events(created_at);
