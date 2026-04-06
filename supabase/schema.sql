-- ============================================================
-- GradSnap - Graduation Photography Booking SaaS
-- Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('admin', 'photographer', 'customer');

create type booking_status as enum (
  'PENDING_PAYMENT',
  'CONFIRMED',
  'RESCHEDULED',
  'CANCELLED',
  'COMPLETED',
  'DELIVERED'
);

-- ============================================================
-- PROFILES (extends auth.users 1-to-1)
-- ============================================================
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'customer',
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'photographer')::user_role,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- PHOTOGRAPHERS
-- ============================================================
create table if not exists photographers (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references profiles(id) on delete cascade,
  slug                  text not null unique,
  display_name          text not null,
  bio                   text,
  profile_photo         text,
  cover_photo           text,
  school_name           text,
  location              text,
  phone                 text,
  email                 text,
  bank_name             text,
  bank_account          text,
  bank_account_name     text,
  payment_instructions  text,
  duitnow_qr_url        text,
  lock_duration_mins    int not null default 10,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_photographers_slug on photographers(slug);
create index if not exists idx_photographers_user_id on photographers(user_id);

-- ============================================================
-- PACKAGES
-- ============================================================
create table if not exists packages (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references photographers(id) on delete cascade,
  name            text not null,
  description     text,
  price           numeric(10,2) not null,
  duration_mins   int not null default 30,
  max_pax         int not null default 1,
  inclusions      text[] default '{}',
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists idx_packages_photographer on packages(photographer_id);

-- ============================================================
-- AVAILABILITY RULES (weekly recurring schedule)
-- ============================================================
create table if not exists availability_rules (
  id                uuid primary key default gen_random_uuid(),
  photographer_id   uuid not null references photographers(id) on delete cascade,
  day_of_week       int not null check (day_of_week between 0 and 6), -- 0=Sun
  start_time        time not null,
  end_time          time not null,
  slot_duration_mins int not null default 60,
  is_active         boolean not null default true
);

create index if not exists idx_availability_rules on availability_rules(photographer_id);

-- ============================================================
-- AVAILABILITY OVERRIDES (specific date exceptions)
-- ============================================================
create table if not exists availability_overrides (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references photographers(id) on delete cascade,
  override_date   date not null,
  is_blocked      boolean not null default true,
  start_time      time,
  end_time        time,
  note            text
);

create index if not exists idx_availability_overrides on availability_overrides(photographer_id, override_date);

-- ============================================================
-- TIMESLOT LOCKS (soft-lock during checkout)
-- ============================================================
create table if not exists timeslot_locks (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references photographers(id) on delete cascade,
  slot_date       date not null,
  slot_time       time not null,
  session_token   text not null,
  expires_at      timestamptz not null default (now() + interval '10 minutes'),
  created_at      timestamptz not null default now()
);

create index if not exists idx_timeslot_locks on timeslot_locks(photographer_id, slot_date, slot_time, expires_at);

-- ============================================================
-- BOOKINGS
-- ============================================================
create table if not exists bookings (
  id                  uuid primary key default gen_random_uuid(),
  booking_code        text not null unique,
  photographer_id     uuid not null references photographers(id),
  package_id          uuid not null references packages(id),
  customer_name       text not null,
  customer_email      text not null,
  customer_phone      text,
  slot_date           date not null,
  slot_time           time not null,
  pax_count           int not null default 1,
  location            text,
  special_requests    text,
  status              booking_status not null default 'PENDING_PAYMENT',
  payment_amount      numeric(10,2),
  receipt_url         text,
  receipt_uploaded_at timestamptz,
  verified_by         uuid references profiles(id),
  verified_at         timestamptz,
  notes               text,
  gallery_url         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_bookings_photographer_date on bookings(photographer_id, slot_date);
create index if not exists idx_bookings_code on bookings(booking_code);
create index if not exists idx_bookings_email on bookings(customer_email);
create index if not exists idx_bookings_status on bookings(status);

-- ============================================================
-- BOOKING STATUS HISTORY
-- ============================================================
create table if not exists booking_status_history (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  from_status booking_status,
  to_status   booking_status not null,
  changed_by  uuid references profiles(id),
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_booking_history on booking_status_history(booking_id);

-- ============================================================
-- GALLERY IMAGES
-- ============================================================
create table if not exists gallery_images (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references photographers(id) on delete cascade,
  storage_path    text not null,
  public_url      text not null,
  caption         text,
  sort_order      int not null default 0,
  is_cover        boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists idx_gallery_images on gallery_images(photographer_id, sort_order);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_photographers_updated_at
  before update on photographers
  for each row execute function set_updated_at();

create or replace trigger trg_bookings_updated_at
  before update on bookings
  for each row execute function set_updated_at();

-- ============================================================
-- PUBLIC FUNCTION: Lookup booking by code (bypasses RLS for unauthenticated access)
-- ============================================================
create or replace function get_booking_by_code(p_code text)
returns setof bookings
language sql security definer as $$
  select * from bookings where booking_code = p_code limit 1;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table photographers enable row level security;
alter table packages enable row level security;
alter table availability_rules enable row level security;
alter table availability_overrides enable row level security;
alter table timeslot_locks enable row level security;
alter table bookings enable row level security;
alter table booking_status_history enable row level security;
alter table gallery_images enable row level security;

-- Profiles: users see their own
create policy "users read own profile" on profiles for select using (id = auth.uid());
create policy "users update own profile" on profiles for update using (id = auth.uid());

-- Admins have full access to profiles
create policy "admins full profiles" on profiles for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Photographers: public can read active
create policy "public read active photographers" on photographers
  for select using (is_active = true);

-- Photographers: owner can read/write
create policy "photographer owner access" on photographers for all
  using (user_id = auth.uid());

-- Admins: full photographer access
create policy "admin full photographers" on photographers for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Packages: public read active
create policy "public read active packages" on packages
  for select using (is_active = true);

-- Packages: photographer manages own
create policy "photographer manages packages" on packages for all
  using (photographer_id in (select id from photographers where user_id = auth.uid()));

-- Admin: full packages
create policy "admin full packages" on packages for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Availability: public read
create policy "public read availability_rules" on availability_rules for select using (true);
create policy "photographer manages availability" on availability_rules for all
  using (photographer_id in (select id from photographers where user_id = auth.uid()));

create policy "public read overrides" on availability_overrides for select using (true);
create policy "photographer manages overrides" on availability_overrides for all
  using (photographer_id in (select id from photographers where user_id = auth.uid()));

-- Timeslot locks: public insert/read, only expired can be deleted by anyone
create policy "public insert lock" on timeslot_locks for insert with check (true);
create policy "public read locks" on timeslot_locks for select using (true);
create policy "owner delete lock" on timeslot_locks for delete using (true);

-- Bookings: photographer sees/updates own
create policy "photographer reads own bookings" on bookings for select
  using (photographer_id in (select id from photographers where user_id = auth.uid()));

create policy "photographer updates own bookings" on bookings for update
  using (photographer_id in (select id from photographers where user_id = auth.uid()));

-- Customers can create bookings (no auth required)
create policy "public create bookings" on bookings for insert with check (true);

-- Admin: full bookings
create policy "admin full bookings" on bookings for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Booking history: photographer sees own
create policy "photographer reads booking history" on booking_status_history for select
  using (booking_id in (
    select id from bookings where photographer_id in (
      select id from photographers where user_id = auth.uid()
    )
  ));

create policy "public insert booking history" on booking_status_history for insert with check (true);

-- Gallery: public read
create policy "public read gallery" on gallery_images for select using (true);
create policy "photographer manages gallery" on gallery_images for all
  using (photographer_id in (select id from photographers where user_id = auth.uid()));

-- ============================================================
-- STORAGE BUCKETS (run in Supabase Storage settings or via API)
-- ============================================================
-- Create these buckets in Supabase Dashboard > Storage:
--
-- 1. receipts     (private) - payment receipts
-- 2. gallery      (public)  - portfolio images
-- 3. profile-photos (public) - profile/cover photos, DuitNow QR
--
-- Storage policies (also set in Dashboard):
-- receipts: authenticated users and public can insert, only owner/admin can read
-- gallery: public read, photographer insert/delete
-- profile-photos: public read, photographer insert/delete

-- ============================================================
-- SEED DATA (for testing - remove in production)
-- ============================================================
-- Run separately after setup:
-- INSERT INTO auth.users (id, email, ...) ...
-- INSERT INTO profiles ...
-- INSERT INTO photographers ...

-- ============================================================
-- CLEANUP EXPIRED LOCKS (run as a scheduled function or cron)
-- ============================================================
create or replace function cleanup_expired_locks()
returns void language sql as $$
  delete from timeslot_locks where expires_at < now();
$$;

-- To schedule cleanup, use Supabase pg_cron extension:
-- select cron.schedule('cleanup-locks', '*/15 * * * *', 'select cleanup_expired_locks()');
