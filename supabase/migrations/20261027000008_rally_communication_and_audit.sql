-- ==============================================================================
-- SAM GUINÉE 2027 — MIGRATION 08 : RALLYE, COMMUNICATION, AUDIT ET STORAGE
-- ==============================================================================

-- Enums Rallye et Communication
DO $$ BEGIN
    CREATE TYPE public.rally_role AS ENUM (
        'driver',
        'co_driver',
        'spectator'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.rally_entry_status AS ENUM (
        'submitted',
        'accepted',
        'rejected',
        'waitlist'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.contact_message_status AS ENUM (
        'new',
        'read',
        'answered'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 1. Table Inscriptions Circuit Rallye
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rally_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.rally_role NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_make_model TEXT NOT NULL,
    vehicle_plate TEXT NOT NULL,
    licence_number TEXT,
    status public.rally_entry_status NOT NULL DEFAULT 'submitted',
    waiver_accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_rally_name CHECK (length(full_name) >= 2),
    CONSTRAINT chk_rally_phone CHECK (length(phone) >= 8)
);

CREATE INDEX IF NOT EXISTS idx_rally_entries_user_id ON public.rally_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_rally_entries_activity ON public.rally_entries(activity_id);

CREATE TRIGGER trg_rally_entries_updated_at
    BEFORE UPDATE ON public.rally_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 2. Table Messages de Contact
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status public.contact_message_status NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_contact_name CHECK (length(name) >= 2 AND length(name) <= 120),
    CONSTRAINT chk_contact_email CHECK (length(email) >= 5 AND length(email) <= 150),
    CONSTRAINT chk_contact_subject CHECK (length(subject) >= 3 AND length(subject) <= 200),
    CONSTRAINT chk_contact_message CHECK (length(message) >= 10 AND length(message) <= 3000)
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages(status);

-- ------------------------------------------------------------------------------
-- 3. Table Abonnés Newsletter
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unsubscribed_at TIMESTAMPTZ,
    CONSTRAINT chk_newsletter_email CHECK (length(email) >= 5 AND length(email) <= 150)
);

-- ------------------------------------------------------------------------------
-- 4. Table Journal d'Audit (Audit Log)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    row_id TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_row ON public.audit_log(table_name, row_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- Trigger d'audit automatique sur les statuts sensibles
CREATE OR REPLACE FUNCTION public.audit_status_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            INSERT INTO public.audit_log (actor_id, action, table_name, row_id, details)
            VALUES (
                auth.uid(),
                'STATUS_CHANGE',
                TG_TABLE_NAME,
                NEW.id::text,
                jsonb_build_object(
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'updated_at', now()
                )
            );
        END IF;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_log (actor_id, action, table_name, row_id, details)
        VALUES (
            auth.uid(),
            'ROW_CREATED',
            TG_TABLE_NAME,
            NEW.id::text,
            jsonb_build_object('initial_status', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Attachement des triggers d'audit sur les tables sensibles
DROP TRIGGER IF EXISTS trg_audit_exhibitors ON public.exhibitor_applications;
CREATE TRIGGER trg_audit_exhibitors
    AFTER INSERT OR UPDATE OF status ON public.exhibitor_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_status_changes();

DROP TRIGGER IF EXISTS trg_audit_sponsors ON public.sponsor_applications;
CREATE TRIGGER trg_audit_sponsors
    AFTER INSERT OR UPDATE OF status ON public.sponsor_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_status_changes();

DROP TRIGGER IF EXISTS trg_audit_reservations ON public.reservations;
CREATE TRIGGER trg_audit_reservations
    AFTER INSERT OR UPDATE OF status ON public.reservations
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_status_changes();

DROP TRIGGER IF EXISTS trg_audit_entry_tickets ON public.entry_tickets;
CREATE TRIGGER trg_audit_entry_tickets
    AFTER INSERT OR UPDATE OF status ON public.entry_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_status_changes();

-- ------------------------------------------------------------------------------
-- 5. Activation RLS et Politiques
-- ------------------------------------------------------------------------------
ALTER TABLE public.rally_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Politiques Rallye :
CREATE POLICY "rally_entries_select"
    ON public.rally_entries
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'staff')
    );

CREATE POLICY "rally_entries_insert"
    ON public.rally_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND status = 'submitted'
    );

CREATE POLICY "rally_entries_admin_update"
    ON public.rally_entries
    FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Politiques Contact Messages :
-- Insertion anonyme et authentifiée autorisée avec statut 'new'
CREATE POLICY "contact_messages_insert_public"
    ON public.contact_messages
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (status = 'new');

-- Lecture et gestion réservées strictement aux administrateurs
CREATE POLICY "contact_messages_admin_all"
    ON public.contact_messages
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Politiques Newsletter Subscribers :
CREATE POLICY "newsletter_insert_public"
    ON public.newsletter_subscribers
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (unsubscribed_at IS NULL);

CREATE POLICY "newsletter_admin_all"
    ON public.newsletter_subscribers
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Politiques Audit Log :
-- Lecture et gestion réservées exclusivement aux administrateurs
CREATE POLICY "audit_log_admin_select"
    ON public.audit_log
    FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------------------------
-- 6. Configuration des Buckets Supabase Storage
-- ------------------------------------------------------------------------------
-- Buckets :
-- 1. payment-proofs (Privé : accès restreint au dossier de chaque utilisateur auth.uid()/*)
-- 2. public-media (Public en lecture : logos, galeries, affiches)
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES 
        ('payment-proofs', 'payment-proofs', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
        ('public-media', 'public-media', true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf'])
    ON CONFLICT (id) DO UPDATE SET
        public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;
EXCEPTION
    WHEN undefined_table THEN null; -- Si l'extension storage n'est pas encore montée
END $$;

-- Politiques RLS sur storage.objects (appliquées si le schéma storage existe)
DO $$
BEGIN
    -- Public media : lecture ouverte à tous
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
        DROP POLICY IF EXISTS "public_media_select" ON storage.objects;
        CREATE POLICY "public_media_select"
            ON storage.objects FOR SELECT
            TO anon, authenticated
            USING (bucket_id = 'public-media');

        DROP POLICY IF EXISTS "public_media_admin_write" ON storage.objects;
        CREATE POLICY "public_media_admin_write"
            ON storage.objects FOR ALL
            TO authenticated
            USING (bucket_id = 'public-media' AND public.has_role(auth.uid(), 'admin'))
            WITH CHECK (bucket_id = 'public-media' AND public.has_role(auth.uid(), 'admin'));

        -- Payment proofs : chaque utilisateur n'accède qu'à son dossier user_id/...
        DROP POLICY IF EXISTS "payment_proofs_user_select" ON storage.objects;
        CREATE POLICY "payment_proofs_user_select"
            ON storage.objects FOR SELECT
            TO authenticated
            USING (
                bucket_id = 'payment-proofs'
                AND (
                    (storage.foldername(name))[1] = auth.uid()::text
                    OR public.has_role(auth.uid(), 'admin')
                )
            );

        DROP POLICY IF EXISTS "payment_proofs_user_insert" ON storage.objects;
        CREATE POLICY "payment_proofs_user_insert"
            ON storage.objects FOR INSERT
            TO authenticated
            WITH CHECK (
                bucket_id = 'payment-proofs'
                AND (
                    (storage.foldername(name))[1] = auth.uid()::text
                    OR public.has_role(auth.uid(), 'admin')
                )
            );
    END IF;
END $$;
