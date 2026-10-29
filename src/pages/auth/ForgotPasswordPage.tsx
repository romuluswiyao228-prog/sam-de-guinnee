import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AuthLayout, FormField, SubmitButton, Alert } from '@/components/auth/AuthUI'

export default function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: err } = await resetPasswordForEmail(email)

    setLoading(false)

    if (err) {
      if (err.message.includes('rate limit') || err.message.includes('too many requests')) {
        setError('Trop de tentatives. Réessayez dans quelques minutes.')
        return
      }
      if (err.message.includes('network') || err.message.includes('fetch')) {
        setError('Erreur réseau. Vérifiez votre connexion internet.')
        return
      }
    }

    // Always show success to not reveal whether the email exists
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <AuthLayout title="E-mail envoyé" subtitle="Vérifiez votre boîte de réception">
        <Alert type="success">
          Si un compte est associé à cette adresse, un e-mail contenant un lien de
          réinitialisation vous a été envoyé. Vérifiez également vos courriers indésirables.
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
    <AuthLayout title="Mot de passe oublié" subtitle="Saisissez votre adresse e-mail pour recevoir un lien de réinitialisation">
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

        <SubmitButton loading={loading}>Envoyer le lien</SubmitButton>
      </form>

      <div className="mt-6 text-center text-sm">
        <Link to="/connexion" className="text-[#0B1B33] hover:underline">
          Retour à la connexion
        </Link>
      </div>
    </AuthLayout>
  )
}

