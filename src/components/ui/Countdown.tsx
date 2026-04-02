import { Clock, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

interface CountdownProps {
  seconds: number
  className?: string
}

export function Countdown({ seconds, className }: CountdownProps) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const isWarning = seconds < 120 // < 2 minutes
  const isCritical = seconds < 60

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border',
      isCritical
        ? 'bg-red-50 border-red-200 text-red-700'
        : isWarning
          ? 'bg-orange-50 border-orange-200 text-orange-700'
          : 'bg-blue-50 border-blue-200 text-blue-700',
      className
    )}>
      {isCritical ? (
        <AlertCircle size={16} className="shrink-0 animate-pulse" />
      ) : (
        <Clock size={16} className="shrink-0" />
      )}
      <span>
        Slot reserved for{' '}
        <span className="font-bold tabular-nums">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
      </span>
    </div>
  )
}
