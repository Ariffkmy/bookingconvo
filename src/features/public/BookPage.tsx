import { useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, addDays, isBefore, startOfToday, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { sendBookingConfirmationEmail } from '../../lib/email'
import { type Photographer, type Package, type BookingFormData, bookingFormSchema } from '../../types'
import { formatCurrency, formatTime, generateBookingCode, generateTimeSlots, getSessionToken } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Input'
import { Countdown } from '../../components/ui/Countdown'
import { SectionLoader } from '../../components/ui/Spinner'
import { useTimeslotLock } from '../../hooks/useTimeslotLock'

export function BookPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [step, setStep] = useState<'slot' | 'details'>('slot')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [submitError, setSubmitError] = useState('')

  const { data: photographer, isLoading } = useQuery({
    queryKey: ['photographer', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photographers')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()
      if (error) throw error
      return data as Photographer
    },
    enabled: !!slug,
  })

  const { data: packages = [] } = useQuery({
    queryKey: ['packages', photographer?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('packages')
        .select('*')
        .eq('photographer_id', photographer!.id)
        .eq('is_active', true)
        .order('sort_order')
      return (data || []) as Package[]
    },
    enabled: !!photographer?.id,
  })

  const { data: availabilityRules = [] } = useQuery({
    queryKey: ['availability-rules', photographer?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('availability_rules')
        .select('*')
        .eq('photographer_id', photographer!.id)
        .eq('is_active', true)
      return data || []
    },
    enabled: !!photographer?.id,
  })

  const { data: overrides = [] } = useQuery({
    queryKey: ['availability-overrides', photographer?.id, format(calendarMonth, 'yyyy-MM')],
    queryFn: async () => {
      const start = format(calendarMonth, 'yyyy-MM-01')
      const end = format(addDays(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0), 1), 'yyyy-MM-dd')
      const { data } = await supabase
        .from('availability_overrides')
        .select('*')
        .eq('photographer_id', photographer!.id)
        .gte('override_date', start)
        .lte('override_date', end)
      return data || []
    },
    enabled: !!photographer?.id,
  })

  const { data: lockedSlots = [] } = useQuery({
    queryKey: ['locked-slots', photographer?.id, selectedDate],
    queryFn: async () => {
      const now = new Date().toISOString()
      const sessionToken = getSessionToken()
      const { data } = await supabase
        .from('timeslot_locks')
        .select('slot_time, session_token')
        .eq('photographer_id', photographer!.id)
        .eq('slot_date', selectedDate)
        .gt('expires_at', now)
      return (data || []).filter(l => l.session_token !== sessionToken).map(l => l.slot_time as string)
    },
    enabled: !!photographer?.id && !!selectedDate,
    refetchInterval: 30000,
  })

  const { data: bookedSlots = [] } = useQuery({
    queryKey: ['booked-slots', photographer?.id, selectedDate],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('slot_time')
        .eq('photographer_id', photographer!.id)
        .eq('slot_date', selectedDate)
        .not('status', 'eq', 'CANCELLED')
      return (data || []).map(b => b.slot_time as string)
    },
    enabled: !!photographer?.id && !!selectedDate,
  })

  const { lockSlot, releaseLock, lockedDate, lockedTime, secondsRemaining, isLocking, lockError } = useTimeslotLock(
    photographer?.id ?? null,
    photographer?.lock_duration_mins ?? 10
  )

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      pax_count: 1,
      package_id: searchParams.get('package') || '',
    },
  })

  const selectedPackageId = form.watch('package_id')
  const selectedPackage = packages.find(p => p.id === selectedPackageId)

  // Generate available slots for selected date
  const getAvailableSlotsForDate = (date: string) => {
    if (!date) return []
    const dayOfWeek = parseISO(date).getDay()

    // Check overrides first
    const override = overrides.find(o => o.override_date === date)
    if (override?.is_blocked) return []

    let startTime = '', endTime = ''
    if (override && !override.is_blocked && override.start_time && override.end_time) {
      startTime = override.start_time
      endTime = override.end_time
    } else {
      const rule = availabilityRules.find(r => r.day_of_week === dayOfWeek)
      if (!rule) return []
      startTime = rule.start_time
      endTime = rule.end_time
    }

    const duration = selectedPackage?.duration_mins || 60
    const slots = generateTimeSlots(startTime, endTime, duration)
    return slots.filter(s => !bookedSlots.includes(s) && !lockedSlots.includes(s))
  }

  const availableSlots = getAvailableSlotsForDate(selectedDate)

  // Check if date is available
  const isDateAvailable = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    if (isBefore(date, startOfToday())) return false
    const override = overrides.find(o => o.override_date === dateStr)
    if (override?.is_blocked) return false
    if (override && !override.is_blocked) return true
    const dayOfWeek = date.getDay()
    return availabilityRules.some(r => r.day_of_week === dayOfWeek)
  }

  const handleSlotSelect = async (time: string) => {
    if (!selectedDate || isLocking) return
    const success = await lockSlot(selectedDate, time)
    if (success) {
      form.setValue('slot_date', selectedDate)
      form.setValue('slot_time', time)
      setStep('details')
    }
  }

  const submitMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      const bookingCode = generateBookingCode()
      const pkg = packages.find(p => p.id === data.package_id)

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          booking_code: bookingCode,
          photographer_id: photographer!.id,
          package_id: data.package_id,
          customer_name: data.customer_name,
          customer_email: data.customer_email,
          customer_phone: data.customer_phone,
          slot_date: data.slot_date,
          slot_time: data.slot_time,
          pax_count: data.pax_count,
          location: data.location,
          special_requests: data.special_requests || null,
          status: 'PENDING_PAYMENT',
          payment_amount: pkg?.price || null,
        })
        .select()
        .single()

      if (error) throw error

      // Release the timeslot lock - booking is now confirmed as pending
      await releaseLock()

      // Insert status history
      await supabase.from('booking_status_history').insert({
        booking_id: booking.id,
        from_status: null,
        to_status: 'PENDING_PAYMENT',
        note: 'Booking created by customer',
      })

      // Send booking confirmation email to customer
      sendBookingConfirmationEmail({
        booking_code: booking.booking_code,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        slot_date: data.slot_date,
        slot_time: data.slot_time,
        location: data.location,
        package_name: pkg?.name,
        package_price: pkg?.price,
        pax_count: data.pax_count,
        photographer_name: photographer!.display_name,
        photographer_slug: photographer!.slug,
      })

      return booking
    },
    onSuccess: (booking) => {
      navigate(`/booking/${booking.booking_code}/payment`)
    },
    onError: (err: Error) => {
      setSubmitError(err.message || 'Failed to submit booking. Please try again.')
    },
  })

  if (isLoading) return <SectionLoader />
  if (!photographer) return <div className="p-4 text-center text-gray-500">Photographer not found.</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => step === 'details' ? setStep('slot') : navigate(`/p/${slug}`)}
          className="p-2 rounded-xl hover:bg-gray-100 -ml-1"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-gray-900">Book a Session</h1>
          <p className="text-sm text-gray-500">{photographer.display_name}</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6">
        {['Select Slot', 'Your Details'].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              (i === 0 && step === 'slot') || (i === 1 && step === 'details')
                ? 'bg-sky-600 text-white'
                : i < (step === 'details' ? 1 : 0)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
            }`}>
              {i < (step === 'details' ? 1 : 0) ? <CheckCircle size={12} /> : i + 1}
            </div>
            <span className="text-xs font-medium text-gray-600">{label}</span>
            {i === 0 && <ChevronRight size={14} className="text-gray-300" />}
          </div>
        ))}
      </div>

      {step === 'slot' && (
        <SlotStep
          packages={packages}
          selectedPackageId={selectedPackageId}
          onPackageChange={(id) => form.setValue('package_id', id)}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          calendarMonth={calendarMonth}
          onMonthChange={setCalendarMonth}
          isDateAvailable={isDateAvailable}
          availableSlots={availableSlots}
          onSlotSelect={handleSlotSelect}
          isLocking={isLocking}
          lockError={lockError}
        />
      )}

      {step === 'details' && (
        <DetailsStep
          form={form}
          photographer={photographer}
          selectedPackage={selectedPackage}
          lockedDate={lockedDate}
          lockedTime={lockedTime}
          secondsRemaining={secondsRemaining}
          onBack={() => { releaseLock(); setStep('slot') }}
          onSubmit={form.handleSubmit((data) => submitMutation.mutate(data))}
          isSubmitting={submitMutation.isPending}
          submitError={submitError}
          packages={packages}
        />
      )}
    </div>
  )
}

// ---- Sub-components ----

interface SlotStepProps {
  packages: Package[]
  selectedPackageId: string
  onPackageChange: (id: string) => void
  selectedDate: string
  onDateSelect: (d: string) => void
  calendarMonth: Date
  onMonthChange: (d: Date) => void
  isDateAvailable: (d: Date) => boolean
  availableSlots: string[]
  onSlotSelect: (t: string) => void
  isLocking: boolean
  lockError: string | null
}

function SlotStep({
  packages, selectedPackageId, onPackageChange,
  selectedDate, onDateSelect, calendarMonth, onMonthChange,
  isDateAvailable, availableSlots, onSlotSelect, isLocking, lockError
}: SlotStepProps) {
  const today = startOfToday()
  const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
  const lastDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0)
  const startPadding = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const days = []
  for (let i = 0; i < startPadding; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), i))
  }

  return (
    <div className="space-y-5">
      {/* Package selection */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-2 text-sm">Select Package</h2>
        <div className="space-y-2">
          {packages.map(pkg => (
            <button
              key={pkg.id}
              type="button"
              onClick={() => onPackageChange(pkg.id)}
              className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                selectedPackageId === pkg.id
                  ? 'border-sky-500 bg-sky-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-gray-900">{pkg.name}</p>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock size={10} /> {pkg.duration_mins} mins
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Users size={10} /> Up to {pkg.max_pax} pax
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sky-700">{formatCurrency(pkg.price)}</p>
                  {selectedPackageId === pkg.id && (
                    <CheckCircle size={16} className="text-sky-500 ml-auto mt-1" />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        {packages.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">No packages available.</p>
        )}
      </div>

      {/* Calendar */}
      {selectedPackageId && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-2 text-sm">Select Date</h2>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => onMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                disabled={isBefore(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1), today)}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-semibold text-sm text-gray-900">
                {format(calendarMonth, 'MMMM yyyy')}
              </span>
              <button
                type="button"
                onClick={() => onMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((day, i) => {
                if (!day) return <div key={`pad-${i}`} />
                const dateStr = format(day, 'yyyy-MM-dd')
                const available = isDateAvailable(day)
                const isSelected = selectedDate === dateStr
                const isPast = isBefore(day, today)

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => available && onDateSelect(dateStr)}
                    disabled={!available || isPast}
                    className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-sky-600 text-white'
                        : available && !isPast
                          ? 'hover:bg-sky-100 text-gray-900 cursor-pointer'
                          : 'text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Timeslots */}
      {selectedDate && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-2 text-sm">
            Select Timeslot — {format(parseISO(selectedDate), 'EEE, dd MMM yyyy')}
          </h2>
          {lockError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-3">
              <AlertCircle size={16} />
              {lockError}
            </div>
          )}
          {availableSlots.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-500 bg-white rounded-2xl border border-gray-200">
              No available slots for this date. Please choose another date.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableSlots.map(time => (
                <button
                  key={time}
                  type="button"
                  onClick={() => onSlotSelect(time)}
                  disabled={isLocking}
                  className="py-2.5 px-2 rounded-xl border-2 border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {formatTime(time)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface DetailsStepProps {
  form: ReturnType<typeof useForm<BookingFormData>>
  photographer: Photographer
  selectedPackage?: Package
  lockedDate: string | null
  lockedTime: string | null
  secondsRemaining: number
  onBack: () => void
  onSubmit: () => void
  isSubmitting: boolean
  submitError: string
  packages: Package[]
}

function DetailsStep({
  form, selectedPackage, lockedDate, lockedTime,
  secondsRemaining, onBack, onSubmit, isSubmitting, submitError
}: DetailsStepProps) {
  const { register, formState: { errors }, watch } = form
  const paxCount = watch('pax_count')

  return (
    <div className="space-y-5">
      {/* Reservation countdown */}
      {secondsRemaining > 0 && (
        <Countdown seconds={secondsRemaining} />
      )}

      {/* Booking summary */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4">
        <h3 className="font-semibold text-sky-900 text-sm mb-2">Your Selection</h3>
        <div className="space-y-1.5 text-sm text-sky-800">
          {selectedPackage && (
            <div className="flex justify-between">
              <span>Package</span>
              <span className="font-semibold">{selectedPackage.name} — {formatCurrency(selectedPackage.price)}</span>
            </div>
          )}
          {lockedDate && (
            <div className="flex justify-between">
              <span>Date</span>
              <span className="font-semibold">{format(parseISO(lockedDate), 'EEE, dd MMM yyyy')}</span>
            </div>
          )}
          {lockedTime && (
            <div className="flex justify-between">
              <span>Time</span>
              <span className="font-semibold">{formatTime(lockedTime)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="space-y-3.5">
        <h2 className="font-semibold text-gray-900 text-sm">Your Details</h2>

        <Input
          label="Full Name"
          placeholder="As per IC / Matric card"
          required
          error={errors.customer_name?.message}
          {...register('customer_name')}
        />

        <Input
          label="Phone Number"
          type="tel"
          placeholder="+60 12-345 6789"
          required
          error={errors.customer_phone?.message}
          {...register('customer_phone')}
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="you@email.com"
          required
          error={errors.customer_email?.message}
          {...register('customer_email')}
        />

        <Input
          label="Session Venue / Location"
          placeholder="e.g. Main Hall, Faculty of Engineering"
          required
          error={errors.location?.message}
          {...register('location')}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Number of People <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => form.setValue('pax_count', Math.max(1, (paxCount || 1) - 1))}
              className="w-10 h-10 rounded-xl border border-gray-300 flex items-center justify-center text-lg font-bold hover:bg-gray-100 active:scale-95"
            >
              −
            </button>
            <span className="text-xl font-bold text-gray-900 w-8 text-center">{paxCount || 1}</span>
            <button
              type="button"
              onClick={() => form.setValue('pax_count', Math.min(selectedPackage?.max_pax || 10, (paxCount || 1) + 1))}
              className="w-10 h-10 rounded-xl border border-gray-300 flex items-center justify-center text-lg font-bold hover:bg-gray-100 active:scale-95"
            >
              +
            </button>
            {selectedPackage && (
              <span className="text-xs text-gray-400">Max {selectedPackage.max_pax} pax</span>
            )}
          </div>
        </div>

        <Textarea
          label="Special Requests"
          placeholder="Any special requests, allergies, accessibility needs..."
          rows={3}
          error={errors.special_requests?.message}
          {...register('special_requests')}
        />
      </div>

      {submitError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} />
          {submitError}
        </div>
      )}

      <div className="pb-4">
        <Button
          fullWidth
          size="lg"
          onClick={onSubmit}
          loading={isSubmitting}
          disabled={secondsRemaining === 0}
        >
          {secondsRemaining === 0 ? 'Slot Expired — Go Back' : 'Confirm Booking'}
        </Button>
        {secondsRemaining === 0 && (
          <Button variant="outline" fullWidth size="md" className="mt-2" onClick={onBack}>
            Choose Another Slot
          </Button>
        )}
      </div>
    </div>
  )
}
