import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Mail, Lock, AlertCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user } = await signIn(email, password)
      // Fetch role to redirect
      const { supabase } = await import('../../lib/supabase')
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role === 'admin') {
        navigate('/admin/dashboard')
      } else {
        navigate('/portal/dashboard')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Camera size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">GradSnap</h1>
          <p className="text-sm text-gray-500 mt-1">Photographer Portal</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Sign in to your account</h2>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{top: '55%'}} />
              <Input
                type="email"
                label="Email"
                placeholder="photographer@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 text-gray-400 pointer-events-none" style={{top: '62%'}} />
              <Input
                type="password"
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="pl-10"
              />
            </div>

            <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
              Sign In
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Are you a customer?{' '}
          <span className="text-gray-500">Find your photographer's booking link.</span>
        </p>
      </div>
    </div>
  )
}
