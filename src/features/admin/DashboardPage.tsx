import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Users, BookOpen, TrendingUp, Camera } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { type Booking, type Photographer } from '../../types'
import { formatCurrency } from '../../lib/utils'
import { BookingStatusBadge } from '../../components/ui/Badge'
import { SectionLoader } from '../../components/ui/Spinner'
import { Link } from 'react-router-dom'

export function AdminDashboardPage() {
  const today = new Date()
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd')

  const { data: photographers = [], isLoading: loadingPhotographers } = useQuery({
    queryKey: ['admin-photographers'],
    queryFn: async () => {
      const { data } = await supabase.from('photographers').select('*').order('created_at', { ascending: false })
      return (data || []) as Photographer[]
    },
  })

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, photographer:photographers(display_name), package:packages(name, price)')
        .order('created_at', { ascending: false })
        .limit(20)
      return (data || []) as Booking[]
    },
  })

  const { data: monthStats } = useQuery({
    queryKey: ['admin-month-stats', monthStart],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('status, payment_amount')
        .gte('created_at', monthStart + 'T00:00:00')
        .lte('created_at', monthEnd + 'T23:59:59')
      return data || []
    },
  })

  if (loadingPhotographers || loadingBookings) return <SectionLoader />

  const monthRevenue = (monthStats || [])
    .filter(b => b.status !== 'CANCELLED')
    .reduce((sum, b) => sum + (b.payment_amount || 0), 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{format(today, 'MMMM yyyy')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Users size={18} className="text-indigo-600" />} label="Photographers" value={photographers.length} bg="bg-indigo-50" />
        <StatCard icon={<BookOpen size={18} className="text-sky-600" />} label="Total Bookings" value={bookings.length} bg="bg-sky-50" />
        <StatCard icon={<TrendingUp size={18} className="text-green-600" />} label="This Month Revenue" value={formatCurrency(monthRevenue)} bg="bg-green-50" isText />
      </div>

      {/* Active Photographers */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Photographers</h2>
          <Link to="/admin/photographers" className="text-xs text-indigo-600 hover:text-indigo-700">View all</Link>
        </div>
        <div className="space-y-2">
          {photographers.slice(0, 5).map(p => (
            <div key={p.id} className="flex items-center gap-3 py-1.5">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                {p.profile_photo
                  ? <img src={p.profile_photo} className="w-full h-full rounded-full object-cover" alt="" />
                  : <Camera size={14} className="text-indigo-500" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{p.display_name}</p>
                <p className="text-xs text-gray-500">/p/{p.slug}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {p.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Recent Bookings</h2>
          <Link to="/admin/bookings" className="text-xs text-indigo-600 hover:text-indigo-700">View all</Link>
        </div>
        <div className="space-y-2">
          {bookings.slice(0, 8).map(b => (
            <Link
              key={b.id}
              to={`/admin/bookings/${b.id}`}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{b.customer_name}</p>
                <p className="text-xs text-gray-500">
                  {(b.photographer as unknown as { display_name: string })?.display_name} · {b.booking_code}
                </p>
              </div>
              <BookingStatusBadge status={b.status} size="sm" className="shrink-0 ml-2" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, bg, isText }: {
  icon: React.ReactNode; label: string; value: number | string; bg: string; isText?: boolean
}) {
  return (
    <div className={`${bg} rounded-2xl p-3.5`}>
      <div className="mb-2">{icon}</div>
      <p className={`font-bold text-gray-900 ${isText ? 'text-base' : 'text-2xl'}`}>{value}</p>
      <p className="text-xs text-gray-600 mt-0.5">{label}</p>
    </div>
  )
}
