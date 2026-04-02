import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Trash2, Star, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { type GalleryImage } from '../../types'
import { Button } from '../../components/ui/Button'
import { ConfirmModal } from '../../components/ui/Modal'
import { SectionLoader } from '../../components/ui/Spinner'

export function GalleryPage() {
  const { photographerId } = useAuth()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: images = [], isLoading } = useQuery({
    queryKey: ['gallery', photographerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('gallery_images')
        .select('*')
        .eq('photographer_id', photographerId)
        .order('sort_order')
      return (data || []) as GalleryImage[]
    },
    enabled: !!photographerId,
  })

  const deleteMutation = useMutation({
    mutationFn: async (img: GalleryImage) => {
      // Delete from storage
      const path = img.storage_path
      await supabase.storage.from('gallery').remove([path])
      // Delete from DB
      const { error } = await supabase.from('gallery_images').delete().eq('id', img.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gallery', photographerId] })
      setDeleteConfirm(null)
    },
  })

  const setCoverMutation = useMutation({
    mutationFn: async (imgId: string) => {
      // Unset all covers
      await supabase
        .from('gallery_images')
        .update({ is_cover: false })
        .eq('photographer_id', photographerId)
      // Set new cover
      const { error } = await supabase
        .from('gallery_images')
        .update({ is_cover: true })
        .eq('id', imgId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gallery', photographerId] }),
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !photographerId) return

    setUploading(true)
    setUploadError('')

    for (const file of files) {
      try {
        if (file.size > 10 * 1024 * 1024) {
          setUploadError(`${file.name} is too large (max 10MB)`)
          continue
        }

        const ext = file.name.split('.').pop()
        const path = `${photographerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('gallery')
          .upload(path, file)
        if (uploadErr) throw uploadErr

        const { data: urlData } = supabase.storage.from('gallery').getPublicUrl(path)

        await supabase.from('gallery_images').insert({
          photographer_id: photographerId,
          storage_path: path,
          public_url: urlData.publicUrl,
          sort_order: images.length,
          is_cover: images.length === 0,
        })
      } catch (err) {
        setUploadError(`Failed to upload ${file.name}`)
      }
    }

    setUploading(false)
    qc.invalidateQueries({ queryKey: ['gallery', photographerId] })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (isLoading) return <SectionLoader />

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gallery</h1>
          <p className="text-sm text-gray-500 mt-0.5">{images.length} photos in portfolio</p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} loading={uploading} size="sm">
          <Upload size={16} />
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
          <AlertCircle size={14} />
          {uploadError}
          <button onClick={() => setUploadError('')} className="ml-auto text-red-500">✕</button>
        </div>
      )}

      {images.length === 0 ? (
        <div
          className="text-center py-16 border-2 border-dashed border-gray-300 rounded-2xl bg-white cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-700 mb-1">Upload your portfolio photos</p>
          <p className="text-sm text-gray-400">JPEG, PNG · Max 10MB per photo</p>
          <Button size="sm" className="mt-4" variant="outline">Choose Photos</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map(img => (
            <div key={img.id} className="relative group aspect-square rounded-2xl overflow-hidden bg-gray-100">
              <img
                src={img.public_url}
                alt={img.caption || 'Gallery'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {img.is_cover && (
                <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star size={10} /> Cover
                </div>
              )}
              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                <button
                  onClick={() => setCoverMutation.mutate(img.id)}
                  className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg hover:bg-white/30 flex items-center gap-1"
                >
                  <Star size={10} /> Cover
                </button>
                <button
                  onClick={() => setDeleteConfirm(img.id)}
                  className="bg-red-500/80 text-white p-1.5 rounded-lg hover:bg-red-600"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {/* Upload more tile */}
          <div
            className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={20} className="text-gray-400 mb-1" />
            <span className="text-xs text-gray-400">Add more</span>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          const img = images.find(i => i.id === deleteConfirm)
          if (img) deleteMutation.mutate(img)
        }}
        title="Delete Photo"
        message="Are you sure you want to delete this photo? This cannot be undone."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
