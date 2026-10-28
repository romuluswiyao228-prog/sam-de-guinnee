-- ==============================================================================
-- SAM GUINÉE 2027 — MIGRATION 09 : DURCISSEMENT SÉCURITÉ ET LOGIQUE MÉTIER
-- Corrige les failles et bugs relevés à la relecture des migrations 01 à 08.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Utilitaires
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- has_role ne répond plus que pour l'utilisateur appelant (empêche de sonder qui est admin)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public, auth, pg_temp STABLE AS $$
    SELECT _user_id IS NOT NULL
       AND _user_id = auth.uid()
       AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- BUG CORRIGÉ : pgcrypto vit dans le schéma "extensions" sur Supabase ; l'ancienne version
-- faisait échouer reserve_seats() ("function gen_random_bytes does not exist").
CREATE OR REPLACE FUNCTION public.generate_ticket_code(prefix TEXT)
RETURNS TEXT LANGUAGE sql VOLATILE SET search_path = extensions, public, pg_temp AS $$
    SELECT prefix || '-' || upper(encode(extensions.gen_random_bytes(6), 'hex'));
$$;
REVOKE ALL ON FUNCTION public.generate_ticket_code(TEXT) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 1. Montants en BIGINT (un stand double de 270 m² dépassait déjà la limite d'un INT)
-- ------------------------------------------------------------------------------
ALTER TABLE public.stand_classes ALTER COLUMN price_per_m2_gnf TYPE BIGINT;
ALTER TABLE public.activities ALTER COLUMN price_gnf TYPE BIGINT;
ALTER TABLE public.ticket_types ALTER COLUMN price_gnf TYPE BIGINT;
ALTER TABLE public.exhibitor_applications
    ALTER COLUMN registration_fee_gnf TYPE BIGINT,
    ALTER COLUMN stand_total_ht_gnf TYPE BIGINT,
    ALTER COLUMN total_ttc_gnf TYPE BIGINT;
ALTER TABLE public.exhibitor_applications
    ADD CONSTRAINT chk_exhibitor_surface CHECK (surface_m2 > 0 AND surface_m2 <= 1000);

-- ------------------------------------------------------------------------------
-- 2. Notes internes : table réservée aux admins (les colonnes admin_notes / notes
--    étaient lisibles par le candidat lui-même)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.application_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL CHECK (target_type IN ('exhibitor','sponsor','reservation','finance')),
    target_id UUID NOT NULL,
    note TEXT NOT NULL CHECK (length(note) BETWEEN 1 AND 4000),
    author_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_application_notes_target ON public.application_notes(target_type, target_id);
ALTER TABLE public.application_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "application_notes_admin_all" ON public.application_notes FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Les triggers qui référencent admin_notes sont remplacés plus bas ; on retire les colonnes ensuite.

-- ------------------------------------------------------------------------------
-- 3. Invitations pour les activités à accès restreint (gala, VIP, cérémonies)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    email TEXT NOT NULL CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_activity_invitation UNIQUE (activity_id, email)
);
ALTER TABLE public.activity_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_invitations_admin_all" ON public.activity_invitations FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------------------------
-- 4. RÉSERVATIONS : seats_taken dérivé automatiquement + contrôles complets
-- ------------------------------------------------------------------------------
ALTER TABLE public.reservations DROP COLUMN IF EXISTS notes;

CREATE OR REPLACE FUNCTION public.sync_activity_seats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_act UUID;
BEGIN
    FOR v_act IN
        SELECT DISTINCT x FROM unnest(ARRAY[
            CASE WHEN TG_OP <> 'INSERT' THEN OLD.activity_id END,
            CASE WHEN TG_OP <> 'DELETE' THEN NEW.activity_id END]) AS x
        WHERE x IS NOT NULL
    LOOP
        UPDATE public.activities
           SET seats_taken = COALESCE((SELECT SUM(seats) FROM public.reservations
                                       WHERE activity_id = v_act AND status IN ('confirmed','checked_in')), 0)
         WHERE id = v_act;
    END LOOP;
    RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_reservations_sync_seats ON public.reservations;
CREATE TRIGGER trg_reservations_sync_seats
    AFTER INSERT OR UPDATE OF status, seats, activity_id OR DELETE ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.sync_activity_seats();

