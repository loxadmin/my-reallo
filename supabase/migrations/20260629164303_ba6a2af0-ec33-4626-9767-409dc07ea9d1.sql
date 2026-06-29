
CREATE OR REPLACE FUNCTION public.influencer_completed_general_task_last_30d(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.survey_responses
      WHERE user_id = _user_id AND status = 'approved'
        AND COALESCE(reviewed_at, created_at) >= now() - interval '30 days'
  ) OR EXISTS (
    SELECT 1 FROM public.spend_verifications
      WHERE user_id = _user_id AND status = 'approved'
        AND created_at >= now() - interval '30 days'
  ) OR EXISTS (
    SELECT 1 FROM public.decision_responses
      WHERE user_id = _user_id AND referral_approved = true
        AND created_at >= now() - interval '30 days'
  );
$$;

GRANT EXECUTE ON FUNCTION public.influencer_completed_general_task_last_30d(uuid) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.leaderboard_contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  rules text,
  prize_amount numeric NOT NULL DEFAULT 1000000,
  prize_currency text NOT NULL DEFAULT 'NGN',
  winner_count int NOT NULL DEFAULT 10,
  target_referrals int NOT NULL DEFAULT 1000,
  period_days int NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.leaderboard_contests TO anon, authenticated;
GRANT ALL ON public.leaderboard_contests TO service_role;
ALTER TABLE public.leaderboard_contests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lb_contests_select_all" ON public.leaderboard_contests FOR SELECT USING (true);
CREATE POLICY "lb_contests_admin_all" ON public.leaderboard_contests
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_lb_contests_updated BEFORE UPDATE ON public.leaderboard_contests
  FOR EACH ROW EXECUTE FUNCTION public.oauth_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.leaderboard_contest_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES public.leaderboard_contests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rank int NOT NULL,
  valid_referrals int NOT NULL,
  prize_amount numeric NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  paid boolean NOT NULL DEFAULT true,
  UNIQUE (contest_id, user_id),
  UNIQUE (contest_id, rank)
);

