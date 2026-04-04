import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Upload, CheckCircle, AlertCircle, X, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { type Booking, type Photographer, type Package } from '../../types'
import { formatCurrency, formatTime } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { SectionLoader } from '../../components/ui/Spinner'
import { BookingStatusBadge } from '../../components/ui/Badge'

export function PaymentPage() {
  const { bookingCode } = useParams<{ bookingCode: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')

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
  })

  const { data: photographer } = useQuery({
    queryKey: ['photographer-by-id', booking?.photographer_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('photographers')
        .select('*')
        .eq('id', booking!.photographer_id)
        .single()
      return data as Photographer
    },
    enabled: !!booking?.photographer_id,
  })

  const { data: pkg } = useQuery({
    queryKey: ['package', booking?.package_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('packages')
        .select('*')
        .eq('id', booking!.package_id)
        .single()
      return data as Package
    },
    enabled: !!booking?.package_id,
  })

  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
  const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!booking) throw new Error('Booking not found')
      setUploadError('')

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and PDF are allowed.')
      }

      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw new Error('Invalid file extension. Allowed: jpg, jpeg, png, gif, webp, pdf.')
      }

      const randomBytes = new Uint8Array(16)
      crypto.getRandomValues(randomBytes)
      const randomName = Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('')
      const path = `receipts/${booking.booking_code}/${randomName}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(path, file, { upsert: false })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)

      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          receipt_url: urlData.publicUrl,
          receipt_uploaded_at: new Date().toISOString(),
          status: 'PENDING_VERIFICATION',
        })
        .eq('booking_code', booking.booking_code)
      if (updateError) throw updateError

      await supabase.from('booking_status_history').insert({
        booking_id: booking.id,
        from_status: 'PENDING_PAYMENT',
        to_status: 'PENDING_VERIFICATION',
        note: 'Payment receipt uploaded by customer',
      })

      return urlData.publicUrl
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking', bookingCode] })
      navigate(`/booking/${bookingCode}`)
    },
    onError: (err: Error) => {
      setUploadError(err.message || 'Upload failed. Please try again.')
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File too large. Maximum 10MB.')
      return
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploadError('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and PDF are allowed.')
      return
    }
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setUploadError('')
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (isLoading) return <SectionLoader />

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">Booking not found.</p>
        </div>
      </div>
    )
  }

  if (booking.status === 'PENDING_VERIFICATION' || booking.status === 'CONFIRMED') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
          <h2 className="font-bold text-gray-900 text-lg mb-1">Receipt Submitted!</h2>
          <p className="text-gray-500 text-sm mb-4">
            {booking.status === 'PENDING_VERIFICATION'
              ? "We're waiting for the photographer to verify your payment."
              : "Your booking has been confirmed!"}
          </p>
          <BookingStatusBadge status={booking.status} className="mx-auto mb-4" />
          <Button onClick={() => navigate(`/booking/${bookingCode}`)}>
            View Booking Status <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-bold text-gray-900 text-lg mb-1">Complete Your Booking</h1>
      <p className="text-sm text-gray-500 mb-5">Upload your payment receipt to confirm your session.</p>

      {/* Booking Summary */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Booking Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Booking Code</span>
            <span className="font-mono font-bold text-sky-700">{booking.booking_code}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Photographer</span>
            <span className="font-medium">{photographer?.display_name}</span>
          </div>
          {pkg && (
            <div className="flex justify-between">
              <span className="text-gray-500">Package</span>
              <span className="font-medium">{pkg.name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Date & Time</span>
            <span className="font-medium">
              {format(parseISO(booking.slot_date), 'dd MMM yyyy')} at {formatTime(booking.slot_time)}
            </span>
          </div>
          {booking.payment_amount && (
            <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
              <span className="font-semibold text-gray-800">Amount to Pay</span>
              <span className="font-bold text-sky-700 text-base">{formatCurrency(booking.payment_amount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment Instructions */}
      {photographer && (photographer.bank_name || photographer.payment_instructions) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
          <h3 className="text-sm font-semibold text-amber-900 mb-2">Payment Details</h3>
          {photographer.bank_name && (
            <div className="text-sm text-amber-800 space-y-1.5">
              <p><span className="font-medium">Bank:</span> {photographer.bank_name}</p>
              {photographer.bank_account && (
                <div className="flex items-center justify-between bg-amber-100 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs text-amber-600">Account Number</p>
                    <p className="font-bold font-mono text-amber-900">{photographer.bank_account}</p>
                  </div>
                </div>
              )}
              {photographer.bank_account_name && (
                <p><span className="font-medium">Account Name:</span> {photographer.bank_account_name}</p>
              )}
            </div>
          )}
          {photographer.payment_instructions && (
            <p className="text-xs text-amber-700 mt-2 whitespace-pre-line">{photographer.payment_instructions}</p>
          )}
          {photographer.duitnow_qr_url && (
            <div className="mt-3">
              <p className="text-xs font-medium text-amber-800 mb-2">DuitNow QR</p>
              <img
                src={photographer.duitnow_qr_url}
                alt="DuitNow QR"
                className="w-32 h-32 object-contain border border-amber-300 rounded-xl bg-white p-1"
              />
            </div>
          )}
        </div>
      )}

      {/* Receipt Upload */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Upload Payment Receipt</h3>

        {!selectedFile ? (
          <label
            htmlFor="receipt-upload"
            className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-sky-300 rounded-xl bg-sky-50 cursor-pointer hover:bg-sky-100 transition-colors"
          >
            <Upload size={24} className="text-sky-400 mb-2" />
            <p className="text-sm font-medium text-sky-700">Tap to upload receipt</p>
            <p className="text-xs text-sky-400 mt-1">Photo or screenshot, max 10MB</p>
            <input
              id="receipt-upload"
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileSelect}
              capture="environment"
            />
          </label>
        ) : (
          <div className="relative">
            <img
              src={previewUrl!}
              alt="Receipt preview"
              className="w-full max-h-48 object-contain rounded-xl border border-gray-200"
            />
            <button
              onClick={handleRemoveFile}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow"
            >
              <X size={14} />
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">{selectedFile.name}</p>
          </div>
        )}

        {uploadError && (
          <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={14} />
            {uploadError}
          </div>
        )}
      </div>

      <Button
        fullWidth
        size="lg"
        disabled={!selectedFile}
        loading={uploadMutation.isPending}
        onClick={() => selectedFile && uploadMutation.mutate(selectedFile)}
      >
        Submit Receipt
      </Button>

      <p className="text-xs text-gray-400 text-center mt-3">
        After submission, the photographer will verify your payment and confirm your booking.
      </p>
    </div>
  )
}
