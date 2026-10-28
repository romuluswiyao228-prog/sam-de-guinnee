import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function App() {
  const [editionStatus, setEditionStatus] = useState<string>('Initialisation du socle...')

  useEffect(() => {
    async function checkConnection() {
      try {
        const { error } = await supabase.from('editions').select('count', { count: 'exact', head: true })
        if (error) {
          setEditionStatus('Socle initialisé — En attente des migrations Supabase locales')
        } else {
          setEditionStatus('Connecté au socle de données Supabase')
        }
      } catch {
        setEditionStatus('Socle initialisé — Mode local')
      }
    }
    checkConnection()
  }, [])

  return (
    <main className="min-h-screen bg-[#F3F5F9] text-[#1D2733] flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
        <div className="w-16 h-1 bg-gradient-to-r from-[#D52B1E] via-[#F2B705] to-[#00A651] mx-auto mb-6 rounded-full" />
        <h1 className="text-2xl font-bold font-['Poppins'] text-[#0B1B33] mb-2">
          SAM Guinée 2027
        </h1>
        <p className="text-sm font-medium text-slate-500 mb-6 uppercase tracking-wider">
          Salon Auto et Mobilité de Guinée · 19–28 mars 2027
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-sm space-y-2 mb-6">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Socle technique :</span>
            <span className="text-emerald-700 font-medium">React + Vite + TS + Tailwind</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Base PostgreSQL :</span>
            <span className="text-emerald-700 font-medium">Supabase RLS & Migrations</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Statut :</span>
            <span className="text-slate-600 font-mono text-xs">{editionStatus}</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 italic">
          « La Guinée roule vers l'avenir. »
        </p>
      </div>
    </main>
  )
}

export default App
