-- ==============================================================================
-- SAM GUINÉE 2027 — MIGRATION 03 : ACTIVITÉS ET RÉSERVATIONS ATOMIQUES
-- ==============================================================================

-- Enums pour les activités et réservations
DO $$ BEGIN
    CREATE TYPE public.activity_kind AS ENUM (
        'ceremony',
        'conference',
        'workshop',
        'b2b',
        'rally',
        'gala',
        'guided_tour',
        'finance_desk',
        'vip',
        'exhibition',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.access_type AS ENUM (
        'public',
        'registration',
        'invitation',
        'vip'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.reservation_status AS ENUM (
        'pending',
        'confirmed',
        'waitlist',
        'cancelled',
        'checked_in'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 1. Table Activités
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edition_id UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    kind public.activity_kind NOT NULL DEFAULT 'other',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    location TEXT,
    capacity INT NULL, -- NULL = capacité illimitée
    seats_taken INT NOT NULL DEFAULT 0,
    price_gnf INT NOT NULL DEFAULT 0,
    access public.access_type NOT NULL DEFAULT 'public',
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_activity_dates CHECK (ends_at >= starts_at),
    CONSTRAINT chk_activity_capacity CHECK (capacity IS NULL OR capacity >= 0),
    CONSTRAINT chk_activity_seats_taken CHECK (seats_taken >= 0),
    CONSTRAINT chk_activity_price CHECK (price_gnf >= 0)
);

CREATE INDEX IF NOT EXISTS idx_activities_edition ON public.activities(edition_id);
CREATE INDEX IF NOT EXISTS idx_activities_published ON public.activities(is_published);
CREATE INDEX IF NOT EXISTS idx_activities_kind ON public.activities(kind);

CREATE TRIGGER trg_activities_updated_at
    BEFORE UPDATE ON public.activities
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 2. Table Réservations
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    attendee_name TEXT NOT NULL,
    attendee_email TEXT NOT NULL,
    attendee_phone TEXT NOT NULL,
    seats INT NOT NULL,
    status public.reservation_status NOT NULL DEFAULT 'pending',
    ticket_code TEXT NOT NULL UNIQUE,
    checked_in_at TIMESTAMPTZ,
    checked_in_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_reservations_seats CHECK (seats >= 1 AND seats <= 10)
);

CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_activity_id ON public.reservations(activity_id);
CREATE INDEX IF NOT EXISTS idx_reservations_ticket_code ON public.reservations(ticket_code);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);

-- Règle stricte : Un utilisateur ne peut pas avoir deux réservations actives pour la même activité
CREATE UNIQUE INDEX IF NOT EXISTS uq_reservations_user_activity_active
    ON public.reservations (user_id, activity_id)
    WHERE status IN ('pending', 'confirmed', 'waitlist', 'checked_in');

CREATE TRIGGER trg_reservations_updated_at
    BEFORE UPDATE ON public.reservations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 3. Fonctions SECURITY DEFINER Atomiques pour les réservations
-- ------------------------------------------------------------------------------

-- Fonction utilitaire de génération de ticket_code court et non devinable
CREATE OR REPLACE FUNCTION public.generate_ticket_code(prefix TEXT)
RETURNS TEXT
LANGUAGE sql
AS $$
    SELECT prefix || '-' || upper(encode(extensions.gen_random_bytes(4), 'hex'));
$$;

-- Fonction 1 : reserve_seats (Atomique, avec verrou de ligne FOR UPDATE)
CREATE OR REPLACE FUNCTION public.reserve_seats(
    _activity_id UUID,
    _seats INT,
    _attendee_name TEXT,
    _attendee_email TEXT,
    _attendee_phone TEXT
)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_activity public.activities%ROWTYPE;
    v_target_status public.reservation_status;
    v_ticket_code TEXT;
    v_reservation public.reservations%ROWTYPE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentification requise pour réserver une activité.'
            USING ERRCODE = 'P0001';
    END IF;

    IF _seats < 1 OR _seats > 10 THEN
        RAISE EXCEPTION 'Le nombre de places doit être compris entre 1 et 10.'
            USING ERRCODE = 'P0002';
    END IF;

    IF trim(COALESCE(_attendee_name, '')) = '' OR trim(COALESCE(_attendee_email, '')) = '' THEN
        RAISE EXCEPTION 'Le nom et l''email du participant sont obligatoires.'
            USING ERRCODE = 'P0003';
    END IF;

    -- Verrouiller la ligne de l'activité pour garantir l'atomicité sans concurrence critique
    SELECT * INTO v_activity
    FROM public.activities
    WHERE id = _activity_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Activité introuvable.' USING ERRCODE = 'P0004';
    END IF;

    IF NOT v_activity.is_published THEN
        RAISE EXCEPTION 'Cette activité n''est pas ouverte à la réservation.' USING ERRCODE = 'P0005';
    END IF;

    -- Vérifier si l'utilisateur possède déjà une réservation active
    IF EXISTS (
        SELECT 1
        FROM public.reservations
        WHERE user_id = v_user_id
          AND activity_id = _activity_id
          AND status IN ('pending', 'confirmed', 'waitlist', 'checked_in')
    ) THEN
        RAISE EXCEPTION 'Vous avez déjà une réservation active pour cette activité.'
            USING ERRCODE = 'P0006';
    END IF;

    -- Génération d'un code de billet unique
    LOOP
        v_ticket_code := public.generate_ticket_code('SAM-ACT');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.reservations WHERE ticket_code = v_ticket_code);
    END LOOP;

    -- Détermination du statut selon approbation et capacité
    IF v_activity.requires_approval THEN
        v_target_status := 'pending';
    ELSIF v_activity.capacity IS NOT NULL AND (v_activity.seats_taken + _seats) > v_activity.capacity THEN
        -- Capacité atteinte -> Placement en liste d'attente
        v_target_status := 'waitlist';
    ELSE
        -- Places disponibles -> Réservation confirmée
        v_target_status := 'confirmed';
        UPDATE public.activities
        SET seats_taken = seats_taken + _seats
        WHERE id = _activity_id;
    END IF;

    -- Insertion de la réservation
    INSERT INTO public.reservations (
        activity_id,
        user_id,
        attendee_name,
        attendee_email,
        attendee_phone,
        seats,
        status,
        ticket_code
    )
    VALUES (
        _activity_id,
        v_user_id,
        trim(_attendee_name),
        lower(trim(_attendee_email)),
        trim(_attendee_phone),
        _seats,
        v_target_status,
        v_ticket_code
    )
    RETURNING * INTO v_reservation;

    RETURN v_reservation;
