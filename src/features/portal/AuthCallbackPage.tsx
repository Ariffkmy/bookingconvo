import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageLoader } from '../../components/ui/Spinner'

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase automatically picks up the #access_token hash via detectSessionInUrl
    // We just need to wait for the session to be established, then route by role
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profile?.role === 'admin') {
          navigate('/admin/dashboard', { replace: true })
        } else {
          navigate('/portal/dashboard', { replace: true })
        }
      } else if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
        navigate('/portal/login', { replace: true })
      }
    })

    // Fallback: if no auth event fires after 3 seconds, go to login
    const timeout = setTimeout(() => {
      navigate('/portal/login', { replace: true })
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  return <PageLoader label="Signing you in..." />
}
