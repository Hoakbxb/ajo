-- Link members to Supabase Auth users; remove local password storage
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.members DROP COLUMN IF EXISTS password_hash;

CREATE INDEX IF NOT EXISTS members_auth_user_id_idx ON public.members(auth_user_id);