GRANT SELECT ON public.leaderboard_contest_winners TO anon, authenticated;
GRANT ALL ON public.leaderboard_contest_winners TO service_role;
ALTER TABLE public.leaderboard_contest_winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lb_winners_select_all" ON public.leaderboard_contest_winners FOR SELECT USING (true);
CREATE POLICY "lb_winners_admin_write" ON public.leaderboard_contest_winners
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.evaluate_leaderboard_contests(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
  v_count int;
  v_winners int;
  v_next_rank int;
  v_wallet RECORD;
BEGIN
  FOR c IN
    SELECT * FROM public.leaderboard_contests
    WHERE is_active = true
      AND (ends_at IS NULL OR ends_at > now())
      AND starts_at <= now()
  LOOP
    IF EXISTS (SELECT 1 FROM public.leaderboard_contest_winners WHERE contest_id = c.id AND user_id = _user_id) THEN
      CONTINUE;
    END IF;

    SELECT COUNT(*)::int INTO v_count FROM public.influencer_referrals
      WHERE influencer_id = _user_id
        AND status = 'valid'
        AND validated_at >= now() - (c.period_days || ' days')::interval;

    IF v_count < c.target_referrals THEN CONTINUE; END IF;

    SELECT COUNT(*)::int INTO v_winners FROM public.leaderboard_contest_winners WHERE contest_id = c.id;
    IF v_winners >= c.winner_count THEN CONTINUE; END IF;

    v_next_rank := v_winners + 1;

    INSERT INTO public.leaderboard_contest_winners (contest_id, user_id, rank, valid_referrals, prize_amount)
    VALUES (c.id, _user_id, v_next_rank, v_count, c.prize_amount)
    ON CONFLICT DO NOTHING;

    IF c.prize_currency = 'NGN' THEN
      SELECT * INTO v_wallet FROM public.influencer_wallets WHERE user_id = _user_id AND status = 'active' LIMIT 1;
      IF v_wallet.id IS NOT NULL THEN
        UPDATE public.influencer_wallets SET balance = balance + c.prize_amount WHERE id = v_wallet.id;
        INSERT INTO public.influencer_wallet_transactions (user_id, source, source_id, amount, status, note)
        VALUES (_user_id, 'leaderboard_bonus', c.id, c.prize_amount, 'completed',
                format('Leaderboard bonus: %s (rank #%s)', c.title, v_next_rank));
      END IF;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_leaderboard_contests(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.mark_referral_valid(_referred_user_id uuid, _source text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref RECORD;
  v_inf_ref RECORD;
  v_wallet RECORD;
BEGIN
  SELECT * INTO v_ref FROM public.referrals
  WHERE referred_user_id = _referred_user_id AND status = 'pending' LIMIT 1;

  IF v_ref.id IS NOT NULL THEN
    UPDATE public.referrals
      SET status = 'valid', validated_at = now(), validation_source = _source
      WHERE id = v_ref.id;

    SELECT * INTO v_wallet FROM public.influencer_wallets
      WHERE user_id = v_ref.referrer_id AND status = 'active' LIMIT 1;

    IF v_wallet.id IS NULL THEN
      UPDATE public.profiles
        SET points_balance = points_balance + 1000
        WHERE id = v_ref.referrer_id;
      INSERT INTO public.waitlist_activity (user_id, action_type, positions_moved)
        VALUES (v_ref.referrer_id, 'referral_points_validated', 0);
    END IF;
  END IF;

  SELECT * INTO v_inf_ref FROM public.influencer_referrals
    WHERE referred_user_id = _referred_user_id AND status = 'pending' LIMIT 1;

  IF v_inf_ref.id IS NOT NULL THEN
    SELECT * INTO v_wallet FROM public.influencer_wallets
      WHERE user_id = v_inf_ref.influencer_id AND status = 'active' LIMIT 1;

    IF v_wallet.id IS NOT NULL THEN
      UPDATE public.influencer_wallets SET balance = balance + v_inf_ref.reward_amount
        WHERE id = v_wallet.id;
      INSERT INTO public.influencer_wallet_transactions
        (user_id, source, source_id, amount, status, note)
        VALUES (v_inf_ref.influencer_id, 'referral', v_inf_ref.id, v_inf_ref.reward_amount,
                'completed', 'Valid referral reward');
    END IF;

    UPDATE public.influencer_referrals
      SET status = 'valid', validated_at = now()
      WHERE id = v_inf_ref.id;

    PERFORM public.evaluate_leaderboard_contests(v_inf_ref.influencer_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_influencer_withdrawal(p_amount integer, p_bank_account_id uuid)
RETURNS json
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_wallet RECORD;
  v_withdrawal_id uuid;
  v_valid_count int;
  v_did_task boolean;
BEGIN
  IF v_user_id IS NULL THEN RETURN json_build_object('error', 'Not authenticated'); END IF;

  SELECT id, balance, status INTO v_wallet FROM public.influencer_wallets
  WHERE user_id = v_user_id AND status = 'active';
  IF v_wallet.id IS NULL THEN RETURN json_build_object('error', 'No active wallet found'); END IF;
  IF p_amount < 50000 THEN RETURN json_build_object('error', 'Minimum withdrawal is ₦50,000'); END IF;
  IF p_amount > v_wallet.balance THEN RETURN json_build_object('error', 'Insufficient balance'); END IF;

  SELECT public.count_valid_referrals_last_30d(v_user_id) INTO v_valid_count;
  IF v_valid_count < 100 THEN
    RETURN json_build_object('error',
      format('You need 100 valid referrals in the last 30 days to withdraw. Current: %s / 100', v_valid_count));
  END IF;

  SELECT public.influencer_completed_general_task_last_30d(v_user_id) INTO v_did_task;
  IF NOT v_did_task THEN
    RETURN json_build_object('error',
      'You must complete at least one general task (survey, spend verification, or decision task) in the last 30 days to withdraw.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.influencer_bank_accounts
    WHERE id = p_bank_account_id AND user_id = v_user_id) THEN
    RETURN json_build_object('error', 'Invalid bank account');
  END IF;

  UPDATE public.influencer_wallets SET balance = balance - p_amount WHERE id = v_wallet.id;
  INSERT INTO public.influencer_withdrawals (user_id, amount, bank_account_id)
  VALUES (v_user_id, p_amount, p_bank_account_id) RETURNING id INTO v_withdrawal_id;

  RETURN json_build_object('success', true, 'withdrawal_id', v_withdrawal_id, 'new_balance', v_wallet.balance - p_amount);
END;
$$;

INSERT INTO public.leaderboard_contests (title, description, rules, prize_amount, prize_currency, winner_count, target_referrals, period_days, is_active)
SELECT
  'Top Influencer Bonus',
  'First 10 influencers to reach 1000 valid referrals in 30 days each win a ₦1,000,000 bonus.',
  E'• Only valid referrals count (referred user must complete at least one admin-approved task).\n• Must reach 1000 valid referrals within a rolling 30-day window.\n• Bonus is credited automatically to the influencer wallet.\n• Limited to the first 10 qualifying influencers.',
  1000000, 'NGN', 10, 1000, 30, true
WHERE NOT EXISTS (SELECT 1 FROM public.leaderboard_contests);
