import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'

export function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-sam-bg text-sam-text">
      {/* Lien d'évitement accessible au clavier (Skip Link) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-sam-gold focus:text-sam-navy focus:font-bold focus:rounded-lg focus:shadow-xl focus:ring-2 focus:ring-sam-navy"
      >
        Aller au contenu principal
      </a>

      <Header />

      <main id="main-content" className="flex-1 focus:outline-none" tabIndex={-1}>
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}

