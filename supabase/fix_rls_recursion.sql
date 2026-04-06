-- ============================================================
-- Fix RLS Infinite Recursion
--
-- ISSUE: Policies like "admins full profiles" do:
--   exists (select 1 from profiles where id = auth.uid() and role = 'admin')
-- This queries `profiles` FROM WITHIN a policy ON `profiles` → infinite
-- recursion → 500 Internal Server Error on any profiles query.
--
-- FIX: Extract the admin check into a security definer function.
-- Security definer functions bypass RLS, breaking the recursion.
-- ============================================================

-- Step 1: Create a security definer helper (bypasses RLS)
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Step 2: Drop all recursive admin policies and recreate using is_admin()

-- profiles
drop policy if exists "admins full profiles" on profiles;
create policy "admins full profiles" on profiles for all
  using (is_admin());

-- photographers
drop policy if exists "admin full photographers" on photographers;
create policy "admin full photographers" on photographers for all
  using (is_admin());

-- packages
drop policy if exists "admin full packages" on packages;
create policy "admin full packages" on packages for all
  using (is_admin());

-- bookings
drop policy if exists "admin full bookings" on bookings;
create policy "admin full bookings" on bookings for all
  using (is_admin());

-- booking_status_history (from security_fixes.sql — also references profiles for admin check)
drop policy if exists "public insert booking history" on booking_status_history;
create policy "public insert booking history" on booking_status_history for insert
  with check (
    booking_id in (
      select id from bookings where photographer_id in (
        select id from photographers where user_id = auth.uid()
      )
    )
    or is_admin()
    or (
      auth.uid() is null
      and to_status = 'CONFIRMED'
      and from_status = 'PENDING_PAYMENT'
    )
  );