-- Garde-fou : aucun chemin (y compris un admin) ne peut dépasser la capacité
CREATE OR REPLACE FUNCTION public.guard_reservation_capacity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_act public.activities%ROWTYPE; v_taken BIGINT;
BEGIN
    IF NEW.status IN ('confirmed','checked_in')
       AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('confirmed','checked_in') OR OLD.seats <> NEW.seats) THEN
        SELECT * INTO v_act FROM public.activities WHERE id = NEW.activity_id FOR UPDATE;
        IF v_act.capacity IS NOT NULL THEN
            SELECT COALESCE(SUM(seats),0) INTO v_taken FROM public.reservations
             WHERE activity_id = NEW.activity_id AND status IN ('confirmed','checked_in')
               AND id <> NEW.id;
            IF v_taken + NEW.seats > v_act.capacity THEN
                RAISE EXCEPTION 'Capacité de l''activité dépassée.' USING ERRCODE = 'P0011';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_reservations_guard_capacity ON public.reservations;
CREATE TRIGGER trg_reservations_guard_capacity
    BEFORE INSERT OR UPDATE OF status, seats ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.guard_reservation_capacity();

CREATE OR REPLACE FUNCTION public.reserve_seats(
    _activity_id UUID, _seats INT, _attendee_name TEXT, _attendee_email TEXT, _attendee_phone TEXT)
