import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AuthLayout, FormField, SubmitButton, Alert } from '@/components/auth/AuthUI'

export default function RegisterPage() {
  const { signUp } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 10) {
      setError('Le mot de passe doit contenir au moins 10 caractères.')
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)

    const { error: authError } = await signUp(email, password, fullName, phone, consent)

    setLoading(false)

    if (authError) {
      // Never reveal whether the email already exists
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        setSuccess(true)
        return
      }
      if (authError.message.includes('rate limit') || authError.message.includes('too many requests')) {
        setError('Trop de tentatives. Réessayez dans quelques minutes.')
        return
      }
      if (authError.message.includes('network') || authError.message.includes('fetch')) {
        setError('Erreur réseau. Vérifiez votre connexion internet.')
        return
      }
      setError('Une erreur est survenue. Veuillez réessayer.')
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <AuthLayout title="Vérifiez votre e-mail" subtitle="Un lien de confirmation a été envoyé">
        <Alert type="success">
          Si un compte n'existe pas encore pour cette adresse, un e-mail de confirmation vous a été envoyé.
          Cliquez sur le lien qu'il contient pour activer votre compte.
        </Alert>
        <div className="mt-6 text-center">
          <Link to="/connexion" className="text-[#0B1B33] font-medium hover:underline text-sm">
            Retour à la connexion
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Inscription" subtitle="Créez votre compte SAM Guinée">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}

        <FormField
          id="fullName"
          label="Nom complet"
          value={fullName}
          onChange={setFullName}
          required
          autoComplete="name"
          placeholder="Prénom Nom"
        />

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
          id="phone"
          label="Téléphone"
          type="tel"
          value={phone}
          onChange={setPhone}
          required
          autoComplete="tel"
          placeholder="+224 6XX XX XX XX"
        />

        <FormField
          id="password"
          label="Mot de passe (10 caractères minimum)"
          type="password"
          value={password}
          onChange={setPassword}
          required
          autoComplete="new-password"
          minLength={10}
        />

        <FormField
          id="confirmPassword"
          label="Confirmer le mot de passe"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          autoComplete="new-password"
          minLength={10}
        />

        <div className="flex items-start gap-2">
          <input
            id="consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0B1B33] focus:ring-[#F2B705]"
          />
          <label htmlFor="consent" className="text-sm text-slate-600">
            J'accepte de recevoir des informations par e-mail concernant le SAM Guinée
            (actualités du salon, offres exposants, programme). Vous pouvez vous
            désabonner à tout moment.
          </label>
        </div>

        <SubmitButton loading={loading}>Créer mon compte</SubmitButton>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        Déjà un compte ?{' '}
        <Link to="/connexion" className="text-[#0B1B33] font-medium hover:underline">
          Se connecter
        </Link>
      </div>
    </AuthLayout>
  )
}

