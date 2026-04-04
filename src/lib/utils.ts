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
  const randomValues = new Uint32Array(6)
  crypto.getRandomValues(randomValues)
  let random = ''
  for (let i = 0; i < 6; i++) {
    random += chars[randomValues[i] % chars.length]
  }
  return `BK-${datePart}-${random}`
}

export function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
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

// ============================================================
// Image compression (client-side, Canvas API — no extra deps)
// ============================================================

export interface CompressOptions {
  /** Max width in px. Aspect ratio is preserved. Default: 1920 */
  maxWidth?: number
  /** Max height in px. Aspect ratio is preserved. Default: 1920 */
  maxHeight?: number
  /** Compression quality 0–1. Default: 0.82 */
  quality?: number
  /** Output format. Default: 'webp' (best compression). Use 'png' for QR codes. */
  format?: 'webp' | 'jpeg' | 'png'
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.82,
    format = 'webp',
  } = options

  const mimeType = `image/${format}`

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img

      // Scale down only if exceeds max; never upscale
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas 2D not supported'))

      // White background (prevents transparent PNGs becoming black in JPEG/WebP)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Image compression failed'))

          const baseName = file.name.replace(/\.[^.]+$/, '')
          const ext = format === 'jpeg' ? 'jpg' : format
          const compressed = new File([blob], `${baseName}.${ext}`, { type: mimeType })

          // If compression made it larger (rare), return original
          resolve(compressed.size < file.size ? compressed : file)
        },
        mimeType,
        format === 'png' ? undefined : quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not load image for compression'))
    }

    img.src = objectUrl
  })
}