END;
$$;

-- Fonction 2 : cancel_reservation (Atomique avec promotion éventuelle de la liste d'attente)
CREATE OR REPLACE FUNCTION public.cancel_reservation(_reservation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_res public.reservations%ROWTYPE;
    v_act public.activities%ROWTYPE;
    v_waitlist_res public.reservations%ROWTYPE;
    v_available_seats INT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentification requise.' USING ERRCODE = 'P0001';
    END IF;

    -- Verrouiller la réservation
    SELECT * INTO v_res
    FROM public.reservations
    WHERE id = _reservation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Réservation introuvable.' USING ERRCODE = 'P0007';
    END IF;

    -- Vérification des droits : propriétaire ou admin ou staff
    IF v_res.user_id <> v_user_id
       AND NOT public.has_role(v_user_id, 'admin')
       AND NOT public.has_role(v_user_id, 'staff') THEN
        RAISE EXCEPTION 'Action non autorisée sur cette réservation.' USING ERRCODE = 'P0008';
    END IF;

    IF v_res.status = 'cancelled' THEN
        RETURN FALSE; -- Déjà annulée
    END IF;

    -- Verrouiller l'activité associée
    SELECT * INTO v_act
    FROM public.activities
    WHERE id = v_res.activity_id
    FOR UPDATE;

    -- Si la réservation occupait des places confirmées, libérer seats_taken
    IF v_res.status IN ('confirmed', 'checked_in') THEN
        UPDATE public.activities
        SET seats_taken = GREATEST(0, seats_taken - v_res.seats)
        WHERE id = v_res.activity_id;

        -- Recalculer les places disponibles
        v_act.seats_taken := GREATEST(0, v_act.seats_taken - v_res.seats);

        -- Tentative de promotion du premier de la liste d'attente éligible
        IF v_act.capacity IS NOT NULL THEN
            v_available_seats := v_act.capacity - v_act.seats_taken;

            FOR v_waitlist_res IN
                SELECT *
                FROM public.reservations
                WHERE activity_id = v_res.activity_id
                  AND status = 'waitlist'
                ORDER BY created_at ASC
                FOR UPDATE
            LOOP
                IF v_waitlist_res.seats <= v_available_seats THEN
                    -- Promouvoir cette réservation
                    UPDATE public.reservations
                    SET status = 'confirmed',
                        updated_at = now()
                    WHERE id = v_waitlist_res.id;

                    -- Réserver les places
                    UPDATE public.activities
                    SET seats_taken = seats_taken + v_waitlist_res.seats
                    WHERE id = v_res.activity_id;

                    v_available_seats := v_available_seats - v_waitlist_res.seats;
                END IF;
                EXIT WHEN v_available_seats <= 0;
            END LOOP;
        END IF;
    END IF;

    -- Marquer la réservation comme annulée
    UPDATE public.reservations
    SET status = 'cancelled',
        updated_at = now()
    WHERE id = _reservation_id;

    RETURN TRUE;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Activation RLS et Politiques
-- ------------------------------------------------------------------------------
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Politiques sur activities :
-- Lecture publique des activités publiées ; admin/staff voient tout
CREATE POLICY "activities_select"
    ON public.activities
    FOR SELECT
    TO anon, authenticated
    USING (
        is_published = true
        OR (auth.uid() IS NOT NULL AND (
            public.has_role(auth.uid(), 'admin')
            OR public.has_role(auth.uid(), 'staff')
        ))
    );

-- Écriture directe sur activities réservée exclusivement aux administrateurs
-- Les utilisateurs modifient seats_taken UNIQUEMENT via les fonctions SECURITY DEFINER
CREATE POLICY "activities_admin_all"
    ON public.activities
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Politiques sur reservations :
-- Lecture : l'utilisateur propriétaire, ou le staff/admin
CREATE POLICY "reservations_select"
    ON public.reservations
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'staff')
    );

-- Empêcher toute insertion directe depuis le client : passer impérativement par reserve_seats()
-- L'admin reste autorisé pour la gestion technique directe
CREATE POLICY "reservations_admin_insert"
    ON public.reservations
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Empêcher toute mise à jour directe client : passer par cancel_reservation() et check_in()
-- L'admin reste autorisé
CREATE POLICY "reservations_admin_update"
    ON public.reservations
    FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));