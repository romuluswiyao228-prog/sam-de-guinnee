import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { AuthLayout, SubmitButton, Alert, FormField } from '@/components/auth/AuthUI'

/**
 * SecurityPage — MFA (TOTP) enrollment and verification.
 * Required for admin and staff roles before accessing privileged routes.
 */
export default function SecurityPage() {
  const { user, mfaFactors, aal, needsMfa, refreshMfa, roles } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname

  // Enrollment state
  const [enrolling, setEnrolling] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [factorId, setFactorId] = useState('')

  // Verification state
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const hasVerifiedFactor = mfaFactors.some((f) => f.status === 'verified')
  const isPrivileged = roles.includes('admin') || roles.includes('staff')

  async function handleEnroll() {
    setError('')
    setLoading(true)

    const { data, error: err } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'SAM Guinée Authenticator',
    })

    setLoading(false)

    if (err || !data) {
      setError('Impossible d\'activer l\'authentification à deux facteurs. Réessayez.')
      return
    }

    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
    setFactorId(data.id)
    setEnrolling(true)
  }

  async function handleVerifyEnrollment(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Challenge the factor
    const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
      factorId,
    })

    if (challengeErr || !challengeData) {
      setError('Erreur lors de la vérification. Réessayez.')
      setLoading(false)
      return
    }

    // Verify the code
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    })

    setLoading(false)

    if (verifyErr) {
      setError('Code invalide. Vérifiez le code affiché dans votre application d\'authentification.')
      return
    }

    setEnrolling(false)
    setSuccess('Authentification à deux facteurs activée avec succès.')
    setCode('')
    await refreshMfa()

    // Redirect to the intended page after MFA is verified
    if (from) {
      setTimeout(() => navigate(from, { replace: true }), 1500)
    }
  }

  async function handleVerifyExisting(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const verifiedFactor = mfaFactors.find((f) => f.status === 'verified')
    if (!verifiedFactor) {
      setError('Aucun facteur d\'authentification configuré.')
      setLoading(false)
      return
    }

    const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
      factorId: verifiedFactor.id,
    })

    if (challengeErr || !challengeData) {
      setError('Erreur lors de la vérification. Réessayez.')
      setLoading(false)
      return
    }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: verifiedFactor.id,
      challengeId: challengeData.id,
      code,
    })

    setLoading(false)

    if (verifyErr) {
      setError('Code invalide. Vérifiez le code affiché dans votre application d\'authentification.')
      return
    }

    setSuccess('Vérification réussie.')
    await refreshMfa()

    // Redirect to the intended page
    if (from) {
      setTimeout(() => navigate(from, { replace: true }), 1000)
    }
  }

  if (!user) return null

  // Case 1: Has a verified factor but needs to re-verify (aal1 → aal2)
  if (hasVerifiedFactor && aal !== 'aal2') {
    return (
      <AuthLayout
        title="Vérification requise"
        subtitle="Saisissez le code de votre application d'authentification"
      >
        <form onSubmit={handleVerifyExisting} className="space-y-4">
          {error && <Alert type="error">{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}

          <FormField
            id="code"
            label="Code à 6 chiffres"
            value={code}
            onChange={setCode}
            required
            placeholder="000000"
            autoComplete="one-time-code"
          />

          <SubmitButton loading={loading}>Vérifier</SubmitButton>
        </form>
      </AuthLayout>
    )
  }

  // Case 2: Currently enrolling (showing QR code)
  if (enrolling) {
    return (
      <AuthLayout
        title="Configurer l'authentificateur"
        subtitle="Scannez le QR code avec votre application (Google Authenticator, Authy…)"
      >
        <form onSubmit={handleVerifyEnrollment} className="space-y-4">
          {error && <Alert type="error">{error}</Alert>}

          <div className="flex justify-center">
            <img src={qrCode} alt="QR Code TOTP" className="w-48 h-48" />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">
              Ou saisissez manuellement cette clé dans votre application :
            </p>
            <p className="text-xs font-mono text-slate-700 break-all select-all">{secret}</p>
          </div>

          <FormField
            id="verifyCode"
            label="Code à 6 chiffres affiché dans l'application"
            value={code}
            onChange={setCode}
            required
            placeholder="000000"
            autoComplete="one-time-code"
          />

          <SubmitButton loading={loading}>Activer</SubmitButton>
        </form>
      </AuthLayout>
    )
  }

  // Case 3: No factor enrolled — show enrollment option
  return (
    <AuthLayout
      title="Sécurité du compte"
      subtitle="Authentification à deux facteurs (MFA)"
    >
      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {hasVerifiedFactor && aal === 'aal2' ? (
        <div className="space-y-4">
          <Alert type="success">
            L'authentification à deux facteurs est activée et vérifiée.
          </Alert>
        </div>
      ) : (
        <div className="space-y-4">
          {isPrivileged && !hasVerifiedFactor && (
            <Alert type="info">
              L'authentification à deux facteurs est obligatoire pour les comptes
              administrateur et personnel. Veuillez configurer votre authentificateur
              pour accéder aux fonctions d'administration.
            </Alert>
          )}

          <SubmitButton
            type="button"
            loading={loading}
            disabled={loading}
            onClick={handleEnroll}
          >
            {hasVerifiedFactor ? 'MFA activée ✓' : 'Configurer l\'authentificateur'}
          </SubmitButton>
        </div>
      )}

      {needsMfa && !hasVerifiedFactor && (
        <p className="text-xs text-slate-500 mt-4 text-center">
          Vous devez activer l'authentification à deux facteurs pour accéder
          aux fonctions d'administration ou de personnel.
        </p>
      )}
    </AuthLayout>
  )
}

