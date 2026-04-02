import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Search, Filter, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { type Booking } from '../../types'
import { formatTime } from '../../lib/utils'
import { BookingStatusBadge } from '../../components/ui/Badge'
import { SectionLoader } from '../../components/ui/Spinner'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'PENDING_VERIFICATION', label: 'Verify Receipt' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export function AdminBookingsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['admin-all-bookings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, photographer:photographers(display_name, slug), package:packages(name)')
        .order('created_at', { ascending: false })
        .limit(200)
      return (data || []) as Booking[]
    },
    refetchInterval: 60000,
  })

  const filtered = bookings.filter(b => {
    const matchStatus = !statusFilter || b.status === statusFilter
    const matchSearch = !search || [
      b.customer_name, b.customer_email, b.booking_code,
      (b.photographer as unknown as { display_name: string })?.display_name,
    ].some(f => f?.toLowerCase().includes(search.toLowerCase()))
    return matchStatus && matchSearch
  })

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">All Bookings</h1>
        <p className="text-sm text-gray-500 mt-0.5">{bookings.length} total</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search name, email, code, photographer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              statusFilter === f.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SectionLoader />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-200">
          <Filter size={24} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(b => {
            const photographer = b.photographer as unknown as { display_name: string; slug: string } | undefined
            const pkg = b.package as unknown as { name: string } | undefined
            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{b.customer_name}</p>
                      <BookingStatusBadge status={b.status} size="sm" />
                    </div>
                    <p className="text-xs font-mono text-indigo-600 mt-0.5">{b.booking_code}</p>
                    {photographer && (
                      <p className="text-xs text-gray-500 mt-1">📷 {photographer.display_name}</p>
                    )}
                    <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {format(parseISO(b.slot_date), 'dd MMM yyyy')}
                      </span>
                      <span>{formatTime(b.slot_time)}</span>
                      {pkg && <span>· {pkg.name}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
