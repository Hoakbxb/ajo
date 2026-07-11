-- Members (matrix tree nodes)
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  left_child_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  right_child_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  position TEXT NOT NULL CHECK (position IN ('left', 'right')),
  matrix_level INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  has_paid_contribution BOOLEAN NOT NULL DEFAULT FALSE,
  payout_received BOOLEAN NOT NULL DEFAULT FALSE,
  payout_amount INT NOT NULL DEFAULT 0,
  cycles_completed INT NOT NULL DEFAULT 0,
  payment_rejection_count INT NOT NULL DEFAULT 0,
  requires_admin_contact BOOLEAN NOT NULL DEFAULT FALSE,
  awaiting_rematch_since TIMESTAMPTZ,
  rematch_after TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  to_member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  cycle_number INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'awaiting_confirmation', 'confirmed', 'declined')),
  claimed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX contributions_one_per_cycle_idx
  ON public.contributions (from_member_id, cycle_number)
  WHERE status IN ('pending', 'awaiting_confirmation', 'confirmed');

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY members_select_realtime ON public.members FOR SELECT USING (true);
CREATE POLICY contributions_select_realtime ON public.contributions FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contributions;

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('sent', 'received', 'payout')),
  amount INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'awaiting_confirmation', 'confirmed', 'declined')
  ),
  counterparty_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  counterparty_name TEXT,
  contribution_id UUID REFERENCES public.contributions(id) ON DELETE CASCADE,
  cycle_number INT,
  reference TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX transactions_member_occurred_idx
  ON public.transactions(member_id, occurred_at DESC);

CREATE UNIQUE INDEX transactions_contribution_member_kind_idx
  ON public.transactions(contribution_id, member_id, kind)
  WHERE contribution_id IS NOT NULL;

CREATE UNIQUE INDEX transactions_payout_cycle_idx
  ON public.transactions(member_id, cycle_number)
  WHERE kind = 'payout';

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY transactions_select_realtime ON public.transactions FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
