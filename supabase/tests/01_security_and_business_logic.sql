-- ==============================================================================
-- SAM GUINÉE 2027 — SUITE DE TESTS SQL DE SÉCURITÉ ET LOGIQUE MÉTIER
-- ==============================================================================
-- Exécute et valide les 11 points clés de sécurité et logique métier :
-- 1. anon ne peut lire aucune donnée personnelle
-- 2. cloisonnement strict entre utilisateurs authentifiés
-- 3. interdiction de modifier montants, statuts et seats_taken
-- 4. gestion atomique de la capacité et promotion de la liste d'attente
-- 5. calcul automatique côté serveur du total TTC (stand simple 3 m² -> 16 520 000 GNF)
-- 6. un non-admin ne peut pas s'auto-attribuer un rôle
-- 7. check_in réservé à staff/admin et refus de double utilisation
-- 8. [NOUVEAU] transition exposant rejeté vers soumis refusée (P3004)
-- 9. [NOUVEAU] réservation sur activité sur invitation refusée aux non-invités (P0010)
-- 10. [NOUVEAU] réservation sur activité terminée refusée (P0009)
-- 11. [NOUVEAU] usurpation de user_id sur finance_requests refusée par RLS (42501)
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- FONCTIONS D'ASSERTION STRICTES (ÉCHOUENT VRAIMENT EN CAS D'ANOMALIE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.assert_true(_condition BOOLEAN, _message TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    IF _condition IS NOT TRUE THEN
        RAISE EXCEPTION 'ASSERTION FAILED : %', _message USING ERRCODE = 'P9999';
    END IF;
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.assert_eq_int(_actual BIGINT, _expected BIGINT, _message TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    IF _actual IS DISTINCT FROM _expected THEN
        RAISE EXCEPTION 'ASSERTION FAILED [%] : attendu %, obtenu %', _message, _expected, _actual USING ERRCODE = 'P9999';
    END IF;
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.assert_eq_text(_actual TEXT, _expected TEXT, _message TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    IF _actual IS DISTINCT FROM _expected THEN
        RAISE EXCEPTION 'ASSERTION FAILED [%] : attendu "%", obtenu "%"', _message, _expected, _actual USING ERRCODE = 'P9999';
    END IF;
END; $$;

-- ------------------------------------------------------------------------------
-- BLOC PRINCIPAL D'EXÉCUTION DES TESTS
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    -- Utilisateurs de test fixes
    v_user_a UUID := 'a0000000-0000-0000-0000-000000000001';
    v_user_b UUID := 'a0000000-0000-0000-0000-000000000002';
    v_staff_id UUID := 'a0000000-0000-0000-0000-000000000003';
    v_admin_id UUID := 'a0000000-0000-0000-0000-000000000004';

    -- Identifiants d'entités de test
    v_edition_id UUID;
    v_stand_class_id UUID;
    v_activity_id UUID := 'c0000000-0000-0000-0000-000000000001';
    v_act_invitation_id UUID := 'c0000000-0000-0000-0000-000000000002';
    v_act_expired_id UUID := 'c0000000-0000-0000-0000-000000000003';

    -- Variables de travail
    v_res_1 public.reservations%ROWTYPE;
    v_res_2 public.reservations%ROWTYPE;
    v_app public.exhibitor_applications%ROWTYPE;
    v_ticket_code TEXT;
    v_checkin_res JSONB;
    v_count INT;
    v_rejected BOOLEAN;
    v_errcode TEXT;
    v_errmsg TEXT;
BEGIN
    RAISE NOTICE '======================================================================';
    RAISE NOTICE '>>> DÉBUT DE LA SUITE DE TESTS SAM GUINÉE 2027 <<<';
    RAISE NOTICE '======================================================================';

    -- --------------------------------------------------------------------------
    -- ÉTAPE 0 : PRÉPARATION DES DONNÉES DE TEST SOUS RÔLE PRIVILÉGIÉ
    -- --------------------------------------------------------------------------
    PERFORM set_config('role', 'postgres', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);

    -- 0.1 Comptes auth.users
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES 
        (v_user_a, 'usera@example.com', '{"full_name": "Utilisateur A"}'::jsonb),
        (v_user_b, 'userb@example.com', '{"full_name": "Utilisateur B"}'::jsonb),
        (v_staff_id, 'staff@example.com', '{"full_name": "Agent Staff"}'::jsonb),
        (v_admin_id, 'admin@example.com', '{"full_name": "Administrateur"}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

    -- 0.2 Rôles applicatifs
    INSERT INTO public.user_roles (user_id, role)
    VALUES 
        (v_staff_id, 'staff'::public.app_role),
        (v_admin_id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- 0.3 Édition
    SELECT id INTO v_edition_id FROM public.editions WHERE slug = 'sam-2027';
    IF v_edition_id IS NULL THEN
        INSERT INTO public.editions (slug, name, starts_on, ends_on, venue_name, venue_address, is_current)
        VALUES ('sam-2027', 'SAM Guinée 2027 — 1re édition', '2027-03-19', '2027-03-28',
                'Palais du Peuple de Conakry', 'Esplanade du Stade Général Lansana Conté', true)
        RETURNING id INTO v_edition_id;
    END IF;

    -- 0.4 Classe de stand simple
    SELECT id INTO v_stand_class_id FROM public.stand_classes WHERE code = 'simple';
    PERFORM pg_temp.assert_true(v_stand_class_id IS NOT NULL, 'Classe de stand simple requise');

    -- 0.5 Activités de test
    -- Act 1 : standard, publiée, capacité 5
    INSERT INTO public.activities (
        id, edition_id, slug, title, starts_at, ends_at, capacity, seats_taken, is_published, access, requires_approval
    )
    VALUES (
        v_activity_id, v_edition_id, 'test-atelier-mecanique', 'Atelier Test Mécanique',
        '2027-03-20 10:00:00+00', '2027-03-20 12:00:00+00', 5, 0, true, 'registration', false
    )
    ON CONFLICT (id) DO UPDATE SET capacity = 5, seats_taken = 0, is_published = true, access = 'registration';

    -- Act 2 : sur invitation, publiée
    INSERT INTO public.activities (
        id, edition_id, slug, title, starts_at, ends_at, capacity, seats_taken, is_published, access, requires_approval
    )
    VALUES (
        v_act_invitation_id, v_edition_id, 'test-soiree-privee', 'Soirée Privée Test',
        '2027-03-26 20:00:00+00', '2027-03-26 23:00:00+00', 50, 0, true, 'invitation', false
    )
    ON CONFLICT (id) DO UPDATE SET capacity = 50, seats_taken = 0, is_published = true, access = 'invitation';

    -- Act 3 : terminée (ends_at dans le passé)
    INSERT INTO public.activities (
        id, edition_id, slug, title, starts_at, ends_at, capacity, seats_taken, is_published, access, requires_approval
    )
    VALUES (
        v_act_expired_id, v_edition_id, 'test-activite-expiree', 'Activité Expirée Test',
        '2020-03-20 10:00:00+00', '2020-03-20 12:00:00+00', 50, 0, true, 'registration', false
    )
    ON CONFLICT (id) DO UPDATE SET capacity = 50, seats_taken = 0, is_published = true;

    -- Nettoyage pré-test des invitations sur Act 2
    DELETE FROM public.activity_invitations WHERE activity_id = v_act_invitation_id;

    -- Données personnelles témoins
    INSERT INTO public.contact_messages (name, email, subject, message)
    VALUES ('Visiteur Anon', 'anon@test.com', 'Question', 'Message de test de contact valide');

    INSERT INTO public.finance_requests (full_name, phone, email, applicant_type, vehicle_interest, consent_contact)
    VALUES ('Demandeur Crédit', '+224610000000', 'credit-temoin@test.com', 'civil_servant', 'SUV Toyota', true);

    -- --------------------------------------------------------------------------
    -- TEST 1 : ANON NE PEUT LIRE AUCUNE DONNÉE PERSONNELLE
    -- --------------------------------------------------------------------------
    RAISE NOTICE '--- Test 1 : Confidentialité publique (rôle anon) ---';
    PERFORM set_config('role', 'anon', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);

    SELECT count(*) INTO v_count FROM public.reservations;
    PERFORM pg_temp.assert_eq_int(v_count, 0, 'anon ne doit pas voir les réservations');

    SELECT count(*) INTO v_count FROM public.exhibitor_applications;
    PERFORM pg_temp.assert_eq_int(v_count, 0, 'anon ne doit pas voir les candidatures exposants');

    SELECT count(*) INTO v_count FROM public.sponsor_applications;
    PERFORM pg_temp.assert_eq_int(v_count, 0, 'anon ne doit pas voir les candidatures sponsors');

    SELECT count(*) INTO v_count FROM public.finance_requests;
    PERFORM pg_temp.assert_eq_int(v_count, 0, 'anon ne doit pas voir les demandes de crédit');

    SELECT count(*) INTO v_count FROM public.contact_messages;
    PERFORM pg_temp.assert_eq_int(v_count, 0, 'anon ne doit pas voir les messages de contact');

    SELECT count(*) INTO v_count FROM public.application_notes;
    PERFORM pg_temp.assert_eq_int(v_count, 0, 'anon ne doit pas voir les notes internes');

    SELECT count(*) INTO v_count FROM public.activity_invitations;
    PERFORM pg_temp.assert_eq_int(v_count, 0, 'anon ne doit pas voir les invitations');

    RAISE NOTICE '[OK] Test 1 validé : Zéro fuite de données personnelles vers le rôle anon.';

    -- --------------------------------------------------------------------------
    -- TEST 2 : CLOISONNEMENT STRICT ENTRE UTILISATEURS AUTHENTIFIÉS
    -- --------------------------------------------------------------------------
    RAISE NOTICE '--- Test 2 : Cloisonnement strict entre utilisateurs authentifiés ---';
    -- Création d'une candidature par User A
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

    INSERT INTO public.exhibitor_applications (
        id, user_id, company_name, sector, address, country, contact_name, contact_email,
        contact_phone, stand_class_id, surface_m2, activity_declaration, status
    )
    VALUES (
        'e0000000-0000-0000-0000-000000000001',
        v_user_a,
        'Entreprise A',
        'Accessoires',
        'Conakry',
        'Guinée',
        'Contact A',
        'a@entreprise.com',
        '+224611111111',
        v_stand_class_id,
        3.00,
        'Vente pièces détachées',
        'draft'
    );

    -- Bascule vers User B : ne doit pas pouvoir lire la ligne de User A
    PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);

    SELECT count(*) INTO v_count 
    FROM public.exhibitor_applications
    WHERE id = 'e0000000-0000-0000-0000-000000000001';

    PERFORM pg_temp.assert_eq_int(v_count, 0, 'User B ne doit pas voir la candidature de User A');
    RAISE NOTICE '[OK] Test 2 validé : Isolation stricte des données entre utilisateurs authentifiés.';

    -- --------------------------------------------------------------------------
    -- TEST 3 : IMPOSSIBILITÉ DE FRAUDER LES MONTANTS, LE STATUT OU SEATS_TAKEN
    -- --------------------------------------------------------------------------
    RAISE NOTICE '--- Test 3 : Interdiction de modifier montants, statuts et seats_taken ---';
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

    -- 3.1 : Tentative de modification de statut en 'paid' par l'utilisateur
    v_rejected := false;
    BEGIN
        UPDATE public.exhibitor_applications
           SET status = 'paid', total_ttc_gnf = 1000
         WHERE id = 'e0000000-0000-0000-0000-000000000001';
    EXCEPTION WHEN OTHERS THEN
        v_rejected := true;
        v_errcode := SQLSTATE;
    END;
    PERFORM pg_temp.assert_true(v_rejected, 'User A ne doit pas pouvoir s''attribuer le statut paid');
    RAISE NOTICE '[OK] Test 3.1 validé : Rejet confirmé de la fraude au statut (% / P3004 attendu)', v_errcode;

    -- 3.2 : Tentative de modification directe de seats_taken
    v_rejected := false;
    BEGIN
        UPDATE public.activities SET seats_taken = 999 WHERE id = v_activity_id;
    EXCEPTION WHEN OTHERS THEN
        v_rejected := true;
        v_errcode := SQLSTATE;
    END;
    PERFORM pg_temp.assert_true(v_rejected, 'User A ne doit pas pouvoir modifier seats_taken directement');
    RAISE NOTICE '[OK] Test 3.2 validé : Rejet confirmé de la modification directe de seats_taken (%)', v_errcode;

    -- --------------------------------------------------------------------------
    -- TEST 4 : ATOMICITÉ DE RESERVE_SEATS ET GESTION LISTE D'ATTENTE
    -- --------------------------------------------------------------------------
    RAISE NOTICE '--- Test 4 : Capacité atomique et promotion automatique de la waitlist ---';
    -- 4.1 : User A réserve 3 places (capacité = 5) -> statut 'confirmed'
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

    v_res_1 := public.reserve_seats(
        v_activity_id, 3, 'Utilisateur A', 'usera@example.com', '+224611111111'
    );
    PERFORM pg_temp.assert_eq_text(v_res_1.status::text, 'confirmed', 'Réservation A doit être confirmée');
    PERFORM pg_temp.assert_eq_int(v_res_1.seats, 3, 'Réservation A doit comporter 3 places');

    SELECT seats_taken INTO v_count FROM public.activities WHERE id = v_activity_id;
    PERFORM pg_temp.assert_eq_int(v_count, 3, 'seats_taken doit valoir 3 après la réservation A');

    -- 4.2 : User B réserve 3 places (3 + 3 = 6 > 5) -> bascule en 'waitlist'
    PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
    v_res_2 := public.reserve_seats(
        v_activity_id, 3, 'Utilisateur B', 'userb@example.com', '+224622222222'
    );
    PERFORM pg_temp.assert_eq_text(v_res_2.status::text, 'waitlist', 'Réservation B doit être mise en liste d''attente');

    -- seats_taken reste à 3 (la waitlist ne bloque pas les places)
    SELECT seats_taken INTO v_count FROM public.activities WHERE id = v_activity_id;
    PERFORM pg_temp.assert_eq_int(v_count, 3, 'seats_taken ne doit pas inclure la waitlist (doit rester 3)');

    -- 4.3 : User A annule -> User B doit être automatiquement promu en 'confirmed'
    PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
    PERFORM public.cancel_reservation(v_res_1.id);

    SELECT status INTO v_res_2.status FROM public.reservations WHERE id = v_res_2.id;
    PERFORM pg_temp.assert_eq_text(v_res_2.status::text, 'confirmed', 'Réservation B doit être promue en confirmed');

    SELECT seats_taken INTO v_count FROM public.activities WHERE id = v_activity_id;
    PERFORM pg_temp.assert_eq_int(v_count, 3, 'seats_taken doit valoir 3 après promotion de User B');
    RAISE NOTICE '[OK] Test 4 validé : Capacité respectée, waitlist gérée et promotion automatique.';

    -- --------------------------------------------------------------------------
    -- TEST 5 : CALCUL CÔTÉ SERVEUR DU TOTAL TTC (STAND SIMPLE 3 m² = 16 520 000 GNF)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '--- Test 5 : Calcul serveur exact du devis TTC ---';
    SELECT * INTO v_app FROM public.exhibitor_applications WHERE id = 'e0000000-0000-0000-0000-000000000001';

    -- Prix unitaire = 4 000 000 GNF/m² * 3 m² = 12 000 000 GNF HT
    PERFORM pg_temp.assert_eq_int(v_app.stand_total_ht_gnf, 12000000, 'stand_total_ht_gnf attendu 12 000 000');
    -- Frais d'inscription obligatoires = 2 000 000 GNF
    PERFORM pg_temp.assert_eq_int(v_app.registration_fee_gnf, 2000000, 'registration_fee_gnf attendu 2 000 000');
    -- Total TTC = (12 000 000 + 2 000 000) * 1.18 = 16 520 000 GNF
    PERFORM pg_temp.assert_eq_int(v_app.total_ttc_gnf, 16520000, 'total_ttc_gnf attendu 16 520 000');
    RAISE NOTICE '[OK] Test 5 validé : Stand simple 3 m² = 16 520 000 GNF TTC calculé au centime près.';

    -- --------------------------------------------------------------------------
    -- TEST 6 : UN NON-ADMIN NE PEUT PAS S'ATTRIBUER DE RÔLE
    -- --------------------------------------------------------------------------
    RAISE NOTICE '--- Test 6 : Sécurité contre l''auto-attribution de rôle ---';
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

    v_rejected := false;
    BEGIN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_a, 'admin'::public.app_role);
    EXCEPTION WHEN OTHERS THEN
        v_rejected := true;
        v_errcode := SQLSTATE;
    END;
    PERFORM pg_temp.assert_true(v_rejected, 'Un utilisateur ordinaire ne doit pas pouvoir s''octroyer le rôle admin');
    RAISE NOTICE '[OK] Test 6 validé : Auto-promotion de rôle bloquée (% / violation RLS).', v_errcode;

    -- --------------------------------------------------------------------------
    -- TEST 7 : CHECK-IN RÉSERVÉ À STAFF/ADMIN ET REFUS DE DOUBLE UTILISATION
    -- --------------------------------------------------------------------------
    RAISE NOTICE '--- Test 7 : Contrôle du check_in et protection anti-réutilisation ---';
    -- Insertion préalable du billet payé sous rôle postgres (système)
    PERFORM set_config('role', 'postgres', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);

    INSERT INTO public.entry_tickets (
        id, user_id, ticket_type_id, holder_name, status
    )
    SELECT
        'b0000000-0000-0000-0000-000000000099',
        v_user_a,
        id,
        'Utilisateur A',
        'paid'
    FROM public.ticket_types
    WHERE code = 'adult'
    LIMIT 1;

    -- Récupération du code généré par le trigger serveur prepare_entry_ticket()
    SELECT ticket_code INTO v_ticket_code
    FROM public.entry_tickets
    WHERE id = 'b0000000-0000-0000-0000-000000000099';
    PERFORM pg_temp.assert_true(v_ticket_code IS NOT NULL, 'Le ticket_code doit avoir été généré');

    -- 7.1 : Tentative d'émargement par un simple utilisateur (doit être refusée)
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

    v_rejected := false;
    BEGIN
        PERFORM public.check_in(v_ticket_code);
    EXCEPTION WHEN OTHERS THEN
        v_rejected := true;
        v_errcode := SQLSTATE;
    END;
    PERFORM pg_temp.assert_true(v_rejected, 'Un simple utilisateur ne doit pas pouvoir exécuter de check-in');
    PERFORM pg_temp.assert_eq_text(v_errcode, 'P4003', 'Code P4003 attendu pour check-in sans rôle staff/admin');
    RAISE NOTICE '[OK] Test 7.1 validé : Check-in refusé à un utilisateur ordinaire (P4003).';

    -- 7.2 : Émargement légitime par un membre du Staff (doit réussir)
    PERFORM set_config('request.jwt.claim.sub', v_staff_id::text, true);
    v_checkin_res := public.check_in(v_ticket_code);
    PERFORM pg_temp.assert_true((v_checkin_res->>'success')::boolean, 'Le check-in par le staff doit réussir');
    RAISE NOTICE '[OK] Test 7.2 validé : Check-in exécuté avec succès par le Staff.';

    -- 7.3 : Seconde tentative d'émargement sur le même code (doit être refusée)
    v_rejected := false;
    BEGIN
        PERFORM public.check_in(v_ticket_code);
    EXCEPTION WHEN OTHERS THEN
        v_rejected := true;
        v_errcode := SQLSTATE;
    END;
    PERFORM pg_temp.assert_true(v_rejected, 'Un billet déjà utilisé ne peut pas être émargé une seconde fois');
    PERFORM pg_temp.assert_eq_text(v_errcode, 'P1001', 'Code P1001 attendu pour billet déjà utilisé');
    RAISE NOTICE '[OK] Test 7.3 validé : Réutilisation du billet immédiatement refusée (P1001).';

    -- --------------------------------------------------------------------------
    -- TEST 8 : [NOUVEAU] REJETÉ VERS SOUMIS STRICTEMENT REFUSÉ (P3004)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '--- Test 8 : Rejeté vers soumis refusé (exposants) ---';
    -- L'admin passe la candidature au statut 'rejected'
    PERFORM set_config('role', 'postgres', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);

    UPDATE public.exhibitor_applications
       SET status = 'rejected'
     WHERE id = 'e0000000-0000-0000-0000-000000000001';

    -- User A tente de repasser sa candidature à 'submitted'
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

    v_rejected := false;
    BEGIN
        UPDATE public.exhibitor_applications
           SET status = 'submitted'
         WHERE id = 'e0000000-0000-0000-0000-000000000001';
    EXCEPTION WHEN OTHERS THEN
        v_rejected := true;
        v_errcode := SQLSTATE;
    END;
    PERFORM pg_temp.assert_true(v_rejected, 'Un candidat ne peut pas réactiver une candidature rejetée');
    PERFORM pg_temp.assert_eq_text(v_errcode, 'P3004', 'Code P3004 attendu pour transition rejetée vers soumis');
    RAISE NOTICE '[OK] Test 8 validé : Transition de rejeté vers soumis strictement refusée (P3004).';

    -- --------------------------------------------------------------------------
    -- TEST 9 : [NOUVEAU] RÉSERVATION SUR ACTIVITÉ SUR INVITATION REFUSÉE (P0010)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '--- Test 9 : Réservation sur activité sur invitation refusée ---';
    -- User A (non invité) tente de réserver sur une activité access = 'invitation'
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

    v_rejected := false;
    BEGIN
        PERFORM public.reserve_seats(
            v_act_invitation_id, 1, 'Utilisateur A', 'usera@example.com', '+224611111111'
        );
    EXCEPTION WHEN OTHERS THEN
        v_rejected := true;
        v_errcode := SQLSTATE;
    END;
    PERFORM pg_temp.assert_true(v_rejected, 'Une réservation sur activité privée doit être refusée sans invitation');
    PERFORM pg_temp.assert_eq_text(v_errcode, 'P0010', 'Code P0010 attendu pour accès non invité');
    RAISE NOTICE '[OK] Test 9.1 validé : Réservation refusée sans invitation (P0010).';

    -- Inviter explicitement User A via activity_invitations (sous rôle admin/système)
    PERFORM set_config('role', 'postgres', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);
    INSERT INTO public.activity_invitations (activity_id, email)
    VALUES (v_act_invitation_id, 'usera@example.com');

    -- Nouvelle tentative sous User A : la réservation doit désormais réussir
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

    v_res_1 := public.reserve_seats(
        v_act_invitation_id, 1, 'Utilisateur A', 'usera@example.com', '+224611111111'
    );
    PERFORM pg_temp.assert_true(v_res_1.id IS NOT NULL, 'La réservation doit réussir une fois l''utilisateur invité');
    RAISE NOTICE '[OK] Test 9.2 validé : Réservation confirmée avec succès après émission de l''invitation.';

    -- --------------------------------------------------------------------------
    -- TEST 10 : [NOUVEAU] RÉSERVATION SUR ACTIVITÉ TERMINÉE REFUSÉE (P0009)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '--- Test 10 : Réservation sur activité terminée refusée ---';
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

    v_rejected := false;
    BEGIN
        PERFORM public.reserve_seats(
            v_act_expired_id, 1, 'Utilisateur A', 'usera@example.com', '+224611111111'
        );
    EXCEPTION WHEN OTHERS THEN
        v_rejected := true;
        v_errcode := SQLSTATE;
    END;
    PERFORM pg_temp.assert_true(v_rejected, 'Une réservation sur activité terminée doit être rejetée');
    PERFORM pg_temp.assert_eq_text(v_errcode, 'P0009', 'Code P0009 attendu pour activité terminée');
    RAISE NOTICE '[OK] Test 10 validé : Réservation sur activité terminée refusée (P0009).';

    -- --------------------------------------------------------------------------
    -- TEST 11 : [NOUVEAU] USURPATION DE USER_ID SUR FINANCE_REQUESTS REFUSÉE (42501)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '--- Test 11 : Usurpation de user_id sur finance_requests refusée par RLS ---';
    -- 11.1 : User A authentifié tente d'insérer avec user_id = User B
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

    v_rejected := false;
    BEGIN
        INSERT INTO public.finance_requests (
            user_id, full_name, phone, email, applicant_type, vehicle_interest, consent_contact
        )
        VALUES (
            v_user_b,
            'Victime B Usurpée',
            '+224622222222',
            'usurpation-auth@test.com',
            'civil_servant',
            'SUV Toyota Land Cruiser',
            true
        );
    EXCEPTION WHEN OTHERS THEN
        v_rejected := true;
        v_errcode := SQLSTATE;
    END;
    PERFORM pg_temp.assert_true(v_rejected, 'L''usurpation de user_id par un utilisateur connecté doit être bloquée par RLS');
    PERFORM pg_temp.assert_eq_text(v_errcode, '42501', 'Code 42501 attendu (violation RLS INSERT)');
    RAISE NOTICE '[OK] Test 11.1 validé : Usurpation de user_id entre connectés bloquée par RLS (42501).';

    -- 11.2 : Utilisateur anonyme tente d'insérer avec user_id = User A (non nul)
    PERFORM set_config('role', 'anon', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);

    v_rejected := false;
    BEGIN
        INSERT INTO public.finance_requests (
            user_id, full_name, phone, email, applicant_type, vehicle_interest, consent_contact
        )
        VALUES (
            v_user_a,
            'Visiteur Anonyme Usurpateur',
            '+224633333333',
            'usurpation-anon@test.com',
            'civil_servant',
            'Véhicule Électrique',
            true
        );
    EXCEPTION WHEN OTHERS THEN
        v_rejected := true;
        v_errcode := SQLSTATE;
    END;
    PERFORM pg_temp.assert_true(v_rejected, 'L''insertion anonyme avec user_id arbitraire doit être bloquée par RLS');
    PERFORM pg_temp.assert_eq_text(v_errcode, '42501', 'Code 42501 attendu (violation RLS INSERT)');
    RAISE NOTICE '[OK] Test 11.2 validé : Usurpation de user_id par un anonyme bloquée par RLS (42501).';

    RAISE NOTICE '======================================================================';
    RAISE NOTICE '>>> TOUS LES 11 TESTS DE SÉCURITÉ ET LOGIQUE MÉTIER ONT RÉUSSI ! <<<';
    RAISE NOTICE '======================================================================';
END $$;

ROLLBACK; -- Transaction de test : annulation complète pour laisser la base vierge
