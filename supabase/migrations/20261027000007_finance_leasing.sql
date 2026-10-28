-- ==============================================================================
-- SAM GUINÉE 2027 — MIGRATION 07 : CRÉDIT ET LEASING AUTOMOBILE (PRIORITÉ SALON)
-- ==============================================================================

-- Enums pour les demandes de financement
DO $$ BEGIN
    CREATE TYPE public.applicant_type AS ENUM (
        'civil_servant',
        'permanent_employee',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.financing_type AS ENUM (
        'credit',
        'leasing',
        'undecided'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.finance_request_status AS ENUM (
        'new',
        'contacted',
        'forwarded',
        'closed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 1. Table Demandes de Financement / Leasing
-- ------------------------------------------------------------------------------
-- Conforme au RGPD / confidentialité : AUCUNE collecte de fiches de paie, revenus
-- ni pièces d'identité à ce stade préliminaire de mise en relation.
CREATE TABLE IF NOT EXISTS public.finance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    applicant_type public.applicant_type NOT NULL,
    employer_name TEXT,
    vehicle_interest TEXT NOT NULL,
    budget_range TEXT,
    financing_type public.financing_type NOT NULL DEFAULT 'undecided',
    consent_contact BOOLEAN NOT NULL DEFAULT true,
    status public.finance_request_status NOT NULL DEFAULT 'new',
    forwarded_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_finance_consent CHECK (consent_contact = true),
    CONSTRAINT chk_finance_phone CHECK (length(phone) >= 8),
    CONSTRAINT chk_finance_name CHECK (length(full_name) >= 2)
);

CREATE INDEX IF NOT EXISTS idx_finance_requests_user_id ON public.finance_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_requests_status ON public.finance_requests(status);
CREATE INDEX IF NOT EXISTS idx_finance_requests_partner ON public.finance_requests(forwarded_partner_id);

CREATE TRIGGER trg_finance_requests_updated_at
    BEFORE UPDATE ON public.finance_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 2. Activation RLS et Politiques
-- ------------------------------------------------------------------------------
ALTER TABLE public.finance_requests ENABLE ROW LEVEL SECURITY;

-- 1. Insertion : accessible aux visiteurs (anon) et utilisateurs connectés
-- La contrainte impose consent_contact = true et un statut initial 'new'
CREATE POLICY "finance_requests_insert_public"
    ON public.finance_requests
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        consent_contact = true
        AND status = 'new'
        AND forwarded_partner_id IS NULL
    );

-- 2. Lecture : l'utilisateur ne peut lire que ses propres demandes connectées
-- Les anonymes n'ont AUCUN droit de lecture (protection stricte des données personnelles)
CREATE POLICY "finance_requests_select_owner_or_admin"
    ON public.finance_requests
    FOR SELECT
    TO authenticated
    USING (
        (user_id IS NOT NULL AND auth.uid() = user_id)
        OR public.has_role(auth.uid(), 'admin')
    );

-- 3. Mise à jour / Administration : réservée exclusivement aux administrateurs
CREATE POLICY "finance_requests_admin_update"
    ON public.finance_requests
    FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "finance_requests_admin_delete"
    ON public.finance_requests
    FOR DELETE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
