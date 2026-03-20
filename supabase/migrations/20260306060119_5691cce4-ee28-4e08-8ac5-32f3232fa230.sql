
-- Add switch_to_referral_app_ids column for robust category
ALTER TABLE public.decision_apps ADD COLUMN IF NOT EXISTS switch_to_referral_app_ids uuid[] DEFAULT '{}';

-- Update handle_new_user to change referral skip from 5 to 20
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
    SELECT id, queue_position INTO referrer_record
    FROM public.profiles
    WHERE referral_code = upper(input_referral);
    
    IF referrer_record.id IS NOT NULL THEN
      UPDATE public.profiles SET referred_by = referrer_record.id WHERE id = NEW.id;
      
      UPDATE public.profiles 
      SET queue_position = GREATEST(1, referrer_record.queue_position - 20)
      WHERE id = referrer_record.id;
      
      INSERT INTO public.referrals (referrer_id, referred_user_id)
      VALUES (referrer_record.id, NEW.id);
      
      INSERT INTO public.waitlist_activity (user_id, action_type, positions_moved)
      VALUES (referrer_record.id, 'referral', 20);
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$function$;

-- Add footer settings
INSERT INTO public.admin_settings (key, value) VALUES 
  ('footer_contact_us', 'Contact us at support@karbali.com'),
  ('footer_about_us', 'Karbali helps you reclaim your utility spend toward life goals.'),
  ('footer_invest_with_us', 'Interested in investing? Reach out to invest@karbali.com')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Add off_queue_at column to profiles to track when user got off queue
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS off_queue_at timestamp with time zone DEFAULT NULL;

-- Add spend_verified column to profiles for quick check
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS spend_verified boolean DEFAULT false;
