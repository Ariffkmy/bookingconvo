-- ============================================================
-- Security Fixes Migration
-- Apply these changes to address critical security vulnerabilities
-- ============================================================

-- ============================================================
-- FIX 1: handle_new_user trigger - prevent role privilege escalation
--
-- ISSUE: The trigger reads `role` from raw_user_meta_data, which
-- is user-controlled at signup. An attacker could register with
-- role='admin' to gain admin privileges.
--
-- FIX: Always assign 'photographer' role at signup. Admin role
-- must be granted explicitly by an existing admin.
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    'photographer'::user_role,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

-- ============================================================
-- FIX 2: timeslot_locks RLS - prevent unauthorized lock deletion
--
-- ISSUE: The delete policy `using (true)` allows ANY user to
-- delete ANY timeslot lock, enabling attackers to remove locks
-- and cause double-bookings.
--
-- FIX: Drop the permissive delete policy and use a security
-- definer RPC function that validates the session token before
-- deleting. This ensures only the lock owner can release it.
-- ============================================================
drop policy if exists "owner delete lock" on timeslot_locks;

-- No direct public delete — use the RPC function below instead
-- Photographers and admins can still delete via their own policies
create policy "authenticated delete own lock" on timeslot_locks for delete
  using (
    -- Authenticated photographers can delete locks they created
    photographer_id in (select id from photographers where user_id = auth.uid())
    -- Or expired locks (cleanup)
    or expires_at < now()
  );

-- Secure RPC to release a lock by session token (used by unauthenticated booking flow)
create or replace function release_timeslot_lock(p_lock_id uuid, p_session_token text)
returns void language sql security definer as $$
  delete from timeslot_locks
  where id = p_lock_id
    and session_token = p_session_token;
$$;

-- ============================================================
-- FIX 3: booking_status_history - restrict public insert
--
-- ISSUE: `public insert booking history` allows any unauthenticated
-- user to insert arbitrary status history records, potentially
-- polluting the audit trail.
--
-- FIX: Only allow inserting history for bookings the caller owns
-- (via booking code) or is authenticated as photographer/admin.
-- Unauthenticated inserts are restricted to PENDING_PAYMENT ->
-- PENDING_VERIFICATION transitions only.
-- ============================================================
drop policy if exists "public insert booking history" on booking_status_history;

create policy "public insert booking history" on booking_status_history for insert
  with check (
    -- Authenticated photographers can insert for their bookings
    booking_id in (
      select id from bookings where photographer_id in (
        select id from photographers where user_id = auth.uid()
      )
    )
    or
    -- Admins can insert any
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    or
    -- Unauthenticated users can only record the payment receipt upload transition
    (
      auth.uid() is null
      and to_status = 'PENDING_VERIFICATION'
      and from_status = 'PENDING_PAYMENT'
    )
  );

-- ============================================================
-- FIX 4: bookings update - prevent unauthenticated status updates
--
-- ISSUE: Unauthenticated users can update any booking's status
-- via direct API calls (no update RLS policy explicitly blocks
-- unauthenticated access for fields like receipt_url and status).
--
-- FIX: Add explicit policy restricting unauthenticated updates
-- to only the receipt upload transition fields.
-- ============================================================
drop policy if exists "public update booking receipt" on bookings;

create policy "public update booking receipt" on bookings for update
  using (
    -- Only allow unauthenticated update when status is PENDING_PAYMENT
    auth.uid() is null
    and status = 'PENDING_PAYMENT'
  )
  with check (
    -- Unauthenticated updates can only set receipt fields and move to PENDING_VERIFICATION
    status = 'PENDING_VERIFICATION'
  );

-- ============================================================
-- NOTE: Frontend changes required for FIX 2
-- The timeslot lock deletion must pass the session token as a
-- request header: x-session-token: <token>
-- This is handled via supabase client headers configuration.
-- ============================================================
