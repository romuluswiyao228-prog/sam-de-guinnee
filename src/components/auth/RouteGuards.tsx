import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { AppRole } from '@/types/database'

/** Spinner displayed during auth loading */
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F3F5F9] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#F2B705] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500">Chargement…</p>
      </div>
    </div>
  )
}

/**
 * RequireAuth — blocks access to unauthenticated users.
 * Saves the intended location so we can redirect back after login.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />

  if (!user) {
    return <Navigate to="/connexion" state={{ from: location }} replace />
  }

  return <>{children}</>
}

/**
 * RequireRole — requires the user to hold at least one of the given roles.
 * If the user holds a privileged role (admin/staff), also requires aal2 (MFA).
 * Redirects to /securite when MFA is needed.
 */
export function RequireRole({ roles, children }: { roles: AppRole[]; children: React.ReactNode }) {
  const { user, loading, hasAnyRole, needsMfa } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />

  if (!user) {
    return <Navigate to="/connexion" state={{ from: location }} replace />
  }

  // Admin/staff need MFA verified → redirect to MFA setup/verify page
  if (needsMfa) {
    return <Navigate to="/securite" state={{ from: location }} replace />
  }

  if (!hasAnyRole(roles)) {
    return <Navigate to="/mon-compte" replace />
  }

  return <>{children}</>
}

