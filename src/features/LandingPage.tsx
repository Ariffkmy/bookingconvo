import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Camera, CheckCircle, ChevronDown, ChevronUp, UserPlus, Settings, Share2, Inbox, Star, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/Button'

export function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [isYearly, setIsYearly] = useState(false);

  const steps = [
    { title: "Daftar akaun", icon: UserPlus },
    { title: "Tetapkan profil anda", icon: Settings },
    { title: "Kongsi pautan tempahan", icon: Share2 },
    { title: "Terima tempahan", icon: Inbox },
    { title: "Sesi fotografi konvokesyen", icon: Camera },
    { title: "Selesai", icon: CheckCircle }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((c) => (c + 1) % steps.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [steps.length]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Bagaimana saya boleh mula menggunakan GradSnap?",
      a: "Memulakan adalah mudah! Cipta akaun percuma, sediakan profil dan pakej anda, tetapkan ketersediaan kalendar, dan anda sudah bersedia untuk berkongsi pautan tempahan peribadi anda bersama klien."
    },
    {
      q: "Bolehkah saya sesuaikan halaman tempahan saya?",
      a: "Ya, anda boleh menyesuaikan profil fotografer anda dengan portfolio, avatar, dan teks deskriptif. Anda juga boleh menentukan pakej perkhidmatan yang disesuaikan dengan harga tersendiri."
    },
    {
      q: "Adakah penyegerakan Google Calendar automatik?",
      a: "Sudah tentu. Sebaik sahaja anda menghubungkan Google Calendar, tempahan baharu yang diterima akan terus menyekat slot masa berkenaan, mengelakkan tempahan berganda secara automatik."
    },
    {
      q: "Adakah klien membayar terus melalui aplikasi?",
      a: "Klien menghantar tempahan dan memuat naik resit terus ke dalam sistem. Anda mengesahkan status dan memproses pembayaran mengikut prosedur operasi standard anda, memastikan rekod pentadbiran anda sentiasa tepat."
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <header className="flex items-center justify-between w-full max-w-4xl px-4 py-3 bg-white/70 backdrop-blur-xl border border-gray-200/60 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] pointer-events-auto transition-all">
          <div className="flex items-center gap-2 pl-2">
            <Link to="/">
              <img src="/fotoconvologo.svg" alt="FotoConvo Logo" className="h-12 w-auto object-contain" />
            </Link>
          </div>
          <nav className="hidden md:flex items-center justify-center gap-8 ml-4">
            <a href="#how-it-works" className="text-sm font-semibold text-gray-600 hover:text-[#0ea5e9] transition-colors">Cara Kerja</a>
            <a href="#pricing" className="text-sm font-semibold text-gray-600 hover:text-[#0ea5e9] transition-colors">Harga</a>
            <a href="#faq" className="text-sm font-semibold text-gray-600 hover:text-[#0ea5e9] transition-colors">Soalan Lazim</a>
            <Link to="/manual" className="text-sm font-semibold text-gray-600 hover:text-[#0ea5e9] transition-colors">Manual Pengguna</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/signin">
              <Button variant="outline" size="sm" className="rounded-full shadow-sm text-sm px-4">Log Masuk</Button>
            </Link>
            <Link to="/signup">
              <Button variant="primary" size="sm" className="rounded-full shadow-sm text-sm px-5 hover:shadow-md transition-shadow">Daftar</Button>
            </Link>
          </div>
        </header>
      </div>

      {/* Hero */}
      <main className="flex-1">
        <section className="bg-white px-6 pt-32 pb-16 sm:pt-40 sm:pb-24 border-b border-gray-100 overflow-hidden relative">
          {/* Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

          <div className="max-w-4xl mx-auto flex flex-col items-center text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 text-sky-600 text-sm font-semibold mb-8 border border-sky-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
              </span>
              Kini diabadikan dengan indah
            </div>
            <h1 className="text-5xl sm:text-7xl font-bold text-[#1A202C] mb-6 leading-[1.1] tracking-tight">
              Urus tempahan <span className="text-[#0ea5e9]">konvokesyen</span> anda dengan mudah.
            </h1>
            <p className="text-xl text-gray-500 mb-10 leading-relaxed max-w-2xl mx-auto">
              GradSnap menghubungkan anda dengan fotografer konvokesyen berbakat.
              Tempah sesi anda, urus jadual, dan hasilkan kenangan yang memukau.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto">
              <Link to="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base shadow-sm">
                  Mulakan — Percuma
                </Button>
              </Link>
              <Link to="/signin" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-base">
                  Log Masuk
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="border-b border-gray-100 bg-sky-50/40 py-12 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-200 to-transparent"></div>
          <div className="max-w-5xl mx-auto px-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-8">
              <Sparkles size={16} className="text-sky-500" />
              <p className="text-sm font-bold text-sky-600 tracking-wider uppercase">Digunakan oleh graduan di seluruh Malaysia</p>
              <Sparkles size={16} className="text-sky-500" />
            </div>
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
              <span className="text-2xl font-black text-gray-800 font-serif">UiTM Snaps</span>
              <span className="text-2xl font-bold text-gray-800 tracking-tighter">UMStudio</span>
              <span className="text-2xl font-extrabold text-[#111] italic pr-2">UKM Lensa</span>
              <span className="text-2xl font-bold text-gray-800">UPM<span className="font-light">Clicks</span></span>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="px-6 py-24 bg-white border-t border-gray-100 scroll-mt-20">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-[#1A202C] mb-4">Cara ia berfungsi</h2>
            <p className="text-lg text-gray-500 mb-16">Aliran kerja lancar dari pendaftaran hingga penghantaran.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
              {steps.map((step, idx) => {
                const isActive = activeStep === idx;
                const Icon = step.icon;
                return (
                  <div
                    key={idx}
                    className={`p-6 rounded-2xl border transition-all duration-500 ease-in-out text-left ${isActive
                      ? 'border-[#0ea5e9] bg-sky-50 shadow-md scale-105 z-10'
                      : 'border-gray-100 bg-white scale-100 opacity-70'
                      }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-500 ${isActive ? 'bg-[#0ea5e9] text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <Icon size={24} />
                    </div>
                    <div className="text-sm font-bold text-gray-400 mb-1">Langkah {idx + 1}</div>
                    <h3 className={`font-bold text-lg transition-colors duration-500 ${isActive ? 'text-[#0ea5e9]' : 'text-[#1A202C]'}`}>
                      {step.title}
                    </h3>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="px-6 py-24 bg-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="max-w-6xl mx-auto text-center relative z-10">
            <h2 className="text-3xl font-bold text-[#1A202C] mb-4">Disukai oleh Fotografer</h2>
            <p className="text-lg text-gray-500 mb-16">Lihat apa yang profesional katakan tentang GradSnap.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              {[
                { name: "Ahmad Danish", role: "Pakar Konvokesyen", quote: "GradSnap telah menghapuskan kekeliruan tempahan berganda. Penyegerakan Google Calendar amat lancar.", rating: 5 },
                { name: "Sarah Lee", role: "Fotografer Bebas", quote: "Klien saya suka betapa profesionalnya pautan tempahan itu. Saya melihat peningkatan 40% dalam tempahan berbayar sejak beralih.", rating: 5 },
                { name: "Faizal Tahir", role: "Pemilik Studio", quote: "Jana resit dan portal pentadbir menjimatkan berjam-jam kerja manual setiap minggu. Ia benar-benar mengubah cara kerja saya.", rating: 5 }
              ].map((t, idx) => (
                <div key={idx} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-2 transition-transform duration-300">
                  <div className="flex gap-1 mb-6">
                    {[...Array(t.rating)].map((_, i) => <Star key={i} size={18} className="text-yellow-400 fill-yellow-400" />)}
                  </div>
                  <p className="text-gray-600 mb-8 italic leading-relaxed">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-sky-100 to-indigo-50 rounded-full flex items-center justify-center font-bold text-sky-700 shadow-sm border border-sky-100">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                      <p className="text-xs text-sky-600 font-medium">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="px-6 py-20 bg-[#F9FAFB] scroll-mt-20">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-[#1A202C] mb-4">Harga yang mudah dan telus</h2>
            <p className="text-gray-500 mb-10">Semua yang anda perlukan untuk menjalankan perniagaan fotografi anda.</p>

            {/* Toggle Switch */}
            <div className="flex justify-center items-center gap-3 mb-10">
              <span className={`text-sm font-semibold cursor-pointer transition-colors ${!isYearly ? 'text-gray-900' : 'text-gray-500'}`} onClick={() => setIsYearly(false)}>Bulanan</span>
              <button
                onClick={() => setIsYearly(!isYearly)}
                className={`w-14 h-8 rounded-full p-1 relative transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:ring-offset-2 ${isYearly ? 'bg-[#0ea5e9]' : 'bg-gray-200'}`}
                aria-label="Tukar tempoh bil"
              >
                <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isYearly ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsYearly(true)}>
                <span className={`text-sm font-semibold transition-colors ${isYearly ? 'text-gray-900' : 'text-gray-500'}`}>Tahunan</span>
                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold shrink-0 animate-pulse">Jimat 76%</span>
              </div>
            </div>

            <div className="max-w-md mx-auto bg-white rounded-2xl border-[1.5px] border-[#0ea5e9] shadow-card overflow-hidden">
              <div className="p-8 text-center border-b border-gray-100">
                <h3 className="text-xl font-bold text-[#1A202C] mb-2 lg:mt-2">Pakej Pro</h3>
                <div className="flex justify-center items-baseline gap-1 mb-4 pt-4">
                  <span className="text-5xl font-extrabold text-[#1A202C] tracking-tight transition-all duration-300">
                    RM{isYearly ? '250' : '89'}
                  </span>
                  <span className="text-gray-500 font-medium">/ {isYearly ? 'tahun' : 'bulan'}</span>
                </div>
                <p className="text-sm text-gray-500">Sesuai untuk fotografer konvokesyen profesional.</p>
              </div>
              <div className="p-8 bg-white text-left">
                <ul className="space-y-4 mb-10">
                  {[
                    'Pautan tempahan awam',
                    'Penyegerakan Google Calendar',
                    'Notifikasi e-mel',
                    'Jana resit',
                    'Portal pentadbir untuk urus tempahan'
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-700">
                      <CheckCircle size={18} className="text-[#0ea5e9] shrink-0" />
                      <span className="font-medium text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="block w-full">
                  <Button size="lg" className="w-full h-12 shadow-sm font-semibold">
                    Mulakan Sekarang
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="px-6 py-24 bg-white border-t border-gray-100 scroll-mt-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-[#1A202C] mb-12 text-center">Soalan Lazim</h2>
            <div className="space-y-4 text-left">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={index} className="border-b border-gray-100 last:border-0 pb-4">
                    <button
                      className="w-full flex justify-between items-center text-left py-4 focus:outline-none group"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                    >
                      <h3 className="text-lg font-bold text-[#1A202C] group-hover:text-[#0ea5e9] transition-colors">
                        {faq.q}
                      </h3>
                      <span className="text-[#0ea5e9] ml-4 shrink-0 transition-transform duration-300">
                        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </span>
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mb-4' : 'max-h-0 opacity-0'
                        }`}
                    >
                      <p className="text-gray-500 leading-relaxed pr-8">{faq.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-24 bg-white relative">
          <div className="max-w-5xl mx-auto bg-gradient-to-br from-sky-500 via-[#0ea5e9] to-indigo-600 rounded-[3rem] p-12 md:p-20 text-center shadow-2xl relative overflow-hidden group">
            {/* Decorative background circle */}
            <div className="absolute top-0 right-0 -m-20 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
            <div className="absolute bottom-0 left-0 -m-20 w-80 h-80 bg-sky-300 opacity-20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>

            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 relative z-10 leading-tight tracking-tight">Bersedia tingkatkan<br /> tempahan konvokesyen anda?</h2>
            <p className="text-sky-100 mb-10 text-lg max-w-xl mx-auto relative z-10 leading-relaxed">Sertai fotografer bebas terkemuka yang sudah menggunakan GradSnap untuk mengurus sesi fotografi konvo mereka dan memukau klien.</p>
            <Link to="/signup" className="relative z-10 inline-block">
              <Button variant="secondary" size="lg" className="h-14 px-10 text-lg rounded-2xl shadow-xl hover:scale-105 transition-transform duration-300 border-none bg-white text-sky-600 hover:bg-sky-50 font-bold">
                Cipta Akaun Percuma Anda
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} GradSnap. Hak cipta terpelihara.</p>
      </footer>
    </div>
  )
}
