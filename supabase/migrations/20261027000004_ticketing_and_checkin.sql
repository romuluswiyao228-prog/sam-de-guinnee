-- ==============================================================================
-- SAM GUINÉE 2027 — MIGRATION 04 : BILLETTERIE D'ENTRÉE ET CHECK-IN SÉCURISÉ
-- ==============================================================================

-- Enums pour la billetterie
DO $$ BEGIN
    CREATE TYPE public.ticket_type_code AS ENUM (
        'adult',
        'teen',
        'child',
        'press',
        'vip'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.ticket_status AS ENUM (
        'pending',
        'paid',
        'used',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 1. Table Types de Billets d'Entrée
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edition_id UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
    code public.ticket_type_code NOT NULL,
    label TEXT NOT NULL,
    price_gnf INT NOT NULL DEFAULT 0,
    min_age INT,
    max_age INT,
    requires_proof BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ticket_types_edition_code UNIQUE (edition_id, code),
    CONSTRAINT chk_ticket_types_price CHECK (price_gnf >= 0)
);

CREATE TRIGGER trg_ticket_types_updated_at
    BEFORE UPDATE ON public.ticket_types
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 2. Table Billets d'Entrée Émis
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entry_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE RESTRICT,
    valid_on DATE NULL, -- NULL = valable n'importe quel jour de l'édition
    holder_name TEXT NOT NULL,
    ticket_code TEXT NOT NULL UNIQUE,
    status public.ticket_status NOT NULL DEFAULT 'pending',
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entry_tickets_user_id ON public.entry_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_entry_tickets_ticket_code ON public.entry_tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_entry_tickets_status ON public.entry_tickets(status);

CREATE TRIGGER trg_entry_tickets_updated_at
    BEFORE UPDATE ON public.entry_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 3. Fonction SECURITY DEFINER check_in (Réservée Staff et Admin)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_in(_ticket_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_operator_id UUID;
    v_clean_code TEXT;
    v_entry_ticket public.entry_tickets%ROWTYPE;
    v_reservation public.reservations%ROWTYPE;
    v_result JSONB;
BEGIN
    v_operator_id := auth.uid();
    IF v_operator_id IS NULL THEN
        RAISE EXCEPTION 'Authentification requise pour effectuer un check-in.'
            USING ERRCODE = 'P0001';
    END IF;

    -- Contrôle strict du rôle : seuls staff et admin sont habilités
    IF NOT public.has_role(v_operator_id, 'staff') AND NOT public.has_role(v_operator_id, 'admin') THEN
        RAISE EXCEPTION 'Opération non autorisée : rôle staff ou admin requis pour le check-in.'
            USING ERRCODE = 'P4003';
    END IF;

    v_clean_code := trim(_ticket_code);

    -- 1. Recherche dans les billets d'entrée
    SELECT * INTO v_entry_ticket
    FROM public.entry_tickets
    WHERE ticket_code = v_clean_code
    FOR UPDATE;

    IF FOUND THEN
        IF v_entry_ticket.status = 'used' THEN
            RAISE EXCEPTION 'Billet d''entrée déjà utilisé (émargé le %)',
                to_char(v_entry_ticket.used_at, 'DD/MM/YYYY HH24:MI')
                USING ERRCODE = 'P1001';
        END IF;

        IF v_entry_ticket.status <> 'paid' THEN
            RAISE EXCEPTION 'Billet d''entrée non valide pour accès (statut actuel : %)', v_entry_ticket.status
                USING ERRCODE = 'P1002';
        END IF;

        -- Valider le billet
        UPDATE public.entry_tickets
        SET status = 'used',
            used_at = now(),
            updated_at = now()
        WHERE id = v_entry_ticket.id;

        -- Construction de la réponse
        v_result := jsonb_build_object(
            'success', true,
            'type', 'entry_ticket',
            'ticket_code', v_entry_ticket.ticket_code,
            'holder_name', v_entry_ticket.holder_name,
            'checked_in_at', now(),
            'operator_id', v_operator_id
        );
        RETURN v_result;
    END IF;

    -- 2. Recherche dans les réservations d'activités
    SELECT * INTO v_reservation
    FROM public.reservations
    WHERE ticket_code = v_clean_code
    FOR UPDATE;

    IF FOUND THEN
        IF v_reservation.status = 'checked_in' THEN
            RAISE EXCEPTION 'Réservation déjà émargée (le %)',
                to_char(v_reservation.checked_in_at, 'DD/MM/YYYY HH24:MI')
                USING ERRCODE = 'P1003';
        END IF;

        IF v_reservation.status <> 'confirmed' THEN
            RAISE EXCEPTION 'Réservation non confirmée pour accès (statut actuel : %)', v_reservation.status
                USING ERRCODE = 'P1004';
        END IF;

        -- Valider la réservation
        UPDATE public.reservations
        SET status = 'checked_in',
            checked_in_at = now(),
            checked_in_by = v_operator_id,
            updated_at = now()
        WHERE id = v_reservation.id;

        v_result := jsonb_build_object(
            'success', true,
            'type', 'activity_reservation',
            'ticket_code', v_reservation.ticket_code,
            'holder_name', v_reservation.attendee_name,
            'seats', v_reservation.seats,
            'checked_in_at', now(),
            'operator_id', v_operator_id
        );
        RETURN v_result;
    END IF;

    -- 3. Si aucun billet ni réservation ne correspond
    RAISE EXCEPTION 'Code de billet ou réservation introuvable : %', v_clean_code
        USING ERRCODE = 'P1005';
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Activation RLS et Politiques
-- ------------------------------------------------------------------------------
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_tickets ENABLE ROW LEVEL SECURITY;

-- Politiques sur ticket_types :
-- Lecture publique pour les types actifs, admin voit tout
CREATE POLICY "ticket_types_select"
    ON public.ticket_types
    FOR SELECT
    TO anon, authenticated
    USING (
        is_active = true
        OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'))
    );

CREATE POLICY "ticket_types_admin_all"
    ON public.ticket_types
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Politiques sur entry_tickets :
-- Lecture : acheteur lui-même, ou staff/admin
CREATE POLICY "entry_tickets_select"
    ON public.entry_tickets
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR public.has_role(auth.uid(), 'staff')
        OR public.has_role(auth.uid(), 'admin')
    );

-- Insertion : utilisateur connecté pour lui-même avec statut 'pending'
CREATE POLICY "entry_tickets_insert"
    ON public.entry_tickets
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND status = 'pending'
    );

-- Mise à jour : admin uniquement (le staff passe exclusivement par check_in)
CREATE POLICY "entry_tickets_admin_update"
    ON public.entry_tickets
    FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
