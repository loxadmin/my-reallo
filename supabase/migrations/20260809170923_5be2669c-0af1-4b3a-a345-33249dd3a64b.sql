ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_path text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_bonus_awarded boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.award_onboarding_bonus()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid(); v_p RECORD;
BEGIN
  IF v_uid IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT * INTO v_p FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_p.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'No profile'); END IF;
  IF v_p.onboarding_bonus_awarded THEN RETURN json_build_object('success', true, 'already', true); END IF;
  UPDATE public.profiles
    SET points_balance = points_balance + 4000, onboarding_bonus_awarded = true
    WHERE id = v_uid;
  RETURN json_build_object('success', true, 'points', 4000);
END $$;

GRANT EXECUTE ON FUNCTION public.award_onboarding_bonus() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ref_code TEXT;
  queue_pos INTEGER;
  input_referral TEXT;
  referrer_record RECORD;
  input_account_type TEXT;
  v_queue_enabled BOOLEAN;
BEGIN
  SELECT generate_referral_code() INTO ref_code;

  SELECT (value <> 'false') INTO v_queue_enabled
    FROM public.admin_settings WHERE key = 'queue_enabled';
  v_queue_enabled := COALESCE(v_queue_enabled, true);

  IF v_queue_enabled THEN
    SELECT get_next_queue_position() INTO queue_pos;
  ELSE
    queue_pos := 0;
  END IF;

  input_account_type := COALESCE(NEW.raw_user_meta_data ->> 'account_type', 'personal');
  IF input_account_type NOT IN ('personal','business') THEN
    input_account_type := 'personal';
  END IF;

  INSERT INTO public.profiles (id, email, referral_code, queue_position, off_queue_at, account_type)
  VALUES (NEW.id, NEW.email, ref_code, queue_pos,
          CASE WHEN queue_pos <= 0 THEN now() ELSE NULL END,
          input_account_type);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  input_referral := NEW.raw_user_meta_data ->> 'referral_code';

  IF input_referral IS NOT NULL AND input_referral != '' THEN
    SELECT id, queue_position, off_queue_at INTO referrer_record
    FROM public.profiles
    WHERE referral_code = upper(input_referral);

    IF referrer_record.id IS NOT NULL THEN
      -- referred user gets a NGN 2,000 equivalent signup bonus (4,000 points)
      UPDATE public.profiles
        SET referred_by = referrer_record.id,
            points_balance = points_balance + 4000,
            signup_bonus_awarded = true
        WHERE id = NEW.id;

      IF v_queue_enabled AND NOT (referrer_record.queue_position <= 0 AND referrer_record.off_queue_at IS NOT NULL) THEN
        UPDATE public.profiles
          SET queue_position = GREATEST(1, referrer_record.queue_position - 20)
          WHERE id = referrer_record.id;
        INSERT INTO public.waitlist_activity (user_id, action_type, positions_moved)
          VALUES (referrer_record.id, 'referral', 20);
      END IF;

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