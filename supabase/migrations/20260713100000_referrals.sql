-- Referral program: invite friends, earn ₦1,000 per qualified referral,
-- redeem ₦5,000 toward your next contribution.

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS referred_by_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_balance INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contribution_credit INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS members_referred_by_idx
  ON public.members(referred_by_member_id)
  WHERE referred_by_member_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  referred_member_id UUID NOT NULL UNIQUE REFERENCES public.members(id) ON DELETE CASCADE,
  reward_amount INT NOT NULL DEFAULT 1000,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'paid')),
  qualified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx
  ON public.referrals(referrer_member_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.referral_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  contribution_id UUID REFERENCES public.contributions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Extend transaction kinds for referral earnings and credit usage
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_kind_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_kind_check
  CHECK (kind IN ('sent', 'received', 'payout', 'referral', 'referral_credit'));

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY referrals_select_realtime ON public.referrals FOR SELECT USING (true);
CREATE POLICY referral_redemptions_select_realtime ON public.referral_redemptions FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
