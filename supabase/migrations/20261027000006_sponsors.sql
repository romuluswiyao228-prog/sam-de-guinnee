-- ==============================================================================
-- SAM GUINÉE 2027 — MIGRATION 06 : SPONSORS ET PACKS DE PARTENARIAT
-- ==============================================================================

-- Enums pour les sponsors
DO $$ BEGIN
    CREATE TYPE public.sponsor_pack_code AS ENUM (
        'diamond',
        'platinum',
        'gold'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.sponsor_application_status AS ENUM (
        'submitted',
        'under_review',
        'accepted',
        'rejected',
        'signed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 1. Table Packs de Sponsoring
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sponsor_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code public.sponsor_pack_code NOT NULL UNIQUE,
    label TEXT NOT NULL,
    role_label TEXT NOT NULL,
    price_gnf BIGINT NOT NULL,
    benefits JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_sponsor_packs_price CHECK (price_gnf > 0)
);

CREATE TRIGGER trg_sponsor_packs_updated_at
    BEFORE UPDATE ON public.sponsor_packs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 2. Table Candidatures Sponsors
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sponsor_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    company_type TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    pack_id UUID NOT NULL REFERENCES public.sponsor_packs(id) ON DELETE RESTRICT,
    message TEXT,
    status public.sponsor_application_status NOT NULL DEFAULT 'submitted',
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsor_app_user_id ON public.sponsor_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_app_status ON public.sponsor_applications(status);

CREATE TRIGGER trg_sponsor_applications_updated_at
    BEFORE UPDATE ON public.sponsor_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Trigger de protection des statuts sponsors
CREATE OR REPLACE FUNCTION public.process_sponsor_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
        IF TG_OP = 'INSERT' THEN
            NEW.status := 'submitted';
            NEW.admin_notes := NULL;
        ELSIF TG_OP = 'UPDATE' THEN
            NEW.admin_notes := OLD.admin_notes;
            IF NEW.status IN ('accepted', 'signed') AND OLD.status <> NEW.status THEN
                RAISE EXCEPTION 'Seul un administrateur peut accepter ou signer un partenariat.'
                    USING ERRCODE = 'P5001';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sponsor_security ON public.sponsor_applications;
CREATE TRIGGER trg_sponsor_security
    BEFORE INSERT OR UPDATE ON public.sponsor_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.process_sponsor_application();

-- ------------------------------------------------------------------------------
-- 3. Activation RLS et Politiques
-- ------------------------------------------------------------------------------
ALTER TABLE public.sponsor_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_applications ENABLE ROW LEVEL SECURITY;

-- Sponsor Packs : lecture publique si actif, admin gère tout
CREATE POLICY "sponsor_packs_select"
    ON public.sponsor_packs
    FOR SELECT
    TO anon, authenticated
    USING (
        is_active = true
        OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'))
    );

CREATE POLICY "sponsor_packs_admin_all"
    ON public.sponsor_packs
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sponsor Applications :
CREATE POLICY "sponsor_applications_select"
    ON public.sponsor_applications
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "sponsor_applications_insert"
    ON public.sponsor_applications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sponsor_applications_update"
    ON public.sponsor_applications
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
