-- ==============================================================================
-- SAM GUINÉE 2027 — MIGRATION 02 : CONTENU ÉDITORIAL ET CONFIGURATION
-- ==============================================================================

-- Enum des types de partenaires
DO $$ BEGIN
    CREATE TYPE public.partner_kind AS ENUM (
        'sponsor',
        'bank',
        'insurer',
        'leasing',
        'media',
        'institution'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 1. Table Éditions du Salon
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.editions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    venue_name TEXT NOT NULL,
    venue_address TEXT NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_editions_dates CHECK (ends_on >= starts_on)
);

CREATE TRIGGER trg_editions_updated_at
    BEFORE UPDATE ON public.editions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Contrainte : une seule édition courante à la fois
CREATE UNIQUE INDEX IF NOT EXISTS uq_editions_single_current
    ON public.editions (is_current)
    WHERE is_current = true;

-- ------------------------------------------------------------------------------
-- 2. Table Paramètres du Site (site_settings) et Vue Publique
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Vue publique sécurisée exposant UNIQUEMENT les paramètres publics (slogan, contacts, etc.)
CREATE OR REPLACE VIEW public.public_site_settings AS
SELECT key, value
FROM public.site_settings
WHERE is_public = true;

GRANT SELECT ON public.public_site_settings TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3. Table Partenaires
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    kind public.partner_kind NOT NULL,
    logo_url TEXT,
    website_url TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partners_kind ON public.partners(kind);
CREATE INDEX IF NOT EXISTS idx_partners_published_sort ON public.partners(is_published, sort_order);

CREATE TRIGGER trg_partners_updated_at
    BEFORE UPDATE ON public.partners
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 4. Table FAQ (Foire Aux Questions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faq_published_sort ON public.faq_items(is_published, sort_order);

CREATE TRIGGER trg_faq_items_updated_at
    BEFORE UPDATE ON public.faq_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 5. Activation RLS et Politiques
-- ------------------------------------------------------------------------------
ALTER TABLE public.editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

-- Editions : Lecture publique, écriture réservée aux admins
CREATE POLICY "editions_select_all"
    ON public.editions
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "editions_admin_all"
    ON public.editions
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Site Settings : Lecture directe réservée aux admins (les autres passent par public_site_settings)
CREATE POLICY "site_settings_admin_all"
    ON public.site_settings
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Partners : Lecture publique si publié, admin voit tout
CREATE POLICY "partners_select_published"
    ON public.partners
    FOR SELECT
    TO anon, authenticated
    USING (
        is_published = true
        OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'))
    );

CREATE POLICY "partners_admin_write"
    ON public.partners
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- FAQ Items : Lecture publique si publié, admin voit tout
CREATE POLICY "faq_items_select_published"
    ON public.faq_items
    FOR SELECT
    TO anon, authenticated
    USING (
        is_published = true
        OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'))
    );

CREATE POLICY "faq_items_admin_write"
    ON public.faq_items
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
