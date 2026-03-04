ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  ref_code TEXT;
  queue_pos INTEGER;
  full_nm TEXT;
BEGIN
  SELECT generate_referral_code() INTO ref_code;
  SELECT get_next_queue_position() INTO queue_pos;

  -- Extract full_name from metadata if provided during signup
  full_nm := NEW.raw_user_meta_data->>'full_name';

  INSERT INTO public.profiles (id, email, referral_code, queue_position, full_name)
  VALUES (NEW.id, NEW.email, ref_code, queue_pos, full_nm);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
