# Production Readiness Review: bookingconvo.my

**Date:** 2026-06-05
**Reviewer:** Claude Opus 4.6 (Automated Code Review)
**Branch:** fix/cal-booking-logic
**Scope:** Full project review with focus on booking conflict prevention changes

---

## Executive Summary

The booking conflict prevention system (migration v2 + bookingService.ts) is **architecturally sound** -- the DB-level RPC with `FOR UPDATE` row locking is the correct approach. However, several gaps remain between the client-side guards and the server-side enforcement, and there are security, data integrity, and production-readiness issues that should be addressed before launch.

**Critical findings:** 5 | **High:** 8 | **Medium:** 10 | **Low:** 6

---

## CRITICAL FINDINGS

---

### C1. Reschedule bypasses conflict detection entirely

**Severity: CRITICAL**
**Category: Bug / Data Integrity**

The photographer reschedule flow updates `slot_date` and `slot_time` directly without any overlap check. Two bookings can be rescheduled to the same time, or a booking can be moved on top of an existing one.

**File:** `src/features/portal/BookingDetailPage.tsx:153-176`
```ts
// No conflict check before this update
const { error } = await supabase
  .from('bookings')
  .update({ slot_date: newDate, slot_time: newTime, status: 'RESCHEDULED' })
  .eq('id', id)
```

**Fix:** Call `checkForConflicts()` before the update, or create a `reschedule_booking_with_conflict_check` RPC that does the overlap check atomically (preferred).

---

### C2. Timeslot lock has no unique constraint -- race condition allows duplicate locks

**Severity: CRITICAL**
**Category: Bug / Race Condition**

The `timeslot_locks` table has no unique constraint on `(photographer_id, slot_date, slot_time)` for active locks. The check-then-insert in `useTimeslotLock.ts:77-127` is a classic TOCTOU (time-of-check-time-of-use) race: two users can simultaneously check, both see no lock, and both insert.

**File:** `src/hooks/useTimeslotLock.ts:77-127`
**File:** `supabase/schema.sql:131-141`

**Fix:** Add a partial unique index:
```sql
CREATE UNIQUE INDEX idx_unique_active_lock
  ON timeslot_locks (photographer_id, slot_date, slot_time)
  WHERE expires_at > now();
```
Or use an `ON CONFLICT` upsert in the insert. Note: a partial unique index with `now()` is tricky in PostgreSQL (it evaluates at query time, not at insert time). A better approach is an RPC function that does the check-and-insert atomically with `FOR UPDATE` locking.

---

### C3. Lock check doesn't perform overlap detection (duration-unaware)

**Severity: CRITICAL**
**Category: Bug**

The timeslot lock in `useTimeslotLock.ts` checks for an exact `slot_time` match when verifying if a slot is already booked (line 99: `.eq('slot_time', time)`). This does NOT check for overlapping time ranges. A 60-minute booking at 10:00 would not block a user from locking 10:30.

The booked-slot check at line 96-104 has the same issue:
```ts
const { data: booked } = await supabase
  .from('bookings')
  .select('id')
  .eq('slot_time', time)  // exact match only!
  .not('status', 'eq', 'CANCELLED')
```

**File:** `src/hooks/useTimeslotLock.ts:96-104`

**Fix:** Use the `get_booked_slots` RPC (which returns durations) and perform range-overlap checking, or create a dedicated RPC for lock-time validation.

---

### C4. `get_booking_by_code` SECURITY DEFINER missing `SET search_path`

**Severity: CRITICAL**
**Category: Security**

The `get_booking_by_code` function in `schema.sql` is `SECURITY DEFINER` but does NOT set `search_path`. This is a known PostgreSQL security issue -- a malicious actor could manipulate the search path to execute arbitrary code with the function owner's privileges.

**File:** `supabase/schema.sql:229-233`
```sql
create or replace function get_booking_by_code(p_code text)
returns setof bookings
language sql security definer as $$   -- missing: SET search_path = public
  select * from bookings where booking_code = p_code limit 1;
$$;
```

