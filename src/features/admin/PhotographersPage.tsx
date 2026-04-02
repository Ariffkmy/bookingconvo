import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, ExternalLink, ToggleLeft, ToggleRight, Plus, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { type Photographer } from '../../types'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { SectionLoader } from '../../components/ui/Spinner'

export function AdminPhotographersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [inviteModal, setInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviting, setInviting] = useState(false)

  const { data: photographers = [], isLoading } = useQuery({
    queryKey: ['admin-photographers'],
    queryFn: async () => {
      const { data } = await supabase.from('photographers').select('*').order('created_at', { ascending: false })
      return (data || []) as Photographer[]
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from('photographers').update({ is_active: isActive }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-photographers'] }),
  })

  const handleInvite = async () => {
    setInviteError('')
    setInviting(true)
    try {
      // Create user via Supabase admin (or send invite)
      const { error } = await supabase.auth.admin.inviteUserByEmail(inviteEmail, {
        data: { role: 'photographer' }
      })
      if (error) throw error
      setInviteModal(false)
      setInviteEmail('')
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  const filtered = photographers.filter(p =>
    !search ||
    p.display_name.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) return <SectionLoader />

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Photographers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{photographers.length} registered</p>
        </div>
        <Button size="sm" onClick={() => setInviteModal(true)}>
          <Plus size={16} /> Invite
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search photographers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
      </div>

      <div className="space-y-3">
        {filtered.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 overflow-hidden shrink-0">
                {p.profile_photo
                  ? <img src={p.profile_photo} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full flex items-center justify-center"><Camera size={18} className="text-indigo-400" /></div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{p.display_name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">/p/{p.slug}</p>
                {p.school_name && <p className="text-xs text-indigo-600 mt-0.5">{p.school_name}</p>}
                {p.email && <p className="text-xs text-gray-400 mt-0.5">{p.email}</p>}
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <a
                href={`/p/${p.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <ExternalLink size={12} /> View Page
              </a>
              <button
                onClick={() => toggleMutation.mutate({ id: p.id, isActive: !p.is_active })}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                  p.is_active
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                {p.is_active ? <><ToggleRight size={12} /> Deactivate</> : <><ToggleLeft size={12} /> Activate</>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-200">
          <Camera size={24} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No photographers found</p>
        </div>
      )}

      {/* Invite Modal */}
      <Modal isOpen={inviteModal} onClose={() => setInviteModal(false)} title="Invite Photographer" size="sm">
        <p className="text-sm text-gray-600 mb-4">Send an invitation email to onboard a new photographer.</p>
        <Input
          label="Email Address"
          type="email"
          placeholder="photographer@email.com"
          value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)}
        />
        {inviteError && (
          <p className="text-xs text-red-600 mt-2">{inviteError}</p>
        )}
        <Button
          fullWidth
          className="mt-4"
          loading={inviting}
          disabled={!inviteEmail}
          onClick={handleInvite}
        >
          Send Invitation
        </Button>
      </Modal>
    </div>
  )
}
