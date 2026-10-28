-- ==============================================================================
-- SAM GUINÉE 2027 — DONNÉES DE TEST LOCALES (SEED)
-- ==============================================================================
-- Note : Les données de référence officielles (édition sam-2027, paramètres du site,
-- types de billets de base, classes de stand officielles sans aménagements inventés,
-- packs sponsors) sont appliquées de manière idempotente par la migration
-- 20261028000002_reference_data.sql.
--
-- Ce fichier contient exclusivement les jeux d'essai pour le développement local :
-- - Programme prévisionnel d'activités (conférences, ateliers, rallye, gala...)
-- - Invitations de test pour les activités à accès restreint
-- - Foire aux questions (FAQ) de test
-- ==============================================================================

DO $$
DECLARE
    v_edition_id UUID;
    v_gala_id UUID;
    v_ceremony_id UUID;
BEGIN
    SELECT id INTO v_edition_id FROM public.editions WHERE slug = 'sam-2027' LIMIT 1;

    IF v_edition_id IS NULL THEN
        RAISE NOTICE 'Édition sam-2027 introuvable. Assurez-vous que les migrations ont été appliquées.';
        RETURN;
    END IF;

    -- --------------------------------------------------------------------------
    -- 1. Activités prévisionnelles de test
    -- --------------------------------------------------------------------------
    INSERT INTO public.activities (
        edition_id,
        slug,
        title,
        description,
        kind,
        starts_at,
        ends_at,
        location,
        capacity,
        seats_taken,
        price_gnf,
        access,
        requires_approval,
        is_published
    )
    VALUES
        (
            v_edition_id,
            'ceremonie-ouverture-sam-2027',
            'Cérémonie d''Ouverture Officielle',
            'Inauguration solennelle en présence des autorités guinéennes, délégations officielles et commissaires du salon.',
            'ceremony',
            '2027-03-19 10:00:00+00',
            '2027-03-19 13:00:00+00',
            'Palais du Peuple — Grande Salle & Zone VIP',
            200,
            0,
            0,
            'invitation',
            true,
            true
        ),
        (
            v_edition_id,
            'conferences-ateliers-experts',
            'Conférences & Ateliers d''Experts de la Mobilité',
            'Débats sur l''innovation automobile, la transition vers la mobilité durable et les défis logistiques en Guinée.',
            'conference',
            '2027-03-20 09:30:00+00',
            '2027-03-27 18:00:00+00',
            'Espace Conférences & Pavillon Innovation',
            150,
            0,
            0,
            'registration',
            false,
            true
        ),
        (
            v_edition_id,
            'espace-b2b-partenariats',
            'Espace B2B — Rencontres d''Affaires & Signatures de Conventions',
            'Plateforme de mise en relation directe entre investisseurs, concessionnaires, flottes d''entreprises minières et télécoms.',
            'b2b',
            '2027-03-20 09:00:00+00',
            '2027-03-27 19:00:00+00',
            'Salon d''Honneur B2B',
            80,
            0,
            0,
            'registration',
            true,
            true
        ),
        (
            v_edition_id,
            'circuit-rallye-sam-guinee',
            'Circuit Rallye Automobile SAM',
            'Démonstrations de pilotage, baptêmes de piste et épreuves chronométrées sur circuit sécurisé.',
            'rally',
            '2027-03-21 11:00:00+00',
            '2027-03-27 17:30:00+00',
            'Esplanade Stade Général Lansana Conté — Piste Rallye',
            50,
            0,
            0,
            'registration',
            true,
            true
        ),
        (
            v_edition_id,
            'bureau-leasing-credit-auto',
            'Pôle Financement : Bureau Leasing & Vente à Crédit',
            'Permanence quotidienne des banques et organismes de financement pour le montage de dossiers de crédit auto aux salariés et fonctionnaires.',
            'finance_desk',
            '2027-03-19 09:00:00+00',
            '2027-03-28 20:00:00+00',
            'Pavillon Banques & Financement',
            NULL,
            0,
            0,
            'public',
            false,
            true
        ),
        (
            v_edition_id,
            'visites-guidees-delegations',
            'Visites Guidées Personnalisées Grands Comptes',
            'Parcours sur mesure des stands pour les délégations ministérielles, chambres de commerce et dirigeants d''entreprises.',
            'guided_tour',
            '2027-03-22 14:00:00+00',
            '2027-03-26 17:00:00+00',
            'Accueil VIP & Allées d''exposition',
            30,
            0,
            0,
            'vip',
            true,
            true
        ),
        (
            v_edition_id,
            'diner-gala-sponsors-8e-jour',
            'Dîner de Gala Prestige des Sponsors (8e Jour)',
            'Soirée de networking et gala de bienfaisance réunissant les partenaires majeurs, officiels et sponsors.',
            'gala',
            '2027-03-26 20:00:00+00',
            '2027-03-26 23:30:00+00',
            'Espace Réception Gala & Banquets',
            100,
            0,
            0,
            'invitation',
            true,
            true
        ),
        (
            v_edition_id,
            'ceremonie-cloture-cocktail',
            'Cérémonie de Clôture & Cocktail des Partenaires',
            'Remise des trophées du SAM Guinée, bilan de l''édition et cocktail dînatoire de remerciement.',
            'ceremony',
            '2027-03-28 17:00:00+00',
            '2027-03-28 21:00:00+00',
            'Palais du Peuple — Esplanade Centrale',
            150,
            0,
            0,
            'invitation',
            false,
            true
        )
    ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        kind = EXCLUDED.kind,
        starts_at = EXCLUDED.starts_at,
        ends_at = EXCLUDED.ends_at,
        location = EXCLUDED.location,
        capacity = EXCLUDED.capacity,
        price_gnf = EXCLUDED.price_gnf,
        access = EXCLUDED.access,
        requires_approval = EXCLUDED.requires_approval,
        is_published = EXCLUDED.is_published;

    -- --------------------------------------------------------------------------
    -- 2. Invitations de test pour activités sur invitation (gala, VIP)
    -- --------------------------------------------------------------------------
    SELECT id INTO v_gala_id FROM public.activities WHERE slug = 'diner-gala-sponsors-8e-jour';
    SELECT id INTO v_ceremony_id FROM public.activities WHERE slug = 'ceremonie-ouverture-sam-2027';

    IF v_gala_id IS NOT NULL THEN
        INSERT INTO public.activity_invitations (activity_id, email)
        VALUES
            (v_gala_id, 'invite.gala@sam-test.com'),
            (v_gala_id, 'vip.partner@sam-test.com')
        ON CONFLICT (activity_id, email) DO NOTHING;
    END IF;

    IF v_ceremony_id IS NOT NULL THEN
        INSERT INTO public.activity_invitations (activity_id, email)
        VALUES
            (v_ceremony_id, 'officiel@sam-test.com')
        ON CONFLICT (activity_id, email) DO NOTHING;
    END IF;

