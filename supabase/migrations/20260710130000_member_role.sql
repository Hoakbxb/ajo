-- Member role for admin portal access
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
  CHECK (role IN ('member', 'admin'));

CREATE INDEX IF NOT EXISTS members_role_idx ON public.members(role);
