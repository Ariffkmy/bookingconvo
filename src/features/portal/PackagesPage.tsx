import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Edit2, Trash2, Clock, Users, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { type Package, type PackageFormData, packageFormSchema } from '../../types'
import { formatCurrency } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Input'
import { Modal, ConfirmModal } from '../../components/ui/Modal'
import { SectionLoader } from '../../components/ui/Spinner'

export function PackagesPage() {
  const { photographerId } = useAuth()
  const qc = useQueryClient()
  const [editingPkg, setEditingPkg] = useState<Package | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['packages', photographerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('packages')
        .select('*')
        .eq('photographer_id', photographerId)
        .order('sort_order')
      return (data || []) as Package[]
    },
    enabled: !!photographerId,
  })

  const saveMutation = useMutation({
    mutationFn: async (data: PackageFormData) => {
      if (editingPkg) {
        const { error } = await supabase
          .from('packages')
          .update({
            name: data.name,
            description: data.description || null,
            price: data.price,
            duration_mins: data.duration_mins,
            max_pax: data.max_pax,
            inclusions: data.inclusions?.filter(Boolean) || [],
            is_active: data.is_active,
          })
          .eq('id', editingPkg.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('packages')
          .insert({
            photographer_id: photographerId,
            name: data.name,
            description: data.description || null,
            price: data.price,
            duration_mins: data.duration_mins,
            max_pax: data.max_pax,
            inclusions: data.inclusions?.filter(Boolean) || [],
            is_active: data.is_active,
            sort_order: packages.length,
          })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packages', photographerId] })
      setShowForm(false)
      setEditingPkg(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('packages').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packages', photographerId] })
      setDeleteConfirm(null)
    },
  })

  const handleEdit = (pkg: Package) => {
    setEditingPkg(pkg)
    setShowForm(true)
  }

  const handleNew = () => {
    setEditingPkg(null)
    setShowForm(true)
  }

  if (isLoading) return <SectionLoader />

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Packages</h1>
          <p className="text-sm text-gray-500 mt-0.5">{packages.length} packages</p>
        </div>
        <Button onClick={handleNew} size="sm">
          <Plus size={16} />
          Add Package
        </Button>
      </div>

      {packages.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Plus size={20} className="text-purple-500" />
          </div>
          <p className="font-medium text-gray-800 mb-1">No packages yet</p>
          <p className="text-sm text-gray-400 mb-4">Add your photography packages to attract customers.</p>
          <Button onClick={handleNew} size="sm">Add First Package</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map(pkg => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              onEdit={() => handleEdit(pkg)}
              onDelete={() => setDeleteConfirm(pkg.id)}
            />
          ))}
        </div>
      )}

      {/* Package Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingPkg(null) }}
        title={editingPkg ? 'Edit Package' : 'New Package'}
        size="md"
      >
        <PackageForm
          defaultValues={editingPkg ? {
            name: editingPkg.name,
            description: editingPkg.description || '',
            price: editingPkg.price,
            duration_mins: editingPkg.duration_mins,
            max_pax: editingPkg.max_pax,
            inclusions: editingPkg.inclusions || [],
            is_active: editingPkg.is_active,
          } : undefined}
          onSubmit={(data) => saveMutation.mutate(data)}
          isLoading={saveMutation.isPending}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
        title="Delete Package"
        message="Are you sure you want to delete this package? This cannot be undone."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function PackageCard({ pkg, onEdit, onDelete }: { pkg: Package; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className={`bg-white rounded-2xl border p-4 ${pkg.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 text-sm">{pkg.name}</h3>
            {!pkg.is_active && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
            )}
          </div>
          {pkg.description && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{pkg.description}</p>
          )}
          <div className="flex gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Clock size={11} />{pkg.duration_mins} mins</span>
            <span className="flex items-center gap-1"><Users size={11} />Up to {pkg.max_pax} pax</span>
          </div>
          {pkg.inclusions && pkg.inclusions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {pkg.inclusions.map((inc, i) => (
                <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle size={9} /> {inc}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-purple-700 text-base">{formatCurrency(pkg.price)}</p>
          <div className="flex gap-1 mt-2 justify-end">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700">
              <Edit2 size={14} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PackageForm({
  defaultValues, onSubmit, isLoading
}: {
  defaultValues?: Partial<PackageFormData>;
  onSubmit: (data: PackageFormData) => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<PackageFormData>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      is_active: true,
      max_pax: 1,
      duration_mins: 30,
      inclusions: [],
      ...defaultValues,
    },
  })

  const [newInclusion, setNewInclusion] = useState('')
  const inclusions = watch('inclusions') || []

  const addInclusion = () => {
    if (newInclusion.trim()) {
      setValue('inclusions', [...inclusions, newInclusion.trim()])
      setNewInclusion('')
    }
  }

  const removeInclusion = (i: number) => {
    setValue('inclusions', inclusions.filter((_, idx) => idx !== i))
  }

  const isActive = watch('is_active')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Input
        label="Package Name"
        placeholder="e.g. Solo Graduate"
        required
        error={errors.name?.message}
        {...register('name')}
      />

      <Textarea
        label="Description"
        placeholder="Brief description of what's included..."
        rows={2}
        {...register('description')}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Price (MYR) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="150.00"
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            {...register('price', { valueAsNumber: true })}
          />
          {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration (mins) *</label>
          <input
            type="number"
            min="15"
            step="15"
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            {...register('duration_mins', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Max People *</label>
        <input
          type="number"
          min="1"
          max="20"
          className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          {...register('max_pax', { valueAsNumber: true })}
        />
      </div>

      {/* Inclusions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">What's Included</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newInclusion}
            onChange={e => setNewInclusion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInclusion())}
            placeholder="e.g. 10 edited photos"
            className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <Button type="button" size="sm" variant="outline" onClick={addInclusion}>Add</Button>
        </div>
        {inclusions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {inclusions.map((inc, i) => (
              <span key={i} className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">
                {inc}
                <button type="button" onClick={() => removeInclusion(i)} className="text-purple-400 hover:text-purple-700">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Active Toggle */}
      <div className="flex items-center justify-between py-2">
        <span className="text-sm font-medium text-gray-700">Active (visible to customers)</span>
        <button
          type="button"
          onClick={() => setValue('is_active', !isActive)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-purple-600' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <Button type="submit" fullWidth loading={isLoading}>
        {defaultValues ? 'Save Changes' : 'Create Package'}
      </Button>
    </form>
  )
}

// Need to import X for inclusions
import { X } from 'lucide-react'