**Fix:** Add `SET search_path = public` to the function definition, matching the pattern used in `migration_v2_range_overlap.sql`.

---

### C5. Unlimited anonymous lock creation -- DoS vector

**Severity: CRITICAL**
**Category: Security**

The RLS policy `"public insert lock"` on `timeslot_locks` (schema.sql:290) allows any unauthenticated user to insert unlimited locks. An attacker can fill every available slot with locks, effectively blocking all bookings for a photographer for 10+ minutes at a time.

**File:** `supabase/schema.sql:290`
```sql
create policy "public insert lock" on timeslot_locks for insert with check (true);
```

**Fix:** Implement rate limiting via an RPC function that checks how many active locks the session_token currently holds (e.g., max 1-2 per session). Replace the direct insert with this RPC.

---

## HIGH SEVERITY FINDINGS

---

### H1. Error results from `checkForConflicts` queries are silently ignored

**Severity: HIGH**
**Category: Bug**

`checkForConflicts` in `bookingService.ts` calls `Promise.all` for the package query and bookings query but never checks for errors on either result. If the package query fails (e.g., network error), `pkgResult.data` is null and `newDuration` silently defaults to 60 minutes, potentially allowing a conflict to go undetected.

**File:** `src/lib/bookingService.ts:31-48`
```ts
const [pkgResult, bookingsResult] = await Promise.all([...])
const newDuration = pkgResult.data?.duration_mins ?? 60  // silent fallback
const bookings = bookingsResult.data || []               // silent fallback
```

**Fix:** Check `pkgResult.error` and `bookingsResult.error` and throw before proceeding.

---

### H2. Status updates are not transactional -- booking/history can diverge

**Severity: HIGH**
**Category: Data Integrity**

Throughout the portal (BookingDetailPage.tsx, PaymentPage.tsx), booking status updates and status_history inserts are separate Supabase calls. If the update succeeds but the history insert fails, the audit trail is incomplete.

**File:** `src/features/portal/BookingDetailPage.tsx:66-79`
**File:** `src/features/public/PaymentPage.tsx:92-105`

**Fix:** Create an `update_booking_status` RPC that atomically updates the status and inserts history in a single transaction.

---

### H3. `submitError` is never cleared on retry

**Severity: HIGH**
**Category: Production Readiness**

In `BookPage.tsx`, `submitError` is set in `onError` (line 240) but is never cleared when the user attempts to submit again. A stale error message remains visible during subsequent submission attempts.

**File:** `src/features/public/BookPage.tsx:239-241`

**Fix:** Add `setSubmitError('')` at the start of `mutationFn` or in an `onMutate` callback.

---

### H4. Booked slots query has no periodic refresh

**Severity: HIGH**
**Category: Production Readiness**

The `bookedSlots` query (BookPage.tsx:103-113) lacks `refetchInterval`. If another user books a slot while the current user is viewing the calendar, they won't see the change until they re-select the date. The `lockedSlots` query correctly uses `refetchInterval: 30000`.

**File:** `src/features/public/BookPage.tsx:103-113`

**Fix:** Add `refetchInterval: 30000` to the `bookedSlots` query, matching `lockedSlots`.

---

### H5. Locked slots filtering is not duration-aware

**Severity: HIGH**
**Category: Bug**

In `BookPage.tsx:159`, locked slots are filtered with exact string match (`lockedSlots.includes(s)`), but locks don't carry duration information. A lock on 10:00 for a 60-min package doesn't block the 10:30 slot from appearing as available.

**File:** `src/features/public/BookPage.tsx:159`
```ts
if (lockedSlots.includes(s)) return false  // exact match only
```

**Fix:** Fetch lock durations (join with packages or store in lock) and use the same range-overlap logic used for booked slots at lines 162-166.

---

### H6. Any unauthenticated user can upload a receipt to any PENDING_PAYMENT booking

**Severity: HIGH**
**Category: Security**

