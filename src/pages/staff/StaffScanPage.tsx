import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

/** Placeholder staff scan page — to be built in Phase 3+ */
export default function StaffScanPage() {
  const { signOut } = useAuth()

  return (
    <main className="min-h-screen bg-[#F3F5F9]">
      <nav className="bg-[#0B1B33] text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-['Poppins'] font-bold text-lg">SAM Guinée</Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/mon-compte" className="text-slate-300 hover:text-white hover:underline">Mon compte</Link>
            <Link to="/securite" className="text-slate-300 hover:text-white hover:underline">Sécurité</Link>
            <button onClick={signOut} className="text-slate-300 hover:text-white hover:underline">
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        <div className="w-16 h-1 bg-gradient-to-r from-[#D52B1E] via-[#F2B705] to-[#00A651] mb-6 rounded-full" />

        <h1 className="text-2xl font-bold font-['Poppins'] text-[#0B1B33] mb-4">
          Scan des billets
        </h1>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
          <div className="text-4xl mb-4">📷</div>
          <h2 className="text-lg font-semibold text-[#0B1B33] mb-2">
            Scanner en construction
          </h2>
          <p className="text-sm text-slate-500">
            Le module de scan et check-in sera disponible dans une prochaine phase de développement.
          </p>
        </div>
      </div>
    </main>
  )
}

