-- Ledger of member payment activity (sent, received, cycle rewards)
CREATE TABLE IF NOT EXISTS public.transactions (
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

CREATE INDEX IF NOT EXISTS transactions_member_occurred_idx
  ON public.transactions(member_id, occurred_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_contribution_member_kind_idx
  ON public.transactions(contribution_id, member_id, kind)
  WHERE contribution_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_payout_cycle_idx
  ON public.transactions(member_id, cycle_number)
  WHERE kind = 'payout';

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY transactions_select_realtime ON public.transactions FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
