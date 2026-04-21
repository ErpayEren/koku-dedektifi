-- Referral system table
-- Rewards are no-op until billing provider is wired (see TODO_BILLING.md)

CREATE TABLE IF NOT EXISTS public.referrals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Index for fast code lookups (landing page)
CREATE INDEX IF NOT EXISTS referrals_code_idx ON public.referrals (code);
-- Index for per-user referral list
CREATE INDEX IF NOT EXISTS referrals_owner_idx ON public.referrals (owner_id);

-- RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Owners can see their own referrals
CREATE POLICY "referrals_owner_select"
  ON public.referrals FOR SELECT
  USING (auth.uid() = owner_id);

-- Anyone can look up a referral code (for the landing page)
CREATE POLICY "referrals_public_code_select"
  ON public.referrals FOR SELECT
  USING (true);

-- Only service role can insert/update (handled server-side)
-- No user-facing insert policy intentionally

-- Function to generate a short unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  LOOP
    -- 8-char base-36 code derived from user id + random
    v_code := lower(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.referrals WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;

  INSERT INTO public.referrals (code, owner_id)
  VALUES (v_code, p_user_id)
  ON CONFLICT (code) DO NOTHING;

  RETURN v_code;
END;
$$;
