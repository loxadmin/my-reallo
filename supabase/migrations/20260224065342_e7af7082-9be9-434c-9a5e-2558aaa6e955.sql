
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
BEGIN
  SELECT generate_referral_code() INTO ref_code;
  SELECT get_next_queue_position() INTO queue_pos;
  
  INSERT INTO public.profiles (id, email, referral_code, queue_position)
  VALUES (NEW.id, NEW.email, ref_code, queue_pos);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Handle referral from user metadata
  input_referral := NEW.raw_user_meta_data ->> 'referral_code';
  
  IF input_referral IS NOT NULL AND input_referral != '' THEN
    SELECT id, queue_position INTO referrer_record
    FROM public.profiles
    WHERE referral_code = upper(input_referral);
    
    IF referrer_record.id IS NOT NULL THEN
      -- Set referred_by on new user
      UPDATE public.profiles SET referred_by = referrer_record.id WHERE id = NEW.id;
      
      -- Move referrer up 5 positions
      UPDATE public.profiles 
      SET queue_position = GREATEST(1, referrer_record.queue_position - 5)
      WHERE id = referrer_record.id;
      
      -- Record the referral
      INSERT INTO public.referrals (referrer_id, referred_user_id)
      VALUES (referrer_record.id, NEW.id);
      
      -- Log activity
      INSERT INTO public.waitlist_activity (user_id, action_type, positions_moved)
      VALUES (referrer_record.id, 'referral', 5);
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$function$;
