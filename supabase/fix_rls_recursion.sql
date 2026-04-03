-- ============================================================
-- Fix RLS infinite recursion on profiles table
--
-- Problem: The "admins full profiles" policy queries the profiles
-- table from within a profiles RLS policy, causing infinite recursion
-- and a 500 error on any profiles query.
--
-- Fix: Create a security definer function (runs as DB owner, bypasses
-- RLS) to check admin status, then use it in all admin policies.
-- ============================================================

-- 1. Create a security-definer helper that checks admin role
--    without triggering RLS on profiles
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 2. Fix the recursive policy on profiles
drop policy if exists "admins full profiles" on profiles;
create policy "admins full profiles" on profiles for all
  using (is_admin());

-- 3. Fix the same recursion risk on all other tables whose admin
--    policies query profiles (they indirectly trigger profiles RLS)
drop policy if exists "admin full photographers" on photographers;
create policy "admin full photographers" on photographers for all
  using (is_admin());

drop policy if exists "admin full packages" on packages;
create policy "admin full packages" on packages for all
  using (is_admin());

drop policy if exists "admin full bookings" on bookings;
create policy "admin full bookings" on bookings for all
  using (is_admin());
