import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export function SignUpPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const { session } = await signUp(email, password, fullName)
      if (session) {
        // Auto-confirmed (email confirmation disabled in Supabase)
        navigate('/portal/dashboard')
      } else {
        // Email confirmation required
        setSuccess(true)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create account'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-100 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CheckCircle size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-sm text-gray-500 mb-6">
            We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account, then sign in.
          </p>
          <Link to="/signin">
            <Button fullWidth size="lg">Go to Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/">
            <div className="w-14 h-14 bg-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg hover:bg-sky-700 transition-colors">
              <Camera size={28} className="text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">GradSnap</h1>
          <p className="text-sm text-gray-500 mt-1">Create your photographer account</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User size={16} className="absolute left-3.5 text-gray-400 pointer-events-none" style={{ top: '62%' }} />
              <Input
                type="text"
                label="Full Name"
                placeholder="Your full name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 text-gray-400 pointer-events-none" style={{ top: '62%' }} />
              <Input
                type="email"
                label="Email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 text-gray-400 pointer-events-none" style={{ top: '62%' }} />
              <Input
                type="password"
                label="Password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 text-gray-400 pointer-events-none" style={{ top: '62%' }} />
              <Input
                type="password"
                label="Confirm Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="pl-10"
              />
            </div>

            <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
              Create Account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/signin" className="text-sky-600 hover:text-sky-700 font-medium">
            Sign in
          </Link>
        </p>
        <p className="text-center text-xs text-gray-400 mt-2">
          <Link to="/" className="hover:text-gray-600">Back to home</Link>
        </p>
      </div>
    </div>
  )
}