The "public update booking receipt" RLS policy (security_fixes.sql:107-115) allows any unauthenticated user to update any booking that is in PENDING_PAYMENT status. Combined with `get_booking_by_code` returning full booking data, an attacker who discovers a valid booking code can upload a fake receipt and move the booking to CONFIRMED status.

**File:** `supabase/security_fixes.sql:104-115`

**Fix:** Tie the receipt upload to the session_token used during booking, or require the customer_email to match a supplied email parameter.

---

### H7. `cleanup_expired_locks` cron may not be scheduled

**Severity: HIGH**
**Category: Production Readiness**

The `cleanup_expired_locks` function exists (schema.sql:348-351), but the `pg_cron` scheduling line is commented out (line 354). If this cron isn't running, expired locks accumulate in the database and the `gt('expires_at', now)` filter becomes the only guard. The table will grow unbounded.

**File:** `supabase/schema.sql:348-354`

**Fix:** Verify that `pg_cron` is enabled and the cleanup job is scheduled. If not, enable it:
```sql
SELECT cron.schedule('cleanup-locks', '*/15 * * * *', 'SELECT cleanup_expired_locks()');
```

---

### H8. No rate limiting on booking creation

**Severity: HIGH**
**Category: Security**

The `create_booking_with_conflict_check` RPC is callable by the anon role without any rate limiting. An attacker could rapidly fill a photographer's calendar with spam bookings in PENDING_PAYMENT status, as each slot can only hold one active booking.

**Fix:** Add rate limiting at the Supabase Edge Function or API gateway level. Consider adding a cooldown per `session_token` or per `customer_email`.

---

## MEDIUM SEVERITY FINDINGS

---

### M1. Branding inconsistency: "GradSnap" references remain

**Severity: MEDIUM**
**Category: Production Readiness**

The recent commit `0f18012` rebranded to Fotokonvo, but `SignInPage.tsx:60` and `SignUpPage.tsx:88` still display "GradSnap". The schema comment (schema.sql:5) also says "GradSnap".

**Files:**
- `src/features/auth/SignInPage.tsx:60`
- `src/features/auth/SignUpPage.tsx:88`
- `supabase/schema.sql:5`

---

### M2. PDF receipt preview shows broken image

**Severity: MEDIUM**
**Category: Bug**

In `PaymentPage.tsx:281`, the receipt preview uses `<img src={previewUrl}>`. If the user selects a PDF file (which is an allowed type per line 62), the blob URL won't render in an `<img>` tag, showing a broken image.

**File:** `src/features/public/PaymentPage.tsx:279-285`

**Fix:** Check file type and show a PDF icon/label instead of an `<img>` preview for PDF files.

---

### M3. `generateTimeSlots` uses mutable `new Date()` -- fragile across midnight

**Severity: MEDIUM**
**Category: Bug**

`generateTimeSlots` (utils.ts:67-91) creates `current` and `end` from `new Date()` and sets hours/minutes. If `startTime > endTime` (e.g., night schedule from 20:00 to 02:00), the function returns no slots because `current < end` is immediately false.

**File:** `src/lib/utils.ts:67-91`

**Fix:** Use minute-based arithmetic instead of Date objects, or document that overnight schedules are unsupported. The RPC already rejects cross-midnight bookings (migration_v2 lines 68-72), so this is internally consistent.

---

### M4. `booking.package` type casting is unsafe

**Severity: MEDIUM**
**Category: Bug**

Throughout the portal, joined package data is accessed via `booking.package as unknown as Package | undefined`. This double-cast bypasses TypeScript's type safety entirely. If the Supabase query shape changes, these will silently produce undefined values.

**Files:**
- `src/features/portal/BookingDetailPage.tsx:181`
- `src/features/portal/BookingsPage.tsx:208, 269, 292, 419`

**Fix:** Define a proper type for `Booking` with joined relations (e.g., `BookingWithPackage`) and use it consistently.

---

### M5. Session token never rotates or expires

