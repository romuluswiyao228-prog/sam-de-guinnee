-- ==============================================================================
-- SAM GUINÉE 2027 — MIGRATION 05 : EXPOSANTS, GRILLE TARIFAIRE ET CALCUL TTC
-- ==============================================================================

-- Enums pour les exposants
DO $$ BEGIN
    CREATE TYPE public.stand_class_code AS ENUM (
        'simple',
        'double',
        'accessory',
        'bank_insurance'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.exhibitor_application_status AS ENUM (
        'draft',
        'submitted',
        'under_review',
        'accepted',
        'rejected',
        'paid',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 1. Table Classes de Stand (Grille tarifaire et aménagements)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stand_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code public.stand_class_code NOT NULL UNIQUE,
    label TEXT NOT NULL,
    price_per_m2_gnf INT NOT NULL,
    min_surface_m2 NUMERIC(6, 2) NOT NULL DEFAULT 3.00,
    amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_stand_classes_price CHECK (price_per_m2_gnf > 0),
    CONSTRAINT chk_stand_classes_min_surface CHECK (min_surface_m2 > 0)
);

CREATE TRIGGER trg_stand_classes_updated_at
    BEFORE UPDATE ON public.stand_classes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 2. Table Candidatures Exposants
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exhibitor_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    sector TEXT NOT NULL,
    address TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'Guinée',
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    stand_class_id UUID NOT NULL REFERENCES public.stand_classes(id) ON DELETE RESTRICT,
    surface_m2 NUMERIC(6, 2) NOT NULL,
    
    -- Montants calculés strictement côté serveur
    registration_fee_gnf INT NOT NULL DEFAULT 2000000,
    stand_total_ht_gnf INT NOT NULL DEFAULT 0,
    vat_rate NUMERIC(4, 2) NOT NULL DEFAULT 0.18,
    total_ttc_gnf INT NOT NULL DEFAULT 0,

    -- Règles d'éligibilité et conformité
    activity_declaration TEXT NOT NULL,
    is_vehicle_sales_agent BOOLEAN NOT NULL DEFAULT false,
    rules_accepted_at TIMESTAMPTZ,

    -- Statut et administration
    status public.exhibitor_application_status NOT NULL DEFAULT 'draft',
    payment_proof_path TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exhibitor_app_user_id ON public.exhibitor_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_exhibitor_app_status ON public.exhibitor_applications(status);

CREATE TRIGGER trg_exhibitor_applications_updated_at
    BEFORE UPDATE ON public.exhibitor_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 3. Trigger Métier : Calcul automatique serveur du devis TTC & Sécurité
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_exhibitor_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_stand_class public.stand_classes%ROWTYPE;
    v_reg_fee INT;
    v_vat_rate NUMERIC(4, 2);
    v_total_ht INT;
    v_setting_fee JSONB;
    v_setting_vat JSONB;
BEGIN
    -- 1. Règle absolue d'exclusion : les mandataires de vente sont strictement interdits
    IF NEW.is_vehicle_sales_agent = true THEN
        RAISE EXCEPTION 'Les mandataires de vente de véhicules ne sont pas autorisés à exposer (Règlement SAM art. 7).'
            USING ERRCODE = 'P3001';
    END IF;

    -- 2. Récupération des paramètres de la classe de stand
    SELECT * INTO v_stand_class
    FROM public.stand_classes
    WHERE id = NEW.stand_class_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Classe de stand invalide ou inexistante.' USING ERRCODE = 'P3002';
    END IF;

    -- 3. Vérification de la surface minimale exigée
    IF NEW.surface_m2 < v_stand_class.min_surface_m2 THEN
        RAISE EXCEPTION 'La surface minimale pour ce type de stand est de % m² (demandé : % m²).',
            v_stand_class.min_surface_m2, NEW.surface_m2
            USING ERRCODE = 'P3003';
    END IF;

    -- 4. Récupération dynamique des frais d'inscription et de la TVA depuis site_settings
    SELECT value INTO v_setting_fee FROM public.site_settings WHERE key = 'exhibitor_registration_fee_gnf';
    IF v_setting_fee IS NOT NULL AND jsonb_typeof(v_setting_fee) = 'number' THEN
        v_reg_fee := (v_setting_fee)::text::int;
    ELSE
        v_reg_fee := 2000000; -- Valeur par défaut de référence
    END IF;

    SELECT value INTO v_setting_vat FROM public.site_settings WHERE key = 'vat_rate';
    IF v_setting_vat IS NOT NULL AND jsonb_typeof(v_setting_vat) = 'number' THEN
        v_vat_rate := (v_setting_vat)::text::numeric;
    ELSE
        v_vat_rate := 0.18; -- TVA guinéenne à 18 %
    END IF;

    -- 5. Calcul serveur strict et inviolable
    NEW.registration_fee_gnf := v_reg_fee;
    NEW.vat_rate := v_vat_rate;
    NEW.stand_total_ht_gnf := ROUND(NEW.surface_m2 * v_stand_class.price_per_m2_gnf);
    v_total_ht := NEW.registration_fee_gnf + NEW.stand_total_ht_gnf;
    NEW.total_ttc_gnf := ROUND(v_total_ht * (1.0 + NEW.vat_rate));

    -- 6. Verrouillage des privilèges pour les utilisateurs non-admins
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
        IF TG_OP = 'INSERT' THEN
            -- Le statut initial ne peut être que draft ou submitted
            IF NEW.status NOT IN ('draft', 'submitted') THEN
                NEW.status := 'draft';
            END IF;
            NEW.admin_notes := NULL;
        ELSIF TG_OP = 'UPDATE' THEN
            -- Préservation des notes admin
            NEW.admin_notes := OLD.admin_notes;

            -- Interdiction formelle d'auto-promotion du statut à 'accepted' ou 'paid'
            IF NEW.status IN ('accepted', 'paid', 'under_review') AND OLD.status <> NEW.status THEN
                RAISE EXCEPTION 'Seul un administrateur peut modifier le statut de validation ou de paiement.'
                    USING ERRCODE = 'P3004';
            END IF;

            -- Si la candidature était déjà acceptée ou payée, modifications restreintes
            IF OLD.status IN ('accepted', 'paid') AND (
                NEW.surface_m2 <> OLD.surface_m2 OR
                NEW.stand_class_id <> OLD.stand_class_id OR
                NEW.is_vehicle_sales_agent <> OLD.is_vehicle_sales_agent
            ) THEN
                RAISE EXCEPTION 'Impossible de modifier la surface ou le stand d''une candidature déjà acceptée ou payée.'
                    USING ERRCODE = 'P3005';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_exhibitor_pricing_and_security ON public.exhibitor_applications;
CREATE TRIGGER trg_exhibitor_pricing_and_security
    BEFORE INSERT OR UPDATE ON public.exhibitor_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.process_exhibitor_application();

-- ------------------------------------------------------------------------------
-- 4. Activation RLS et Politiques
-- ------------------------------------------------------------------------------
ALTER TABLE public.stand_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibitor_applications ENABLE ROW LEVEL SECURITY;

-- Stand Classes : lecture publique des classes actives, admin gère tout
CREATE POLICY "stand_classes_select"
    ON public.stand_classes
    FOR SELECT
    TO anon, authenticated
    USING (
        is_active = true
        OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'))
    );

CREATE POLICY "stand_classes_admin_all"
    ON public.stand_classes
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Exhibitor Applications :
-- 1. Lecture : le candidat propriétaire ou l'administrateur
CREATE POLICY "exhibitor_applications_select"
    ON public.exhibitor_applications
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR public.has_role(auth.uid(), 'admin')
    );

-- 2. Insertion : l'utilisateur pour son propre compte
CREATE POLICY "exhibitor_applications_insert"
    ON public.exhibitor_applications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 3. Mise à jour : le propriétaire (contrôlé par le trigger) ou l'administrateur
CREATE POLICY "exhibitor_applications_update"
    ON public.exhibitor_applications
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR public.has_role(auth.uid(), 'admin')
    )
    WITH CHECK (
        auth.uid() = user_id
        OR public.has_role(auth.uid(), 'admin')
    );

-- 4. Suppression : brouillon uniquement pour l'utilisateur, ou admin
CREATE POLICY "exhibitor_applications_delete"
    ON public.exhibitor_applications
    FOR DELETE
    TO authenticated
    USING (
        (auth.uid() = user_id AND status = 'draft')
        OR public.has_role(auth.uid(), 'admin')
    );
