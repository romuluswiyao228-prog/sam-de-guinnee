import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AuthLayout, FormField, SubmitButton, Alert } from '@/components/auth/AuthUI'

/** Translates common Supabase auth error messages into French */
function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Identifiants incorrects. Vérifiez votre e-mail et votre mot de passe.'
  if (msg.includes('Email not confirmed')) return 'Veuillez confirmer votre adresse e-mail avant de vous connecter.'
  if (msg.includes('rate limit') || msg.includes('too many requests')) return 'Trop de tentatives. Réessayez dans quelques minutes.'
  if (msg.includes('network') || msg.includes('fetch')) return 'Erreur réseau. Vérifiez votre connexion internet.'
  return 'Une erreur est survenue. Veuillez réessayer.'
}

export default function LoginPage() {
  const { signIn, getDefaultRedirect } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Where to go after login (saved by RequireAuth)
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await signIn(email, password)

    if (authError) {
      setError(translateError(authError.message))
      setLoading(false)
      return
    }

    // Small delay for state to propagate, then redirect
    // getDefaultRedirect() returns the role-based path
    navigate(from ?? getDefaultRedirect(), { replace: true })
  }

  return (
    <AuthLayout title="Connexion" subtitle="Accédez à votre espace SAM Guinée">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}

        <FormField
          id="email"
          label="Adresse e-mail"
          type="email"
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
          placeholder="votre@email.com"
        />

        <FormField
          id="password"
          label="Mot de passe"
          type="password"
          value={password}
          onChange={setPassword}
          required
          autoComplete="current-password"
          minLength={10}
        />

        <SubmitButton loading={loading}>Se connecter</SubmitButton>
      </form>

      <div className="mt-6 text-center space-y-2 text-sm">
        <Link to="/mot-de-passe-oublie" className="text-[#0B1B33] hover:underline">
          Mot de passe oublié ?
        </Link>
        <p className="text-slate-500">
          Pas encore de compte ?{' '}
          <Link to="/inscription" className="text-[#0B1B33] font-medium hover:underline">
            S'inscrire
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

