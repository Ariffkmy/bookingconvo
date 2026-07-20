-- ============================================================
-- Dummy Bookings Seed
-- Auto-discovers existing photographers & packages.
-- Safe to run multiple times (uses unique booking codes).
-- Run in Supabase SQL Editor.
-- ============================================================

do $$
declare
  v_photographer_id uuid;
  v_package_id      uuid;
  v_package_price   numeric;
  v_booking_id      uuid;
  v_booking_code    text;
  v_slot_date       date;
  v_slot_time       time;

  -- Customer pool
  type_customers text[][] := array[
    array['Aisyah Binti Rahman',    'aisyah.rahman@gmail.com',   '+601112345678'],
    array['Muhammad Hafiz',         'hafiz.study@gmail.com',     '+601123456789'],
    array['Nur Farah Liyana',       'farah.liyana@yahoo.com',    '+601134567890'],
    array['Ahmad Zulkifli',         'zulkifli.ahmad@gmail.com',  '+601145678901'],
    array['Siti Nabilah',           'nabilah.siti@gmail.com',    '+601156789012'],
    array['Haziq Bin Ismail',       'haziq.ismail@outlook.com',  '+601167890123'],
    array['Nadia Husna',            'nadia.husna@gmail.com',     '+601178901234'],
    array['Izzatul Iman',           'izzatul.iman@gmail.com',    '+601189012345'],
    array['Syafiq Danial',          'syafiq.danial@gmail.com',   '+601190123456'],
    array['Hanis Zahirah',          'hanis.zahirah@yahoo.com',   '+601101234567'],
    array['Amirul Hakimi',          'amirul.hakimi@gmail.com',   '+601111234567'],
    array['Fatin Syahirah',         'fatin.syahirah@gmail.com',  '+601121234567'],
    array['Irfan Bin Zakaria',      'irfan.zakaria@gmail.com',   '+601131234567'],
    array['Alya Batrisyia',         'alya.batrisyia@gmail.com',  '+601141234567'],
    array['Muaz Fakhruddin',        'muaz.fakhruddin@gmail.com', '+601151234567']
  ];

  -- Location pool
  type_locations text[] := array[
    'Dewan Besar, Universiti Malaya',
    'Dataran Perdana, UPM',
    'Padang Kawad, UTM Skudai',
    'Dewan Tun Canselor, USM',
    'Kompleks Sukan UKM',
    'Dewan Agung Tuanku Canselor, UiTM',
    'Kolej Kediaman 4, UM',
    'Padang Convocation, UMS',
    'Balai Raya Utama, UMT',
    'Dewan Budaya Kampus Induk'
  ];

  -- Special requests pool
  type_requests text[] := array[
    'Sila ambil gambar dari sudut kanan',
    'Prefer outdoor shots if weather permits',
    'Need photos ready within 3 days',
    'Group shot with 5 friends after individual',
    null, null, null  -- most bookings have no special requests
  ];

  -- Statuses with weightings (more realistic distribution)
  type_statuses text[] := array[
    'PENDING_PAYMENT',
    'PENDING_PAYMENT',
    'CONFIRMED',
    'CONFIRMED',
    'CONFIRMED',
    'COMPLETED',
    'COMPLETED',
    'DELIVERED',
    'CANCELLED',
    'RESCHEDULED'
  ];

  v_customer      text[];
  v_location      text;
  v_request       text;
  v_status        text;
  v_pax           int;
  v_i             int;
  v_days_offset   int;

begin
  -- Get the first active photographer (uses whatever exists in the DB)
  select id into v_photographer_id
  from photographers
  where is_active = true
  order by created_at
  limit 1;

  if v_photographer_id is null then
    raise exception 'No active photographers found. Please create a photographer first.';
  end if;

  -- Generate 20 dummy bookings
  for v_i in 1..20 loop

    -- Pick a random package for this photographer
    select id, price into v_package_id, v_package_price
    from packages
    where photographer_id = v_photographer_id
      and is_active = true
    order by random()
    limit 1;

    if v_package_id is null then
      raise notice 'No packages found for photographer %, skipping booking %', v_photographer_id, v_i;
      continue;
    end if;

    -- Random date: spread across past 60 days and next 30 days
    v_days_offset := (random() * 90 - 60)::int;
    v_slot_date   := current_date + v_days_offset;

    -- Random timeslot between 8am–5pm in 1h increments
    v_slot_time := (time '08:00' + (floor(random() * 9) || ' hours')::interval)::time;

    -- Pick random customer, location, request, status, pax
    v_customer := type_customers[1 + (random() * (array_length(type_customers, 1) - 1))::int];
    v_location := type_locations[1 + (random() * (array_length(type_locations,  1) - 1))::int];
    v_request  := type_requests [1 + (random() * (array_length(type_requests,   1) - 1))::int];
    v_status   := type_statuses [1 + (random() * (array_length(type_statuses,   1) - 1))::int];
    v_pax      := 1 + (random() * 3)::int;  -- 1–4 pax

    -- Force past bookings to be completed/delivered, future ones pending/confirmed
    if v_slot_date < current_date - 7 then
      v_status := (array['COMPLETED', 'DELIVERED', 'CANCELLED'])[1 + (random() * 2)::int];
    elsif v_slot_date > current_date + 7 then
      v_status := (array['PENDING_PAYMENT', 'CONFIRMED', 'CONFIRMED'])[1 + (random() * 2)::int];
    end if;

    -- Generate unique booking code
    v_booking_code := 'BK-' ||
      to_char(current_date, 'YYYYMMDD') || '-' ||
      upper(substring(md5(random()::text || v_i::text), 1, 6));

    -- Insert booking
    insert into bookings (
      booking_code, photographer_id, package_id,
      customer_name, customer_email, customer_phone,
      slot_date, slot_time, pax_count,
      location, special_requests,
      status, payment_amount,
      created_at, updated_at
    ) values (
      v_booking_code,
      v_photographer_id,
      v_package_id,
      v_customer[1], v_customer[2], v_customer[3],
      v_slot_date, v_slot_time, v_pax,
      v_location, v_request,
      v_status::booking_status,
      v_package_price,
      now() - ((random() * 30)::int || ' days')::interval,
      now() - ((random() * 5)::int  || ' days')::interval
    )
    returning id into v_booking_id;

    -- Insert initial status history
    insert into booking_status_history (booking_id, from_status, to_status, note, created_at)
    values (v_booking_id, null, 'PENDING_PAYMENT', 'Booking created by customer', now() - ((random() * 30)::int || ' days')::interval);

    -- Add a second history entry for non-pending bookings
    if v_status != 'PENDING_PAYMENT' then
      insert into booking_status_history (booking_id, from_status, to_status, note, created_at)
      values (
        v_booking_id,
        'PENDING_PAYMENT',
        v_status::booking_status,
        case v_status
          when 'CONFIRMED'    then 'Payment verified, booking confirmed'
          when 'COMPLETED'    then 'Session completed successfully'
          when 'DELIVERED'    then 'Gallery delivered to customer'
          when 'CANCELLED'    then 'Cancelled by customer'
          when 'RESCHEDULED'  then 'Rescheduled upon customer request'
          else 'Status updated'
        end,
        now() - ((random() * 10)::int || ' days')::interval
      );
    end if;

    raise notice 'Created booking % (%) — % on % at % [%]',
      v_i, v_booking_code, v_customer[1], v_slot_date, v_slot_time, v_status;

  end loop;

  raise notice '✓ Done — 20 dummy bookings inserted.';
end;
$$;
