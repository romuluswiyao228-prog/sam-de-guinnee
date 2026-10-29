import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AuthLayout, FormField, SubmitButton, Alert } from '@/components/auth/AuthUI'

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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

    const { error: err } = await updatePassword(password)

    setLoading(false)

    if (err) {
      if (err.message.includes('network') || err.message.includes('fetch')) {
        setError('Erreur réseau. Vérifiez votre connexion internet.')
        return
      }
      if (err.message.includes('same password') || err.message.includes('different')) {
        setError('Le nouveau mot de passe doit être différent de l\'ancien.')
        return
      }
      setError('Une erreur est survenue. Le lien a peut-être expiré. Demandez un nouveau lien.')
      return
    }

    setSuccess(true)
    setTimeout(() => navigate('/connexion', { replace: true }), 3000)
  }

  if (success) {
    return (
      <AuthLayout title="Mot de passe modifié" subtitle="Votre mot de passe a été mis à jour">
        <Alert type="success">
          Votre mot de passe a été modifié avec succès. Vous allez être redirigé vers la page de connexion…
        </Alert>
        <div className="mt-6 text-center">
          <Link to="/connexion" className="text-[#0B1B33] font-medium hover:underline text-sm">
            Se connecter maintenant
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Nouveau mot de passe" subtitle="Choisissez un nouveau mot de passe sécurisé">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}

        <FormField
          id="password"
          label="Nouveau mot de passe (10 caractères minimum)"
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

        <SubmitButton loading={loading}>Enregistrer le mot de passe</SubmitButton>
      </form>
    </AuthLayout>
  )
}

