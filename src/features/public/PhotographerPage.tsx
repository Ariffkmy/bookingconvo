import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Camera, Star, ArrowRight, ChevronDown, Phone, Mail, Users, Clock, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { type Photographer, type Package, type GalleryImage } from '../../types'
import { formatCurrency } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { SectionLoader } from '../../components/ui/Spinner'
import { useState } from 'react'

export function PhotographerPage() {
  const { slug } = useParams<{ slug: string }>()
  const [showAllGallery, setShowAllGallery] = useState(false)

  const { data: photographer, isLoading, error } = useQuery({
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
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('photographer_id', photographer!.id)
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data as Package[]
    },
    enabled: !!photographer?.id,
  })

  const { data: gallery = [] } = useQuery({
    queryKey: ['gallery', photographer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery_images')
        .select('*')
        .eq('photographer_id', photographer!.id)
        .order('sort_order')
      if (error) throw error
      return data as GalleryImage[]
    },
    enabled: !!photographer?.id,
  })

  if (isLoading) return <SectionLoader />

  if (error || !photographer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <Camera size={48} className="text-gray-300 mb-4" />
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Photographer Not Found</h1>
        <p className="text-gray-500 text-sm">This link may be invalid or the photographer is no longer active.</p>
      </div>
    )
  }

  const displayGallery = showAllGallery ? gallery : gallery.slice(0, 8)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero */}
      <div className="relative">
        {photographer.cover_photo ? (
          <div className="h-48 sm:h-64 bg-gray-200 overflow-hidden">
            <img src={photographer.cover_photo} alt="Cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
          </div>
        ) : (
          <div className="h-48 sm:h-64 bg-gradient-to-br from-sky-600 to-indigo-700" />
        )}

        {/* Profile info overlay */}
        <div className="px-4 -mt-12 relative">
          <div className="flex items-end gap-3">
            <div className="w-20 h-20 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden shrink-0">
              {photographer.profile_photo ? (
                <img src={photographer.profile_photo} alt={photographer.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-sky-100 flex items-center justify-center">
                  <Camera size={28} className="text-sky-400" />
                </div>
              )}
            </div>
            <div className="pb-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 leading-tight">{photographer.display_name}</h1>
              {photographer.school_name && (
                <p className="text-sm text-sky-600 font-medium mt-0.5">{photographer.school_name}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="px-4 mt-4 space-y-3">
        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
          {photographer.location && (
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-gray-400" />
              {photographer.location}
            </span>
          )}
          {photographer.phone && (
            <a href={`tel:${photographer.phone}`} className="flex items-center gap-1.5 hover:text-sky-600">
              <Phone size={14} className="text-gray-400" />
              {photographer.phone}
            </a>
          )}
          {photographer.email && (
            <a href={`mailto:${photographer.email}`} className="flex items-center gap-1.5 hover:text-sky-600">
              <Mail size={14} className="text-gray-400" />
              {photographer.email}
            </a>
          )}
        </div>

        {photographer.bio && (
          <p className="text-sm text-gray-700 leading-relaxed">{photographer.bio}</p>
        )}

        {/* CTA */}
        <Link to={`/p/${slug}/book`}>
          <Button fullWidth size="lg" className="mt-2">
            Book a Session
            <ArrowRight size={18} />
          </Button>
        </Link>
      </div>

      {/* Packages */}
      {packages.length > 0 && (
        <section className="mt-8 px-4">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Star size={16} className="text-yellow-500" />
            Packages
          </h2>
          <div className="space-y-3">
            {packages.map(pkg => (
              <PackageCard key={pkg.id} pkg={pkg} slug={slug!} />
            ))}
          </div>
        </section>
      )}

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="mt-8 px-4">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Camera size={16} className="text-sky-500" />
            Portfolio
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {displayGallery.map(img => (
              <div key={img.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img
                  src={img.public_url}
                  alt={img.caption || 'Gallery'}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
          {gallery.length > 8 && (
            <button
              onClick={() => setShowAllGallery(!showAllGallery)}
              className="mt-3 w-full py-2 text-sm text-sky-600 font-medium flex items-center justify-center gap-1 hover:text-sky-700"
            >
              {showAllGallery ? 'Show Less' : `View All ${gallery.length} Photos`}
              <ChevronDown size={14} className={showAllGallery ? 'rotate-180' : ''} />
            </button>
          )}
        </section>
      )}

      {/* Payment & FAQ */}
      <section className="mt-8 px-4 mb-8">
        <h2 className="text-base font-bold text-gray-900 mb-3">How It Works</h2>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Choose a Package', desc: 'Select the package that fits your needs and budget.' },
            { step: '2', title: 'Pick Date & Time', desc: 'Choose your preferred session date and timeslot.' },
            { step: '3', title: 'Submit Booking', desc: 'Fill in your details and submit the booking form.' },
            { step: '4', title: 'Upload Payment Receipt', desc: 'Transfer payment and upload your receipt for verification.' },
            { step: '5', title: 'Get Confirmed!', desc: 'Photographer reviews and confirms your booking.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-sky-700">{step}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Payment info */}
        {(photographer.bank_name || photographer.payment_instructions) && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-1.5">
              <CheckCircle size={14} />
              Payment Information
            </h3>
            {photographer.bank_name && (
              <div className="text-sm text-amber-800 space-y-1">
                <p><span className="font-medium">Bank:</span> {photographer.bank_name}</p>
                {photographer.bank_account && <p><span className="font-medium">Account:</span> {photographer.bank_account}</p>}
                {photographer.bank_account_name && <p><span className="font-medium">Name:</span> {photographer.bank_account_name}</p>}
              </div>
            )}
            {photographer.payment_instructions && (
              <p className="text-xs text-amber-700 mt-2 whitespace-pre-line">{photographer.payment_instructions}</p>
            )}
          </div>
        )}
      </section>

      {/* Sticky Book CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20 md:hidden">
        <Link to={`/p/${slug}/book`}>
          <Button fullWidth size="lg">
            Book a Session
            <ArrowRight size={18} />
          </Button>
        </Link>
      </div>
      <div className="h-20 md:hidden" />
    </div>
  )
}

function PackageCard({ pkg, slug }: { pkg: Package; slug: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-sky-300 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm">{pkg.name}</h3>
          {pkg.description && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{pkg.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={11} />
              {pkg.duration_mins} mins
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Users size={11} />
              Up to {pkg.max_pax} pax
            </span>
          </div>
          {pkg.inclusions && pkg.inclusions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {pkg.inclusions.map((inc, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full">
                  <CheckCircle size={10} />
                  {inc}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-sky-700 text-lg">{formatCurrency(pkg.price)}</p>
          <Link to={`/p/${slug}/book?package=${pkg.id}`}>
            <Button size="sm" className="mt-2">Book</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
