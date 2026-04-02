import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { MapPin, Calendar, Clock, Users, Upload, AlertCircle, CheckCircle, Package as PackageIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { type Booking, type Package, type Photographer, type BookingStatusHistory } from '../../types'
import { formatCurrency, formatTime } from '../../lib/utils'
import { BookingStatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { SectionLoader } from '../../components/ui/Spinner'

export function BookingDetailPage() {
  const { bookingCode } = useParams<{ bookingCode: string }>()

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_booking_by_code', { p_code: bookingCode })
        .single()
      if (error) throw error
      return data as Booking
    },
    enabled: !!bookingCode,
    refetchInterval: 30000,
  })

  const { data: photographer } = useQuery({
    queryKey: ['photographer-by-id', booking?.photographer_id],
    queryFn: async () => {
      const { data } = await supabase.from('photographers').select('*').eq('id', booking!.photographer_id).single()
      return data as Photographer
    },
    enabled: !!booking?.photographer_id,
  })

  const { data: pkg } = useQuery({
    queryKey: ['package', booking?.package_id],
    queryFn: async () => {
      const { data } = await supabase.from('packages').select('*').eq('id', booking!.package_id).single()
      return data as Package
    },
    enabled: !!booking?.package_id,
  })

  const { data: history = [] } = useQuery({
    queryKey: ['booking-history', booking?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('booking_status_history')
        .select('*')
        .eq('booking_id', booking!.id)
        .order('created_at', { ascending: true })
      return (data || []) as BookingStatusHistory[]
    },
    enabled: !!booking?.id,
  })

  if (isLoading) return <SectionLoader />

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">Booking not found.</p>
          <p className="text-sm text-gray-400 mt-1">Check your booking code and try again.</p>
        </div>
      </div>
    )
  }

  const STATUS_MESSAGES: Record<string, { icon: React.ReactNode; title: string; desc: string }> = {
    PENDING_PAYMENT: {
      icon: <AlertCircle size={20} className="text-yellow-500" />,
      title: 'Awaiting Payment',
      desc: 'Please transfer the payment and upload your receipt to proceed.',
    },
    PENDING_VERIFICATION: {
      icon: <Clock size={20} className="text-blue-500" />,
      title: 'Verifying Payment',
      desc: 'The photographer is reviewing your payment receipt.',
    },
    CONFIRMED: {
      icon: <CheckCircle size={20} className="text-green-500" />,
      title: 'Booking Confirmed!',
      desc: "You're all set! See you at your session.",
    },
    RESCHEDULED: {
      icon: <Calendar size={20} className="text-orange-500" />,
      title: 'Rescheduled',
      desc: 'Your session has been rescheduled. Check the new date/time below.',
    },
    CANCELLED: {
      icon: <AlertCircle size={20} className="text-red-500" />,
      title: 'Booking Cancelled',
      desc: 'This booking has been cancelled.',
    },
    COMPLETED: {
      icon: <CheckCircle size={20} className="text-purple-500" />,
      title: 'Session Completed!',
      desc: 'Thank you for choosing us for your graduation shoot!',
    },
    DELIVERED: {
      icon: <CheckCircle size={20} className="text-teal-500" />,
      title: 'Photos Delivered!',
      desc: "Your photos are ready. Check your email or the gallery link below.",
    },
  }

  const statusMsg = STATUS_MESSAGES[booking.status]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Status Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <div className="flex items-start gap-3">
          {statusMsg?.icon}
          <div>
            <h1 className="font-bold text-gray-900">{statusMsg?.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{statusMsg?.desc}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Booking Code</p>
            <p className="font-mono font-bold text-purple-700 text-sm">{booking.booking_code}</p>
          </div>
          <BookingStatusBadge status={booking.status} />
        </div>
      </div>

      {/* Action CTA */}
      {booking.status === 'PENDING_PAYMENT' && (
        <Link to={`/booking/${bookingCode}/payment`}>
          <Button fullWidth size="lg" className="mb-4">
            <Upload size={18} />
            Upload Payment Receipt
          </Button>
        </Link>
      )}

      {booking.status === 'PENDING_VERIFICATION' && booking.receipt_url && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 text-sm text-blue-700">
          <CheckCircle size={16} className="inline mr-1.5" />
          Receipt submitted. Waiting for verification.
          <Link
            to={`/booking/${bookingCode}/payment`}
            className="block mt-2 text-blue-600 underline text-xs"
          >
            Re-upload receipt
          </Link>
        </div>
      )}

      {booking.gallery_url && booking.status === 'DELIVERED' && (
        <a href={booking.gallery_url} target="_blank" rel="noopener noreferrer">
          <Button fullWidth size="lg" variant="secondary" className="mb-4">
            View Your Photos
          </Button>
        </a>
      )}

      {/* Session Details */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Session Details</h3>
        <div className="space-y-3">
          {photographer && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                {photographer.profile_photo
                  ? <img src={photographer.profile_photo} className="w-full h-full rounded-full object-cover" alt="" />
                  : <span className="text-xs font-bold text-purple-600">{photographer.display_name[0]}</span>
                }
              </div>
              <div>
                <p className="text-xs text-gray-400">Photographer</p>
                <p className="text-sm font-semibold">{photographer.display_name}</p>
              </div>
            </div>
          )}

          <InfoRow icon={<Calendar size={14} />} label="Date">
            {format(parseISO(booking.slot_date), 'EEEE, dd MMMM yyyy')}
          </InfoRow>
          <InfoRow icon={<Clock size={14} />} label="Time">
            {formatTime(booking.slot_time)}
          </InfoRow>
          {booking.location && (
            <InfoRow icon={<MapPin size={14} />} label="Location">
              {booking.location}
            </InfoRow>
          )}
          <InfoRow icon={<Users size={14} />} label="People">
            {booking.pax_count} {booking.pax_count === 1 ? 'person' : 'people'}
          </InfoRow>
          {pkg && (
            <InfoRow icon={<PackageIcon size={14} />} label="Package">
              {pkg.name} — {formatCurrency(pkg.price)}
            </InfoRow>
          )}
        </div>
      </div>

      {/* Customer info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Information</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Name</span>
            <span>{booking.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="truncate ml-4">{booking.customer_email}</span>
          </div>
          {booking.customer_phone && (
            <div className="flex justify-between">
              <span className="text-gray-500">Phone</span>
              <span>{booking.customer_phone}</span>
            </div>
          )}
          {booking.special_requests && (
            <div>
              <span className="text-gray-500 block">Special Requests</span>
              <span className="text-sm mt-0.5 block">{booking.special_requests}</span>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Status History</h3>
          <div className="space-y-3">
            {history.map((h, i) => (
              <div key={h.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 ${i === history.length - 1 ? 'bg-purple-500' : 'bg-gray-300'}`} />
                  {i < history.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                </div>
                <div className="pb-3">
                  <BookingStatusBadge status={h.to_status} size="sm" />
                  {h.note && <p className="text-xs text-gray-500 mt-1">{h.note}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(parseISO(h.created_at), 'dd MMM yyyy, h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-gray-400 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{children}</p>
      </div>
    </div>
  )
}
