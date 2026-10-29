import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { RequireAuth, RequireRole } from '@/components/auth/RouteGuards'
import { RootLayout } from '@/components/layout/RootLayout'

import HomePage from '@/pages/HomePage'
import ComingSoonPage from '@/pages/ComingSoonPage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import AccountPage from '@/pages/auth/AccountPage'
import SecurityPage from '@/pages/auth/SecurityPage'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import StaffScanPage from '@/pages/staff/StaffScanPage'
import NotFoundPage from '@/pages/NotFoundPage'

/**
 * GuestOnly — redirige les utilisateurs déjà connectés vers leur espace par défaut.
 * Évite d'accéder à /connexion ou /inscription lorsqu'on a déjà une session active.
 */
function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, loading, getDefaultRedirect } = useAuth()

  if (loading) return null

  if (user) {
    return <Navigate to={getDefaultRedirect()} replace />
  }

  return <>{children}</>
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Routes publiques avec le Layout global (Header collant + Footer) */}
          <Route element={<RootLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/programme" element={<ComingSoonPage />} />
            <Route path="/exposants" element={<ComingSoonPage />} />
            <Route path="/sponsors" element={<ComingSoonPage />} />
            <Route path="/financement" element={<ComingSoonPage />} />
            <Route path="/rallye" element={<ComingSoonPage />} />
            <Route path="/infos-pratiques" element={<ComingSoonPage />} />
            <Route path="/contact" element={<ComingSoonPage />} />
            <Route path="/billetterie" element={<ComingSoonPage />} />
            <Route path="/reglement" element={<ComingSoonPage />} />
            <Route path="/mentions-legales" element={<ComingSoonPage />} />
          </Route>

          {/* Pages d'authentification (Guest only) */}
          <Route path="/connexion" element={<GuestOnly><LoginPage /></GuestOnly>} />
          <Route path="/inscription" element={<GuestOnly><RegisterPage /></GuestOnly>} />
          <Route path="/mot-de-passe-oublie" element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />

          {/* Réinitialisation de mot de passe (accessible avec le token URL) */}
          <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />

          {/* Espace Compte & Sécurité (Authentification requise) */}
          <Route
            path="/mon-compte"
            element={<RequireAuth><AccountPage /></RequireAuth>}
          />
          <Route
            path="/securite"
            element={<RequireAuth><SecurityPage /></RequireAuth>}
          />

          {/* Espace Administration (Rôle admin + MFA aal2 obligatoire) */}
          <Route
            path="/admin"
            element={<RequireRole roles={['admin']}><AdminDashboard /></RequireRole>}
          />

          {/* Espace Personnel / Staff (Rôle admin ou staff + MFA aal2 obligatoire) */}
          <Route
            path="/staff/scan"
            element={<RequireRole roles={['admin', 'staff']}><StaffScanPage /></RequireRole>}
          />

          {/* 404 — Page non trouvée */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
