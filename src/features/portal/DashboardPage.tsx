import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, isToday, parseISO } from 'date-fns'
import { Calendar, Clock, CheckCircle, TrendingUp, ArrowRight, Camera } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { type Booking } from '../../types'
import { formatTime } from '../../lib/utils'
import { BookingStatusBadge } from '../../components/ui/Badge'
import { SectionLoader } from '../../components/ui/Spinner'

export function DashboardPage() {
  const { photographerId } = useAuth()

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['portal-bookings', photographerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, package:packages(*)')
        .eq('photographer_id', photographerId)
        .order('slot_date', { ascending: true })
      return (data || []) as Booking[]
    },
    enabled: !!photographerId,
    refetchInterval: 60000,
  })

  if (isLoading) return <SectionLoader />

  const today = new Date()
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd')

  const todayBookings = bookings.filter(b =>
    isToday(parseISO(b.slot_date)) && b.status !== 'CANCELLED'
  )
  const upcomingBookings = bookings.filter(b =>
    b.slot_date >= format(today, 'yyyy-MM-dd') && b.status !== 'CANCELLED'
  ).slice(0, 5)
  const pendingPayment = bookings.filter(b => b.status === 'PENDING_PAYMENT')
  const thisMonthTotal = bookings.filter(b =>
    b.slot_date >= monthStart && b.slot_date <= monthEnd && b.status !== 'CANCELLED'
  ).length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{format(today, 'EEEE, dd MMMM yyyy')}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Today's Sessions"
          value={todayBookings.length}
          icon={<Camera size={18} className="text-sky-600" />}
          bg="bg-sky-50"
        />
        <StatCard
          label="Awaiting Payment"
          value={pendingPayment.length}
          icon={<Clock size={18} className="text-blue-500" />}
          bg="bg-blue-50"
        />
        <StatCard
          label="This Month"
          value={thisMonthTotal}
          icon={<TrendingUp size={18} className="text-green-600" />}
          bg="bg-green-50"
        />
      </div>

      {/* Today's Sessions */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <Calendar size={16} className="text-sky-500" />
            Today's Sessions
          </h2>
        </div>
        {todayBookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <CheckCircle size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No sessions today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayBookings.map(b => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <Clock size={16} className="text-blue-500" />
            Upcoming Bookings
          </h2>
          <Link to="/portal/bookings" className="text-xs text-sky-600 flex items-center gap-1 hover:text-sky-700">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {upcomingBookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-500">No upcoming bookings</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingBookings.map(b => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label, value, icon, bg, urgent, linkTo
}: {
  label: string; value: number; icon: React.ReactNode; bg: string; urgent?: boolean; linkTo?: string
}) {
  const content = (
    <div className={`${bg} rounded-2xl p-3.5 border ${urgent ? 'border-amber-300' : 'border-transparent'}`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
        {urgent && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-600 mt-0.5">{label}</p>
    </div>
  )

  if (linkTo) return <Link to={linkTo}>{content}</Link>
  return content
}

function BookingRow({ booking }: { booking: Booking }) {
  return (
    <Link
      to={`/portal/bookings/${booking.id}`}
      className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 px-4 py-3 hover:border-sky-300 hover:shadow-sm transition-all"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{booking.customer_name}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {format(parseISO(booking.slot_date), 'dd MMM')} · {formatTime(booking.slot_time)}
        </p>
      </div>
      <BookingStatusBadge status={booking.status} size="sm" />
    </Link>
  )
}
