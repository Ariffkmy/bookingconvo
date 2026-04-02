import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ChevronLeft, CheckCircle, X, Calendar, Clock, MapPin, Users, Phone, Mail, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { type Booking, type Package, type BookingStatusHistory, type BookingStatus, VALID_TRANSITIONS } from '../../types'
import { formatCurrency, formatTime } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { BookingStatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Input'
import { SectionLoader } from '../../components/ui/Spinner'

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { photographerId } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [confirmAction, setConfirmAction] = useState<{
    toStatus: BookingStatus; label: string; message: string
  } | null>(null)
  const [actionNote, setActionNote] = useState('')
  const [noteModal, setNoteModal] = useState(false)
  const [internalNote, setInternalNote] = useState('')
  const [receiptModal, setReceiptModal] = useState(false)
  const [galleryUrlInput, setGalleryUrlInput] = useState('')
  const [galleryModal, setGalleryModal] = useState(false)

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, package:packages(*)')
        .eq('id', id)
        .eq('photographer_id', photographerId)
        .single()
      if (error) throw error
      return data as Booking
    },
    enabled: !!id && !!photographerId,
  })

  const { data: history = [] } = useQuery({
    queryKey: ['booking-history', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('booking_status_history')
        .select('*')
        .eq('booking_id', id)
        .order('created_at')
      return (data || []) as BookingStatusHistory[]
    },
    enabled: !!id,
  })

  const statusMutation = useMutation({
    mutationFn: async ({ toStatus, note }: { toStatus: BookingStatus; note?: string }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status: toStatus, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      await supabase.from('booking_status_history').insert({
        booking_id: id,
        from_status: booking?.status,
        to_status: toStatus,
        note: note || null,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking-detail', id] })
      qc.invalidateQueries({ queryKey: ['booking-history', id] })
      qc.invalidateQueries({ queryKey: ['portal-bookings'] })
      setConfirmAction(null)
      setActionNote('')
    },
  })

  const noteMutation = useMutation({
    mutationFn: async (note: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({ notes: note })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking-detail', id] })
      setNoteModal(false)
    },
  })

  const deliveryMutation = useMutation({
    mutationFn: async (url: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({ gallery_url: url, status: 'DELIVERED' })
        .eq('id', id)
      if (error) throw error
      await supabase.from('booking_status_history').insert({
        booking_id: id,
        from_status: booking?.status,
        to_status: 'DELIVERED',
        note: 'Gallery delivered to customer',
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking-detail', id] })
      qc.invalidateQueries({ queryKey: ['booking-history', id] })
      setGalleryModal(false)
    },
  })

  if (isLoading) return <SectionLoader />
  if (!booking) return <div className="p-4 text-center text-gray-500">Booking not found.</div>

  const pkg = booking.package as unknown as Package | undefined
  const validNext = VALID_TRANSITIONS[booking.status] || []

  const ALL_ACTION_BUTTONS = [
    {
      toStatus: 'CONFIRMED' as BookingStatus,
      label: 'Approve & Confirm',
      variant: 'primary' as const,
      message: `Confirm this booking for ${booking.customer_name}? This will notify the customer.`,
    },
    {
      toStatus: 'COMPLETED' as BookingStatus,
      label: 'Mark Completed',
      variant: 'secondary' as const,
      message: 'Mark the session as completed?',
    },
    {
      toStatus: 'CANCELLED' as BookingStatus,
      label: 'Cancel Booking',
      variant: 'danger' as const,
      message: `Cancel this booking for ${booking.customer_name}? The customer will be notified.`,
    },
  ]
  const ACTION_BUTTONS = ALL_ACTION_BUTTONS.filter(a => validNext.includes(a.toStatus))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/portal/bookings')} className="p-2 rounded-xl hover:bg-gray-100 -ml-1">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">{booking.customer_name}</h1>
          <p className="text-xs font-mono text-purple-600">{booking.booking_code}</p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {/* Receipt Review (if pending verification) */}
      {booking.status === 'PENDING_VERIFICATION' && booking.receipt_url && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-amber-900 mb-3">Review Payment Receipt</h3>
          <button
            onClick={() => setReceiptModal(true)}
            className="w-full"
          >
            <img
              src={booking.receipt_url}
              alt="Payment Receipt"
              className="w-full max-h-48 object-contain rounded-xl border border-amber-200 bg-white cursor-zoom-in"
            />
          </button>
          <p className="text-xs text-amber-600 mt-2 text-center">Tap to view full receipt</p>

          <div className="flex gap-2 mt-3">
            <Button
              fullWidth
              variant="primary"
              onClick={() => setConfirmAction({
                toStatus: 'CONFIRMED',
                label: 'Approve Booking',
                message: `Approve and confirm this booking for ${booking.customer_name}?`,
              })}
            >
              <CheckCircle size={16} /> Approve
            </Button>
            <Button
              fullWidth
              variant="danger"
              onClick={() => setConfirmAction({
                toStatus: 'PENDING_PAYMENT',
                label: 'Request Re-upload',
                message: 'Request the customer to re-upload their receipt?',
              })}
            >
              <X size={16} /> Reject
            </Button>
          </div>
        </div>
      )}

      {/* Deliver photos */}
      {booking.status === 'COMPLETED' && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-purple-900 mb-2">Deliver Photos</h3>
          <p className="text-xs text-purple-700 mb-3">Enter the gallery link to deliver photos to the customer.</p>
          <Button fullWidth onClick={() => { setGalleryUrlInput(booking.gallery_url || ''); setGalleryModal(true) }}>
            Deliver Gallery
          </Button>
        </div>
      )}

      {/* Session Details */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Session Details</h3>
        <div className="space-y-3">
          <InfoRow icon={<Calendar size={14} />} label="Date">
            {format(parseISO(booking.slot_date), 'EEEE, dd MMMM yyyy')}
          </InfoRow>
          <InfoRow icon={<Clock size={14} />} label="Time">
            {formatTime(booking.slot_time)}
          </InfoRow>
          {booking.location && (
            <InfoRow icon={<MapPin size={14} />} label="Location">{booking.location}</InfoRow>
          )}
          <InfoRow icon={<Users size={14} />} label="People">{booking.pax_count} pax</InfoRow>
          {pkg && (
            <InfoRow icon={<span className="text-xs font-bold text-gray-400">PKG</span>} label="Package">
              {pkg.name} — {formatCurrency(pkg.price)}
            </InfoRow>
          )}
        </div>
      </div>

      {/* Customer Info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Customer</h3>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-purple-600">{booking.customer_name[0]}</span>
            </div>
            <p className="font-semibold text-sm text-gray-900">{booking.customer_name}</p>
          </div>
          {booking.customer_phone && (
            <a href={`tel:${booking.customer_phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
              <Phone size={14} /> {booking.customer_phone}
            </a>
          )}
          <a href={`mailto:${booking.customer_email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
            <Mail size={14} /> {booking.customer_email}
          </a>
          {booking.special_requests && (
            <div className="mt-2 bg-gray-50 rounded-lg p-2.5">
              <p className="text-xs text-gray-500 mb-1">Special Requests</p>
              <p className="text-sm text-gray-700">{booking.special_requests}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {ACTION_BUTTONS.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Actions</h3>
          <div className="space-y-2">
            {ACTION_BUTTONS.map(btn => (
              <Button
                key={btn.toStatus}
                fullWidth
                variant={btn.variant}
                onClick={() => setConfirmAction({ toStatus: btn.toStatus, label: btn.label, message: btn.message })}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Internal Notes */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Internal Notes</h3>
          <button
            onClick={() => { setInternalNote(booking.notes || ''); setNoteModal(true) }}
            className="text-xs text-purple-600 hover:text-purple-700"
          >
            Edit
          </button>
        </div>
        {booking.notes ? (
          <p className="text-sm text-gray-700 whitespace-pre-line">{booking.notes}</p>
        ) : (
          <p className="text-xs text-gray-400">No notes yet.</p>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Status History</h3>
        {history.length === 0 ? (
          <p className="text-xs text-gray-400">No history yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={h.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 ${i === history.length - 1 ? 'bg-purple-500' : 'bg-gray-300'}`} />
                  {i < history.length - 1 && <div className="w-px h-full bg-gray-200 mt-1" />}
                </div>
                <div className="pb-3">
                  <BookingStatusBadge status={h.to_status} size="sm" />
                  {h.note && <p className="text-xs text-gray-500 mt-0.5">{h.note}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{format(parseISO(h.created_at), 'dd MMM yyyy · h:mm a')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receipt Full View Modal */}
      <Modal isOpen={receiptModal} onClose={() => setReceiptModal(false)} title="Payment Receipt" size="lg">
        {booking.receipt_url && (
          <div>
            <img src={booking.receipt_url} alt="Receipt" className="w-full rounded-xl" />
            <a
              href={booking.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 mt-3 text-sm text-purple-600 hover:text-purple-700"
            >
              <ExternalLink size={14} /> Open in new tab
            </a>
          </div>
        )}
      </Modal>

      {/* Confirm Status Change Modal */}
      {confirmAction && (
        <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={confirmAction.label} size="sm">
          <p className="text-sm text-gray-600 mb-3">{confirmAction.message}</p>
          <Textarea
            label="Note (optional)"
            placeholder="Add a note for this action..."
            rows={2}
            value={actionNote}
            onChange={e => setActionNote(e.target.value)}
          />
          <div className="flex gap-2 mt-4">
            <Button variant="outline" fullWidth onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              fullWidth
              variant={confirmAction.toStatus === 'CANCELLED' ? 'danger' : 'primary'}
              loading={statusMutation.isPending}
              onClick={() => statusMutation.mutate({ toStatus: confirmAction.toStatus, note: actionNote })}
            >
              {confirmAction.label}
            </Button>
          </div>
        </Modal>
      )}

      {/* Internal Notes Modal */}
      <Modal isOpen={noteModal} onClose={() => setNoteModal(false)} title="Internal Notes" size="sm">
        <Textarea
          rows={5}
          value={internalNote}
          onChange={e => setInternalNote(e.target.value)}
          placeholder="Add notes visible only to you..."
        />
        <Button
          fullWidth
          className="mt-3"
          loading={noteMutation.isPending}
          onClick={() => noteMutation.mutate(internalNote)}
        >
          Save Note
        </Button>
      </Modal>

      {/* Gallery Delivery Modal */}
      <Modal isOpen={galleryModal} onClose={() => setGalleryModal(false)} title="Deliver Gallery" size="sm">
        <p className="text-sm text-gray-600 mb-3">Enter the gallery link to deliver to the customer.</p>
        <input
          type="url"
          placeholder="https://drive.google.com/..."
          value={galleryUrlInput}
          onChange={e => setGalleryUrlInput(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3"
        />
        <Button
          fullWidth
          loading={deliveryMutation.isPending}
          disabled={!galleryUrlInput}
          onClick={() => deliveryMutation.mutate(galleryUrlInput)}
        >
          Mark as Delivered
        </Button>
      </Modal>
    </div>
  )
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{children}</p>
      </div>
    </div>
  )
}
