import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'

interface NavLink {
  label: string
  href: string
}

const NAV_LINKS: NavLink[] = [
  { label: 'Le salon', href: '/#presentation' },
  { label: 'Programme', href: '/#programme' },
  { label: 'Exposants', href: '/exposants' },
  { label: 'Sponsors', href: '/sponsors' },
  { label: 'Crédit & Leasing', href: '/financement' },
  { label: 'Rallye', href: '/rallye' },
  { label: 'Infos pratiques', href: '/infos-pratiques' },
  { label: 'Contact', href: '/contact' },
]

export function Header() {
  const { user } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  // Fermer le menu mobile lors du changement de route (ajustement pendant le rendu)
  const [prevPath, setPrevPath] = useState(location.pathname + location.hash)
  const currentPath = location.pathname + location.hash
  if (prevPath !== currentPath) {
    setPrevPath(currentPath)
    setMobileMenuOpen(false)
  }

  // Gestion de la touche Echap pour fermer le menu mobile
  useEffect(() => {
    if (!mobileMenuOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileMenuOpen])

  return (
    <header className="sticky top-0 z-40 w-full bg-sam-navy/95 backdrop-blur-md border-b border-sam-navy-light text-white shadow-md">
      {/* Barre tricolore discrète tout en haut du header */}
      <div className="sam-tricolor-bar w-full" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo officiel SAM Guinée */}
          <Link
            to="/"
            className="flex items-center gap-3 shrink-0 focus-visible:ring-2 focus-visible:ring-sam-gold rounded-lg py-1 px-1"
            aria-label="Accueil — Salon Auto et Mobilité de Guinée 2027"
          >
            <img
              src="/brand/logo-sam-sur-fond-sombre.png"
              alt="Logo SAM Guinée 2027"
              width={160}
              height={85}
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </Link>

          {/* Navigation Desktop */}
          <nav
            aria-label="Navigation principale"
            className="hidden xl:flex items-center gap-1 2xl:gap-2 text-sm font-medium"
          >
            {NAV_LINKS.map((link) => {
              const isHashLink = link.href.startsWith('/#')
              const Component = isHashLink ? 'a' : Link

              return (
                <Component
                  key={link.label}
                  href={isHashLink ? link.href : undefined}
                  to={!isHashLink ? link.href : undefined as unknown as string}
                  className="px-3 py-2 text-slate-200 hover:text-sam-gold hover:bg-white/5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-sam-gold whitespace-nowrap"
                >
                  {link.label}
                </Component>
              )
            })}
          </nav>

          {/* Actions : Réserver + Connexion / Mon compte */}
          <div className="hidden sm:flex items-center gap-3">
            <Button
              to="/billetterie"
              variant="primary"
              size="sm"
              className="font-bold text-xs uppercase tracking-wider"
            >
              Réserver
            </Button>

            {user ? (
              <Button
                to="/mon-compte"
                variant="outline"
                size="sm"
                className="border-white/30 text-white hover:bg-white hover:text-sam-navy text-xs"
              >
                Mon compte
              </Button>
            ) : (
              <Button
                to="/connexion"
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 text-xs"
              >
                Connexion
              </Button>
            )}
          </div>

          {/* Bouton Menu Mobile (Burger) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileMenuOpen ? 'Fermer le menu de navigation' : 'Ouvrir le menu de navigation'}
            className="xl:hidden p-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sam-gold transition-colors"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Panneau Mobile (Slide-over Drawer accessible) */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation mobile"
          className="xl:hidden fixed inset-0 z-50 flex justify-end"
        >
          {/* Overlay sombre */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Tiroir coulissant */}
          <div
            ref={mobileMenuRef}
            className="relative w-full max-w-sm bg-sam-navy text-white h-full shadow-2xl border-l border-sam-navy-light flex flex-col justify-between p-6 z-10 overflow-y-auto animate-in slide-in-from-right duration-200"
          >
            <div>
              {/* En-tête du tiroir avec Logo et bouton fermeture */}
              <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
                <img
                  src="/brand/logo-sam-sur-fond-sombre.png"
                  alt="Logo SAM Guinée"
                  width={140}
                  height={74}
                  className="h-10 w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Fermer le menu"
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sam-gold"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Liens de navigation mobile */}
              <nav aria-label="Navigation mobile" className="space-y-1">
                {NAV_LINKS.map((link) => {
                  const isHashLink = link.href.startsWith('/#')
                  const Component = isHashLink ? 'a' : Link

                  return (
                    <Component
                      key={link.label}
                      href={isHashLink ? link.href : undefined}
                      to={!isHashLink ? link.href : undefined as unknown as string}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 rounded-xl text-base font-semibold text-slate-200 hover:text-sam-gold hover:bg-white/5 transition-colors"
                    >
                      {link.label}
                    </Component>
                  )
                })}
              </nav>
            </div>

            {/* Actions du bas dans le panneau mobile */}
            <div className="pt-6 border-t border-white/10 space-y-3 mt-8">
              <Button
                to="/billetterie"
                variant="primary"
                fullWidth
                size="md"
                onClick={() => setMobileMenuOpen(false)}
              >
                Réserver ma place
              </Button>

              {user ? (
                <Button
                  to="/mon-compte"
                  variant="outline"
                  fullWidth
                  size="md"
                  className="border-white/40 text-white hover:bg-white hover:text-sam-navy"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Mon compte
                </Button>
              ) : (
                <Button
                  to="/connexion"
                  variant="outline"
                  fullWidth
                  size="md"
                  className="border-white/40 text-white hover:bg-white hover:text-sam-navy"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Se connecter
                </Button>
              )}

              <p className="text-xs text-center text-slate-400 italic pt-2">
                « La Guinée roule vers l'avenir. »
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

