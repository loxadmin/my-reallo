
-- Monthly earners program
CREATE TABLE public.monthly_earners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  cycle_index int NOT NULL DEFAULT 1,
  cycle_start timestamptz NOT NULL DEFAULT now(),
  cycle_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  target_referrals int NOT NULL DEFAULT 40,
  last_cycle_referrals int NOT NULL DEFAULT 0,
  contact_phone text,
  terminated_at timestamptz,
  termination_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.monthly_earners TO authenticated;
GRANT ALL ON public.monthly_earners TO service_role;
ALTER TABLE public.monthly_earners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own monthly earner record" ON public.monthly_earners
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own contact phone" ON public.monthly_earners
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage monthly earners" ON public.monthly_earners
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_monthly_earners_updated_at BEFORE UPDATE ON public.monthly_earners
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_generic();

-- Task / contest targeting
ALTER TABLE public.influencer_challenges
  ADD COLUMN IF NOT EXISTS program text NOT NULL DEFAULT 'influencer',
  ADD COLUMN IF NOT EXISTS proof_type text NOT NULL DEFAULT 'video',
  ADD COLUMN IF NOT EXISTS min_views int NOT NULL DEFAULT 0;

ALTER TABLE public.leaderboard_contests
  ADD COLUMN IF NOT EXISTS program text NOT NULL DEFAULT 'influencer',
  ADD COLUMN IF NOT EXISTS prize_description text,
  ADD COLUMN IF NOT EXISTS requires_contact boolean NOT NULL DEFAULT false;

ALTER TABLE public.leaderboard_contest_winners
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_submitted_at timestamptz;

CREATE POLICY "Winners submit contact phone" ON public.leaderboard_contest_winners
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Cycle referral count
CREATE OR REPLACE FUNCTION public.monthly_earner_cycle_referrals(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COUNT(*)::int FROM public.influencer_referrals ir
  JOIN public.monthly_earners me ON me.user_id = ir.influencer_id
  WHERE ir.influencer_id = _user_id
    AND ir.status = 'valid'
    AND ir.validated_at >= me.cycle_start
    AND ir.validated_at < me.cycle_end;
$$;

-- Join the program
CREATE OR REPLACE FUNCTION public.join_monthly_earner_program()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid(); v_row RECORD;
BEGIN
  IF v_uid IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT * INTO v_row FROM public.monthly_earners WHERE user_id = v_uid;
  IF v_row.id IS NOT NULL THEN
    IF v_row.status = 'terminated' THEN
      RETURN json_build_object('success', false, 'error', 'You are no longer eligible for the Monthly Earners programme.');
    END IF;
    RETURN json_build_object('success', true, 'already', true);
  END IF;

  INSERT INTO public.monthly_earners (user_id) VALUES (v_uid);

  INSERT INTO public.influencer_wallets (user_id, status)
  VALUES (v_uid, 'active')
  ON CONFLICT (user_id) DO UPDATE SET status = 'active';

  RETURN json_build_object('success', true);
END;
$$;

-- Cycle evaluation (idempotent, safe to run often)
CREATE OR REPLACE FUNCTION public.evaluate_monthly_earner_cycles()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me RECORD; v_count int; v_bonus int; v_processed int := 0; v_wallet RECORD;
BEGIN
  FOR me IN SELECT * FROM public.monthly_earners WHERE status = 'active' AND cycle_end <= now() LOOP
    SELECT COUNT(*)::int INTO v_count FROM public.influencer_referrals
      WHERE influencer_id = me.user_id AND status = 'valid'
        AND validated_at >= me.cycle_start AND validated_at < me.cycle_end;

    IF v_count < 40 THEN
      UPDATE public.monthly_earners
        SET status = 'terminated', terminated_at = now(), last_cycle_referrals = v_count,
            termination_reason = format('Only %s valid referrals in the cycle (minimum is 40)', v_count)
        WHERE id = me.id;
      UPDATE public.influencer_wallets SET status = 'closed'
        WHERE user_id = me.user_id AND status = 'active'
          AND NOT EXISTS (SELECT 1 FROM public.influencer_applications
                          WHERE user_id = me.user_id AND status = 'approved');
    ELSE
      IF v_count >= me.target_referrals THEN
        v_bonus := ROUND(v_count * 500 * 0.20);
        SELECT * INTO v_wallet FROM public.influencer_wallets WHERE user_id = me.user_id AND status = 'active' LIMIT 1;
        IF v_wallet.id IS NOT NULL AND v_bonus > 0 THEN
          UPDATE public.influencer_wallets SET balance = balance + v_bonus WHERE id = v_wallet.id;
          INSERT INTO public.influencer_wallet_transactions (user_id, source, source_id, amount, status, note)
          VALUES (me.user_id, 'monthly_earner_bonus', me.id, v_bonus, 'completed',
                  format('20%% monthly earner bonus on %s valid referrals', v_count));
        END IF;
      END IF;

      UPDATE public.monthly_earners
        SET cycle_index = me.cycle_index + 1,
            cycle_start = me.cycle_end,
            cycle_end = me.cycle_end + interval '30 days',
            last_cycle_referrals = v_count,
            target_referrals = GREATEST(40, v_count)
        WHERE id = me.id;
    END IF;

    v_processed := v_processed + 1;
  END LOOP;

  RETURN v_processed;
END;
$$;
