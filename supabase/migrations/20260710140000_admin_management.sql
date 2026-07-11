-- Admin management: suspension, platform settings, activity audit log
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES public.members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS members_is_suspended_idx
  ON public.members(is_suspended) WHERE is_suspended = TRUE;

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  contribution_amount INT NOT NULL DEFAULT 5000 CHECK (contribution_amount > 0),
  payout_amount INT NOT NULL DEFAULT 10000 CHECK (payout_amount > 0),
  updated_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_activity_log_created_idx
  ON public.admin_activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS admin_activity_log_admin_idx
  ON public.admin_activity_log(admin_member_id);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_settings_select ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY admin_activity_log_select ON public.admin_activity_log FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_activity_log;
