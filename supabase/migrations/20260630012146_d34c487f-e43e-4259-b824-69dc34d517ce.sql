
-- Seed admin_settings toggles for queue and ghost users (idempotent)
INSERT INTO public.admin_settings (key, value, updated_at)
VALUES
  ('queue_enabled', 'true', now()),
  ('ghost_users_enabled', 'true', now())
ON CONFLICT (key) DO NOTHING;

-- Update handle_new_user to respect queue_enabled toggle
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
      UPDATE public.profiles SET referred_by = referrer_record.id WHERE id = NEW.id;

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
