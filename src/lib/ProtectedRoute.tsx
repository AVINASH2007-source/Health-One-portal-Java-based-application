import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { Role } from './navConfig'

export default function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const { session, role: activeRole, loading, error: authError } = useAuth()

  // 1. Authentication or profile state is still resolving — render a clean loading spinner
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void text-mist">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-vital border-t-transparent" />
          <span className="text-sm font-medium">Verifying Health-One session...</span>
        </div>
      </div>
    )
  }

  // 2. Unauthenticated user attempting to access protected route -> redirect to login
  if (!session) {
    return <Navigate to="/login" replace />
  }

  // 3. User authenticated, but database profile missing -> render explicit error screen
  if (!activeRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-panel p-6 text-center text-ink">
        <div className="max-w-md rounded-2xl border border-edge bg-cardsurface p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold text-emergency">Profile Not Found</h2>
          <p className="mt-2 text-sm text-mist">
            {authError ||
              'Authentication succeeded, but your Health-One profile could not be loaded. Please contact support or try signing in again.'}
          </p>
        </div>
      </div>
    )
  }

  // 4. Role mismatch (e.g. Patient account attempting to access /doctor) -> redirect to authorized dashboard
  if (activeRole.toLowerCase() !== role.toLowerCase()) {
    return <Navigate to={`/${activeRole.toLowerCase()}`} replace />
  }

  return <>{children}</>
}
