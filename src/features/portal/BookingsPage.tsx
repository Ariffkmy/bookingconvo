import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  format, parseISO, isSameDay, startOfWeek, addDays, addWeeks, subWeeks, isToday,
} from 'date-fns'
import {
  Search, Filter, Calendar, Clock, ChevronRight, LayoutList, CalendarDays,
  ChevronLeft, ChevronRight as ChevronRightIcon, Table2,
  ChevronsUpDown, ChevronUp, ChevronDown as ChevronDownIcon, X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { type Booking, type BookingStatus, type Package } from '../../types'
import { formatTime } from '../../lib/utils'
import { BookingStatusBadge } from '../../components/ui/Badge'
import { SectionLoader } from '../../components/ui/Spinner'

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const CALENDAR_START_HOUR = 7   // 7 AM
const CALENDAR_END_HOUR = 22    // 10 PM
const HOUR_HEIGHT = 64          // px per hour

const HOURS = Array.from(
  { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR },
  (_, i) => CALENDAR_START_HOUR + i,
)

const STATUS_BLOCK_COLORS: Record<BookingStatus, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 border-yellow-400 text-yellow-900 hover:bg-yellow-200',
  CONFIRMED:       'bg-green-100 border-green-500 text-green-900 hover:bg-green-200',
  RESCHEDULED:     'bg-orange-100 border-orange-400 text-orange-900 hover:bg-orange-200',
  CANCELLED:       'bg-red-50 border-red-300 text-red-600 hover:bg-red-100',
  COMPLETED:       'bg-sky-100 border-sky-400 text-sky-900 hover:bg-sky-200',
  DELIVERED:       'bg-teal-100 border-teal-400 text-teal-900 hover:bg-teal-200',
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function BookingsPage() {
  const { photographerId } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'list' | 'calendar' | 'table'>('list')

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
      b.customer_name, b.customer_email, b.booking_code,
    ].some(f => f?.toLowerCase().includes(search.toLowerCase()))
    return matchStatus && matchSearch
  })

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-500 mt-0.5">{bookings.length} total bookings</p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              view === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutList size={13} />
            List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              view === 'calendar'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CalendarDays size={13} />
            Calendar
          </button>
          <button
            onClick={() => setView('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              view === 'table'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Table2 size={13} />
            Table
          </button>
        </div>
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

      {/* Content */}
      {isLoading ? (
        <SectionLoader />
      ) : view === 'list' ? (
        <ListView bookings={filtered} onClearFilters={() => { setSearch(''); setSearchParams({}) }} hasFilters={!!(search || statusFilter)} />
      ) : view === 'calendar' ? (
        <CalendarView bookings={filtered} />
      ) : (
        <TableView bookings={filtered} />
      )}
    </div>
  )
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({
  bookings,
  hasFilters,
  onClearFilters,
}: {
  bookings: Booking[]
  hasFilters: boolean
  onClearFilters: () => void
}) {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-200">
        <Filter size={24} className="mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No bookings found</p>
        {hasFilters && (
          <button onClick={onClearFilters} className="text-xs text-sky-600 mt-1 hover:underline">
            Clear filters
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {bookings.map(b => <BookingCard key={b.id} booking={b} />)}
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

// ─── Table View ───────────────────────────────────────────────────────────────

type SortCol = 'booking_code' | 'customer_name' | 'slot_date' | 'slot_time' | 'package' | 'status' | 'payment_amount'
type SortDir = 'asc' | 'desc'

interface ColFilters {
  code: string
  customer: string
  date: string
  package: string
  status: string
}

function TableView({ bookings }: { bookings: Booking[] }) {
  const navigate = useNavigate()
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: 'slot_date', dir: 'asc' })
  const [filters, setFilters] = useState<ColFilters>({ code: '', customer: '', date: '', package: '', status: '' })

  const setFilter = (key: keyof ColFilters, val: string) =>
    setFilters(f => ({ ...f, [key]: val }))

  const clearFilters = () => setFilters({ code: '', customer: '', date: '', package: '', status: '' })

  const hasColFilters = Object.values(filters).some(Boolean)

  // Unique package names for dropdown
  const packageOptions = Array.from(
    new Set(bookings.map(b => (b.package as unknown as { name: string } | undefined)?.name).filter(Boolean))
  ) as string[]

  // Apply column-level filters
  const filtered = bookings.filter(b => {
    const pkg = (b.package as unknown as { name: string } | undefined)?.name ?? ''
    if (filters.code && !b.booking_code.toLowerCase().includes(filters.code.toLowerCase())) return false
    if (filters.customer && !b.customer_name.toLowerCase().includes(filters.customer.toLowerCase())) return false
    if (filters.date && b.slot_date !== filters.date) return false
    if (filters.package && pkg !== filters.package) return false
    if (filters.status && b.status !== filters.status) return false
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let av: string | number = '', bv: string | number = ''
    switch (sort.col) {
      case 'booking_code':    av = a.booking_code;    bv = b.booking_code;    break
      case 'customer_name':   av = a.customer_name;   bv = b.customer_name;   break
      case 'slot_date':       av = a.slot_date;        bv = b.slot_date;       break
      case 'slot_time':       av = a.slot_time;        bv = b.slot_time;       break
      case 'package':
        av = (a.package as unknown as { name: string } | undefined)?.name ?? ''
        bv = (b.package as unknown as { name: string } | undefined)?.name ?? ''
        break
      case 'status':          av = a.status;           bv = b.status;          break
      case 'payment_amount':  av = a.payment_amount ?? 0; bv = b.payment_amount ?? 0; break
    }
    if (av < bv) return sort.dir === 'asc' ? -1 : 1
    if (av > bv) return sort.dir === 'asc' ? 1 : -1
    return 0
  })

  const toggleSort = (col: SortCol) =>
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })

  function SortIcon({ col }: { col: SortCol }) {
    if (sort.col !== col) return <ChevronsUpDown size={12} className="text-gray-300" />
    return sort.dir === 'asc'
      ? <ChevronUp size={12} className="text-sky-500" />
      : <ChevronDownIcon size={12} className="text-sky-500" />
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Filter summary bar */}
      {hasColFilters && (
        <div className="flex items-center gap-2 px-4 py-2 bg-sky-50 border-b border-sky-100 text-xs text-sky-700">
          <Filter size={12} />
          <span>{sorted.length} of {bookings.length} bookings shown</span>
          <button onClick={clearFilters} className="ml-auto flex items-center gap-1 hover:text-sky-900">
            <X size={11} /> Clear column filters
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {/* Column headers (sortable) */}
            <tr className="border-b border-gray-100 bg-gray-50">
              <Th col="booking_code" onSort={toggleSort}>
                Code <SortIcon col="booking_code" />
              </Th>
              <Th col="customer_name" onSort={toggleSort}>
                Customer <SortIcon col="customer_name" />
              </Th>
              <Th col="slot_date" onSort={toggleSort}>
                Date <SortIcon col="slot_date" />
              </Th>
              <Th col="slot_time" onSort={toggleSort}>
                Time <SortIcon col="slot_time" />
              </Th>
              <Th col="package" onSort={toggleSort}>
                Package <SortIcon col="package" />
              </Th>
              <Th col="status" onSort={toggleSort}>
                Status <SortIcon col="status" />
              </Th>
              <Th col="payment_amount" onSort={toggleSort}>
                Amount <SortIcon col="payment_amount" />
              </Th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap" />
            </tr>

            {/* Column filter row */}
            <tr className="border-b border-gray-200 bg-white">
              <td className="px-3 py-2">
                <input
                  value={filters.code}
                  onChange={e => setFilter('code', e.target.value)}
                  placeholder="Filter..."
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-400 placeholder:text-gray-300"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  value={filters.customer}
                  onChange={e => setFilter('customer', e.target.value)}
                  placeholder="Filter..."
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-400 placeholder:text-gray-300"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="date"
                  value={filters.date}
                  onChange={e => setFilter('date', e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-400 text-gray-600"
                />
              </td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2">
                <select
                  value={filters.package}
                  onChange={e => setFilter('package', e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-400 bg-white text-gray-600"
                >
                  <option value="">All</option>
                  {packageOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </td>
              <td className="px-3 py-2">
                <select
                  value={filters.status}
                  onChange={e => setFilter('status', e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-400 bg-white text-gray-600"
                >
                  <option value="">All</option>
                  {STATUS_FILTERS.filter(f => f.value).map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2" />
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                  <Filter size={20} className="mx-auto mb-2 text-gray-200" />
                  No bookings match the filters
                </td>
              </tr>
            ) : (
              sorted.map((b, idx) => {
                const pkg = (b.package as unknown as { name: string } | undefined)?.name
                return (
                  <tr
                    key={b.id}
                    onClick={() => navigate(`/portal/bookings/${b.id}`)}
                    className={`cursor-pointer transition-colors hover:bg-sky-50 ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}
                  >
                    <td className="px-3 py-3 font-mono text-xs text-gray-500">{b.booking_code}</td>
                    <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">{b.customer_name}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                      {format(parseISO(b.slot_date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{formatTime(b.slot_time)}</td>
                    <td className="px-3 py-3 text-sky-700 text-xs font-medium whitespace-nowrap">{pkg ?? '—'}</td>
                    <td className="px-3 py-3">
                      <BookingStatusBadge status={b.status} size="sm" />
                    </td>
                    <td className="px-3 py-3 text-gray-700 font-medium whitespace-nowrap">
                      {b.payment_amount ? `RM ${Number(b.payment_amount).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <ChevronRight size={14} className="text-gray-300" />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>

          {sorted.length > 0 && (
            <tfoot>
              <tr className="border-t border-gray-100 bg-gray-50">
                <td colSpan={6} className="px-3 py-2 text-xs text-gray-400">
                  {sorted.length} booking{sorted.length !== 1 ? 's' : ''}
                </td>
                <td className="px-3 py-2 text-xs font-semibold text-gray-700">
                  RM {sorted.reduce((sum, b) => sum + Number(b.payment_amount ?? 0), 0).toFixed(2)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

function Th({
  col, onSort, children,
}: {
  col: SortCol
  onSort: (col: SortCol) => void
  children: React.ReactNode
}) {
  return (
    <th
      onClick={() => onSort(col)}
      className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-gray-800 select-none"
    >
      <div className="flex items-center gap-1">{children}</div>
    </th>
  )
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({ bookings }: { bookings: Booking[] }) {
  const navigate = useNavigate()
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
  )

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const weekEnd = addDays(weekStart, 6)
  const weekLabel =
    format(weekStart, 'MMM d') + ' – ' + format(weekEnd, 'd MMM yyyy')

  // Filter bookings that fall within this week
  const weekBookings = bookings.filter(b => {
    const d = parseISO(b.slot_date)
    return days.some(day => isSameDay(day, d))
  })

  function getTopPx(slotTime: string) {
    const [h, m] = slotTime.split(':').map(Number)
    return ((h - CALENDAR_START_HOUR) * 60 + m) / 60 * HOUR_HEIGHT
  }

  function getHeightPx(durationMins: number) {
    return Math.max((durationMins / 60) * HOUR_HEIGHT - 3, 22)
  }

  const totalHeight = HOURS.length * HOUR_HEIGHT

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Week navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button
          onClick={() => setWeekStart(w => subWeeks(w, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-900">{weekLabel}</span>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-sky-400 hover:text-sky-600 transition-colors"
          >
            Today
          </button>
        </div>

        <button
          onClick={() => setWeekStart(w => addWeeks(w, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        >
          <ChevronRightIcon size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="flex border-b border-gray-100">
        {/* Time gutter */}
        <div className="w-14 shrink-0" />
        {days.map(day => (
          <div
            key={day.toISOString()}
            className={`flex-1 text-center py-2 border-l border-gray-100 ${
              isToday(day) ? 'bg-sky-50' : ''
            }`}
          >
            <p className={`text-xs font-medium ${isToday(day) ? 'text-sky-600' : 'text-gray-500'}`}>
              {format(day, 'EEE')}
            </p>
            <p className={`text-sm font-bold mt-0.5 w-7 h-7 flex items-center justify-center mx-auto rounded-full ${
              isToday(day) ? 'bg-sky-600 text-white' : 'text-gray-900'
            }`}>
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>

      {/* Scrollable grid */}
      <div className="overflow-y-auto max-h-[600px]">
        <div className="flex" style={{ height: `${totalHeight}px` }}>
          {/* Time labels */}
          <div className="w-14 shrink-0 relative">
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute w-full flex items-start justify-end pr-2"
                style={{ top: `${(h - CALENDAR_START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
              >
                <span className="text-[10px] text-gray-400 leading-none -translate-y-1.5">
                  {format(new Date(2000, 0, 1, h), 'h a')}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(day => {
            const dayBookings = weekBookings.filter(b => isSameDay(parseISO(b.slot_date), day))

            return (
              <div
                key={day.toISOString()}
                className={`flex-1 relative border-l border-gray-100 ${
                  isToday(day) ? 'bg-sky-50/40' : ''
                }`}
              >
                {/* Hour grid lines */}
                {HOURS.map(h => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-gray-100"
                    style={{ top: `${(h - CALENDAR_START_HOUR) * HOUR_HEIGHT}px` }}
                  />
                ))}

                {/* Half-hour lines */}
                {HOURS.map(h => (
                  <div
                    key={`half-${h}`}
                    className="absolute left-0 right-0 border-t border-dashed border-gray-50"
                    style={{ top: `${(h - CALENDAR_START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }}
                  />
                ))}

                {/* Booking blocks */}
                {dayBookings.map(b => {
                  const pkg = b.package as unknown as Package | undefined
                  const top = getTopPx(b.slot_time)
                  const height = getHeightPx(pkg?.duration_mins ?? 60)
                  const colorClass = STATUS_BLOCK_COLORS[b.status]

                  // Skip if out of visible range
                  const [h] = b.slot_time.split(':').map(Number)
                  if (h < CALENDAR_START_HOUR || h >= CALENDAR_END_HOUR) return null

                  return (
                    <button
                      key={b.id}
                      onClick={() => navigate(`/portal/bookings/${b.id}`)}
                      className={`absolute left-0.5 right-0.5 rounded border-l-[3px] px-1.5 py-1 text-left overflow-hidden transition-all cursor-pointer ${colorClass}`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      title={`${b.customer_name} · ${formatTime(b.slot_time)}${pkg ? ` · ${pkg.name}` : ''}`}
                    >
                      <p className="text-[11px] font-semibold leading-tight truncate">
                        {b.customer_name}
                      </p>
                      {height >= 36 && (
                        <p className="text-[10px] opacity-70 leading-tight truncate">
                          {formatTime(b.slot_time)}
                          {pkg && ` · ${pkg.name}`}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
        {(Object.entries(STATUS_BLOCK_COLORS) as [BookingStatus, string][]).map(([status, colors]) => {
          const count = bookings.filter(b => b.status === status).length
          if (count === 0) return null
          return (
            <span key={status} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-2 h-2 rounded-sm border-l-2 ${colors.split(' ').slice(0, 2).join(' ')}`} />
              {status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              <span className="text-gray-400">({count})</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
