CREATE OR REPLACE FUNCTION public.apply_goal_unlock(p_goal_id uuid, p_source text, p_source_id text, p_amount bigint, p_note text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v RECORD;
  v_add bigint;
  v_points bigint;
  v_remaining bigint;
BEGIN
  SELECT * INTO v FROM public.goal_accounts WHERE id = p_goal_id FOR UPDATE;
  IF v.id IS NULL OR v.status <> 'active' THEN RETURN 0; END IF;
  v_remaining := v.target_amount - v.unlocked_amount;
  IF v_remaining <= 0 THEN RETURN 0; END IF;
  v_add := LEAST(p_amount, v_remaining);
  IF v_add <= 0 THEN RETURN 0; END IF;
  v_points := v_add * 2; -- 1 point = NGN 0.5

  INSERT INTO public.goal_account_contributions (goal_account_id, user_id, source, source_id, amount, note)
  VALUES (p_goal_id, v.user_id, p_source, p_source_id, v_add, p_note);

  UPDATE public.goal_accounts
    SET unlocked_amount = unlocked_amount + v_add,
        points_contributed = points_contributed + v_points,
        unlock_sources = unlock_sources || jsonb_build_object(
          p_source, COALESCE((unlock_sources->>p_source)::bigint, 0) + v_add
        ),
        status = CASE
          WHEN points_required > 0 AND points_contributed + v_points >= points_required THEN 'completed'
          WHEN points_required = 0 AND unlocked_amount + v_add >= target_amount THEN 'completed'
          ELSE status END,
        updated_at = now()
    WHERE id = p_goal_id;

  RETURN v_add;
END $$;