RETURNS public.reservations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions, pg_temp AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_activity public.activities%ROWTYPE;
    v_status public.reservation_status;
    v_code TEXT;
    v_res public.reservations%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentification requise pour réserver une activité.' USING ERRCODE = 'P0001';
    END IF;
    IF _seats IS NULL OR _seats < 1 OR _seats > 10 THEN
        RAISE EXCEPTION 'Le nombre de places doit être compris entre 1 et 10.' USING ERRCODE = 'P0002';
    END IF;
    IF length(trim(COALESCE(_attendee_name,''))) NOT BETWEEN 2 AND 120
       OR COALESCE(_attendee_email,'') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(_attendee_email) > 150
       OR length(trim(COALESCE(_attendee_phone,''))) NOT BETWEEN 6 AND 30 THEN
        RAISE EXCEPTION 'Nom, e-mail ou téléphone du participant invalide.' USING ERRCODE = 'P0003';
    END IF;

    SELECT * INTO v_activity FROM public.activities WHERE id = _activity_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Activité introuvable.' USING ERRCODE = 'P0004'; END IF;
    IF NOT v_activity.is_published THEN
        RAISE EXCEPTION 'Cette activité n''est pas ouverte à la réservation.' USING ERRCODE = 'P0005';
    END IF;
    IF v_activity.ends_at <= now() THEN
        RAISE EXCEPTION 'Cette activité est terminée.' USING ERRCODE = 'P0009';
    END IF;

    -- Accès restreint : invitation, VIP (ou admin / staff)
    IF v_activity.access IN ('invitation','vip')
       AND NOT public.has_role(v_user_id,'admin') AND NOT public.has_role(v_user_id,'staff')
       AND NOT EXISTS (
            SELECT 1 FROM public.activity_invitations i
              JOIN auth.users u ON lower(u.email) = lower(i.email)
             WHERE i.activity_id = _activity_id AND u.id = v_user_id) THEN
        RAISE EXCEPTION 'Cette activité est réservée aux personnes invitées.' USING ERRCODE = 'P0010';
    END IF;

    IF EXISTS (SELECT 1 FROM public.reservations WHERE user_id = v_user_id AND activity_id = _activity_id
               AND status IN ('pending','confirmed','waitlist','checked_in')) THEN
        RAISE EXCEPTION 'Vous avez déjà une réservation active pour cette activité.' USING ERRCODE = 'P0006';
    END IF;

    LOOP
        v_code := public.generate_ticket_code('SAM-ACT');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.reservations WHERE ticket_code = v_code);
    END LOOP;

    IF v_activity.requires_approval THEN
        v_status := 'pending';
    ELSIF v_activity.capacity IS NOT NULL AND (v_activity.seats_taken + _seats) > v_activity.capacity THEN
        v_status := 'waitlist';
    ELSE
        v_status := 'confirmed';
    END IF;

    INSERT INTO public.reservations (activity_id, user_id, attendee_name, attendee_email, attendee_phone, seats, status, ticket_code)
    VALUES (_activity_id, v_user_id, trim(_attendee_name), lower(trim(_attendee_email)), trim(_attendee_phone), _seats, v_status, v_code)
    RETURNING * INTO v_res;
    RETURN v_res;   -- seats_taken est mis à jour par le trigger sync_activity_seats
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_reservation(_reservation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp AS $$
DECLARE
    v_user UUID := auth.uid();
    v_res public.reservations%ROWTYPE;
    v_act public.activities%ROWTYPE;
    v_w public.reservations%ROWTYPE;
    v_avail BIGINT;
    v_privileged BOOLEAN;
BEGIN
    IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise.' USING ERRCODE = 'P0001'; END IF;
    v_privileged := public.has_role(v_user,'admin') OR public.has_role(v_user,'staff');

    SELECT * INTO v_res FROM public.reservations WHERE id = _reservation_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Réservation introuvable.' USING ERRCODE = 'P0007'; END IF;
    IF v_res.user_id <> v_user AND NOT v_privileged THEN
        RAISE EXCEPTION 'Action non autorisée sur cette réservation.' USING ERRCODE = 'P0008';
    END IF;
    IF v_res.status = 'cancelled' THEN RETURN FALSE; END IF;

    SELECT * INTO v_act FROM public.activities WHERE id = v_res.activity_id FOR UPDATE;
    IF NOT v_privileged AND (v_res.status = 'checked_in' OR v_act.starts_at <= now()) THEN
        RAISE EXCEPTION 'Annulation impossible : l''activité a commencé.' USING ERRCODE = 'P0012';
    END IF;

    UPDATE public.reservations SET status = 'cancelled' WHERE id = _reservation_id;  -- le trigger resynchronise seats_taken

    IF v_res.status IN ('confirmed','checked_in') AND v_act.capacity IS NOT NULL THEN
        FOR v_w IN SELECT * FROM public.reservations
                    WHERE activity_id = v_res.activity_id AND status = 'waitlist'
                    ORDER BY created_at ASC FOR UPDATE
        LOOP
            SELECT capacity - seats_taken INTO v_avail FROM public.activities WHERE id = v_res.activity_id;
            IF v_w.seats <= v_avail THEN
                UPDATE public.reservations SET status = 'confirmed' WHERE id = v_w.id;
            END IF;
        END LOOP;
    END IF;
    RETURN TRUE;
END; $$;

-- ------------------------------------------------------------------------------
-- 5. BILLETS D'ENTRÉE : code généré par le serveur, types gratuits réservés à l'organisation
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prepare_entry_ticket()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions, pg_temp AS $$
DECLARE v_type public.ticket_types%ROWTYPE; v_pending INT;
BEGIN
    LOOP
        NEW.ticket_code := public.generate_ticket_code('SAM-TKT');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.entry_tickets WHERE ticket_code = NEW.ticket_code)
              AND NOT EXISTS (SELECT 1 FROM public.reservations WHERE ticket_code = NEW.ticket_code);
    END LOOP;
    NEW.used_at := NULL;
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
        SELECT * INTO v_type FROM public.ticket_types WHERE id = NEW.ticket_type_id AND is_active;
        IF NOT FOUND THEN RAISE EXCEPTION 'Type de billet invalide.' USING ERRCODE = 'P6002'; END IF;
        IF v_type.price_gnf <= 0 THEN
            RAISE EXCEPTION 'Ce type de billet est délivré par l''organisation.' USING ERRCODE = 'P6001';
        END IF;
        IF length(trim(COALESCE(NEW.holder_name,''))) NOT BETWEEN 2 AND 120 THEN
            RAISE EXCEPTION 'Nom du porteur invalide.' USING ERRCODE = 'P6003';
        END IF;
        SELECT count(*) INTO v_pending FROM public.entry_tickets WHERE user_id = auth.uid() AND status = 'pending';
        IF v_pending >= 20 THEN
            RAISE EXCEPTION 'Trop de billets en attente de paiement.' USING ERRCODE = 'P6004';
        END IF;
        NEW.status := 'pending';
        NEW.user_id := auth.uid();
    END IF;
    RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_entry_tickets_prepare ON public.entry_tickets;
CREATE TRIGGER trg_entry_tickets_prepare BEFORE INSERT ON public.entry_tickets
    FOR EACH ROW EXECUTE FUNCTION public.prepare_entry_ticket();

