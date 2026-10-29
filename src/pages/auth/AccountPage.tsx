import { useState, type FormEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Alert, SubmitButton } from '@/components/auth/AuthUI'
import { Link } from 'react-router-dom'

export default function AccountPage() {
  const { user, profile, roles, signOut, updateProfile } = useAuth()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [language, setLanguage] = useState(profile?.preferred_language ?? 'fr')
  const [consent, setConsent] = useState(profile?.marketing_consent ?? false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    setLoading(true)

    const { error } = await updateProfile({
      full_name: fullName || null,
      phone: phone || null,
      preferred_language: language,
      marketing_consent: consent,
    })

    setLoading(false)

    if (error) {
      setMessage({ type: 'error', text: error.message.includes('network') || error.message.includes('fetch')
        ? 'Erreur réseau. Vérifiez votre connexion internet.'
        : 'Une erreur est survenue lors de la mise à jour.' })
      return
    }

    setMessage({ type: 'success', text: 'Vos informations ont été mises à jour.' })
  }

  return (
    <main className="min-h-screen bg-[#F3F5F9]">
      {/* Top navigation bar */}
      <nav className="bg-[#0B1B33] text-white">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-['Poppins'] font-bold text-lg">SAM Guinée</Link>
          <div className="flex items-center gap-4 text-sm">
            {roles.includes('admin') && (
              <Link to="/admin" className="text-[#F2B705] hover:underline">Administration</Link>
            )}
            {roles.includes('staff') && (
              <Link to="/staff/scan" className="text-[#F2B705] hover:underline">Scan</Link>
            )}
            {(roles.includes('admin') || roles.includes('staff')) && (
              <Link to="/securite" className="text-slate-300 hover:text-white hover:underline">Sécurité</Link>
            )}
            <button
              onClick={signOut}
              className="text-slate-300 hover:text-white hover:underline"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto p-6">
        <div className="w-16 h-1 bg-gradient-to-r from-[#D52B1E] via-[#F2B705] to-[#00A651] mb-6 rounded-full" />

        <h1 className="text-2xl font-bold font-['Poppins'] text-[#0B1B33] mb-2">Mon compte</h1>
        <p className="text-sm text-slate-500 mb-6">
          {user?.email}
          {roles.length > 0 && (
            <span className="ml-2 text-xs">
              ({roles.map((r) => {
                const labels: Record<string, string> = {
                  admin: 'Administrateur',
                  staff: 'Personnel',
                  exhibitor: 'Exposant',
                  sponsor: 'Sponsor',
                  user: 'Utilisateur',
                }
                return labels[r] ?? r
              }).join(', ')})
            </span>
          )}
        </p>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-[#0B1B33] mb-4">Informations personnelles</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {message && <Alert type={message.type}>{message.text}</Alert>}

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1">
                Nom complet
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-[#F2B705]/50 focus:border-[#F2B705]"
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
                Téléphone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-[#F2B705]/50 focus:border-[#F2B705]"
                autoComplete="tel"
                placeholder="+224 6XX XX XX XX"
              />
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-medium text-slate-700 mb-1">
                Langue préférée
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white
                  focus:outline-none focus:ring-2 focus:ring-[#F2B705]/50 focus:border-[#F2B705]"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="flex items-start gap-2">
              <input
                id="consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0B1B33] focus:ring-[#F2B705]"
              />
              <label htmlFor="consent" className="text-sm text-slate-600">
                J'accepte de recevoir des informations par e-mail concernant le SAM Guinée.
              </label>
            </div>

            <SubmitButton loading={loading}>Enregistrer les modifications</SubmitButton>
          </form>
        </div>
      </div>
    </main>
  )
}

