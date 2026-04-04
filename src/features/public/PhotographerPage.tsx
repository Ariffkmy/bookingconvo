import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Camera, Link2, MessageCircle, Search, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { type Photographer, type GalleryImage } from '../../types'
import { SectionLoader } from '../../components/ui/Spinner'

function formatWhatsApp(phone: string | null) {
  if (!phone) return null
  return phone.replace(/[\s\-()]/g, '').replace(/^\+/, '')
}

export function PhotographerPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [currentImage, setCurrentImage] = useState(0)
  const [bookingCode, setBookingCode] = useState('')

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

  // Advance slide every 5 seconds
  useEffect(() => {
    if (gallery.length < 2) return
    const timer = setInterval(() => {
      setCurrentImage(i => (i + 1) % gallery.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [gallery.length])

  const handleCheckBooking = (e: React.FormEvent) => {
    e.preventDefault()
    const code = bookingCode.trim().toUpperCase()
    if (code) navigate(`/booking/${code}`)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: photographer?.display_name, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  if (isLoading) return <SectionLoader />

  if (error || !photographer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-gray-950">
        <Camera size={48} className="text-gray-600 mb-4" />
        <h1 className="text-xl font-semibold text-gray-300 mb-2">Photographer Not Found</h1>
        <p className="text-gray-500 text-sm">This link may be invalid or the photographer is no longer active.</p>
      </div>
    )
  }

  // Determine background sources: gallery first, fallback cover_photo, fallback gradient
  const bgImages: string[] = gallery.length > 0
    ? gallery.map(g => g.public_url)
    : photographer.cover_photo
      ? [photographer.cover_photo]
      : []

  const waNumber = formatWhatsApp(photographer.phone)
  const waUrl = waNumber ? `https://wa.me/${waNumber}` : null

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col">
      {/* ── Slideshow Background ─────────────────────────────── */}
      {bgImages.length > 0 ? (
        bgImages.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: i === currentImage ? 1 : 0 }}
          >
            <img src={src} alt="" className="w-full h-full object-cover" />
          </div>
        ))
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900" />
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Slideshow dots */}
      {bgImages.length > 1 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {bgImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentImage(i)}
              className={`rounded-full transition-all duration-300 ${
                i === currentImage ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'
              }`}
            />
          ))}
        </div>
      )}

      {/* ── Top Bar ──────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-10 pb-4">
        <div className="flex items-center gap-2 text-white">
          <Camera size={18} className="opacity-90" />
          <span className="font-bold tracking-widest uppercase text-sm">
            {photographer.display_name}
          </span>
        </div>
        <button
          onClick={handleShare}
          className="p-2.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white hover:bg-white/25 transition-colors"
        >
          <Link2 size={15} />
        </button>
      </div>

      {/* ── Center Card ──────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Profile photo */}
        <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl mb-5 bg-white/10 backdrop-blur-sm">
          {photographer.profile_photo ? (
            <img
              src={photographer.profile_photo}
              alt={photographer.display_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera size={28} className="text-white/70" />
            </div>
          )}
        </div>

        {/* Glassmorphism card */}
        <div className="w-full max-w-sm backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4">
          {/* Headline */}
          {photographer.bio ? (
            <div className="text-center text-white">
              <p className="text-base leading-snug opacity-90">{photographer.bio}</p>
            </div>
          ) : (
            <div className="text-center text-white">
              <h1 className="text-xl font-bold">{photographer.display_name}</h1>
              {photographer.school_name && (
                <p className="text-sm text-white/70 mt-1">{photographer.school_name}</p>
              )}
            </div>
          )}

          {/* Book Now */}
          <button
            onClick={() => navigate(`/p/${slug}/book`)}
            className="w-full bg-gray-900 hover:bg-gray-800 active:scale-[0.98] text-white rounded-2xl py-4 font-bold tracking-widest uppercase text-sm flex items-center justify-center gap-3 transition-all shadow-lg"
          >
            Tempah Sekarang
            <ArrowRight size={16} />
          </button>

          {/* Check booking */}
          <form onSubmit={handleCheckBooking} className="relative">
            <div className="flex items-center gap-2 bg-white/15 border border-white/20 rounded-2xl px-4 py-3 focus-within:bg-white/20 transition-colors">
              <Search size={15} className="text-white/60 shrink-0" />
              <input
                value={bookingCode}
                onChange={e => setBookingCode(e.target.value)}
                placeholder="Semak Tempahan..."
                className="flex-1 bg-transparent text-white placeholder:text-white/50 text-sm focus:outline-none font-medium tracking-wide uppercase"
              />
              {bookingCode && (
                <button
                  type="submit"
                  className="shrink-0 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                >
                  Cari
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* ── Bottom Bar ───────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-5 pb-8">
        {photographer.location ? (
          <div className="flex items-center gap-1.5 text-white/80 text-sm">
            <MapPin size={14} className="shrink-0" />
            <span>{photographer.location}</span>
          </div>
        ) : <div />}

        {waUrl ? (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-500/80 hover:bg-green-500 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2.5 rounded-full transition-colors shadow-lg"
          >
            <MessageCircle size={15} />
            Hubungi Kami
          </a>
        ) : photographer.phone ? (
          <a
            href={`tel:${photographer.phone}`}
            className="flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2.5 rounded-full"
          >
            <MessageCircle size={15} />
            Hubungi Kami
          </a>
        ) : null}
      </div>

      {/* Footer copyright */}
      <div className="relative z-10 text-center pb-4 text-white/30 text-xs tracking-wide">
        © {new Date().getFullYear()} {photographer.display_name.toUpperCase()}
      </div>
    </div>
  )
}
