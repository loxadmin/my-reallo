
-- 1. Add status to referrals
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS validation_source text;

ALTER TABLE public.influencer_referrals
  ADD COLUMN IF NOT EXISTS validated_at timestamptz;

-- Change influencer_referrals default status from 'credited' to 'pending'
ALTER TABLE public.influencer_referrals ALTER COLUMN status SET DEFAULT 'pending';

-- 2. mark_referral_valid (idempotent)
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
  -- Regular referral
  SELECT * INTO v_ref FROM public.referrals
  WHERE referred_user_id = _referred_user_id AND status = 'pending'
  LIMIT 1;

  IF v_ref.id IS NOT NULL THEN
    UPDATE public.referrals
      SET status = 'valid', validated_at = now(), validation_source = _source
      WHERE id = v_ref.id;

    -- Credit referrer points (only for non-influencer referrers; influencer wallet handled below)
    -- We always credit 1000 pts to the referrer profile here ONLY if there is no active influencer wallet.
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

  -- Influencer referral
  SELECT * INTO v_inf_ref FROM public.influencer_referrals
    WHERE referred_user_id = _referred_user_id AND status = 'pending'
    LIMIT 1;

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
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_referral_valid(uuid, text) TO authenticated, service_role;

-- 3. count_valid_referrals_last_30d
CREATE OR REPLACE FUNCTION public.count_valid_referrals_last_30d(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.influencer_referrals
  WHERE influencer_id = _user_id
    AND status = 'valid'
    AND validated_at >= now() - interval '30 days';
$$;

GRANT EXECUTE ON FUNCTION public.count_valid_referrals_last_30d(uuid) TO authenticated, service_role;

-- 4. Update handle_new_user: do NOT credit points immediately; insert pending referral
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  ref_code TEXT;
  queue_pos INTEGER;
  input_referral TEXT;
  referrer_record RECORD;
  input_account_type TEXT;
BEGIN
  SELECT generate_referral_code() INTO ref_code;
  SELECT get_next_queue_position() INTO queue_pos;

  input_account_type := COALESCE(NEW.raw_user_meta_data ->> 'account_type', 'personal');
  IF input_account_type NOT IN ('personal','business') THEN
    input_account_type := 'personal';
  END IF;

  INSERT INTO public.profiles (id, email, referral_code, queue_position, account_type)
  VALUES (NEW.id, NEW.email, ref_code, queue_pos, input_account_type);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  input_referral := NEW.raw_user_meta_data ->> 'referral_code';

  IF input_referral IS NOT NULL AND input_referral != '' THEN
    SELECT id, queue_position, off_queue_at INTO referrer_record
    FROM public.profiles
    WHERE referral_code = upper(input_referral);

    IF referrer_record.id IS NOT NULL THEN
      UPDATE public.profiles SET referred_by = referrer_record.id WHERE id = NEW.id;

      -- Queue skip stays immediate (queue mechanic, not monetary reward)
      IF NOT (referrer_record.queue_position <= 0 AND referrer_record.off_queue_at IS NOT NULL) THEN
        UPDATE public.profiles
          SET queue_position = GREATEST(1, referrer_record.queue_position - 20)
          WHERE id = referrer_record.id;
        INSERT INTO public.waitlist_activity (user_id, action_type, positions_moved)
          VALUES (referrer_record.id, 'referral', 20);
      END IF;

      -- Pending referral row (points/wallet credit deferred until referred user completes a task)
      INSERT INTO public.referrals (referrer_id, referred_user_id, status)
      VALUES (referrer_record.id, NEW.id, 'pending');
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$function$;

-- 5. Update credit_influencer_referral trigger: insert pending row, don't credit yet
CREATE OR REPLACE FUNCTION public.credit_influencer_referral()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  referrer_id_val uuid;
  inf_wallet RECORD;
BEGIN
  SELECT referred_by INTO referrer_id_val FROM public.profiles WHERE id = NEW.referred_user_id;

  IF referrer_id_val IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO inf_wallet FROM public.influencer_wallets
    WHERE user_id = referrer_id_val AND status = 'active';

  IF inf_wallet.id IS NOT NULL THEN
    -- Insert as pending; mark_referral_valid will credit when the referred user completes a task
    INSERT INTO public.influencer_referrals (influencer_id, referred_user_id, reward_amount, status)
    VALUES (referrer_id_val, NEW.referred_user_id, 500, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'credit_influencer_referral error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$function$;

-- 6. Task-approval triggers calling mark_referral_valid
CREATE OR REPLACE FUNCTION public.trg_survey_response_validate_referral()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.mark_referral_valid(NEW.user_id, 'survey');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS survey_response_validate_referral ON public.survey_responses;
CREATE TRIGGER survey_response_validate_referral
  AFTER INSERT OR UPDATE ON public.survey_responses
  FOR EACH ROW EXECUTE FUNCTION public.trg_survey_response_validate_referral();

CREATE OR REPLACE FUNCTION public.trg_spend_verification_validate_referral()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.mark_referral_valid(NEW.user_id, 'spend');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS spend_verification_validate_referral ON public.spend_verifications;
CREATE TRIGGER spend_verification_validate_referral
  AFTER INSERT OR UPDATE ON public.spend_verifications
  FOR EACH ROW EXECUTE FUNCTION public.trg_spend_verification_validate_referral();

CREATE OR REPLACE FUNCTION public.trg_decision_response_validate_referral()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referral_approved = true AND (TG_OP = 'INSERT' OR OLD.referral_approved IS DISTINCT FROM NEW.referral_approved) THEN
    PERFORM public.mark_referral_valid(NEW.user_id, 'decision');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS decision_response_validate_referral ON public.decision_responses;
CREATE TRIGGER decision_response_validate_referral
  AFTER INSERT OR UPDATE ON public.decision_responses
  FOR EACH ROW EXECUTE FUNCTION public.trg_decision_response_validate_referral();

CREATE OR REPLACE FUNCTION public.trg_challenge_submission_validate_referral()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.mark_referral_valid(NEW.user_id, 'challenge');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS challenge_submission_validate_referral ON public.influencer_challenge_submissions;
CREATE TRIGGER challenge_submission_validate_referral
  AFTER INSERT OR UPDATE ON public.influencer_challenge_submissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_challenge_submission_validate_referral();

-- 7. Update request_influencer_withdrawal with 100/30d target
CREATE OR REPLACE FUNCTION public.request_influencer_withdrawal(p_amount integer, p_bank_account_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_wallet RECORD;
  v_withdrawal_id uuid;
  v_valid_count int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  SELECT id, balance, status INTO v_wallet
  FROM public.influencer_wallets
  WHERE user_id = v_user_id AND status = 'active';

  IF v_wallet.id IS NULL THEN
    RETURN json_build_object('error', 'No active wallet found');
  END IF;

  IF p_amount < 50000 THEN
    RETURN json_build_object('error', 'Minimum withdrawal is ₦50,000');
  END IF;

  IF p_amount > v_wallet.balance THEN
    RETURN json_build_object('error', 'Insufficient balance');
  END IF;

  SELECT public.count_valid_referrals_last_30d(v_user_id) INTO v_valid_count;
  IF v_valid_count < 100 THEN
    RETURN json_build_object(
      'error',
      format('You need 100 valid referrals in the last 30 days to withdraw. Current: %s / 100', v_valid_count)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.influencer_bank_accounts
    WHERE id = p_bank_account_id AND user_id = v_user_id
  ) THEN
    RETURN json_build_object('error', 'Invalid bank account');
  END IF;

  UPDATE public.influencer_wallets
  SET balance = balance - p_amount
  WHERE id = v_wallet.id;

  INSERT INTO public.influencer_withdrawals (user_id, amount, bank_account_id)
  VALUES (v_user_id, p_amount, p_bank_account_id)
  RETURNING id INTO v_withdrawal_id;

  RETURN json_build_object('success', true, 'withdrawal_id', v_withdrawal_id, 'new_balance', v_wallet.balance - p_amount);
END;
$function$;

-- 8. Backfill existing referrals where the referred user already has approved tasks
UPDATE public.referrals r
SET status = 'valid', validated_at = COALESCE(validated_at, now()), validation_source = COALESCE(validation_source, 'backfill')
WHERE status = 'pending'
  AND (
    EXISTS (SELECT 1 FROM public.survey_responses sr WHERE sr.user_id = r.referred_user_id AND sr.status = 'approved')
    OR EXISTS (SELECT 1 FROM public.spend_verifications sv WHERE sv.user_id = r.referred_user_id AND sv.status = 'approved')
    OR EXISTS (SELECT 1 FROM public.decision_responses dr WHERE dr.user_id = r.referred_user_id AND dr.referral_approved = true)
    OR EXISTS (SELECT 1 FROM public.influencer_challenge_submissions cs WHERE cs.user_id = r.referred_user_id AND cs.status = 'approved')
  );

UPDATE public.influencer_referrals ir
SET status = 'valid', validated_at = COALESCE(validated_at, now())
WHERE status IN ('pending','credited')
  AND (
    EXISTS (SELECT 1 FROM public.survey_responses sr WHERE sr.user_id = ir.referred_user_id AND sr.status = 'approved')
    OR EXISTS (SELECT 1 FROM public.spend_verifications sv WHERE sv.user_id = ir.referred_user_id AND sv.status = 'approved')
    OR EXISTS (SELECT 1 FROM public.decision_responses dr WHERE dr.user_id = ir.referred_user_id AND dr.referral_approved = true)
    OR EXISTS (SELECT 1 FROM public.influencer_challenge_submissions cs WHERE cs.user_id = ir.referred_user_id AND cs.status = 'approved')
  );
