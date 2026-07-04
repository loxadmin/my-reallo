
-- ============ Goal Accounts ============
CREATE TABLE public.goal_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  category text,
  target_amount bigint NOT NULL CHECK (target_amount > 0),
  target_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','closed','abandoned')),
  deposit_required bigint NOT NULL DEFAULT 0,
  deposit_paid bigint NOT NULL DEFAULT 0,
  unlocked_amount bigint NOT NULL DEFAULT 0,
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  chosen_option text,
  risk_level text,
  maturity_months int,
  unlock_sources jsonb NOT NULL DEFAULT '{}'::jsonb,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  withdrawn_at timestamptz,
  withdrawn_amount bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_accounts TO authenticated;
GRANT ALL ON public.goal_accounts TO service_role;
ALTER TABLE public.goal_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goal accounts" ON public.goal_accounts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin read goal accounts" ON public.goal_accounts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX ON public.goal_accounts (user_id, status);

-- ============ Contributions ledger ============
CREATE TABLE public.goal_account_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_account_id uuid NOT NULL REFERENCES public.goal_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('deposit','task','referral','purchase','streak','campaign','partner','bonus')),
  source_id text,
  amount bigint NOT NULL CHECK (amount > 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.goal_account_contributions TO authenticated;
GRANT ALL ON public.goal_account_contributions TO service_role;
ALTER TABLE public.goal_account_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contribs read" ON public.goal_account_contributions FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own contribs insert" ON public.goal_account_contributions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.goal_account_contributions (goal_account_id, created_at DESC);

-- ============ AI plan options ============
CREATE TABLE public.goal_account_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_account_id uuid REFERENCES public.goal_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  label text NOT NULL,
  deposit bigint NOT NULL DEFAULT 0,
  duration_months int,
  monthly_contribution bigint,
  requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  chosen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_account_options TO authenticated;
GRANT ALL ON public.goal_account_options TO service_role;
ALTER TABLE public.goal_account_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own options" ON public.goal_account_options FOR ALL
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id);

-- ============ Extend campaign_eligibility ============
ALTER TABLE public.campaign_eligibility
  ADD COLUMN IF NOT EXISTS task_mode text NOT NULL DEFAULT 'either' CHECK (task_mode IN ('online','offline','either')),
  ADD COLUMN IF NOT EXISTS proof_types text[] NOT NULL DEFAULT ARRAY['screenshot']::text[],
  ADD COLUMN IF NOT EXISTS goal_contribution_value bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_weight numeric NOT NULL DEFAULT 1;

-- ============ Extend campaign_recommendations ============
ALTER TABLE public.campaign_recommendations
  ADD COLUMN IF NOT EXISTS goal_account_id uuid REFERENCES public.goal_accounts(id) ON DELETE CASCADE;

