-- ============================================================================
-- 타오운세 2.0 — 0001 init (core user + auth schema)
-- ----------------------------------------------------------------------------
-- Scope: user-owned data + auth. Content/reference tables (celebrities,
-- 만세력/calenda_data, faq, terms, fortune content) come in a later migration.
-- Based on design handoff 04_DATA_MODEL_SUPABASE.md, refined.
--
-- 1.0 tracked users anonymously by browser_id; 2.0 uses Supabase Auth
-- (auth.users) + owner_id + Row Level Security. Tables are NOT a port of 1.0.
--
-- Idempotent: safe to re-run (IF NOT EXISTS / DROP ... IF EXISTS guards).
-- ============================================================================

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ===========================================================================
-- profiles — 1:1 with auth.users
-- ===========================================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  nickname      text,
  email         text,
  login_method  text,                          -- 'kakao' | 'google' | 'email'
  locale        text not null default 'ko',    -- ko | en | ja | zh
  notify_opt_in boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ===========================================================================
-- people — saved subjects (self / family / friends) for saju autofill & match
-- ===========================================================================
create table if not exists public.people (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  gender      text,                  -- 'm' | 'f'
  calendar    text default 'solar',  -- 'solar' | 'lunar' | 'lunar_leap'
  birth_date  date,
  birth_time  time,                  -- nullable (unknown hour)
  birth_place text,                  -- longitude correction (nullable)
  mbti        text,                  -- nullable
  rel_key     text,                  -- relationship label key (i18n)
  tint        text,                  -- avatar tint token
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists people_owner_idx on public.people(owner_id);

-- ===========================================================================
-- saved_readings — library of fortune/compatibility results
-- ===========================================================================
create table if not exists public.saved_readings (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  type_key   text not null,   -- today|toJung|month|date|lotto|hour|lifetime|newyear|celeb|mbti
  tier       text not null default 'free',  -- 'free' | 'pro'
  subject    jsonb,           -- result subject(s): self / person / celeb names
  payload    jsonb,           -- result snapshot (saju + AI output) for replay
  ganji      text,
  glyph      text,
  tint       text,
  created_at timestamptz not null default now()
);
create index if not exists saved_readings_owner_idx on public.saved_readings(owner_id, created_at desc);

-- ===========================================================================
-- purchases — per-item purchase history (no subscriptions)
-- ===========================================================================
create table if not exists public.purchases (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  reading_id uuid references public.saved_readings(id) on delete set null,
  type_key   text not null,
  tier       text not null default 'pro',
  amount     integer,         -- minor units
  currency   text,            -- 'KRW' | 'USD'
  order_no   text unique,     -- PG / PayPal order id
  status     text not null default 'paid',  -- 'paid' | 'refunded' | 'failed'
  provider   text,            -- 'toss' | 'paypal'
  paid_at    timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists purchases_owner_idx on public.purchases(owner_id, paid_at desc);

-- ===========================================================================
-- payments — raw PG/PayPal transaction log (webhook verification)
-- Written by server (service_role) only.
-- ===========================================================================
create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references auth.users(id) on delete set null,
  order_no   text,
  provider   text,
  status     text,            -- 'success' | 'fail' | 'canceled'
  code       text,            -- PG error code on failure
  raw        jsonb,           -- raw webhook body
  created_at timestamptz not null default now()
);
create index if not exists payments_order_idx on public.payments(order_no);

-- ===========================================================================
-- reviews — star + one-line reviews (optionally public for "Their Stories")
-- ===========================================================================
create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  reading_id uuid references public.saved_readings(id) on delete cascade,
  type_key   text not null,
  rating     int not null check (rating between 1 and 5),
  text       text,
  is_public  boolean not null default false,  -- consent to show on main page
  locale     text,
  created_at timestamptz not null default now()
);
create index if not exists reviews_public_idx on public.reviews(is_public, created_at desc);

-- ===========================================================================
-- inquiries — customer support (guests allowed: owner_id nullable)
-- ===========================================================================
create table if not exists public.inquiries (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references auth.users(id) on delete set null,
  email      text,
  category   text,
  message    text,
  status     text not null default 'open',
  locale     text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_people_updated_at on public.people;
create trigger set_people_updated_at before update on public.people
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- Auto-create a profile when a new auth user signs up
-- ===========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, nickname, login_method)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'nickname'
    ),
    coalesce(new.raw_app_meta_data->>'provider', 'email')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.profiles      enable row level security;
alter table public.people        enable row level security;
alter table public.saved_readings enable row level security;
alter table public.purchases     enable row level security;
alter table public.payments      enable row level security;
alter table public.reviews       enable row level security;
alter table public.inquiries     enable row level security;

-- profiles: owner only (id = auth.uid())
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- people: owner only
drop policy if exists "people_all_own" on public.people;
create policy "people_all_own" on public.people for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- saved_readings: owner only
drop policy if exists "saved_readings_all_own" on public.saved_readings;
create policy "saved_readings_all_own" on public.saved_readings for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- purchases: owner can read own; writes happen server-side (service_role bypasses RLS)
drop policy if exists "purchases_select_own" on public.purchases;
create policy "purchases_select_own" on public.purchases for select using (auth.uid() = owner_id);

-- payments: owner can read own; writes server-side only
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments for select using (auth.uid() = owner_id);

-- reviews: owner manages own + anyone can read public reviews
drop policy if exists "reviews_all_own" on public.reviews;
create policy "reviews_all_own" on public.reviews for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public" on public.reviews for select using (is_public = true);

-- inquiries: anyone (incl. guests) can submit; only the owner can read their own
drop policy if exists "inquiries_insert_any" on public.inquiries;
create policy "inquiries_insert_any" on public.inquiries for insert with check (
  owner_id is null or auth.uid() = owner_id
);
drop policy if exists "inquiries_select_own" on public.inquiries;
create policy "inquiries_select_own" on public.inquiries for select using (auth.uid() = owner_id);
