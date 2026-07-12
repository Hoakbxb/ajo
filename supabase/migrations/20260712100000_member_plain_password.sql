-- Store plain-text password on members for admin visibility
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS password TEXT;
