-- ==============================================================================
-- SAM GUINÉE 2027 — MIGRATION 01 : IDENTITÉ, PROFILS ET GESTION DES RÔLES
-- ==============================================================================

-- Extensions requises
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Fonction utilitaire générique de mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enum des rôles applicatifs
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM (
        'admin',
        'staff',
        'exhibitor',
        'sponsor',
        'user'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 1. Table Profiles (liée à auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    country TEXT DEFAULT 'GN',
    preferred_language TEXT NOT NULL DEFAULT 'fr',
    marketing_consent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index sur profiles
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Trigger updated_at sur profiles
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 2. Table User Roles (séparée pour éviter toute auto-promotion ou ambiguïté)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_roles_user_role UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- ------------------------------------------------------------------------------
-- 3. Fonction SECURITY DEFINER has_role
-- ------------------------------------------------------------------------------
-- Permet de vérifier les rôles sans récursion RLS et avec des droits système contrôlés
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    );
$$;

-- ------------------------------------------------------------------------------
-- 4. Trigger d'initialisation de profil à l'inscription auth.users
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone, preferred_language, marketing_consent)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        NEW.raw_user_meta_data->>'phone',
        COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'fr'),
        COALESCE((NEW.raw_user_meta_data->>'marketing_consent')::boolean, false)
    )
    ON CONFLICT (id) DO NOTHING;

    -- Par défaut, chaque nouvel utilisateur a le rôle 'user'
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 5. Activation RLS et Politiques
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Politiques sur profiles :
-- 1. Lecture : l'utilisateur lui-même, ou le staff/admin
CREATE POLICY "profiles_select_self_or_staff"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = id
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'staff')
    );

-- 2. Mise à jour : l'utilisateur ne modifie que son propre profil
CREATE POLICY "profiles_update_self"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. Insertion : le propriétaire ou fonction d'authentification
CREATE POLICY "profiles_insert_self"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Politiques sur user_roles :
-- 1. Lecture : l'utilisateur voit ses rôles, les admins voient tous les rôles
CREATE POLICY "user_roles_select"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR public.has_role(auth.uid(), 'admin')
    );

-- 2. Écriture (INSERT, UPDATE, DELETE) : STRICTEMENT RÉSERVÉE AUX ADMINISTRATEURS
CREATE POLICY "user_roles_admin_insert"
    ON public.user_roles
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_admin_update"
    ON public.user_roles
    FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_admin_delete"
    ON public.user_roles
    FOR DELETE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
