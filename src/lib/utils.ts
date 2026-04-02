import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isToday, isTomorrow, addMinutes } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ms-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'dd MMM yyyy')
}

export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0)
  return format(date, 'h:mm a')
}

export function formatDateTime(dateStr: string, timeStr: string): string {
  return `${formatDate(dateStr)} at ${formatTime(timeStr)}`
}

export function generateBookingCode(): string {
  const now = new Date()
  const datePart = format(now, 'yyyyMMdd')
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let random = ''
  for (let i = 0; i < 6; i++) {
    random += chars[Math.floor(Math.random() * chars.length)]
  }
  return `BK-${datePart}-${random}`
}

export function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function getSessionToken(): string {
  const key = 'booking_session_token'
  let token = sessionStorage.getItem(key)
  if (!token) {
    token = generateSessionToken()
    sessionStorage.setItem(key, token)
  }
  return token
}

export function generateTimeSlots(
  startTime: string,
  endTime: string,
  durationMins: number
): string[] {
  const slots: string[] = []
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)

  let current = new Date()
  current.setHours(startH, startM, 0, 0)

  const end = new Date()
  end.setHours(endH, endM, 0, 0)

  while (current < end) {
    const next = addMinutes(current, durationMins)
    if (next <= end) {
      slots.push(format(current, 'HH:mm'))
    }
    current = next
  }

  return slots
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function getStorageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  // If it's already a full URL, return as-is
  if (path.startsWith('http')) return path
  return null
}
