import { cn } from '../../lib/utils'
import { type BookingStatus, BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '../../types'

interface BadgeProps {
  status: BookingStatus
  size?: 'sm' | 'md'
  className?: string
}

export function BookingStatusBadge({ status, size = 'md', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center font-medium rounded-full border',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      BOOKING_STATUS_COLORS[status],
      className
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {BOOKING_STATUS_LABELS[status]}
    </span>
  )
}

interface GenericBadgeProps {
  children: React.ReactNode
  variant?: 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'purple'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'gray', size = 'md', className }: GenericBadgeProps) {
  const variants = {
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    purple: 'bg-sky-100 text-sky-800 border-sky-200',
  }

  return (
    <span className={cn(
      'inline-flex items-center font-medium rounded-full border',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}
