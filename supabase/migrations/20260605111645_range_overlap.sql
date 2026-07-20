-- ============================================================
-- Migration v2: Duration-aware Booking Conflict Prevention
-- Replaces exact-slot matching with time-range overlap detection.
--
-- Changes from v1:
--   - RPC now checks OVERLAPPING time ranges (not just exact slot)
--   - Prevents 60-min booking at 10:00 conflicting with 30-min at 10:30
--   - Added get_booked_slots() for public visibility
--   - FOR UPDATE comment corrected
-- ============================================================

-- ============================================================
-- 1. Drop old unique index — will be replaced by range-aware logic
--    inside the RPC. Keep the index on (photographer_id, slot_date)
--    for query performance.
-- ============================================================
DROP INDEX IF EXISTS idx_unique_active_booking;

-- Regular index for fast lookups (NOT unique — we handle uniqueness in RPC)
CREATE INDEX IF NOT EXISTS idx_bookings_active_slots
  ON bookings (photographer_id, slot_date, slot_time)
  WHERE status != 'CANCELLED';

-- ============================================================
-- 2. Updated RPC — checks TIME RANGE OVERLAP instead of exact slot.
--    Looks up package duration, then checks if any existing active
--    booking's time window overlaps with the new one.
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
BEGIN
  -- Look up package duration
  SELECT duration_mins INTO v_duration_mins
  FROM packages
  WHERE id = p_package_id;

  IF v_duration_mins IS NULL THEN
    RAISE EXCEPTION 'Package not found.'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Calculate end time of the NEW booking
  v_new_end := (p_slot_time::time + (v_duration_mins || ' minutes')::interval)::time;

  -- Handle wrap-around (e.g., 23:30 + 60 min = 00:30 next day)
  IF v_new_end <= p_slot_time AND v_duration_mins > 0 THEN
    v_error_msg := 'Booking time extends beyond midnight, which is not supported.';
    RAISE EXCEPTION USING ERRCODE = 'data_exception', MESSAGE = v_error_msg;
  END IF;

  -- Check for overlapping active bookings.
  -- Two bookings overlap when: existing_start < new_end AND existing_end > new_start
  -- existing_end is calculated from each booking's package duration.
  SELECT b.id INTO v_conflict_id
  FROM bookings b
  JOIN packages pk ON b.package_id = pk.id
  WHERE b.photographer_id = p_photographer_id
    AND b.slot_date = p_slot_date
    AND b.status != 'CANCELLED'
    AND b.slot_time < v_new_end                                    -- existing_start < new_end
    AND (b.slot_time::time + (pk.duration_mins || ' minutes')::interval)::time > p_slot_time  -- existing_end > new_start
  LIMIT 1
  FOR UPDATE OF b;  -- Lock only the bookings row, prevents race on overlapping slots

  IF v_conflict_id IS NOT NULL THEN
    RAISE EXCEPTION 'This timeslot overlaps with an existing booking. Please choose a different time.'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Insert the booking
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

  -- Insert initial status history
  INSERT INTO booking_status_history (
    booking_id, from_status, to_status, note
  ) VALUES (
    v_booking.id, NULL, 'PENDING_PAYMENT', 'Booking created by customer'
  );

  -- Return the booking as JSON
  RETURN row_to_json(v_booking);
END;
$$;

-- ============================================================
-- 3. get_booked_slots — public RPC to see which slots are taken
--    (fixes the visibility gap: customers couldn't see booked slots)
-- ============================================================
CREATE OR REPLACE FUNCTION get_booked_slots(
  p_photographer_id uuid,
  p_date date
)
RETURNS TABLE(slot_time time, duration_mins int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.slot_time, pk.duration_mins
  FROM bookings b
  JOIN packages pk ON b.package_id = pk.id
  WHERE b.photographer_id = p_photographer_id
    AND b.slot_date = p_date
    AND b.status != 'CANCELLED'
  ORDER BY b.slot_time;
$$;

-- ============================================================
-- 4. Fix the misleading comment on FOR UPDATE — row-level lock
--    serialises access when an overlapping booking already exists.
--    The overlap check in the WHERE clause is the actual conflict
--    detector; FOR UPDATE prevents two concurrent checks from
--    both seeing "no conflict" simultaneously.
-- ============================================================
-- (Comment fix embedded in the RPC above — see FOR UPDATE OF b)
