// Re-export from AuthContext so all components share a single auth state.
// Previously this hook created independent state + subscriptions per component,
// causing loading flicker and duplicate profile fetches on every mount.
export { useAuthContext as useAuth } from '../contexts/AuthContext'
