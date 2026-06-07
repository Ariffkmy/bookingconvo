import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Link2, Plus, Copy, Check, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { type Affiliate } from '../../types'
import { SectionLoader } from '../../components/ui/Spinner'

function generateCode(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20)
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${suffix}`
}

export function AdminAffiliatesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const origin = window.location.origin

  const { data: affiliates = [], isLoading } = useQuery({
    queryKey: ['admin-affiliates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as Affiliate[]
    },
  })

  const { data: bookingStats = [] } = useQuery({
    queryKey: ['admin-affiliate-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('affiliate_code, status')
        .not('affiliate_code', 'is', null)
      return data || []
    },
  })

  // Count bookings (non-cancelled) per code
  const countByCode = bookingStats.reduce<Record<string, number>>((acc, b) => {
    if (b.affiliate_code && b.status !== 'CANCELLED') {
      acc[b.affiliate_code] = (acc[b.affiliate_code] || 0) + 1
    }
    return acc
  }, {})

  const totalAffiliateBookings = Object.values(countByCode).reduce((a, b) => a + b, 0)

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const code = generateCode(name)
      const { error } = await supabase.from('affiliates').insert({ name, code })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-affiliates'] })
      setNewName('')
      setShowForm(false)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('affiliates').update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-affiliates'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('affiliates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-affiliates'] })
      qc.invalidateQueries({ queryKey: ['admin-affiliate-stats'] })
    },
  })

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`${origin}?ref=${code}`)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (isLoading) return <SectionLoader />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Affiliates</h1>
          <p className="text-sm text-gray-500 mt-0.5">{affiliates.length} affiliates · {totalAffiliateBookings} bookings tracked</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? 'Cancel' : 'Add Affiliate'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-5">
          <p className="text-sm font-semibold text-gray-800 mb-3">New Affiliate</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Affiliator name (e.g. Ahmad Rizal)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && newName.trim() && createMutation.mutate(newName.trim())}
              className="flex-1 px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              autoFocus
            />
            <button
              onClick={() => newName.trim() && createMutation.mutate(newName.trim())}
              disabled={!newName.trim() || createMutation.isPending}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
          {createMutation.isError && (
            <p className="text-xs text-red-600 mt-2">{(createMutation.error as Error).message}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">A unique affiliate link will be generated automatically.</p>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <div className="bg-indigo-50 rounded-2xl p-3.5">
          <div className="mb-2"><Link2 size={18} className="text-indigo-600" /></div>
          <p className="text-2xl font-bold text-gray-900">{affiliates.length}</p>
          <p className="text-xs text-gray-600 mt-0.5">Total Affiliates</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-3.5">
          <div className="mb-2"><Link2 size={18} className="text-green-600" /></div>
          <p className="text-2xl font-bold text-gray-900">{affiliates.filter(a => a.is_active).length}</p>
          <p className="text-xs text-gray-600 mt-0.5">Active</p>
        </div>
        <div className="bg-sky-50 rounded-2xl p-3.5">
          <div className="mb-2"><Link2 size={18} className="text-sky-600" /></div>
          <p className="text-2xl font-bold text-gray-900">{totalAffiliateBookings}</p>
          <p className="text-xs text-gray-600 mt-0.5">Bookings via Affiliates</p>
        </div>
      </div>

      {/* Affiliate list */}
      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {affiliates.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Link2 size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No affiliates yet. Add one to get started.</p>
          </div>
        ) : (
          affiliates.map(affiliate => {
            const bookingCount = countByCode[affiliate.code] || 0
            const link = `${origin}?ref=${affiliate.code}`
            return (
              <div key={affiliate.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-900">{affiliate.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        affiliate.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {affiliate.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">
                      Code: <span className="font-mono text-gray-600">{affiliate.code}</span>
                      {' · '}Added {format(parseISO(affiliate.created_at), 'dd MMM yyyy')}
                    </p>

                    {/* Affiliate link */}
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                      <p className="text-xs text-gray-500 font-mono truncate flex-1">{link}</p>
                      <button
                        onClick={() => copyLink(affiliate.code)}
                        className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        {copiedCode === affiliate.code
                          ? <><Check size={13} className="text-green-600" /><span className="text-green-600">Copied</span></>
                          : <><Copy size={13} /><span>Copy</span></>
                        }
                      </button>
                    </div>
                  </div>

                  {/* Booking count */}
                  <div className="shrink-0 text-center bg-sky-50 rounded-xl px-3 py-2 min-w-[60px]">
                    <p className="text-xl font-bold text-sky-700">{bookingCount}</p>
                    <p className="text-xs text-sky-500 leading-tight">booking{bookingCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => toggleMutation.mutate({ id: affiliate.id, is_active: !affiliate.is_active })}
                    disabled={toggleMutation.isPending}
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-indigo-600 transition-colors"
                  >
                    {affiliate.is_active
                      ? <ToggleRight size={15} className="text-green-600" />
                      : <ToggleLeft size={15} className="text-gray-400" />
                    }
                    {affiliate.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete affiliate "${affiliate.name}"? This cannot be undone.`)) {
                        deleteMutation.mutate(affiliate.id)
                      }
                    }}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
