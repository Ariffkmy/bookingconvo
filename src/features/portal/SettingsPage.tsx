import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save, Upload, ExternalLink, Copy, CheckCircle, GraduationCap, ChevronDown, X, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { compressImage } from '../../lib/utils'
import { type Photographer, type SettingsProfileData, type SettingsPaymentData, settingsProfileSchema, settingsPaymentSchema } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Input'
import { SectionLoader } from '../../components/ui/Spinner'

const TABS = ['Profile', 'Payment', 'Booking'] as const
type Tab = typeof TABS[number]

export function SettingsPage() {
  const { photographerId } = useAuth()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('Profile')
  const [copied, setCopied] = useState(false)

  const { data: universities = [] } = useQuery({
    queryKey: ['universities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('universities')
        .select('id, name, short_name, type')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data as { id: number; name: string; short_name: string | null; type: string }[]
    },
  })

  const { data: photographer, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['photographer-settings', photographerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photographers')
        .select('*')
        .eq('id', photographerId)
        .single()
      if (error) throw error
      return data as Photographer
    },
    enabled: !!photographerId,
    retry: 1,
  })

  const profileForm = useForm<SettingsProfileData>({
    resolver: zodResolver(settingsProfileSchema),
    values: photographer ? {
      display_name: photographer.display_name,
      slug: photographer.slug,
      bio: photographer.bio || '',
      school_names: photographer.school_names || [],
      location: photographer.location || '',
      phone: photographer.phone || '',
      email: photographer.email || '',
    } : undefined,
  })

  const paymentForm = useForm<SettingsPaymentData>({
    resolver: zodResolver(settingsPaymentSchema),
    values: photographer ? {
      bank_name: photographer.bank_name || '',
      bank_account: photographer.bank_account || '',
      bank_account_name: photographer.bank_account_name || '',
      payment_instructions: photographer.payment_instructions || '',
    } : undefined,
  })

  const profileMutation = useMutation({
    mutationFn: async (data: SettingsProfileData) => {
      const { error } = await supabase
        .from('photographers')
        .update({
          display_name: data.display_name,
          slug: data.slug.toLowerCase(),
          bio: data.bio || null,
          school_names: data.school_names?.length ? data.school_names : null,
          location: data.location || null,
          phone: data.phone || null,
          email: data.email || null,
        })
        .eq('id', photographerId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photographer-settings', photographerId] }),
  })

  const paymentMutation = useMutation({
    mutationFn: async (data: SettingsPaymentData) => {
      const { error } = await supabase
        .from('photographers')
        .update({
          bank_name: data.bank_name || null,
          bank_account: data.bank_account || null,
          bank_account_name: data.bank_account_name || null,
          payment_instructions: data.payment_instructions || null,
        })
        .eq('id', photographerId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photographer-settings', photographerId] }),
  })

  const copyBookingLink = () => {
    if (!photographer) return
    navigator.clipboard.writeText(`${window.location.origin}/p/${photographer.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) return <SectionLoader />
  if (!photographerId) return (
    <div className="p-6 text-center">
      <p className="text-gray-500 text-sm mb-1">Could not load your photographer profile.</p>
      <p className="text-xs text-gray-400">Your account may not be linked to a photographer profile yet. Contact support if this persists.</p>
    </div>
  )
  if (queryError || !photographer) return (
    <div className="p-6 text-center">
      <p className="text-gray-500 text-sm mb-3">Could not load settings.</p>
      <button
        onClick={() => refetch()}
        className="text-sm text-sky-600 hover:text-sky-700 font-medium"
      >
        Try again
      </button>
    </div>
  )

  const bookingUrl = `${window.location.origin}/p/${photographer.slug}`

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Booking Link */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 mb-5">
        <p className="text-xs font-semibold text-sky-700 mb-1">Your Booking Link</p>
        <div className="flex items-center gap-2">
          <p className="text-sm text-sky-900 font-mono truncate flex-1">{bookingUrl}</p>
          <button
            onClick={copyBookingLink}
            className="p-2 rounded-lg hover:bg-sky-200 text-sky-700 transition-colors"
          >
            {copied ? <CheckCircle size={16} className="text-green-600" /> : <Copy size={16} />}
          </button>
          <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-sky-200 text-sky-700">
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'Profile' && (
        <ProfilePhotoSection photographer={photographer} photographerId={photographerId!} qc={qc} />
      )}

      {activeTab === 'Profile' && (
        <form onSubmit={profileForm.handleSubmit(d => profileMutation.mutate(d))} className="space-y-4">
          <Input
            label="Display Name"
            required
            error={profileForm.formState.errors.display_name?.message}
            {...profileForm.register('display_name')}
          />
          <Input
            label="Booking URL Slug"
            required
            hint={`Your page: /p/${profileForm.watch('slug')}`}
            error={profileForm.formState.errors.slug?.message}
            {...profileForm.register('slug')}
          />
          <UniversityMultiSelect
            universities={universities}
            value={profileForm.watch('school_names') || []}
            onChange={vals => profileForm.setValue('school_names', vals, { shouldDirty: true })}
          />
          <Input
            label="Location"
            placeholder="Kuala Lumpur, Malaysia"
            {...profileForm.register('location')}
          />
          <Input
            label="Phone"
            type="tel"
            placeholder="+60 12-345 6789"
            {...profileForm.register('phone')}
          />
          <Input
            label="Email"
            type="email"
            placeholder="studio@email.com"
            {...profileForm.register('email')}
          />
          <Textarea
            label="Bio"
            placeholder="Tell students about yourself and your photography style..."
            rows={4}
            {...profileForm.register('bio')}
          />
          <Button
            type="submit"
            fullWidth
            loading={profileMutation.isPending}
          >
            <Save size={16} />
            Save Profile
          </Button>
          {profileMutation.isSuccess && (
            <p className="text-sm text-green-600 text-center flex items-center justify-center gap-1.5">
              <CheckCircle size={14} /> Profile saved!
            </p>
          )}
        </form>
      )}

      {/* Payment Tab */}
      {activeTab === 'Payment' && (
        <form onSubmit={paymentForm.handleSubmit(d => paymentMutation.mutate(d))} className="space-y-4">
          <Input
            label="Bank Name"
            placeholder="Maybank / CIMB / RHB..."
            {...paymentForm.register('bank_name')}
          />
          <Input
            label="Account Number"
            placeholder="1234 5678 9012"
            {...paymentForm.register('bank_account')}
          />
          <Input
            label="Account Name"
            placeholder="Name as per bank account"
            {...paymentForm.register('bank_account_name')}
          />
          <Textarea
            label="Payment Instructions"
            placeholder="Transfer the full amount to the account above. Include your booking code in the reference..."
            rows={4}
            {...paymentForm.register('payment_instructions')}
          />

          <DuitNowUpload photographer={photographer} photographerId={photographerId!} qc={qc} />

          <Button type="submit" fullWidth loading={paymentMutation.isPending}>
            <Save size={16} />
            Save Payment Info
          </Button>
          {paymentMutation.isSuccess && (
            <p className="text-sm text-green-600 text-center flex items-center justify-center gap-1.5">
              <CheckCircle size={14} /> Payment info saved!
            </p>
          )}
        </form>
      )}

      {/* Booking Tab */}
      {activeTab === 'Booking' && (
        <BookingSettingsForm photographer={photographer} photographerId={photographerId!} qc={qc} />
      )}
    </div>
  )
}

function ProfilePhotoSection({ photographer, photographerId, qc }: { photographer: Photographer; photographerId: string; qc: ReturnType<typeof useQueryClient> }) {
  const [_uploading, setUploading] = useState(false)
  const { user } = useAuth()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'profile_photo' | 'cover_photo') => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      // Profile: 400×400, Cover: 1200×600 — both WebP
      const isProfile = field === 'profile_photo'
      const compressed = await compressImage(file, {
        maxWidth: isProfile ? 400 : 1200,
        maxHeight: isProfile ? 400 : 600,
        quality: 0.85,
        format: 'webp',
      })
      const folder = user?.id ?? photographerId
      const path = `${folder}/${field}.webp`
      await supabase.storage.from('profile-photos').upload(path, compressed, { upsert: true, contentType: 'image/webp' })
      const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(path)
      await supabase.from('photographers').update({ [field]: urlData.publicUrl }).eq('id', photographerId)
      qc.invalidateQueries({ queryKey: ['photographer-settings', photographerId] })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Photos</h3>
      <div className="flex gap-4 items-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden border border-gray-200">
            {photographer.profile_photo
              ? <img src={photographer.profile_photo} className="w-full h-full object-cover" alt="Profile" />
              : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">📷</div>
            }
          </div>
          <label className="absolute -bottom-1 -right-1 bg-sky-600 text-white rounded-full p-1 cursor-pointer hover:bg-sky-700 shadow">
            <Upload size={10} />
            <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, 'profile_photo')} />
          </label>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">Profile Photo</p>
          <p className="text-xs text-gray-400">Square, min 200×200px</p>
        </div>
      </div>
    </div>
  )
}

function DuitNowUpload({ photographer, photographerId, qc }: { photographer: Photographer; photographerId: string; qc: ReturnType<typeof useQueryClient> }) {
  const [uploading, setUploading] = useState(false)
  const { user } = useAuth()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      // QR codes: keep as PNG to preserve sharp edges & scanability
      const compressed = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        format: 'png',
      })
      const folder = user?.id ?? photographerId
      const path = `${folder}/duitnow-qr.png`
      await supabase.storage.from('profile-photos').upload(path, compressed, { upsert: true, contentType: 'image/png' })
      const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(path)
      await supabase.from('photographers').update({ duitnow_qr_url: urlData.publicUrl }).eq('id', photographerId)
      qc.invalidateQueries({ queryKey: ['photographer-settings', photographerId] })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">DuitNow QR Code (optional)</label>
      {photographer.duitnow_qr_url && (
        <img src={photographer.duitnow_qr_url} alt="DuitNow QR" className="w-24 h-24 object-contain border border-gray-200 rounded-xl bg-white p-1 mb-2" />
      )}
      <label className="flex items-center gap-2 text-sm text-sky-600 cursor-pointer hover:text-sky-700">
        <Upload size={14} />
        {photographer.duitnow_qr_url ? 'Replace QR Image' : 'Upload QR Image'}
        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>
    </div>
  )
}

const TYPE_LABELS: Record<string, string> = {
  public: 'Public Universities',
  private: 'Private Universities',
  branch_campus: 'Foreign Branch Campuses',
  university_college: 'University Colleges',
}

function UniversityMultiSelect({
  universities,
  value,
  onChange,
}: {
  universities: { id: number; name: string; short_name: string | null; type: string }[]
  value: string[]
  onChange: (vals: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = search
    ? universities.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        (u.short_name?.toLowerCase().includes(search.toLowerCase()))
      )
    : universities

  const toggle = (name: string) => {
    onChange(value.includes(name) ? value.filter(v => v !== name) : [...value, name])
  }

  const remove = (name: string) => onChange(value.filter(v => v !== name))

  return (
    <div ref={ref}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        University you shooting for
      </label>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-left hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
      >
        <span className={value.length ? 'text-gray-900' : 'text-gray-400'}>
          {value.length ? `${value.length} selected` : '— Select universities —'}
        </span>
        <ChevronDown size={15} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="mt-1 rounded-xl border border-gray-200 bg-white shadow-lg z-10 relative overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search university..."
              className="w-full text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
            />
          </div>

          {/* List */}
          <div className="max-h-60 overflow-y-auto">
            {['public', 'private', 'branch_campus', 'university_college'].map(type => {
              const group = filtered.filter(u => u.type === type)
              if (!group.length) return null
              return (
                <div key={type}>
                  <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 sticky top-0">
                    {TYPE_LABELS[type]}
                  </p>
                  {group.map(u => {
                    const selected = value.includes(u.name)
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggle(u.name)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-sky-50 transition-colors ${selected ? 'text-sky-700' : 'text-gray-800'}`}
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-sky-600 border-sky-600' : 'border-gray-300'}`}>
                          {selected && <CheckCircle size={10} className="text-white" />}
                        </span>
                        {u.name}{u.short_name ? ` (${u.short_name})` : ''}
                      </button>
                    )
                  })}
                </div>
              )
            })}
            {!filtered.length && (
              <p className="px-3 py-4 text-sm text-gray-400 text-center">No universities found</p>
            )}
          </div>
        </div>
      )}

      {/* Selected badges */}
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map(name => (
            <span key={name} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-xs font-medium bg-sky-100 text-sky-800 border border-sky-200 rounded-full">
              <GraduationCap size={11} className="shrink-0" />
              {name}
              <button type="button" onClick={() => remove(name)} className="ml-0.5 hover:text-sky-900">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function BookingSettingsForm({ photographer, photographerId, qc }: { photographer: Photographer; photographerId: string; qc: ReturnType<typeof useQueryClient> }) {
  const [lockDuration, setLockDuration] = useState(photographer.lock_duration_mins || 10)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('photographers').update({ lock_duration_mins: lockDuration }).eq('id', photographerId)
    qc.invalidateQueries({ queryKey: ['photographer-settings', photographerId] })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Slot Lock Duration (minutes)
        </label>
        <p className="text-xs text-gray-500 mb-2">How long a timeslot is reserved while customer fills in the booking form.</p>
        <div className="flex items-center gap-3">
          {[5, 10, 15, 20].map(mins => (
            <button
              key={mins}
              type="button"
              onClick={() => setLockDuration(mins)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                lockDuration === mins ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-gray-200 text-gray-600'
              }`}
            >
              {mins}m
            </button>
          ))}
        </div>
      </div>

      <Button fullWidth loading={saving} onClick={handleSave}>
        <Save size={16} />
        Save Booking Settings
      </Button>
      {saved && (
        <p className="text-sm text-green-600 text-center flex items-center justify-center gap-1.5">
          <CheckCircle size={14} /> Settings saved!
        </p>
      )}
    </div>
  )
}
