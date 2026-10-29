import { useState } from 'react'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useSponsorPacks } from '@/hooks/useSponsorPacks'
import { usePartners } from '@/hooks/usePartners'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Section } from '@/components/ui/Section'
import { Stat } from '@/components/ui/Stat'
import { CountdownTimer } from '@/components/ui/CountdownTimer'
import { Modal } from '@/components/ui/Modal'

interface GalleryItem {
  src: string
  alt: string
  title: string
  desc: string
  width: number
  height: number
}

export default function HomePage() {
  const { settings } = useSiteSettings()
  const { packs } = useSponsorPacks()
  const { partners } = usePartners()

  // État de la modal de visualisation d'image de la galerie
  const [activeImage, setActiveImage] = useState<GalleryItem | null>(null)

  // Galerie officielle SAM Guinée avec dimensions exactes
  const galleryItems = [
    {
      src: '/brand/render-allees-exposition.jpg',
      alt: 'Allées principales d’exposition avec véhicules et stands modernes',
      title: 'Grande Allée d’Exposition',
      desc: 'Vue 3D des allées de circulation piétonne et des espaces concessionnaires.',
      width: 1600,
      height: 1000,
    },
    {
      src: '/brand/render-esplanade.jpg',
      alt: 'Esplanade du Stade Général Lansana Conté avec zone d’exposition extérieure',
      title: 'Esplanade Extérieure & Circuit',
      desc: 'Près de 40 000 m² aménagés pour les véhicules lourds, utilitaires et animations.',
      width: 1600,
      height: 998,
    },
    {
      src: '/brand/salle-exposition-vehicules.jpg',
      alt: 'Halle couverte d’exposition avec véhicules prestigieux et éclairage professionnel',
      title: 'Pavillon Couvert & Modèles Exclusifs',
      desc: 'Espace climatisé dédié aux lancements, berlines et véhicules d’exception.',
      width: 1600,
      height: 934,
    },
    {
      src: '/brand/render-stands-drapeaux.jpg',
      alt: 'Pavillons des partenaires et exposants avec drapeaux et signalétique',
      title: 'Zone des Pavillons & Sponsors',
      desc: 'Emplacements stratégiques pour partenaires majeurs et marques automobiles.',
      width: 1000,
      height: 1248,
    },
    {
      src: '/brand/stand-banque.jpg',
      alt: 'Aménagement du stand banque et assurance avec bureaux d’entretien de crédit',
      title: 'Pôle Financement & Banques',
      desc: 'Stands aménagés pour l’étude immédiate de dossiers de leasing et crédit auto.',
      width: 1200,
      height: 728,
    },
    {
      src: '/brand/stand-simple.jpg',
      alt: 'Stand Simple d’exposition modulaire clé en main avec cloisons et spots',
      title: 'Stand Simple Clé en Main',
      desc: 'Espace optimisé de 3 m² minimum avec cloisons, réserve, moquette et éclairage.',
      width: 779,
      height: 638,
    },
  ]

  return (
    <div className="space-y-0">
      {/* ==================================================================== */}
      {/* (A) HÉROS PLEIN ÉCRAN                                               */}
      {/* ==================================================================== */}
      <section
        aria-label="Présentation principale du salon"
        className="relative min-h-[90vh] flex items-center justify-center bg-sam-navy text-white overflow-hidden py-16 sm:py-24"
      >
        {/* Image de fond avec overlay dégradé */}
        <div className="absolute inset-0 z-0">
          <img
            src="/brand/hero-vehicules-conakry.jpg"
            alt="Véhicules modernes devant le panorama urbain de Conakry"
            width={1055}
            height={430}
            fetchPriority="high"
            className="w-full h-full object-cover object-center opacity-30 sm:opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-sam-navy via-sam-navy/80 to-sam-navy/60" />
        </div>

        {/* Contenu du Héros */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-xs sm:text-sm font-semibold text-sam-gold mb-6">
            <span className="w-2 h-2 rounded-full bg-sam-gold animate-ping" aria-hidden="true" />
            1re Édition Officielle · Conakry 2027
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-['Poppins'] tracking-tight leading-tight mb-4">
            Salon Auto et Mobilité de Guinée
          </h1>

          <p className="text-xl sm:text-2xl lg:text-3xl font-bold font-['Poppins'] text-sam-gold italic mb-6">
            {settings.slogan}
          </p>

          {/* Liseré tricolore sous le slogan */}
          <div className="w-24 h-1 sam-tricolor-gradient mx-auto rounded-full mb-6" aria-hidden="true" />

          {/* Dates & Lieu */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm sm:text-base text-slate-200 mb-10">
            <div className="flex items-center gap-2">
              <span className="text-sam-gold text-lg" aria-hidden="true">📅</span>
              <span className="font-semibold">{settings.event_dates_display}</span>
            </div>
            <span className="hidden sm:inline text-white/40" aria-hidden="true">•</span>
            <div className="flex items-center gap-2">
              <span className="text-sam-gold text-lg" aria-hidden="true">📍</span>
              <span className="font-semibold">{settings.venue_display}</span>
            </div>
          </div>

          {/* Boutons d'appel à l'action */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
            <Button
              to="/billetterie"
              variant="primary"
              size="lg"
              fullWidth
              className="font-extrabold tracking-wide uppercase text-sm sm:text-base"
            >
              Réserver ma place
            </Button>
            <Button
              to="/exposants"
              variant="secondary"
              size="lg"
              fullWidth
              className="bg-white/15 border border-white/30 hover:bg-white hover:text-sam-navy text-sm sm:text-base"
            >
              Exposer au salon
            </Button>
            <Button
              to="/sponsors"
              variant="outline"
              size="lg"
              fullWidth
              className="border-sam-gold text-sam-gold hover:bg-sam-gold hover:text-sam-navy text-sm sm:text-base"
            >
              Devenir sponsor
            </Button>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* (B) COMPTE À REBOURS OFFICIEL                                        */}
      {/* ==================================================================== */}
      <section
        id="compte-a-rebours"
        aria-label="Compte à rebours avant l'ouverture du salon"
        className="py-12 bg-white border-b border-sam-border relative z-20 shadow-xs"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs sm:text-sm uppercase tracking-widest font-bold text-sam-red mb-2">
            Ouverture solennelle
          </p>
          <h2 className="text-xl sm:text-2xl font-bold font-['Poppins'] text-sam-navy mb-6">
            Rendez-vous le vendredi 19 mars 2027 à 09h00 (heure de Conakry)
          </h2>
          <CountdownTimer targetDate="2027-03-19T09:00:00Z" />
        </div>
      </section>

      {/* ==================================================================== */}
      {/* (C) CHIFFRES CLÉS DU SALON                                           */}
      {/* ==================================================================== */}
      <Section
        id="chiffres-cles"
        surtitle="Envergure de l’événement"
        title="Les chiffres clés de cette 1re édition"
        description="Une vitrine sans précédent de l'automobile et des transports en Guinée, réunissant l’ensemble de l’écosystème institutionnel et privé."
        centered
        background="gray"
      >
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          <Stat value="10" label="Jours" subtext="Du 19 au 28 mars 2027" accent="gold" />
          <Stat value="25" label="Modèles exposés" subtext="Nouveautés & avant-premières" accent="navy" />
          <Stat value="60" label="Exposants" subtext="Constructeurs, concessions & pièces" accent="green" />
          <Stat value="5 000" label="Visiteurs attendus" subtext="Grand public & délégations" accent="red" />
          <Stat value="40 000 m²" label="D’exposition" subtext="Palais du Peuple & Stade GLC" accent="gold" />
        </div>
      </Section>

      {/* ==================================================================== */}
      {/* (D) LES CINQ PROMESSES DU SALON (LEASING MIS EN AVANT)              */}
      {/* ==================================================================== */}
      <Section
        id="promesses"
        surtitle="Nos engagements"
        title="Les 5 promesses du SAM Guinée 2027"
        description="Un salon conçu pour répondre concrètement aux besoins des automobilistes guinéens, des familles, des entreprises et des administrations."
        centered
        background="white"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Promesse 1 */}
          <Card className="hover:border-sam-navy transition-all">
            <div className="w-12 h-12 rounded-xl bg-sam-navy/10 text-sam-navy flex items-center justify-center text-2xl mb-4" aria-hidden="true">
              🚗
            </div>
            <h3 className="text-lg font-bold font-['Poppins'] text-sam-navy mb-2">
              1. Exposition de véhicules neufs et d’occasion
            </h3>
            <p className="text-sm text-sam-gray leading-relaxed">
              Découvrez les dernières gammes de SUV, berlines, pick-ups, motos et véhicules utilitaires
              présentés par les concessionnaires officiels et vendeurs agréés.
            </p>
          </Card>

          {/* Promesse 2 */}
          <Card className="hover:border-sam-navy transition-all">
            <div className="w-12 h-12 rounded-xl bg-sam-navy/10 text-sam-navy flex items-center justify-center text-2xl mb-4" aria-hidden="true">
              🤝
            </div>
            <h3 className="text-lg font-bold font-['Poppins'] text-sam-navy mb-2">
              2. Rencontres professionnelles B2B & B2C
            </h3>
            <p className="text-sm text-sam-gray leading-relaxed">
              Plateforme d'échanges directs entre investisseurs, dirigeants d’entreprises minières,
              transporteurs, flottes institutionnelles et grand public.
            </p>
          </Card>

          {/* Promesse 3 */}
          <Card className="hover:border-sam-navy transition-all">
            <div className="w-12 h-12 rounded-xl bg-sam-navy/10 text-sam-navy flex items-center justify-center text-2xl mb-4" aria-hidden="true">
              ⚡
            </div>
            <h3 className="text-lg font-bold font-['Poppins'] text-sam-navy mb-2">
              3. Innovation & mobilité durable
            </h3>
            <p className="text-sm text-sam-gray leading-relaxed">
              Focus sur la transition énergétique, les technologies hybrides et électriques,
              ainsi que les solutions adaptées aux réalités du réseau routier guinéen.
            </p>
          </Card>

          {/* Promesse 4 */}
          <Card className="hover:border-sam-navy transition-all">
            <div className="w-12 h-12 rounded-xl bg-sam-navy/10 text-sam-navy flex items-center justify-center text-2xl mb-4" aria-hidden="true">
              🎤
            </div>
            <h3 className="text-lg font-bold font-['Poppins'] text-sam-navy mb-2">
              4. Conférences et ateliers d’experts
            </h3>
            <p className="text-sm text-sam-gray leading-relaxed">
              Débats animés par des spécialistes de la sécurité routière, des assureurs, des urbanistes
              et des techniciens sur les enjeux de la mobilité en Guinée.
            </p>
          </Card>

          {/* Promesse 5 — PRIORITÉ DU SALON : LEASING & CRÉDIT AUTO */}
          <Card
            variant="highlight"
            className="md:col-span-2 lg:col-span-2 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 border-2 border-sam-gold"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-sam-gold text-sam-navy flex items-center justify-center text-2xl shrink-0" aria-hidden="true">
                  💳
                </div>
                <div>
                  <Badge variant="gold">Priorité N°1 du Salon</Badge>
                  <h3 className="text-xl sm:text-2xl font-bold font-['Poppins'] text-sam-navy mt-1">
                    5. Leasing & Vente de voitures à crédit
                  </h3>
                </div>
              </div>
              <Button to="/financement" variant="primary" size="sm">
                En savoir plus
              </Button>
            </div>

            <p className="text-sm sm:text-base text-sam-navy/90 leading-relaxed mb-4">
              <strong>Réservé aux fonctionnaires de l’État et travailleurs du secteur privé en CDI :</strong>{' '}
              rencontrez sur place nos banques, assurances et organismes de financement partenaires.
              Étudiez immédiatement votre capacité d’emprunt et repartez avec une offre de financement
              concrète pour acquérir votre véhicule neuf ou d’occasion garanti.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-sam-gold/30 text-xs sm:text-sm text-sam-navy font-semibold">
              <div className="flex items-center gap-2">
                <span className="text-sam-green font-bold text-base" aria-hidden="true">✓</span>
                <span>Fonctionnaires & Salariés CDI</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sam-green font-bold text-base" aria-hidden="true">✓</span>
                <span>Banques & Assureurs sur place</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sam-green font-bold text-base" aria-hidden="true">✓</span>
                <span>Montage immédiat de dossier</span>
              </div>
            </div>
          </Card>
        </div>
      </Section>

      {/* ==================================================================== */}
      {/* (E) BLOC « CIRCUIT RALLYE »                                          */}
      {/* ==================================================================== */}
      <Section
        id="rallye"
        background="navy"
        className="relative overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6">
            <Badge variant="gold">Temps fort additionnel</Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-['Poppins'] text-white">
              Circuit Rallye Automobile SAM
            </h2>
            <div className="w-16 h-1 sam-tricolor-gradient rounded-full" aria-hidden="true" />
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Vivez l'adrénaline des sports mécaniques au cœur de Conakry. Sur une piste spécialement
              sécurisée et aménagée sur l’esplanade du Stade Général Lansana Conté, assistez à des
              démonstrations de pilotage, des baptêmes de piste et des épreuves chronométrées.
            </p>
            <div className="space-y-3 text-sm text-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="text-sam-gold font-bold text-lg" aria-hidden="true">🏁</span>
                <span>Épreuves de précision et démonstrations spectaculaires de pilotage</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-sam-gold font-bold text-lg" aria-hidden="true">🏎️</span>
                <span>Baptêmes de piste aux côtés de pilotes expérimentés</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-sam-gold font-bold text-lg" aria-hidden="true">🛡️</span>
                <span>Encadrement professionnel et respect rigoureux des normes de sécurité</span>
              </div>
            </div>
            <div className="pt-2">
              <Button to="/rallye" variant="primary" size="md">
                Découvrir le programme rallye
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden border-2 border-sam-gold/40 shadow-2xl">
              <img
                src="/brand/render-esplanade.jpg"
                alt="Circuit automobile aménagé sur l'esplanade du Stade GLC"
                width={1600}
                height={998}
                loading="lazy"
                className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-sam-navy via-sam-navy/80 to-transparent">
                <p className="text-xs font-bold text-sam-gold font-['Poppins']">
                  Esplanade du Stade Général Lansana Conté
                </p>
                <p className="text-xs text-slate-300">Piste de démonstration et zone spectateurs sécurisée</p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ==================================================================== */}
      {/* (F) PROGRAMME EN FRISE CHRONOLOGIQUE                                */}
      {/* ==================================================================== */}
      <Section
        id="programme"
        surtitle="Agenda prévisionnel"
        title="Les temps forts des 10 jours"
        description="Un programme riche combinant cérémonies officielles, expositions continues, rendez-vous d'affaires et festivités."
        centered
        background="gray"
      >
        <div className="max-w-4xl mx-auto">
          <div className="relative border-l-4 border-sam-navy/20 pl-6 sm:pl-10 space-y-10 py-4 ml-4 sm:ml-8">
            {/* Étape 1 : Ouverture */}
            <div className="relative group">
              <div
                className="absolute -left-[35px] sm:-left-[51px] top-1.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sam-navy border-4 border-white shadow-md flex items-center justify-center text-xs text-white"
                aria-hidden="true"
              >
                1
              </div>
              <div className="bg-white p-6 rounded-2xl border border-sam-border shadow-xs group-hover:border-sam-navy transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <h3 className="text-lg font-bold font-['Poppins'] text-sam-navy">
                    Cérémonie d'Ouverture Solennelle
                  </h3>
                  <Badge variant="gold">Vendredi 19 Mars 2027</Badge>
                </div>
                <p className="text-sm text-sam-gray mb-3">
                  Inauguration officielle en présence des hautes autorités de l’État guinéen, des corps
                  diplomatiques et des délégations internationales. Début des expositions au Palais du Peuple.
                </p>
                <div className="text-xs text-sam-navy font-semibold flex items-center gap-1.5">
                  <span>📍 Palais du Peuple · 10h00 – 13h00</span>
                </div>
              </div>
            </div>

            {/* Étape 2 : Le salon continu */}
            <div className="relative group">
              <div
                className="absolute -left-[35px] sm:-left-[51px] top-1.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sam-gold border-4 border-white shadow-md flex items-center justify-center text-xs text-sam-navy font-bold"
                aria-hidden="true"
              >
                2
              </div>
              <div className="bg-white p-6 rounded-2xl border border-sam-border shadow-xs group-hover:border-sam-gold transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <h3 className="text-lg font-bold font-['Poppins'] text-sam-navy">
                    Salon Continu, B2B & Pôle Financement
                  </h3>
                  <Badge variant="navy">Du 19 au 28 Mars 2027</Badge>
                </div>
                <p className="text-sm text-sam-gray mb-3">
                  Ouverture quotidienne au public et aux professionnels. Permanence du Bureau Leasing et
                  vente à crédit, essais de véhicules, circuit rallye et conférences thématiques.
                </p>
                <div className="text-xs text-sam-navy font-semibold flex items-center gap-1.5">
                  <span>⏱️ Semaine 9h–20h · Week-end 10h–21h</span>
                </div>
              </div>
            </div>

            {/* Étape 3 : Dîner de gala */}
            <div className="relative group">
              <div
                className="absolute -left-[35px] sm:-left-[51px] top-1.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sam-red border-4 border-white shadow-md flex items-center justify-center text-xs text-white"
                aria-hidden="true"
              >
                3
              </div>
              <div className="bg-white p-6 rounded-2xl border border-sam-border shadow-xs group-hover:border-sam-red transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <h3 className="text-lg font-bold font-['Poppins'] text-sam-navy">
                    Dîner de Gala Prestige des Sponsors (8e jour)
                  </h3>
                  <Badge variant="red">Vendredi 26 Mars 2027</Badge>
                </div>
                <p className="text-sm text-sam-gray mb-3">
                  Soirée VIP exclusive et de bienfaisance réservée aux partenaires majeurs, sponsors et
                  invités d’honneur. Remise de distinctions et networking de haut niveau.
                </p>
                <div className="text-xs text-sam-navy font-semibold flex items-center gap-1.5">
                  <span>✨ Espace Réception Gala · 20h00</span>
                </div>
              </div>
            </div>

            {/* Étape 4 : Clôture */}
            <div className="relative group">
              <div
                className="absolute -left-[35px] sm:-left-[51px] top-1.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sam-green border-4 border-white shadow-md flex items-center justify-center text-xs text-white"
                aria-hidden="true"
              >
                4
              </div>
              <div className="bg-white p-6 rounded-2xl border border-sam-border shadow-xs group-hover:border-sam-green transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <h3 className="text-lg font-bold font-['Poppins'] text-sam-navy">
                    Cérémonie de Clôture & Cocktail des Partenaires
                  </h3>
                  <Badge variant="green">Dimanche 28 Mars 2027</Badge>
                </div>
                <p className="text-sm text-sam-gray mb-3">
                  Bilan officiel de cette 1re édition, remise des trophées SAM Guinée et cocktail de
                  remerciement en présence de l’ensemble des exposants et organisateurs.
                </p>
                <div className="text-xs text-sam-navy font-semibold flex items-center gap-1.5">
                  <span>🏆 Esplanade Centrale · 17h00 – 21h00</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-10">
            <Button to="/programme" variant="secondary" size="md">
              Voir le programme complet
            </Button>
          </div>
        </div>
      </Section>

      {/* ==================================================================== */}
      {/* (G) POUR QUI : VISITEURS ET EXPOSANTS                                */}
      {/* ==================================================================== */}
      <Section
        id="publics"
        surtitle="Profils concernés"
        title="Un salon conçu pour tous les acteurs"
        description="Que vous cherchiez à acquérir un véhicule ou à développer votre portefeuille d’affaires en Guinée, le SAM est votre plateforme."
        centered
        background="white"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Bloc Visiteurs */}
          <Card className="border-2 hover:border-sam-navy transition-all p-8 flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-sam-navy/10 text-sam-navy flex items-center justify-center text-3xl mb-4" aria-hidden="true">
                👥
              </div>
              <h3 className="text-2xl font-bold font-['Poppins'] text-sam-navy mb-3">
                Vous êtes Visiteur
              </h3>
              <p className="text-sm text-sam-gray mb-6 leading-relaxed">
                Particuliers, passionnés d’automobiles, fonctionnaires, salariés et familles :
                profitez d'un événement unique pour comparer les modèles, essayer les nouveautés et
                concrétiser votre projet auto en toute confiance.
              </p>
              <ul className="space-y-2.5 text-sm text-sam-navy mb-6 font-medium">
                <li className="flex items-center gap-2">
                  <span className="text-sam-gold">✔</span>
                  <span>Tarifs d'entrée accessibles (25 000 GNF adulte, 10 000 GNF jeune)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-sam-gold">✔</span>
                  <span>Gratuité pour les enfants de moins de 12 ans et journalistes accrédités</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-sam-gold">✔</span>
                  <span>Animations, baptêmes de piste et espace restauration sécurisé</span>
                </li>
              </ul>
            </div>
            <Button to="/billetterie" variant="primary" fullWidth size="md">
              Acheter mon billet d’entrée
            </Button>
          </Card>

          {/* Bloc Exposants */}
          <Card className="border-2 hover:border-sam-gold transition-all p-8 flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-sam-gold/20 text-sam-navy flex items-center justify-center text-3xl mb-4" aria-hidden="true">
                🏢
              </div>
              <h3 className="text-2xl font-bold font-['Poppins'] text-sam-navy mb-3">
                Vous êtes Exposant
              </h3>
              <p className="text-sm text-sam-gray mb-6 leading-relaxed">
                Constructeurs, concessionnaires officiels, équipementiers, banques, assurances,
                entreprises minières et de télécommunications : valorisez vos offres auprès de plus de
                5 000 visiteurs qualifiés.
              </p>
              <ul className="space-y-2.5 text-sm text-sam-navy mb-6 font-medium">
                <li className="flex items-center gap-2">
                  <span className="text-sam-green font-bold">✔</span>
                  <span>Stands modulaires clés en main à partir de 3 m²</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-sam-green font-bold">✔</span>
                  <span>Frais d'inscription de 2 000 000 GNF HT (pack communication inclus)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-sam-green font-bold">✔</span>
                  <span>Admission réservée aux constructeurs et vendeurs agréés (règlement art. 3)</span>
                </li>
              </ul>
            </div>
            <Button to="/exposants" variant="secondary" fullWidth size="md">
              Déposer une demande de stand
            </Button>
          </Card>
        </div>
      </Section>

      {/* ==================================================================== */}
      {/* (H) APERÇU DES 3 PACKS DE SPONSORING                                 */}
      {/* ==================================================================== */}
      <Section
        id="sponsors"
        surtitle="Partenariats & Visibilité"
        title="Les 3 packs officiels de sponsoring"
        description="Associez le prestige de votre marque à l’événement économique et automobile de référence de l’année 2027 en Guinée."
        centered
        background="gray"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {packs.map((pack) => {
            const isDiamond = pack.code === 'diamond'
            const isPlatinum = pack.code === 'platinum'

            return (
              <Card
                key={pack.code}
                variant={isDiamond ? 'highlight' : 'default'}
                className={`flex flex-col justify-between ${
                  isDiamond ? 'border-2 border-sam-gold shadow-xl scale-[1.02]' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <Badge variant={isDiamond ? 'gold' : isPlatinum ? 'navy' : 'gray'}>
                      {pack.role_label}
                    </Badge>
                    {isDiamond && (
                      <span className="text-xs font-bold text-sam-red bg-sam-red/10 px-2 py-0.5 rounded-full">
                        Exclusif
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl font-extrabold font-['Poppins'] text-sam-navy mb-2">
                    Pack {pack.label}
                  </h3>

                  <div className="mb-6 pb-6 border-b border-sam-border">
                    <span className="text-3xl sm:text-4xl font-extrabold font-['Poppins'] text-sam-navy">
                      {(pack.price_gnf / 1000000).toLocaleString('fr-FR')} M
                    </span>
                    <span className="text-sm font-semibold text-sam-gray ml-2">GNF</span>
                  </div>

                  {/* Avantages issus de benefits */}
                  <ul className="space-y-3 text-xs sm:text-sm text-sam-navy mb-8">
                    <li className="flex items-start gap-2">
                      <span className="text-sam-gold font-bold">▸</span>
                      <span>Stand clé en main de 3 m² en emplacement privilégié</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sam-gold font-bold">▸</span>
                      <span>Logo sur tous les supports officiels de communication</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sam-gold font-bold">▸</span>
                      <span>
                        {pack.code === 'diamond'
                          ? 'Double page prestige dans le catalogue officiel'
                          : pack.code === 'platinum'
                          ? '1 page pleine couleur dans le catalogue'
                          : '½ page couleur dans le catalogue'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sam-gold font-bold">▸</span>
                      <span>
                        {pack.code === 'diamond'
                          ? 'Dîner de gala : 1 table personnalisée (4 pers.) + 4 pass VIP'
                          : pack.code === 'platinum'
                          ? 'Dîner de gala : 3 places + 3 pass VIP'
                          : 'Dîner de gala : 2 places + 2 pass VIP'}
                      </span>
                    </li>
                    {pack.code === 'diamond' && (
                      <li className="flex items-start gap-2 font-semibold text-sam-green">
                        <span>✔</span>
                        <span>Accès exclusif à la base de données visiteurs</span>
                      </li>
                    )}
                  </ul>
                </div>

                <Button
                  to="/sponsors"
                  variant={isDiamond ? 'primary' : 'outline'}
                  fullWidth
                  size="md"
                >
                  Choisir le pack {pack.label}
                </Button>
              </Card>
            )
          })}
        </div>

        {/* Partenaires publiés (si disponibles en base, rien d'inventé) */}
        {partners.length > 0 && (
          <div className="mt-16 pt-12 border-t border-sam-border">
            <p className="text-xs uppercase tracking-widest font-bold text-sam-gray mb-6 text-center">
              Partenaires déjà confirmés
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {partners.map((partner) => (
                <div
                  key={partner.id}
                  className="p-4 bg-white rounded-xl border border-sam-border shadow-xs flex items-center justify-center h-20 min-w-[140px]"
                >
                  {partner.logo_url ? (
                    <img
                      src={partner.logo_url}
                      alt={partner.name}
                      width={120}
                      height={50}
                      className="max-h-12 w-auto object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="font-bold text-sam-navy text-sm font-['Poppins']">
                      {partner.name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ==================================================================== */}
      {/* (J) GALERIE AVEC LES RENDUS OFFICIELS FOURNIS                        */}
      {/* ==================================================================== */}
      <Section
        id="galerie"
        surtitle="Immersion visuelle"
        title="Découvrez les installations prévues"
        description="Aperçu des aménagements en 3D des pavillons, stands d’exposition et esplanade du Palais du Peuple et du Stade GLC."
        centered
        background="white"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryItems.map((item) => (
            <div
              key={item.src}
              onClick={() => setActiveImage(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActiveImage(item)
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Agrandir l'image : ${item.title}`}
              className="group relative rounded-2xl overflow-hidden bg-slate-100 border border-sam-border shadow-xs hover:shadow-xl transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-sam-gold"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={item.src}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Légende au bas de la carte */}
              <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold font-['Poppins'] text-sm text-sam-navy group-hover:text-sam-gold transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-sam-gray line-clamp-1">{item.desc}</p>
                </div>
                <span className="w-8 h-8 rounded-full bg-sam-bg flex items-center justify-center text-sam-navy group-hover:bg-sam-gold transition-colors shrink-0 ml-2" aria-hidden="true">
                  🔍
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Modal d'agrandissement d'image */}
      <Modal
        isOpen={Boolean(activeImage)}
        onClose={() => setActiveImage(null)}
        title={activeImage?.title}
        size="xl"
      >
        {activeImage && (
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center max-h-[65vh]">
              <img
                src={activeImage.src}
                alt={activeImage.alt}
                width={activeImage.width}
                height={activeImage.height}
                className="max-h-[65vh] w-auto object-contain mx-auto"
              />
            </div>
            <p className="text-sm text-sam-gray">{activeImage.desc}</p>
          </div>
        )}
      </Modal>

      {/* ==================================================================== */}
      {/* (I) APPEL À L'ACTION FINAL (CTA)                                     */}
      {/* ==================================================================== */}
      <section
        id="contact-cta"
        aria-label="Appel à l'action final pour participer au salon"
        className="py-16 sm:py-24 bg-gradient-to-br from-sam-navy via-sam-navy-light to-sam-navy text-white text-center relative overflow-hidden"
      >
        {/* Liseré tricolore tout en haut du bloc */}
        <div className="sam-tricolor-bar absolute top-0 left-0 right-0" aria-hidden="true" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <Badge variant="gold">Le rendez-vous automobile de l'année</Badge>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold font-['Poppins'] mt-4 mb-4">
            Préparez votre venue au SAM Guinée 2027
          </h2>

          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            Du 19 au 28 mars 2027 à Conakry. Réservez votre badge d'accès, exposez votre marque
            ou bénéficiez des facilités de crédit automobile.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              to="/billetterie"
              variant="primary"
              size="lg"
              className="font-extrabold uppercase text-sm sm:text-base w-full sm:w-auto"
            >
              Réserver mon billet d’entrée
            </Button>
            <Button
              to="/contact"
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white hover:text-sam-navy text-sm sm:text-base w-full sm:w-auto"
            >
              Contacter les commissaires
            </Button>
          </div>

          <div className="mt-10 pt-8 border-t border-white/10 flex flex-wrap justify-center items-center gap-6 text-xs text-slate-400">
            <span>📞 Infoline : (00224) 610 86 14 09 / 655 79 78 77</span>
            <span>•</span>
            <span>✉️ samdeguinee@gmail.com</span>
            <span>•</span>
            <span>Palais du Peuple & Esplanade Stade GLC</span>
          </div>
        </div>
      </section>
    </div>
  )
}
