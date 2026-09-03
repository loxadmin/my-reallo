ALTER TABLE public.goal_account_options
  ADD COLUMN IF NOT EXISTS points_required bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_percent numeric NOT NULL DEFAULT 0;

ALTER TABLE public.goal_account_options ALTER COLUMN duration_months DROP NOT NULL;
ALTER TABLE public.goal_accounts ALTER COLUMN target_date DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.open_goal_account(p_title text, p_target_amount bigint, p_target_date date, p_option_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    plan, chosen_option, points_required, deposit_percent
  ) VALUES (
    v_user, p_title, p_target_amount, NULL, v_opt.deposit,
    jsonb_build_object(
      'label', v_opt.label,
      'deposit', v_opt.deposit,
      'deposit_percent', v_opt.deposit_percent,
      'points_required', v_opt.points_required,
      'requirements', v_opt.requirements
    ),
    v_opt.label, v_opt.points_required, v_opt.deposit_percent
  ) RETURNING id INTO v_id;

  UPDATE public.goal_account_options SET chosen = true WHERE id = p_option_id;
  UPDATE public.goal_account_options SET goal_account_id = v_id
    WHERE user_id = v_user AND goal_account_id IS NULL;

  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.withdraw_goal_account(p_goal_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v RECORD;
  v_user uuid := auth.uid();
  v_req uuid;
  v_name text;
BEGIN
  IF v_user IS NULL THEN RETURN json_build_object('error', 'Not authenticated'); END IF;
  SELECT legal_name INTO v_name FROM public.profiles WHERE id = v_user;
  IF v_name IS NULL OR length(trim(v_name)) < 3 THEN
    RETURN json_build_object('error', 'Add your full legal name in your profile before withdrawing');
  END IF;

  SELECT * INTO v FROM public.goal_accounts WHERE id = p_goal_id AND user_id = v_user FOR UPDATE;
  IF v.id IS NULL THEN RETURN json_build_object('error', 'Not found'); END IF;
  IF v.withdrawn_at IS NOT NULL OR v.status = 'closed' THEN
    RETURN json_build_object('error', 'Already withdrawn');
  END IF;
  IF v.points_required > 0 AND v.points_contributed < v.points_required THEN
    RETURN json_build_object('error', 'Goal not fully funded yet');
  END IF;
  IF EXISTS (SELECT 1 FROM public.withdrawal_requests WHERE goal_account_id = p_goal_id AND status = 'pending') THEN
    RETURN json_build_object('error', 'A withdrawal request is already pending review');
  END IF;

  INSERT INTO public.withdrawal_requests (user_id, goal_account_id, amount, account_name)
  VALUES (v_user, p_goal_id, v.unlocked_amount, v_name) RETURNING id INTO v_req;

  UPDATE public.goal_accounts SET status = 'withdrawal_pending', updated_at = now() WHERE id = p_goal_id;

  RETURN json_build_object('success', true, 'request_id', v_req, 'amount', v.unlocked_amount);
END $$;