-- ============================================================
-- Fix: affiliate_code never persisted + client-trusted payment_amount
--
-- ISSUE 1: bookingService.ts set affiliate_code via a plain anon
-- UPDATE after the booking insert. The only anon UPDATE policy on
-- bookings requires the row to transition PENDING_PAYMENT -> CONFIRMED,
-- so a same-status update (only affiliate_code changing) was rejected
-- by RLS and failed silently. affiliate_code was never saved.
--
-- ISSUE 2: create_booking_with_conflict_check accepted payment_amount
-- directly from the client with no server-side validation against the
-- package's actual price, allowing a caller to set an arbitrary amount
-- (e.g. 0) and then auto-confirm via submit_receipt.
--
-- FIX: accept p_affiliate_code and insert it in the same INSERT as the
-- booking (bypasses RLS since the function is SECURITY DEFINER); derive
-- payment_amount from packages.price instead of accepting it as a param.
-- ============================================================

DROP FUNCTION IF EXISTS create_booking_with_conflict_check(
  text, uuid, uuid, text, text, text, date, time, int, text, text, numeric
);

CREATE FUNCTION create_booking_with_conflict_check(
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
  p_affiliate_code    text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict_id     uuid;
  v_duration_mins   int;
  v_package_price   numeric;
  v_new_end         time;
  v_booking         bookings%ROWTYPE;
  v_error_msg       text;
  v_recent_count    int;
BEGIN
  -- Rate limit — max 3 bookings per 24h per customer_email per photographer
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

  SELECT duration_mins, price INTO v_duration_mins, v_package_price
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
    special_requests, status, payment_amount, affiliate_code
  ) VALUES (
    p_booking_code, p_photographer_id, p_package_id,
    p_customer_name, p_customer_email, p_customer_phone,
    p_slot_date, p_slot_time, p_pax_count, p_location,
    p_special_requests, 'PENDING_PAYMENT', v_package_price, p_affiliate_code
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

GRANT EXECUTE ON FUNCTION create_booking_with_conflict_check(
  text, uuid, uuid, text, text, text, date, time, int, text, text, text
) TO anon, authenticated;
