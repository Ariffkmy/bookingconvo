import { supabase } from './supabase'
import type { Booking } from '../types'

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function rangesOverlap(
  startA: number, durationA: number,
  startB: number, durationB: number
): boolean {
  return startA < startB + durationB && startA + durationA > startB
}

interface ConflictCheckParams {
  photographer_id: string
  package_id: string
  slot_date: string
  slot_time: string
}

interface ConflictResult {
  hasConflict: boolean
  conflictingBooking?: { id: string; status: string; slot_time: string }
}

export async function checkForConflicts(
  params: ConflictCheckParams
): Promise<ConflictResult> {
  const [pkgResult, bookingsResult] = await Promise.all([
    supabase
      .from('packages')
      .select('duration_mins')
      .eq('id', params.package_id)
      .single(),
    supabase
      .from('bookings')
      .select('id, status, slot_time, package_id, packages:package_id(duration_mins)')
      .eq('photographer_id', params.photographer_id)
      .eq('slot_date', params.slot_date)
      .not('status', 'eq', 'CANCELLED'),
  ])

  if (pkgResult.error) throw new Error('Failed to load package: ' + pkgResult.error.message)
  if (bookingsResult.error) throw new Error('Failed to check availability: ' + bookingsResult.error.message)

  const newDuration = pkgResult.data?.duration_mins ?? 60
  const newStart = timeToMinutes(params.slot_time)

  const bookings = bookingsResult.data || []
  for (const b of bookings) {
    const existingDuration = (b.packages as any)?.duration_mins ?? 60
    const existingStart = timeToMinutes(b.slot_time)
    if (rangesOverlap(newStart, newDuration, existingStart, existingDuration)) {
      return {
        hasConflict: true,
        conflictingBooking: { id: b.id, status: b.status, slot_time: b.slot_time },
      }
    }
  }

  return { hasConflict: false }
}

interface CreateBookingParams {
  booking_code: string
  photographer_id: string
  package_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  slot_date: string
  slot_time: string
  pax_count: number
  location: string
  special_requests: string | null
  payment_amount: number | null
}

export async function createBookingWithGuard(
  params: CreateBookingParams
): Promise<Booking> {
  // Pre-flight conflict check (fast-fail before hitting the RPC)
  const conflict = await checkForConflicts({
    photographer_id: params.photographer_id,
    package_id: params.package_id,
    slot_date: params.slot_date,
    slot_time: params.slot_time,
  })

  if (conflict.hasConflict) {
    throw new Error('This timeslot overlaps with an existing booking. Please choose a different time.')
  }

  // Atomic creation via DB function (the real race-condition guard)
  const { data, error } = await supabase.rpc('create_booking_with_conflict_check', {
    p_booking_code: params.booking_code,
    p_photographer_id: params.photographer_id,
    p_package_id: params.package_id,
    p_customer_name: params.customer_name,
    p_customer_email: params.customer_email,
    p_customer_phone: params.customer_phone || '',
    p_slot_date: params.slot_date,
    p_slot_time: params.slot_time,
    p_pax_count: params.pax_count,
    p_location: params.location || '',
    p_special_requests: params.special_requests,
    p_payment_amount: params.payment_amount,
  })

  if (error) {
    if (error.message.includes('overlaps') || error.message.includes('already booked') || error.code === '23505') {
      throw new Error('This timeslot was just booked by someone else. Please choose a different time.')
    }
    throw new Error(error.message || 'Failed to create booking.')
  }

  return data as Booking
}