**Severity: MEDIUM**
**Category: Security**

The session token in `localStorage` (utils.ts:55-64) is generated once and persists indefinitely. On shared devices (common in university environments), the next user inherits the previous user's session token and could manipulate their locks.

**File:** `src/lib/utils.ts:55-64`

**Fix:** Add a timestamp to the token and rotate it after a reasonable period (e.g., 24 hours), or tie it to a session start event.

---

### M6. No input sanitization on gallery URL

**Severity: MEDIUM**
**Category: Security**

The gallery URL input (portal/BookingDetailPage.tsx:472-477) accepts any string and stores it directly. It's then used in an `<a href=...>` tag (public/BookingDetailPage.tsx:139). While modern browsers block `javascript:` URLs in links, this should still be validated.

**File:** `src/features/portal/BookingDetailPage.tsx:472-477`

**Fix:** Validate that the gallery URL starts with `https://` before saving.

---

### M7. Supabase client initializes with placeholder URL if env vars are missing

**Severity: MEDIUM**
**Category: Production Readiness**

If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are not set, the client silently creates a connection to `https://placeholder.supabase.co` (supabase.ts:11-12). In production, this would cause all API calls to fail silently.

**File:** `src/lib/supabase.ts:10-13`

**Fix:** Throw an error in production builds if env vars are missing:
```ts
if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.PROD) throw new Error('Supabase env vars not configured')
}
```

---

### M8. `get_booking_by_code` returns all columns including internal notes

**Severity: MEDIUM**
**Category: Security**

The RPC returns `SELECT *`, which includes `notes` (internal photographer notes), `verified_by`, `receipt_url`, and other fields that customers shouldn't see. Anyone with a booking code can access all this data.

**File:** `supabase/schema.sql:229-233`

**Fix:** Return only customer-relevant columns:
```sql
SELECT id, booking_code, photographer_id, package_id, customer_name, customer_email,
       slot_date, slot_time, pax_count, location, status, payment_amount, gallery_url,
       created_at, updated_at
FROM bookings WHERE booking_code = p_code LIMIT 1;
```

---

### M9. AuthContext role fallback reads from user metadata

**Severity: MEDIUM**
**Category: Security**

In `AuthContext.tsx:62-64`, if the profiles query fails, the role falls back to `user.user_metadata.role`. Even though the `handle_new_user` trigger now forces `photographer` role, the metadata still contains whatever the user set at signup. If a profile row doesn't exist for some reason, the fallback could grant unintended access.

**File:** `src/contexts/AuthContext.tsx:60-65`

**Fix:** Remove the metadata fallback. If the profile doesn't exist, treat the user as unauthenticated or show an error.

---

### M10. Delivery mutation doesn't validate status transition

**Severity: MEDIUM**
**Category: Data Integrity**

The delivery mutation (portal/BookingDetailPage.tsx:118-131) sets status to `DELIVERED` without checking if the current status is `COMPLETED`. While the UI only shows the button for `COMPLETED` bookings, a race condition or stale UI could trigger an invalid transition.

**File:** `src/features/portal/BookingDetailPage.tsx:118-131`

**Fix:** Add a `.eq('status', 'COMPLETED')` filter to the update query, or use the `update_booking_status` RPC suggested in H2.

---

## LOW SEVERITY FINDINGS

---

### L1. `customer_phone` can bypass validation via direct API call

**Severity: LOW**
**Category: Data Integrity**

The Zod schema requires phone numbers to be 10-20 chars with specific format (types/index.ts:178), but `bookingService.ts:100` sends `params.customer_phone || ''` which could be empty. The RPC doesn't validate phone format.

**File:** `src/lib/bookingService.ts:100`

---

### L2. Booking code collision handling is reactive, not preventive

**Severity: LOW**
**Category: Data Integrity**

`generateBookingCode()` creates codes with ~887M possibilities per day. The UNIQUE constraint catches collisions, but the error message from the RPC would be confusing to the user. Probability is extremely low (~1 in 887M per booking).

