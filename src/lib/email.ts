import { supabase } from './supabase'
import type { BookingStatus } from '../types'

export interface BookingEmailInfo {
  booking_code: string
  customer_name: string
  customer_email: string
  slot_date: string
  slot_time: string
  location?: string | null
  package_name?: string
  package_price?: number
  pax_count?: number
  gallery_url?: string | null
  photographer_name?: string
  photographer_slug?: string
}

// Fire-and-forget email sender — never blocks or throws to the caller.
// The edge function handles actual delivery; failures are logged server-side.
function invoke(payload: Record<string, unknown>): void {
  supabase.functions
    .invoke('send-email', { body: payload })
    .catch(err => console.warn('[email] send failed:', err))
}

export function sendGreetingEmail(to: string, name: string): void {
  invoke({ type: 'greeting', to, name })
}

export function sendBookingConfirmationEmail(booking: BookingEmailInfo): void {
  invoke({ type: 'booking_confirmation', booking })
}

export function sendStatusChangeEmail(
  booking: BookingEmailInfo,
  toStatus: BookingStatus,
  note?: string,
): void {
  invoke({ type: 'status_change', booking, to_status: toStatus, note: note || undefined })
}