CREATE OR REPLACE FUNCTION public.check_in(_ticket_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp AS $$
DECLARE
    v_op UUID := auth.uid();
    v_code TEXT := upper(trim(_ticket_code));
    v_t public.entry_tickets%ROWTYPE;
    v_r public.reservations%ROWTYPE;
BEGIN
    IF v_op IS NULL THEN RAISE EXCEPTION 'Authentification requise pour effectuer un check-in.' USING ERRCODE = 'P0001'; END IF;
    IF NOT public.has_role(v_op,'staff') AND NOT public.has_role(v_op,'admin') THEN
        RAISE EXCEPTION 'Opération non autorisée : rôle staff ou admin requis.' USING ERRCODE = 'P4003';
    END IF;

    SELECT * INTO v_t FROM public.entry_tickets WHERE ticket_code = v_code FOR UPDATE;
    IF FOUND THEN
        IF v_t.status = 'used' THEN
            RAISE EXCEPTION 'Billet d''entrée déjà utilisé (le %)', to_char(v_t.used_at AT TIME ZONE 'Africa/Conakry','DD/MM/YYYY HH24:MI') USING ERRCODE = 'P1001';
        END IF;
        IF v_t.status <> 'paid' THEN
            RAISE EXCEPTION 'Billet non valide pour l''accès (statut : %)', v_t.status USING ERRCODE = 'P1002';
        END IF;
        IF v_t.valid_on IS NOT NULL AND v_t.valid_on <> (now() AT TIME ZONE 'Africa/Conakry')::date THEN
            RAISE EXCEPTION 'Billet non valable aujourd''hui (valable le %)', v_t.valid_on USING ERRCODE = 'P1006';
        END IF;
        UPDATE public.entry_tickets SET status = 'used', used_at = now() WHERE id = v_t.id;
        RETURN jsonb_build_object('success', true, 'type', 'entry_ticket', 'ticket_code', v_t.ticket_code,
                                  'holder_name', v_t.holder_name, 'checked_in_at', now(), 'operator_id', v_op);
    END IF;

    SELECT * INTO v_r FROM public.reservations WHERE ticket_code = v_code FOR UPDATE;
    IF FOUND THEN
        IF v_r.status = 'checked_in' THEN
            RAISE EXCEPTION 'Réservation déjà émargée (le %)', to_char(v_r.checked_in_at AT TIME ZONE 'Africa/Conakry','DD/MM/YYYY HH24:MI') USING ERRCODE = 'P1003';
        END IF;
        IF v_r.status <> 'confirmed' THEN
            RAISE EXCEPTION 'Réservation non confirmée (statut : %)', v_r.status USING ERRCODE = 'P1004';
        END IF;
        UPDATE public.reservations SET status = 'checked_in', checked_in_at = now(), checked_in_by = v_op WHERE id = v_r.id;
        RETURN jsonb_build_object('success', true, 'type', 'activity_reservation', 'ticket_code', v_r.ticket_code,
                                  'holder_name', v_r.attendee_name, 'seats', v_r.seats, 'checked_in_at', now(), 'operator_id', v_op);
    END IF;
    RAISE EXCEPTION 'Code de billet ou réservation introuvable.' USING ERRCODE = 'P1005';
END; $$;

-- ------------------------------------------------------------------------------
-- 6. EXPOSANTS : machine à états, gel des tarifs, règlement obligatoire, pas de notes visibles
-- ------------------------------------------------------------------------------
ALTER TABLE public.exhibitor_applications DROP COLUMN IF EXISTS admin_notes;

CREATE OR REPLACE FUNCTION public.process_exhibitor_application()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp AS $$
DECLARE
    v_class public.stand_classes%ROWTYPE;
    v_fee BIGINT; v_vat NUMERIC; v_s JSONB;
    v_admin BOOLEAN;
    v_recalc BOOLEAN;
BEGIN
    v_admin := auth.uid() IS NULL OR public.has_role(auth.uid(),'admin');   -- auth.uid() NULL = service_role / SQL

    IF NEW.is_vehicle_sales_agent THEN
        RAISE EXCEPTION 'Les mandataires de vente de véhicules ne sont pas admis à exposer (règlement intérieur, article 3).' USING ERRCODE = 'P3001';
    END IF;

    IF NOT v_admin THEN
        IF TG_OP = 'INSERT' THEN
            NEW.user_id := auth.uid();
            IF NEW.status NOT IN ('draft','submitted') THEN NEW.status := 'draft'; END IF;
            NEW.rules_accepted_at := CASE WHEN NEW.rules_accepted_at IS NOT NULL THEN now() END;
            IF NEW.status = 'submitted' AND NEW.rules_accepted_at IS NULL THEN
                RAISE EXCEPTION 'L''acceptation du règlement intérieur est obligatoire.' USING ERRCODE = 'P3006';
            END IF;
        ELSE
            NEW.user_id := OLD.user_id;
            IF NEW.status IS DISTINCT FROM OLD.status
               AND (OLD.status::text, NEW.status::text) NOT IN (('draft','submitted'),('draft','cancelled'),('submitted','cancelled')) THEN
                RAISE EXCEPTION 'Changement de statut non autorisé (% vers %).', OLD.status, NEW.status USING ERRCODE = 'P3004';
            END IF;
            IF OLD.status = 'draft' THEN
                IF NEW.status = 'submitted' THEN
                    IF NEW.rules_accepted_at IS NULL THEN
                        RAISE EXCEPTION 'L''acceptation du règlement intérieur est obligatoire.' USING ERRCODE = 'P3006';
                    END IF;
                    NEW.rules_accepted_at := now();
                ELSE
                    NEW.rules_accepted_at := CASE WHEN NEW.rules_accepted_at IS NOT NULL THEN COALESCE(OLD.rules_accepted_at, now()) END;
                END IF;
            ELSE
                -- Hors brouillon : seule la preuve de paiement peut être (re)déposée, et seulement avant clôture
                IF (NEW.company_name, NEW.sector, NEW.address, NEW.country, NEW.contact_name, NEW.contact_email, NEW.contact_phone,
                    NEW.stand_class_id, NEW.surface_m2, NEW.activity_declaration, NEW.is_vehicle_sales_agent, NEW.rules_accepted_at)
                   IS DISTINCT FROM
                   (OLD.company_name, OLD.sector, OLD.address, OLD.country, OLD.contact_name, OLD.contact_email, OLD.contact_phone,
                    OLD.stand_class_id, OLD.surface_m2, OLD.activity_declaration, OLD.is_vehicle_sales_agent, OLD.rules_accepted_at)
                   OR (NEW.payment_proof_path IS DISTINCT FROM OLD.payment_proof_path AND OLD.status NOT IN ('submitted','accepted')) THEN
                    RAISE EXCEPTION 'Cette candidature n''est plus modifiable.' USING ERRCODE = 'P3005';
                END IF;
            END IF;
        END IF;
        IF NEW.payment_proof_path IS NOT NULL
           AND (NEW.payment_proof_path NOT LIKE auth.uid()::text || '/%' OR NEW.payment_proof_path LIKE '%..%') THEN
            RAISE EXCEPTION 'Chemin de justificatif invalide.' USING ERRCODE = 'P3007';
        END IF;
    END IF;

    -- Tarification : recalculée à la création, en brouillon, ou si l'on change stand / surface.
    -- Ensuite elle est GELÉE (un changement de tarif ne modifie pas une candidature acceptée ou payée).
    v_recalc := TG_OP = 'INSERT' OR OLD.status = 'draft'
                OR NEW.stand_class_id IS DISTINCT FROM OLD.stand_class_id
                OR NEW.surface_m2 IS DISTINCT FROM OLD.surface_m2;
    IF v_recalc THEN
        SELECT * INTO v_class FROM public.stand_classes WHERE id = NEW.stand_class_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Classe de stand invalide.' USING ERRCODE = 'P3002'; END IF;
        IF NOT v_class.is_active AND NOT v_admin THEN RAISE EXCEPTION 'Cette classe de stand n''est plus disponible.' USING ERRCODE = 'P3002'; END IF;
        IF NEW.surface_m2 < v_class.min_surface_m2 THEN
            RAISE EXCEPTION 'La surface minimale pour ce stand est de % m² (demandé : % m²).', v_class.min_surface_m2, NEW.surface_m2 USING ERRCODE = 'P3003';
        END IF;
        SELECT value INTO v_s FROM public.site_settings WHERE key = 'exhibitor_registration_fee_gnf';
        v_fee := CASE WHEN v_s IS NOT NULL AND jsonb_typeof(v_s) = 'number' THEN (v_s #>> '{}')::bigint ELSE 2000000 END;
        SELECT value INTO v_s FROM public.site_settings WHERE key = 'vat_rate';
        v_vat := CASE WHEN v_s IS NOT NULL AND jsonb_typeof(v_s) = 'number' THEN (v_s #>> '{}')::numeric ELSE 0.18 END;
        NEW.registration_fee_gnf := v_fee;
        NEW.vat_rate := v_vat;
        NEW.stand_total_ht_gnf := ROUND(NEW.surface_m2 * v_class.price_per_m2_gnf);
        NEW.total_ttc_gnf := ROUND((NEW.registration_fee_gnf + NEW.stand_total_ht_gnf) * (1 + v_vat));
    ELSE
        NEW.registration_fee_gnf := OLD.registration_fee_gnf;
        NEW.vat_rate := OLD.vat_rate;
        NEW.stand_total_ht_gnf := OLD.stand_total_ht_gnf;
        NEW.total_ttc_gnf := OLD.total_ttc_gnf;
    END IF;
    RETURN NEW;
END; $$;

-- ------------------------------------------------------------------------------
-- 7. SPONSORS : statut non modifiable par le candidat, prix du pack figé
-- ------------------------------------------------------------------------------
ALTER TABLE public.sponsor_applications DROP COLUMN IF EXISTS admin_notes;
ALTER TABLE public.sponsor_applications ADD COLUMN IF NOT EXISTS pack_price_gnf BIGINT;

CREATE OR REPLACE FUNCTION public.process_sponsor_application()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp AS $$
DECLARE v_admin BOOLEAN := auth.uid() IS NULL OR public.has_role(auth.uid(),'admin');
BEGIN
    IF NOT v_admin THEN
        IF TG_OP = 'INSERT' THEN
            NEW.user_id := auth.uid();
            NEW.status := 'submitted';
        ELSE
            IF NEW.status IS DISTINCT FROM OLD.status OR NEW.pack_id IS DISTINCT FROM OLD.pack_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
                RAISE EXCEPTION 'Seul un administrateur peut modifier le statut ou le pack.' USING ERRCODE = 'P5001';
            END IF;
            IF OLD.status <> 'submitted' AND
               (NEW.company_name, NEW.company_type, NEW.contact_name, NEW.contact_email, NEW.contact_phone, NEW.message)
               IS DISTINCT FROM
               (OLD.company_name, OLD.company_type, OLD.contact_name, OLD.contact_email, OLD.contact_phone, OLD.message) THEN
                RAISE EXCEPTION 'Cette candidature n''est plus modifiable.' USING ERRCODE = 'P5002';
            END IF;
        END IF;
    END IF;
    IF TG_OP = 'INSERT' OR NEW.pack_id IS DISTINCT FROM OLD.pack_id THEN
        SELECT price_gnf INTO NEW.pack_price_gnf FROM public.sponsor_packs WHERE id = NEW.pack_id;
    ELSE
        NEW.pack_price_gnf := OLD.pack_price_gnf;
    END IF;
    RETURN NEW;
END; $$;

-- ------------------------------------------------------------------------------
-- 8. DEMANDES CRÉDIT / LEASING, CONTACT, NEWSLETTER : usurpation, consentement, spam
-- ------------------------------------------------------------------------------
ALTER TABLE public.finance_requests ALTER COLUMN consent_contact DROP DEFAULT;   -- le consentement doit être explicite
ALTER TABLE public.finance_requests ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.finance_requests
    ADD CONSTRAINT chk_finance_len CHECK (length(full_name) <= 120 AND length(phone) <= 30 AND length(vehicle_interest) BETWEEN 3 AND 300
        AND length(COALESCE(employer_name,'')) <= 150 AND length(COALESCE(budget_range,'')) <= 60),
    ADD CONSTRAINT chk_finance_email CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 150);

DROP POLICY IF EXISTS "finance_requests_insert_public" ON public.finance_requests;
CREATE POLICY "finance_requests_insert_public" ON public.finance_requests FOR INSERT TO anon, authenticated
    WITH CHECK (consent_contact = true AND status = 'new' AND forwarded_partner_id IS NULL
                AND (user_id IS NULL OR user_id = auth.uid()));

ALTER TABLE public.contact_messages ADD CONSTRAINT chk_contact_email_fmt CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
ALTER TABLE public.newsletter_subscribers ADD CONSTRAINT chk_newsletter_email_fmt CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Limitation simple : 3 demandes crédit et 5 messages par e-mail et par heure
CREATE OR REPLACE FUNCTION public.throttle_public_forms()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_n INT;
BEGIN
    IF TG_TABLE_NAME = 'finance_requests' THEN
        SELECT count(*) INTO v_n FROM public.finance_requests WHERE lower(email) = lower(NEW.email) AND created_at > now() - interval '1 hour';
        IF v_n >= 3 THEN RAISE EXCEPTION 'Trop de demandes récentes, réessayez plus tard.' USING ERRCODE = 'P7001'; END IF;
    ELSIF TG_TABLE_NAME = 'contact_messages' THEN
        SELECT count(*) INTO v_n FROM public.contact_messages WHERE lower(email) = lower(NEW.email) AND created_at > now() - interval '1 hour';
        IF v_n >= 5 THEN RAISE EXCEPTION 'Trop de messages récents, réessayez plus tard.' USING ERRCODE = 'P7001'; END IF;
    END IF;
    RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_finance_throttle ON public.finance_requests;
CREATE TRIGGER trg_finance_throttle BEFORE INSERT ON public.finance_requests FOR EACH ROW EXECUTE FUNCTION public.throttle_public_forms();
DROP TRIGGER IF EXISTS trg_contact_throttle ON public.contact_messages;
CREATE TRIGGER trg_contact_throttle BEFORE INSERT ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION public.throttle_public_forms();

-- ------------------------------------------------------------------------------
-- 9. RALLYE : activité de type rallye publiée, décharge acceptée, une inscription par personne
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prepare_rally_entry()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp AS $$
DECLARE v_act public.activities%ROWTYPE;
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
        SELECT * INTO v_act FROM public.activities WHERE id = NEW.activity_id;
        IF NOT FOUND OR v_act.kind <> 'rally' OR NOT v_act.is_published OR v_act.ends_at <= now() THEN
            RAISE EXCEPTION 'Les inscriptions ne sont pas ouvertes pour cette activité.' USING ERRCODE = 'P8001';
        END IF;
        IF NEW.waiver_accepted_at IS NULL THEN
            RAISE EXCEPTION 'L''acceptation de la décharge de responsabilité est obligatoire.' USING ERRCODE = 'P8002';
        END IF;
        NEW.waiver_accepted_at := now();
        NEW.user_id := auth.uid();
        NEW.status := 'submitted';
    END IF;
    RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_rally_prepare ON public.rally_entries;
CREATE TRIGGER trg_rally_prepare BEFORE INSERT ON public.rally_entries FOR EACH ROW EXECUTE FUNCTION public.prepare_rally_entry();
CREATE UNIQUE INDEX IF NOT EXISTS uq_rally_entries_user_activity ON public.rally_entries(activity_id, user_id);
ALTER TABLE public.rally_entries
    ADD CONSTRAINT chk_rally_len CHECK (length(full_name) <= 120 AND length(phone) <= 30
        AND length(vehicle_make_model) BETWEEN 2 AND 120 AND length(vehicle_plate) BETWEEN 2 AND 20
        AND length(COALESCE(licence_number,'')) <= 40);

-- ------------------------------------------------------------------------------
-- 10. Coordonnées bancaires : plus publiques ; visibles seulement par un exposant qui a déposé un dossier
-- ------------------------------------------------------------------------------
UPDATE public.site_settings SET is_public = false WHERE key = 'bank_payment_details';

CREATE OR REPLACE FUNCTION public.get_payment_details()
RETURNS JSONB LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, auth, pg_temp AS $$
    SELECT s.value FROM public.site_settings s
     WHERE s.key = 'bank_payment_details'
       AND auth.uid() IS NOT NULL
       AND (public.has_role(auth.uid(),'admin')
            OR EXISTS (SELECT 1 FROM public.exhibitor_applications a
                        WHERE a.user_id = auth.uid() AND a.status IN ('submitted','accepted','paid')));
$$;

-- ------------------------------------------------------------------------------
-- 11. Droits d'exécution : les fonctions appelables par l'API sont limitées aux connectés
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.reserve_seats(UUID,INT,TEXT,TEXT,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_reservation(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_in(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_payment_details() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_seats(UUID,INT,TEXT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_reservation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_in(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_details() TO authenticated;
