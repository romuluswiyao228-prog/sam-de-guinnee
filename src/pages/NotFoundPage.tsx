import { Link } from 'react-router-dom'

/** 404 — Page non trouvée */
export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-[#F3F5F9] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-1 bg-gradient-to-r from-[#D52B1E] via-[#F2B705] to-[#00A651] mx-auto mb-6 rounded-full" />
        <h1 className="text-6xl font-bold font-['Poppins'] text-[#0B1B33] mb-2">404</h1>
        <p className="text-lg text-slate-600 mb-6">Page non trouvée</p>
        <Link
          to="/"
          className="inline-block px-5 py-2.5 bg-[#0B1B33] text-white font-semibold rounded-lg text-sm
            hover:bg-[#0B1B33]/90 transition-colors"
        >
          Retour à l'accueil
        </Link>
      </div>
    </main>
  )
}

