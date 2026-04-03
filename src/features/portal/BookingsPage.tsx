import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Search, Filter, Calendar, Clock, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { type Booking } from '../../types'
import { formatTime } from '../../lib/utils'
import { BookingStatusBadge } from '../../components/ui/Badge'
import { SectionLoader } from '../../components/ui/Spinner'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'PENDING_VERIFICATION', label: 'Verify Receipt' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export function BookingsPage() {
  const { photographerId } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')

  const statusFilter = searchParams.get('status') || ''

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['portal-bookings', photographerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, package:packages(*)')
        .eq('photographer_id', photographerId)
        .order('created_at', { ascending: false })
      return (data || []) as Booking[]
    },
    enabled: !!photographerId,
    refetchInterval: 60000,
  })

  const filtered = bookings.filter(b => {
    const matchStatus = !statusFilter || b.status === statusFilter
    const matchSearch = !search || [
      b.customer_name, b.customer_email, b.booking_code
    ].some(f => f?.toLowerCase().includes(search.toLowerCase()))
    return matchStatus && matchSearch
  })

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Bookings</h1>
        <p className="text-sm text-gray-500 mt-0.5">{bookings.length} total bookings</p>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name, email, code..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setSearchParams(f.value ? { status: f.value } : {})}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              statusFilter === f.value
                ? 'bg-sky-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-sky-300'
            }`}
          >
            {f.label}
            {f.value && (
              <span className="ml-1 opacity-70">
                ({bookings.filter(b => b.status === f.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Booking List */}
      {isLoading ? (
        <SectionLoader />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-200">
          <Filter size={24} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No bookings found</p>
          {(search || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setSearchParams({}) }}
              className="text-xs text-sky-600 mt-1 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(b => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  )
}

function BookingCard({ booking }: { booking: Booking }) {
  const pkg = booking.package as unknown as { name: string } | undefined

  return (
    <Link
      to={`/portal/bookings/${booking.id}`}
      className="block bg-white rounded-2xl border border-gray-200 p-4 hover:border-sky-300 hover:shadow-sm transition-all active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-semibold text-gray-900 text-sm truncate">{booking.customer_name}</p>
            <BookingStatusBadge status={booking.status} size="sm" />
          </div>
          <p className="text-xs text-gray-500 font-mono">{booking.booking_code}</p>
          <div className="flex gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {format(parseISO(booking.slot_date), 'dd MMM yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {formatTime(booking.slot_time)}
            </span>
          </div>
          {pkg && (
            <p className="text-xs text-sky-600 mt-1 font-medium">{pkg.name}</p>
          )}
        </div>
        <ChevronRight size={16} className="text-gray-400 shrink-0 mt-1" />
      </div>
    </Link>
  )
}
