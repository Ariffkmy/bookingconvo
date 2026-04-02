import { z } from 'zod'

// ============================================================
// ENUMS
// ============================================================
export type UserRole = 'admin' | 'photographer' | 'customer'

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING_VERIFICATION'
  | 'CONFIRMED'
  | 'RESCHEDULED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'DELIVERED'

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING_PAYMENT: 'Pending Payment',
  PENDING_VERIFICATION: 'Verifying Payment',
  CONFIRMED: 'Confirmed',
  RESCHEDULED: 'Rescheduled',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  DELIVERED: 'Delivered',
}

export const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  PENDING_VERIFICATION: 'bg-blue-100 text-blue-800 border-blue-200',
  CONFIRMED: 'bg-green-100 text-green-800 border-green-200',
  RESCHEDULED: 'bg-orange-100 text-orange-800 border-orange-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  COMPLETED: 'bg-purple-100 text-purple-800 border-purple-200',
  DELIVERED: 'bg-teal-100 text-teal-800 border-teal-200',
}

// Valid transitions per status
export const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING_PAYMENT: ['PENDING_VERIFICATION', 'CANCELLED'],
  PENDING_VERIFICATION: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'RESCHEDULED', 'CANCELLED'],
  RESCHEDULED: ['CONFIRMED', 'CANCELLED'],
  CANCELLED: [],
  COMPLETED: ['DELIVERED'],
  DELIVERED: [],
}

// ============================================================
// DATABASE ROW TYPES
// ============================================================
export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Photographer {
  id: string
  user_id: string
  slug: string
  display_name: string
  bio: string | null
  profile_photo: string | null
  cover_photo: string | null
  school_name: string | null
  location: string | null
  phone: string | null
  email: string | null
  bank_name: string | null
  bank_account: string | null
  bank_account_name: string | null
  payment_instructions: string | null
  duitnow_qr_url: string | null
  lock_duration_mins: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Package {
  id: string
  photographer_id: string
  name: string
  description: string | null
  price: number
  duration_mins: number
  max_pax: number
  inclusions: string[] | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface AvailabilityRule {
  id: string
  photographer_id: string
  day_of_week: number // 0=Sun, 1=Mon...6=Sat
  start_time: string // HH:MM
  end_time: string
  slot_duration_mins: number
  is_active: boolean
}

export interface AvailabilityOverride {
  id: string
  photographer_id: string
  override_date: string // YYYY-MM-DD
  is_blocked: boolean
  start_time: string | null
  end_time: string | null
  note: string | null
}

export interface TimeslotLock {
  id: string
  photographer_id: string
  slot_date: string
  slot_time: string
  session_token: string
  expires_at: string
  created_at: string
}

export interface Booking {
  id: string
  booking_code: string
  photographer_id: string
  package_id: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  slot_date: string
  slot_time: string
  pax_count: number
  location: string | null
  special_requests: string | null
  status: BookingStatus
  payment_amount: number | null
  receipt_url: string | null
  receipt_uploaded_at: string | null
  verified_by: string | null
  verified_at: string | null
  notes: string | null
  gallery_url: string | null
  created_at: string
  updated_at: string
  // Joined
  photographer?: Photographer
  package?: Package
}

export interface BookingStatusHistory {
  id: string
  booking_id: string
  from_status: BookingStatus | null
  to_status: BookingStatus
  changed_by: string | null
  note: string | null
  created_at: string
}

export interface GalleryImage {
  id: string
  photographer_id: string
  storage_path: string
  public_url: string
  caption: string | null
  sort_order: number
  is_cover: boolean
  created_at: string
}

// ============================================================
// ZOD SCHEMAS
// ============================================================
export const bookingFormSchema = z.object({
  customer_name: z.string().min(2, 'Name must be at least 2 characters'),
  customer_email: z.string().email('Invalid email address'),
  customer_phone: z.string().min(10, 'Enter a valid phone number'),
  package_id: z.string().min(1, 'Please select a package'),
  slot_date: z.string().min(1, 'Please select a date'),
  slot_time: z.string().min(1, 'Please select a timeslot'),
  location: z.string().min(2, 'Please enter the location/venue'),
  pax_count: z.number().min(1).max(20),
  special_requests: z.string().optional(),
})

export type BookingFormData = z.infer<typeof bookingFormSchema>

export const packageFormSchema = z.object({
  name: z.string().min(2, 'Package name is required'),
  description: z.string().optional(),
  price: z.number().min(1, 'Price must be greater than 0'),
  duration_mins: z.number().min(15, 'Minimum 15 minutes'),
  max_pax: z.number().min(1).max(50),
  inclusions: z.array(z.string()).optional(),
  is_active: z.boolean(),
})

export type PackageFormData = z.infer<typeof packageFormSchema>

export const settingsProfileSchema = z.object({
  display_name: z.string().min(2, 'Display name is required'),
  slug: z.string().min(3, 'Slug must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  bio: z.string().optional(),
  school_name: z.string().optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
})

export type SettingsProfileData = z.infer<typeof settingsProfileSchema>

export const settingsPaymentSchema = z.object({
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  bank_account_name: z.string().optional(),
  payment_instructions: z.string().optional(),
})

export type SettingsPaymentData = z.infer<typeof settingsPaymentSchema>
