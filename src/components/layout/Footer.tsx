import { Link } from 'react-router-dom'
import { useSiteSettings } from '@/hooks/useSiteSettings'

export function Footer() {
  const { settings } = useSiteSettings()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-sam-navy text-white relative">
      {/* Liseré tricolore guinéen au sommet du footer */}
      <div className="sam-tricolor-bar w-full" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 pb-12 border-b border-white/10">
          {/* Colonne 1 : À propos & Logo */}
          <div className="space-y-4">
            <Link to="/" className="inline-block" aria-label="Accueil SAM Guinée 2027">
              <img
                src="/brand/logo-sam-sur-fond-sombre.png"
                alt="Logo SAM Guinée 2027"
                width={160}
                height={85}
                className="h-12 w-auto object-contain"
                loading="lazy"
              />
            </Link>
            <p className="text-xs sm:text-sm font-semibold text-sam-gold italic">
              {settings.slogan}
            </p>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Le rendez-vous d'envergure internationale de l'automobile, des mobilités durables
              et du financement automobile en République de Guinée.
            </p>
            <div className="pt-2">
              <span className="inline-block text-xs bg-white/10 text-slate-200 px-3 py-1 rounded-full border border-white/10">
                Structure de droit guinéen créée en 2022
              </span>
            </div>
          </div>

          {/* Colonne 2 : Navigation rapide */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-sam-gold mb-4 font-['Poppins']">
              Navigation
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li>
                <a href="/#presentation" className="hover:text-sam-gold transition-colors">
                  Présentation du salon
                </a>
              </li>
              <li>
                <a href="/#programme" className="hover:text-sam-gold transition-colors">
                  Programme officiel
                </a>
              </li>
              <li>
                <Link to="/exposants" className="hover:text-sam-gold transition-colors">
                  Espace Exposants & Tarifs
                </Link>
              </li>
              <li>
                <Link to="/sponsors" className="hover:text-sam-gold transition-colors">
                  Packs Sponsoring
                </Link>
              </li>
              <li>
                <Link to="/financement" className="hover:text-sam-gold transition-colors">
                  Crédit auto & Leasing
                </Link>
              </li>
              <li>
                <Link to="/rallye" className="hover:text-sam-gold transition-colors">
                  Circuit Rallye SAM
                </Link>
              </li>
              <li>
                <Link to="/billetterie" className="hover:text-sam-gold transition-colors">
                  Billetterie en ligne
                </Link>
              </li>
            </ul>
          </div>

          {/* Colonne 3 : Horaires & Accès */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-sam-gold mb-4 font-['Poppins']">
              Horaires & Accès
            </h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-sam-gold shrink-0 font-bold" aria-hidden="true">▸</span>
                <div>
                  <strong className="text-white block">Grand Public :</strong>
                  <span>Lundi – Vendredi : {settings.opening_hours.weekdays}</span>
                  <br />
                  <span>Samedi – Dimanche : {settings.opening_hours.weekend}</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sam-gold shrink-0 font-bold" aria-hidden="true">▸</span>
                <div>
                  <strong className="text-white block">Exposants :</strong>
                  <span>Tous les jours : {settings.opening_hours.exhibitors}</span>
                </div>
              </li>
              <li className="flex items-start gap-2 pt-1 border-t border-white/10">
                <span className="text-sam-gold shrink-0 font-bold" aria-hidden="true">📍</span>
                <div>
                  <strong className="text-white block">Lieu :</strong>
                  <span className="text-xs text-slate-300">{settings.venue_display}</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Colonne 4 : Contact & Organisation */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-sam-gold mb-4 font-['Poppins']">
              Contact & Siège
            </h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <span className="text-sam-gold shrink-0" aria-hidden="true">📞</span>
                <div className="space-y-0.5">
                  {settings.contact_phones.map((phone) => (
                    <a
                      key={phone}
                      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                      className="block hover:text-sam-gold transition-colors"
                    >
                      {phone}
                    </a>
                  ))}
                </div>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-sam-gold shrink-0" aria-hidden="true">✉️</span>
                <a
                  href={`mailto:${settings.contact_email}`}
                  className="hover:text-sam-gold transition-colors break-all"
                >
                  {settings.contact_email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sam-gold shrink-0 mt-0.5" aria-hidden="true">🏢</span>
                <span className="text-xs text-slate-300">
                  {settings.headquarters_address}
                </span>
              </li>
            </ul>

            <div className="mt-6 pt-4 border-t border-white/10">
              <span className="text-xs uppercase tracking-wider text-slate-400 block mb-2 font-semibold">
                Réseaux sociaux
              </span>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span className="hover:text-sam-gold transition-colors cursor-default">Facebook : @SAM</span>
                <span>·</span>
                <span className="hover:text-sam-gold transition-colors cursor-default">Instagram : @SAM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bas de page : Copyright, neutralité et mentions */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 text-center sm:text-left">
          <p>
            © {currentYear} SAM Guinée. Tous droits réservés. Événement sous le signe de la stricte neutralité de marque.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/reglement" className="hover:text-sam-gold transition-colors">
              Règlement intérieur
            </Link>
            <span>·</span>
            <Link to="/mentions-legales" className="hover:text-sam-gold transition-colors">
              Mentions légales
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