**File:** `src/lib/utils.ts:36-47`

---

### L3. `previewUrl` object URL is never revoked in PaymentPage

**Severity: LOW**
**Category: Bug**

In `PaymentPage.tsx:144`, `URL.createObjectURL(file)` is called but the URL is never revoked when the component unmounts or when `handleRemoveFile` is called. This is a minor memory leak.

**File:** `src/features/public/PaymentPage.tsx:144`

---

### L4. Calendar month navigation allows navigating to distant future months

**Severity: LOW**
**Category: UX**

The calendar forward navigation in BookPage.tsx has no upper bound. Users can navigate months or years into the future where no availability exists. This is confusing but not harmful.

**File:** `src/features/public/BookPage.tsx:417-420`

---

### L5. Photographer slug can collide on signup

**Severity: LOW**
**Category: Bug**

In `AuthContext.tsx:98`, the auto-generated slug is `studio-{first 8 hex chars of user ID}`. This is not guaranteed unique, and the insert doesn't handle conflicts (`.maybeSingle()` just ignores the error). The unique constraint on `slug` would cause the insert to fail silently.

**File:** `src/contexts/AuthContext.tsx:98-104`

---

### L6. `availability_overrides` allows duplicate overrides for the same date

**Severity: LOW**
**Category: Data Integrity**

There's no unique constraint on `(photographer_id, override_date)` in `availability_overrides`. A photographer could accidentally create multiple overrides for the same date, and only the first one found by `.find()` would be used.

**File:** `supabase/schema.sql:116-127`

---

## Booking Conflict Prevention -- Detailed Analysis

### What works well:

1. **DB-level RPC with FOR UPDATE locking** (migration_v2:77-86): Correctly prevents race conditions between concurrent booking attempts. The `FOR UPDATE OF b` lock ensures serialized access.

2. **Range overlap formula** (migration_v2:83-84): `existing_start < new_end AND existing_end > new_start` is the correct mathematical overlap check.

3. **Pre-flight client check** (bookingService.ts:82-91): Fast-fail before hitting the RPC reduces user-facing latency for obvious conflicts.

4. **Midnight rejection** (migration_v2:69-72): Explicitly rejects bookings that span midnight, avoiding complex cross-day logic.

5. **Status history in same transaction** (migration_v2:108-113): Initial status history is created atomically with the booking.

6. **Client-side overlap filtering** (BookPage.tsx:162-166): The available slot list correctly uses range overlap to filter out booked slots.

### What needs improvement:

1. The pre-flight check is **advisory only** -- it doesn't hold any lock, so a booking can be created between the check and the RPC call. This is acceptable because the RPC is the real guard, but error messages should clearly indicate when the race occurs.

2. The client-side filtering (slots, locks) is **not duration-aware for locks**, creating a window where a user can select a slot that will fail at the RPC level.

3. **Rescheduling bypasses ALL conflict detection**, which is the most critical gap.

---

## Recommendations (Priority Order)

1. **Immediate (before launch):**
   - Fix C1: Add conflict check to reschedule flow
   - Fix C4: Add `SET search_path` to `get_booking_by_code`
   - Fix C5: Rate-limit anonymous lock creation
   - Fix H1: Check for query errors in `checkForConflicts`
   - Fix H3: Clear submit error on retry

2. **Soon after launch:**
   - Fix C2/C3: Make lock system duration-aware and race-free
   - Fix H2: Make status updates transactional
   - Fix H4: Add refetch interval to booked slots
   - Fix H6: Restrict receipt upload to booking owner
   - Fix H7: Verify pg_cron cleanup is scheduled

3. **Next iteration:**
   - Fix M1-M10: Branding, type safety, validation improvements
   - Add photographer notifications for new bookings
   - Add rate limiting on booking creation

---

*Report generated by Claude Opus 4.6 automated code review*
*Total files reviewed: 35+ TypeScript/SQL files across src/, supabase/*
