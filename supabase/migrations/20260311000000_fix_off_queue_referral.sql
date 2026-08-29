
-- Fix off-queue referral logic in handle_new_user
-- Ensure users who are off-queue aren't put back on the queue
-- and non-influencers off-queue receive 1000 points

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
  is_off_queue BOOLEAN;
  is_influencer BOOLEAN;
BEGIN
  -- Generate personal referral code and next queue position for the new user
  SELECT generate_referral_code() INTO ref_code;
  SELECT get_next_queue_position() INTO queue_pos;

  -- Create the new profile
  INSERT INTO public.profiles (id, email, referral_code, queue_position)
  VALUES (NEW.id, NEW.email, ref_code, queue_pos);

  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Process referral if provided
  input_referral := NEW.raw_user_meta_data ->> 'referral_code';

  IF input_referral IS NOT NULL AND input_referral != '' THEN
    SELECT id, queue_position, points_balance, off_queue_at INTO referrer_record
    FROM public.profiles
    WHERE referral_code = upper(input_referral);

    IF referrer_record.id IS NOT NULL AND referrer_record.id != NEW.id THEN
      -- Mark who referred the new user
      UPDATE public.profiles SET referred_by = referrer_record.id WHERE id = NEW.id;

      -- Determine if referrer is off-queue
      is_off_queue := (referrer_record.queue_position = 0 OR referrer_record.off_queue_at IS NOT NULL);

      IF is_off_queue THEN
        -- Check if referrer is an approved influencer
        SELECT EXISTS (
          SELECT 1 FROM public.influencer_applications
          WHERE user_id = referrer_record.id AND status = 'approved'
        ) INTO is_influencer;

        IF NOT is_influencer THEN
          -- Award 1000 points to off-queue non-influencers
          UPDATE public.profiles
          SET points_balance = COALESCE(points_balance, 0) + 1000
          WHERE id = referrer_record.id;
        END IF;

        -- Record waitlist activity with 0 positions moved
        INSERT INTO public.waitlist_activity (user_id, action_type, positions_moved)
        VALUES (referrer_record.id, 'referral', 0);
      ELSE
        -- Referrer is still on queue, move them up
        UPDATE public.profiles
        SET queue_position = GREATEST(1, referrer_record.queue_position - 20)
        WHERE id = referrer_record.id;

        -- Record waitlist activity with 20 positions moved
        INSERT INTO public.waitlist_activity (user_id, action_type, positions_moved)
        VALUES (referrer_record.id, 'referral', 20);
      END IF;

      -- Record the referral relationship
      INSERT INTO public.referrals (referrer_id, referred_user_id)
      VALUES (referrer_record.id, NEW.id);
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$function$;
