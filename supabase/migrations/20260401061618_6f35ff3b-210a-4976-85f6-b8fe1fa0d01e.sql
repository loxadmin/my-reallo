
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
  
  input_referral := NEW.raw_user_meta_data ->> 'referral_code';
  
  IF input_referral IS NOT NULL AND input_referral != '' THEN
    SELECT id, queue_position, off_queue_at INTO referrer_record
    FROM public.profiles
    WHERE referral_code = upper(input_referral);
    
    IF referrer_record.id IS NOT NULL THEN
      UPDATE public.profiles SET referred_by = referrer_record.id WHERE id = NEW.id;
      
      -- Check if referrer is off-queue: award 1000 points instead of queue skip
      IF referrer_record.queue_position <= 0 AND referrer_record.off_queue_at IS NOT NULL THEN
        UPDATE public.profiles 
        SET points_balance = points_balance + 1000
        WHERE id = referrer_record.id;
        
        INSERT INTO public.waitlist_activity (user_id, action_type, positions_moved)
        VALUES (referrer_record.id, 'referral_points', 0);
      ELSE
        UPDATE public.profiles 
        SET queue_position = GREATEST(1, referrer_record.queue_position - 20)
        WHERE id = referrer_record.id;
        
        INSERT INTO public.waitlist_activity (user_id, action_type, positions_moved)
        VALUES (referrer_record.id, 'referral', 20);
      END IF;
      
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
