-- 1. Roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'influencer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'monthly_earner';

-- 2. Profiles: legal name
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS legal_name_updated_at timestamptz;

-- 3. Goal accounts: points-based unlock, no duration
ALTER TABLE public.goal_accounts
  ADD COLUMN IF NOT EXISTS points_required bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_contributed bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_percent numeric NOT NULL DEFAULT 0;

-- 4. Admin 2FA codes
CREATE TABLE IF NOT EXISTS public.admin_2fa_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_2fa_codes TO service_role;
ALTER TABLE public.admin_2fa_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access to admin 2fa" ON public.admin_2fa_codes
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 5. Deposits (Paystack)
CREATE TABLE IF NOT EXISTS public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  goal_account_id uuid REFERENCES public.goal_accounts(id) ON DELETE SET NULL,
  amount bigint NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.deposits TO authenticated;
GRANT ALL ON public.deposits TO service_role;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own deposits select" ON public.deposits FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own deposits insert" ON public.deposits FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE TRIGGER deposits_touch BEFORE UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_generic();

-- 6. Goal withdrawal requests (manual admin approval)
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  goal_account_id uuid REFERENCES public.goal_accounts(id) ON DELETE SET NULL,
  amount bigint NOT NULL,
  bank_name text,
  account_number text,
  account_name text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own withdrawals select" ON public.withdrawal_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own withdrawals insert" ON public.withdrawal_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin withdrawals update" ON public.withdrawal_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER withdrawal_requests_touch BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_generic();

-- 7. Partner point economics
ALTER TABLE public.oauth_apps
  ADD COLUMN IF NOT EXISTS point_value_ngn numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_exchange_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.partner_point_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  app_id uuid NOT NULL REFERENCES public.oauth_apps(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, app_id)
);
GRANT SELECT ON public.partner_point_balances TO authenticated;
GRANT ALL ON public.partner_point_balances TO service_role;
ALTER TABLE public.partner_point_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own partner balances" ON public.partner_point_balances FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER partner_point_balances_touch BEFORE UPDATE ON public.partner_point_balances
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_generic();

CREATE TABLE IF NOT EXISTS public.partner_point_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  app_id uuid NOT NULL REFERENCES public.oauth_apps(id) ON DELETE CASCADE,
  direction text NOT NULL,
  karbali_points bigint NOT NULL,
  partner_points bigint NOT NULL,
  rate_ngn_per_partner_point numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_point_transfers TO authenticated;
GRANT ALL ON public.partner_point_transfers TO service_role;
ALTER TABLE public.partner_point_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own partner transfers" ON public.partner_point_transfers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 8. Points-based goal unlock helper
CREATE OR REPLACE FUNCTION public.apply_goal_points(p_goal_id uuid, p_points bigint, p_source text, p_note text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v RECORD; v_add bigint; v_remaining bigint;
BEGIN
  SELECT * INTO v FROM public.goal_accounts WHERE id = p_goal_id FOR UPDATE;
  IF v.id IS NULL OR v.status <> 'active' THEN RETURN 0; END IF;
  v_remaining := GREATEST(v.points_required - v.points_contributed, 0);
  v_add := LEAST(p_points, v_remaining);
  IF v_add <= 0 THEN RETURN 0; END IF;

  UPDATE public.goal_accounts
    SET points_contributed = points_contributed + v_add,
        unlocked_amount = LEAST(target_amount, ((points_contributed + v_add) * 0.5)::bigint),
        status = CASE WHEN points_contributed + v_add >= points_required THEN 'completed' ELSE status END,
        updated_at = now()
    WHERE id = p_goal_id;

  INSERT INTO public.goal_account_contributions (goal_account_id, user_id, source, source_id, amount, note)
  VALUES (p_goal_id, v.user_id, p_source, NULL, v_add, p_note);

  RETURN v_add;
END $$;