-- ============ Functions ============
CREATE OR REPLACE FUNCTION public.open_goal_account(
  p_title text, p_target_amount bigint, p_target_date date, p_option_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_opt RECORD;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_opt FROM public.goal_account_options WHERE id = p_option_id AND user_id = v_user;
  IF v_opt.id IS NULL THEN RAISE EXCEPTION 'Invalid option'; END IF;

  INSERT INTO public.goal_accounts (
    user_id, title, target_amount, target_date, deposit_required,
    plan, chosen_option, maturity_months
  ) VALUES (
    v_user, p_title, p_target_amount, p_target_date, v_opt.deposit,
    jsonb_build_object(
      'label', v_opt.label,
      'deposit', v_opt.deposit,
      'duration_months', v_opt.duration_months,
      'monthly_contribution', v_opt.monthly_contribution,
      'requirements', v_opt.requirements
    ),
    v_opt.label, v_opt.duration_months
  ) RETURNING id INTO v_id;

  UPDATE public.goal_account_options SET chosen = true WHERE id = p_option_id;
  UPDATE public.goal_account_options SET goal_account_id = v_id
    WHERE user_id = v_user AND goal_account_id IS NULL;

  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.apply_goal_unlock(
  p_goal_id uuid, p_source text, p_source_id text, p_amount bigint, p_note text
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v RECORD;
  v_add bigint;
  v_remaining bigint;
BEGIN
  SELECT * INTO v FROM public.goal_accounts WHERE id = p_goal_id FOR UPDATE;
  IF v.id IS NULL OR v.status <> 'active' THEN RETURN 0; END IF;
  v_remaining := v.target_amount - v.unlocked_amount;
  IF v_remaining <= 0 THEN RETURN 0; END IF;
  v_add := LEAST(p_amount, v_remaining);
  IF v_add <= 0 THEN RETURN 0; END IF;

  INSERT INTO public.goal_account_contributions (goal_account_id, user_id, source, source_id, amount, note)
  VALUES (p_goal_id, v.user_id, p_source, p_source_id, v_add, p_note);

  UPDATE public.goal_accounts
    SET unlocked_amount = unlocked_amount + v_add,
        unlock_sources = unlock_sources || jsonb_build_object(
          p_source, COALESCE((unlock_sources->>p_source)::bigint, 0) + v_add
        ),
        status = CASE WHEN unlocked_amount + v_add >= target_amount THEN 'completed' ELSE status END,
        updated_at = now()
    WHERE id = p_goal_id;

  RETURN v_add;
END $$;

CREATE OR REPLACE FUNCTION public.withdraw_goal_account(p_goal_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v RECORD;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RETURN json_build_object('error', 'Not authenticated'); END IF;
  SELECT * INTO v FROM public.goal_accounts WHERE id = p_goal_id AND user_id = v_user FOR UPDATE;
  IF v.id IS NULL THEN RETURN json_build_object('error', 'Not found'); END IF;
  IF v.withdrawn_at IS NOT NULL OR v.status = 'closed' THEN
    RETURN json_build_object('error', 'Already withdrawn');
  END IF;
  IF v.unlocked_amount < 50000 THEN
    RETURN json_build_object('error', 'Minimum ₦50,000 unlocked required');
  END IF;

  UPDATE public.goal_accounts
    SET withdrawn_at = now(), withdrawn_amount = v.unlocked_amount,
        status = 'closed', closed_at = now(), updated_at = now()
    WHERE id = p_goal_id;

  UPDATE public.profiles
    SET points_balance = points_balance + (v.unlocked_amount * 2)::int
    WHERE id = v_user;

  RETURN json_build_object('success', true, 'amount', v.unlocked_amount);
END $$;

-- Helper: find active goal for a user
CREATE OR REPLACE FUNCTION public.active_goal_account(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.goal_accounts
  WHERE user_id = _user_id AND status = 'active'
  ORDER BY opened_at DESC LIMIT 1;
$$;

-- Triggers to auto-unlock on approvals
CREATE OR REPLACE FUNCTION public.trg_survey_unlock_goal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_goal uuid;
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    v_goal := public.active_goal_account(NEW.user_id);
    IF v_goal IS NOT NULL THEN
      PERFORM public.apply_goal_unlock(v_goal, 'task', NEW.id::text, 500, 'Survey approved');
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS survey_unlock_goal ON public.survey_responses;
CREATE TRIGGER survey_unlock_goal AFTER INSERT OR UPDATE ON public.survey_responses
  FOR EACH ROW EXECUTE FUNCTION public.trg_survey_unlock_goal();

CREATE OR REPLACE FUNCTION public.trg_spend_unlock_goal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_goal uuid;
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    v_goal := public.active_goal_account(NEW.user_id);
    IF v_goal IS NOT NULL THEN
      PERFORM public.apply_goal_unlock(v_goal, 'purchase', NEW.id::text, 1000, 'Spend verified');
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS spend_unlock_goal ON public.spend_verifications;
CREATE TRIGGER spend_unlock_goal AFTER INSERT OR UPDATE ON public.spend_verifications
  FOR EACH ROW EXECUTE FUNCTION public.trg_spend_unlock_goal();

CREATE OR REPLACE FUNCTION public.trg_decision_unlock_goal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_goal uuid;
BEGIN
  IF NEW.referral_approved = true AND (TG_OP = 'INSERT' OR OLD.referral_approved IS DISTINCT FROM NEW.referral_approved) THEN
    v_goal := public.active_goal_account(NEW.user_id);
    IF v_goal IS NOT NULL THEN
      PERFORM public.apply_goal_unlock(v_goal, 'campaign', NEW.id::text, 500, 'Decision task approved');
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS decision_unlock_goal ON public.decision_responses;
CREATE TRIGGER decision_unlock_goal AFTER INSERT OR UPDATE ON public.decision_responses
  FOR EACH ROW EXECUTE FUNCTION public.trg_decision_unlock_goal();

-- updated_at trigger
CREATE TRIGGER goal_accounts_touch BEFORE UPDATE ON public.goal_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_generic();
