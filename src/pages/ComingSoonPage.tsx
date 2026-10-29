import { useLocation } from 'react-router-dom'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'

interface PageMeta {
  title: string
  subtitle: string
  description: string
  icon: string
}

const PAGE_METAS: Record<string, PageMeta> = {
  '/programme': {
    title: 'Programme du Salon',
    subtitle: 'Conférences, ateliers, visites officielles et soirées de gala',
    description:
      'Le calendrier détaillé heure par heure des 10 jours du salon sera publié très prochainement dès validation définitive avec les intervenants et délégations.',
    icon: '📅',
  },
  '/exposants': {
    title: 'Espace Exposants',
    subtitle: 'Réservation de stands, tarifs au m² et aménagement',
    description:
      'Les formulaires d’admission pour les stands simples, doubles, accessoires et banques seront ouverts en ligne dans la prochaine phase.',
    icon: '🏢',
  },
  '/sponsors': {
    title: 'Partenariats & Sponsoring',
    subtitle: 'Packs Diamond, Platinum et Gold',
    description:
      'Associez l’image de votre institution au premier événement automobile de Guinée. Téléchargement du dossier de sponsoring et demande de convention en ligne très bientôt.',
    icon: '💎',
  },
  '/financement': {
    title: 'Pôle Crédit & Leasing Automobile',
    subtitle: 'Vente à crédit pour salariés en CDI et fonctionnaires',
    description:
      'Constituez votre dossier de financement auprès de nos banques et compagnies d’assurance partenaires directement depuis cette plateforme.',
    icon: '💳',
  },
  '/rallye': {
    title: 'Circuit Rallye SAM',
    subtitle: 'Démonstrations, épreuves chronométrées et baptêmes de piste',
    description:
      'Inscriptions des pilotes, co-pilotes et décharges de responsabilité bientôt disponibles pour les épreuves sur circuit sécurisé au Stade Général Lansana Conté.',
    icon: '🏁',
  },
  '/infos-pratiques': {
    title: 'Infos Pratiques & Accès',
    subtitle: 'Venir au Palais du Peuple et au Stade GLC',
    description:
      'Plan d’accès, parkings, restauration sur place, mesures sanitaires et sécurité de l’événement.',
    icon: '📍',
  },
  '/contact': {
    title: 'Contactez l’Organisation',
    subtitle: 'Commissariat Général du SAM Guinée',
    description:
      'Pour toute question relative aux partenariats, accréditations presse ou réservations institutionnelles, joignez nos commissaires.',
    icon: '✉️',
  },
  '/billetterie': {
    title: 'Billetterie Officielle',
    subtitle: 'Achetez vos billets d’entrée coupe-file',
    description:
      'Les ventes de billets adultes (25 000 GNF), jeunes (10 000 GNF) et réservations d’ateliers ouvriront prochainement avec paiement sécurisé.',
    icon: '🎟️',
  },
  '/reglement': {
    title: 'Règlement Intérieur',
    subtitle: 'Règles générales et conditions d’admission',
    description:
      'Consultez les 12 articles régissant l’organisation du salon, les conditions d’exposition et de sécurité des installations.',
    icon: '📜',
  },
  '/mentions-legales': {
    title: 'Mentions Légales & Confidentialité',
    subtitle: 'Informations juridiques de l’organisateur',
    description:
      'Éditeur du site officiel du SAM Guinée, hébergement, protection des données personnelles et politique de confidentialité.',
    icon: '⚖️',
  },
}

export default function ComingSoonPage() {
  const location = useLocation()
  const meta = PAGE_METAS[location.pathname] ?? {
    title: 'Module en préparation',
    subtitle: 'Section en cours de finalisation',
    description:
      'Cette fonctionnalité sera activée dans la prochaine étape de déploiement de la plateforme officielle.',
    icon: '🚧',
  }

  return (
    <div className="py-20 sm:py-28 bg-sam-bg">
      <Container size="md">
        <div className="bg-white rounded-3xl p-8 sm:p-14 border border-sam-border shadow-lg text-center relative overflow-hidden">
          {/* Liseré tricolore en haut de la carte */}
          <div className="sam-tricolor-bar absolute top-0 left-0 right-0" aria-hidden="true" />

          <div className="text-5xl sm:text-6xl mb-6" aria-hidden="true">
            {meta.icon}
          </div>

          <span className="inline-block text-xs uppercase tracking-widest font-bold text-sam-red bg-sam-red/10 px-3.5 py-1 rounded-full mb-3">
            Bientôt disponible
          </span>

          <h1 className="text-2xl sm:text-4xl font-extrabold font-['Poppins'] text-sam-navy mb-3">
            {meta.title}
          </h1>

          <p className="text-base sm:text-lg font-semibold text-sam-gold mb-6 font-['Poppins']">
            {meta.subtitle}
          </p>

          <p className="text-sm sm:text-base text-sam-gray max-w-xl mx-auto leading-relaxed mb-8">
            {meta.description}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button to="/" variant="primary" size="md">
              Retour à l’accueil
            </Button>
            <Button to="/connexion" variant="outline" size="md">
              Espace Compte
            </Button>
          </div>

          <p className="text-xs text-slate-400 italic mt-8">
            SAM Guinée 2027 · 19–28 mars 2027 · Conakry
          </p>
        </div>
      </Container>
    </div>
  )
}

