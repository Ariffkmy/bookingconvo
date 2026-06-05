-- ============================================================
-- Migration v3: Critical & High Severity Fixes
-- Addresses C1-C5, H1-H8 from production review
-- ============================================================

-- ============================================================
-- C3/H5: Add duration_mins to timeslot_locks for overlap-aware locking
-- ============================================================
ALTER TABLE timeslot_locks ADD COLUMN IF NOT EXISTS duration_mins int NOT NULL DEFAULT 60;

-- ============================================================
-- C5: Rate limit tracking table for lock attempts
-- ============================================================
CREATE TABLE IF NOT EXISTS lock_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lock_attempts_session
  ON lock_attempts(session_token, attempted_at);

ALTER TABLE lock_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- C5: Drop permissive public insert policy on timeslot_locks
-- All inserts must go through acquire_timeslot_lock RPC
-- ============================================================
DROP POLICY IF EXISTS "public insert lock" ON timeslot_locks;

-- ============================================================
-- C1: Reschedule booking with atomic conflict check
-- ============================================================
CREATE OR REPLACE FUNCTION reschedule_booking_with_conflict_check(
  p_booking_id uuid,
  p_new_date date,
  p_new_time time,
  p_new_status booking_status DEFAULT 'RESCHEDULED',
  p_note text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_photographer_id uuid;
  v_package_id uuid;
  v_old_status booking_status;
  v_conflict_id uuid;
  v_duration_mins int;
  v_new_end time;
  v_result json;
BEGIN
  SELECT photographer_id, package_id, status
  INTO v_photographer_id, v_package_id, v_old_status
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT duration_mins INTO v_duration_mins
  FROM packages WHERE id = v_package_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Package not found.' USING ERRCODE = 'foreign_key_violation';
  END IF;

  v_new_end := (p_new_time + (v_duration_mins || ' minutes')::interval)::time;

  SELECT b.id INTO v_conflict_id
  FROM bookings b
  JOIN packages pk ON b.package_id = pk.id
  WHERE b.photographer_id = v_photographer_id
    AND b.slot_date = p_new_date
    AND b.status != 'CANCELLED'
    AND b.id != p_booking_id
    AND b.slot_time < v_new_end
    AND (b.slot_time + (pk.duration_mins || ' minutes')::interval)::time > p_new_time
  LIMIT 1;

  IF v_conflict_id IS NOT NULL THEN
    RAISE EXCEPTION 'This timeslot overlaps with an existing booking. Please choose a different time.'
      USING ERRCODE = 'unique_violation';
  END IF;

  UPDATE bookings
  SET slot_date = p_new_date,
      slot_time = p_new_time,
      status = p_new_status,
      updated_at = now()
  WHERE id = p_booking_id;

  INSERT INTO booking_status_history (booking_id, from_status, to_status, note)
  VALUES (p_booking_id, v_old_status, p_new_status,
          COALESCE(p_note, 'Rescheduled to ' || p_new_date || ' at ' || p_new_time));

  SELECT row_to_json(t) INTO v_result
  FROM (SELECT * FROM bookings WHERE id = p_booking_id) t;

  RETURN v_result;
END;
$$;

-- ============================================================
-- C4: Fix get_booking_by_code — add SET search_path, mask internal columns
-- ============================================================
CREATE OR REPLACE FUNCTION get_booking_by_code(p_code text)
RETURNS SETOF bookings
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, booking_code, photographer_id, package_id, customer_name, customer_email,
         customer_phone, slot_date, slot_time, pax_count, location, special_requests,
         status, payment_amount, receipt_url, receipt_uploaded_at,
         NULL::uuid, NULL::timestamptz, NULL::text,
         gallery_url, created_at, updated_at
  FROM bookings WHERE booking_code = p_code LIMIT 1;
$$;

-- ============================================================
-- C2 + C3 + C5: Atomic timeslot lock acquisition with rate limiting
-- ============================================================
CREATE OR REPLACE FUNCTION acquire_timeslot_lock(
  p_photographer_id uuid,
  p_slot_date date,
  p_slot_time time,
  p_session_token text,
  p_lock_duration_mins int DEFAULT 10,
  p_booking_duration_mins int DEFAULT 60
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_count int;
  v_attempt_count int;
  v_conflict_id uuid;
  v_new_end time;
  v_lock_row timeslot_locks%ROWTYPE;
BEGIN
  -- C5: Record attempt and check rate limit (max 5 per minute per session)
  INSERT INTO lock_attempts (session_token) VALUES (p_session_token);

  SELECT count(*) INTO v_attempt_count
  FROM lock_attempts
  WHERE session_token = p_session_token
    AND attempted_at > now() - interval '1 minute';

  IF v_attempt_count > 5 THEN
    RAISE EXCEPTION 'Too many lock attempts. Please wait before trying again.'
      USING ERRCODE = 'program_limit_exceeded';
  END IF;

  -- C5: Max 2 active locks per session
  SELECT count(*) INTO v_active_count
  FROM timeslot_locks
  WHERE session_token = p_session_token
    AND expires_at > now();

  IF v_active_count >= 2 THEN
    RAISE EXCEPTION 'Too many active locks. Please release a slot before locking another.'
      USING ERRCODE = 'program_limit_exceeded';
  END IF;

  v_new_end := (p_slot_time + (p_booking_duration_mins || ' minutes')::interval)::time;

  -- C2/C3: Check for overlapping active locks (duration-aware, atomic)
  SELECT id INTO v_conflict_id
  FROM timeslot_locks
  WHERE photographer_id = p_photographer_id
    AND slot_date = p_slot_date
    AND expires_at > now()
    AND session_token != p_session_token
    AND slot_time < v_new_end
    AND (slot_time + (duration_mins || ' minutes')::interval)::time > p_slot_time
  LIMIT 1
  FOR UPDATE;

  IF v_conflict_id IS NOT NULL THEN
    RAISE EXCEPTION 'This slot was just taken. Please choose another.'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- C3: Check for overlapping booked slots (duration-aware)
  SELECT b.id INTO v_conflict_id
  FROM bookings b
  JOIN packages pk ON b.package_id = pk.id
  WHERE b.photographer_id = p_photographer_id
    AND b.slot_date = p_slot_date
    AND b.status != 'CANCELLED'
    AND b.slot_time < v_new_end
    AND (b.slot_time + (pk.duration_mins || ' minutes')::interval)::time > p_slot_time
  LIMIT 1;

  IF v_conflict_id IS NOT NULL THEN
    RAISE EXCEPTION 'This slot is already booked.'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Insert lock atomically
  INSERT INTO timeslot_locks (
    photographer_id, slot_date, slot_time, session_token,
    duration_mins, expires_at
  )
  VALUES (
    p_photographer_id, p_slot_date, p_slot_time, p_session_token,
    p_booking_duration_mins,
    now() + (p_lock_duration_mins || ' minutes')::interval
  )
  RETURNING * INTO v_lock_row;

  RETURN row_to_json(v_lock_row);
END;
$$;

-- ============================================================
-- H2: Atomic status update with history insert
-- ============================================================
CREATE OR REPLACE FUNCTION update_booking_status(
  p_booking_id uuid,
  p_new_status booking_status,
  p_note text DEFAULT NULL,
  p_gallery_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status booking_status;
BEGIN
  SELECT status INTO v_old_status
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'no_data_found';
  END IF;

  UPDATE bookings
  SET status = p_new_status,
      gallery_url = COALESCE(p_gallery_url, gallery_url),
      updated_at = now()
  WHERE id = p_booking_id;

  INSERT INTO booking_status_history (booking_id, from_status, to_status, note)
  VALUES (p_booking_id, v_old_status, p_new_status, p_note);
END;
$$;

-- ============================================================
-- H6: Secure receipt submission — verifies email before updating
-- ============================================================
CREATE OR REPLACE FUNCTION submit_receipt(
  p_booking_code text,
  p_customer_email text,
  p_receipt_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_old_status booking_status;
BEGIN
  SELECT id, status INTO v_booking_id, v_old_status
  FROM bookings
  WHERE booking_code = p_booking_code
    AND customer_email = p_customer_email
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or email does not match.'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_old_status != 'PENDING_PAYMENT' THEN
    RAISE EXCEPTION 'Booking is not awaiting payment.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE bookings
  SET receipt_url = p_receipt_url,
      receipt_uploaded_at = now(),
      status = 'CONFIRMED',
      updated_at = now()
  WHERE id = v_booking_id;

  INSERT INTO booking_status_history (booking_id, from_status, to_status, note)
  VALUES (v_booking_id, 'PENDING_PAYMENT', 'CONFIRMED', 'Payment receipt uploaded by customer');
END;
$$;

-- ============================================================
-- H6: Drop old permissive receipt upload policy
-- All receipt submissions must go through submit_receipt RPC
-- ============================================================
DROP POLICY IF EXISTS "public update booking receipt" ON bookings;

-- ============================================================
-- H7 + cleanup: Update cleanup function (SECURITY DEFINER, also cleans lock_attempts)
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM timeslot_locks WHERE expires_at < now();
  DELETE FROM lock_attempts WHERE attempted_at < now() - interval '1 hour';
$$;

-- H7: Schedule cleanup cron job (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('cleanup-locks', '*/15 * * * *', 'SELECT cleanup_expired_locks()');
  END IF;
END;
$$;

-- ============================================================
-- H8: Recreate create_booking_with_conflict_check with rate limiting
-- ============================================================
CREATE OR REPLACE FUNCTION create_booking_with_conflict_check(
  p_booking_code      text,
  p_photographer_id   uuid,
  p_package_id        uuid,
  p_customer_name     text,
  p_customer_email    text,
  p_customer_phone    text,
  p_slot_date         date,
  p_slot_time         time,
  p_pax_count         int,
  p_location          text,
  p_special_requests  text,
  p_payment_amount    numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict_id   uuid;
  v_duration_mins int;
  v_new_end       time;
  v_booking       bookings%ROWTYPE;
  v_error_msg     text;
  v_recent_count  int;
BEGIN
  -- H8: Rate limit — max 3 bookings per 24h per customer_email per photographer
  SELECT count(*) INTO v_recent_count
  FROM bookings
  WHERE customer_email = p_customer_email
    AND photographer_id = p_photographer_id
    AND created_at > now() - interval '1 day'
    AND status != 'CANCELLED';

  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'Booking limit reached. Please try again later.'
      USING ERRCODE = 'program_limit_exceeded';
  END IF;

  SELECT duration_mins INTO v_duration_mins
  FROM packages
  WHERE id = p_package_id;

  IF v_duration_mins IS NULL THEN
    RAISE EXCEPTION 'Package not found.'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  v_new_end := (p_slot_time::time + (v_duration_mins || ' minutes')::interval)::time;

  IF v_new_end <= p_slot_time AND v_duration_mins > 0 THEN
    v_error_msg := 'Booking time extends beyond midnight, which is not supported.';
    RAISE EXCEPTION USING ERRCODE = 'data_exception', MESSAGE = v_error_msg;
  END IF;

  SELECT b.id INTO v_conflict_id
  FROM bookings b
  JOIN packages pk ON b.package_id = pk.id
  WHERE b.photographer_id = p_photographer_id
    AND b.slot_date = p_slot_date
    AND b.status != 'CANCELLED'
    AND b.slot_time < v_new_end
    AND (b.slot_time::time + (pk.duration_mins || ' minutes')::interval)::time > p_slot_time
  LIMIT 1
  FOR UPDATE OF b;

  IF v_conflict_id IS NOT NULL THEN
    RAISE EXCEPTION 'This timeslot overlaps with an existing booking. Please choose a different time.'
      USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO bookings (
    booking_code, photographer_id, package_id,
    customer_name, customer_email, customer_phone,
    slot_date, slot_time, pax_count, location,
    special_requests, status, payment_amount
  ) VALUES (
    p_booking_code, p_photographer_id, p_package_id,
    p_customer_name, p_customer_email, p_customer_phone,
    p_slot_date, p_slot_time, p_pax_count, p_location,
    p_special_requests, 'PENDING_PAYMENT', p_payment_amount
  )
  RETURNING * INTO v_booking;

  INSERT INTO booking_status_history (
    booking_id, from_status, to_status, note
  ) VALUES (
    v_booking.id, NULL, 'PENDING_PAYMENT', 'Booking created by customer'
  );

  RETURN row_to_json(v_booking);
END;
$$;
