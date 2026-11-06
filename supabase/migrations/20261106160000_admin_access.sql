-- Acesso administrativo do Browth Supplements.
-- A primeira conta ADM deve ser cadastrada manualmente após a migração.
BEGIN;
CREATE TABLE IF NOT EXISTS public.admin_users (
    uid text PRIMARY KEY REFERENCES public.profiles(uid) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by text NULL REFERENCES public.profiles(uid) ON DELETE SET NULL
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_users FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.admin_users TO service_role;
COMMIT;