END $$;

-- --------------------------------------------------------------------------
-- 3. Foire aux questions (FAQ) de test
-- --------------------------------------------------------------------------
INSERT INTO public.faq_items (question, answer, sort_order, is_published)
VALUES
    (
        'Quelles sont les dates et le lieu du SAM Guinée 2027 ?',
        'Le salon se déroulera du 19 au 28 mars 2027 au Palais du Peuple de Conakry et sur l''esplanade du Stade Général Lansana Conté.',
        1,
        true
    ),
    (
        'Comment fonctionne le pôle leasing et achat de véhicule à crédit ?',
        'Le salon met directement en relation les fonctionnaires et salariés du secteur privé en CDI avec nos banques et assureurs partenaires pour étudier et concrétiser leur financement sur place.',
        2,
        true
    ),
    (
        'Quels sont les tarifs d''entrée au salon ?',
        'L''entrée est de 25 000 GNF pour les adultes (18+ ans), 10 000 GNF pour les jeunes de 12 à 17 ans, et gratuite pour les enfants de moins de 12 ans ainsi que les journalistes accrédités.',
        3,
        true
    ),
    (
        'Les mandataires de vente de véhicules peuvent-ils exposer ?',
        'Non. Conformément au règlement officiel du salon (art. 3 & art. 7), les mandataires de vente de véhicules ne sont pas autorisés à exposer. L''exposition est réservée aux constructeurs, concessionnaires officiels et vendeurs directs agréés.',
        4,
        true
    )
ON CONFLICT DO NOTHING;
