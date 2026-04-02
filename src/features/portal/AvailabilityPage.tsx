import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, isBefore, startOfToday, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { type AvailabilityRule, type AvailabilityOverride } from '../../types'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { SectionLoader } from '../../components/ui/Spinner'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function AvailabilityPage() {
  const { photographerId } = useAuth()
  const qc = useQueryClient()
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [addOverrideModal, setAddOverrideModal] = useState(false)
  const [selectedOverrideDate, setSelectedOverrideDate] = useState('')
  const [overrideIsBlocked, setOverrideIsBlocked] = useState(true)
  const [overrideStart, setOverrideStart] = useState('08:00')
  const [overrideEnd, setOverrideEnd] = useState('17:00')
  const [overrideNote, setOverrideNote] = useState('')

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['availability-rules', photographerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('availability_rules')
        .select('*')
        .eq('photographer_id', photographerId)
        .order('day_of_week')
      return (data || []) as AvailabilityRule[]
    },
    enabled: !!photographerId,
  })

  const { data: overrides = [] } = useQuery({
    queryKey: ['availability-overrides', photographerId],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data } = await supabase
        .from('availability_overrides')
        .select('*')
        .eq('photographer_id', photographerId)
        .gte('override_date', today)
        .order('override_date')
      return (data || []) as AvailabilityOverride[]
    },
    enabled: !!photographerId,
  })

  const updateRuleMutation = useMutation({
    mutationFn: async ({ dayOfWeek, updates }: { dayOfWeek: number; updates: Partial<AvailabilityRule> }) => {
      const existing = rules.find(r => r.day_of_week === dayOfWeek)
      if (existing) {
        const { error } = await supabase
          .from('availability_rules')
          .update(updates)
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('availability_rules')
          .insert({
            photographer_id: photographerId,
            day_of_week: dayOfWeek,
            start_time: '09:00',
            end_time: '17:00',
            slot_duration_mins: 60,
            is_active: true,
            ...updates,
          })
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability-rules', photographerId] }),
  })

  const addOverrideMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('availability_overrides').insert({
        photographer_id: photographerId,
        override_date: selectedOverrideDate,
        is_blocked: overrideIsBlocked,
        start_time: overrideIsBlocked ? null : overrideStart,
        end_time: overrideIsBlocked ? null : overrideEnd,
        note: overrideNote || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availability-overrides', photographerId] })
      setAddOverrideModal(false)
      setSelectedOverrideDate('')
      setOverrideNote('')
    },
  })

  const deleteOverrideMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('availability_overrides').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability-overrides', photographerId] }),
  })

  if (isLoading) return <SectionLoader />

  // Calendar
  const today = startOfToday()
  const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
  const lastDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0)
  const startPadding = firstDay.getDay()
  const days: (Date | null)[] = []
  for (let i = 0; i < startPadding; i++) days.push(null)
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), i))
  }

  const getDateStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const override = overrides.find(o => o.override_date === dateStr)
    if (override) return override.is_blocked ? 'blocked' : 'extra-open'
    const rule = rules.find(r => r.day_of_week === date.getDay() && r.is_active)
    return rule ? 'available' : 'unavailable'
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Availability</h1>
        <p className="text-sm text-gray-500 mt-0.5">Set your working schedule and block dates.</p>
      </div>

      {/* Weekly Schedule */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Weekly Schedule</h2>
        <div className="space-y-3">
          {FULL_DAYS.map((_dayName, dow) => {
            const rule = rules.find(r => r.day_of_week === dow)
            const isActive = rule?.is_active ?? false

            return (
              <div key={dow} className="flex items-center gap-3">
                <div className="w-8 text-xs font-medium text-gray-500">{DAYS[dow]}</div>
                <button
                  onClick={() => updateRuleMutation.mutate({
                    dayOfWeek: dow,
                    updates: { is_active: !isActive }
                  })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isActive ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
                {isActive && rule && (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="time"
                      value={rule.start_time}
                      onChange={e => updateRuleMutation.mutate({ dayOfWeek: dow, updates: { start_time: e.target.value } })}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                    <span className="text-xs text-gray-400">—</span>
                    <input
                      type="time"
                      value={rule.end_time}
                      onChange={e => updateRuleMutation.mutate({ dayOfWeek: dow, updates: { end_time: e.target.value } })}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                  </div>
                )}
                {!isActive && <span className="text-xs text-gray-400">Closed</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-sm font-semibold text-gray-900">{format(calendarMonth, 'MMMM yyyy')}</h2>
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day, i) => {
            if (!day) return <div key={`pad-${i}`} />
            const status = getDateStatus(day)
            const isPast = isBefore(day, today)
            const dateStr = format(day, 'yyyy-MM-dd')

            return (
              <button
                key={dateStr}
                disabled={isPast}
                onClick={() => {
                  if (!isPast) {
                    setSelectedOverrideDate(dateStr)
                    setAddOverrideModal(true)
                  }
                }}
                className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
                  isPast
                    ? 'text-gray-200 cursor-not-allowed'
                    : status === 'available'
                      ? 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer'
                      : status === 'blocked'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer'
                        : status === 'extra-open'
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer'
                          : 'text-gray-300 hover:bg-gray-100 cursor-pointer'
                }`}
              >
                {day.getDate()}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-3 mt-3 flex-wrap">
          {[
            { color: 'bg-green-100', label: 'Available' },
            { color: 'bg-red-100', label: 'Blocked' },
            { color: 'bg-blue-100', label: 'Extra open' },
            { color: 'bg-gray-100', label: 'Unavailable' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className={`w-3 h-3 rounded-sm ${l.color}`} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Overrides */}
      {overrides.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Date Overrides</h2>
          <div className="space-y-2">
            {overrides.map(override => (
              <div key={override.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {format(parseISO(override.override_date), 'EEE, dd MMM yyyy')}
                  </p>
                  <p className={`text-xs ${override.is_blocked ? 'text-red-600' : 'text-blue-600'}`}>
                    {override.is_blocked ? 'Blocked' : `Open ${override.start_time} – ${override.end_time}`}
                    {override.note && ` · ${override.note}`}
                  </p>
                </div>
                <button
                  onClick={() => deleteOverrideMutation.mutate(override.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Override Modal */}
      <Modal isOpen={addOverrideModal} onClose={() => setAddOverrideModal(false)} title="Date Override" size="sm">
        <p className="text-sm text-gray-600 mb-4">
          Override availability for <strong>{selectedOverrideDate && format(parseISO(selectedOverrideDate), 'dd MMMM yyyy')}</strong>
        </p>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setOverrideIsBlocked(true)}
            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
              overrideIsBlocked ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'
            }`}
          >
            Block Date
          </button>
          <button
            onClick={() => setOverrideIsBlocked(false)}
            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
              !overrideIsBlocked ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'
            }`}
          >
            Open Extra
          </button>
        </div>

        {!overrideIsBlocked && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-700 block mb-1">Start</label>
              <input
                type="time"
                value={overrideStart}
                onChange={e => setOverrideStart(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-700 block mb-1">End</label>
              <input
                type="time"
                value={overrideEnd}
                onChange={e => setOverrideEnd(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

        <Input
          label="Note (optional)"
          placeholder="e.g. Public holiday, Special event..."
          value={overrideNote}
          onChange={e => setOverrideNote(e.target.value)}
          className="mb-4"
        />

        <div className="flex gap-2">
          <Button variant="outline" fullWidth onClick={() => setAddOverrideModal(false)}>Cancel</Button>
          <Button
            fullWidth
            variant={overrideIsBlocked ? 'danger' : 'primary'}
            loading={addOverrideMutation.isPending}
            disabled={!selectedOverrideDate}
            onClick={() => addOverrideMutation.mutate()}
          >
            {overrideIsBlocked ? 'Block Date' : 'Add Extra Opening'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
