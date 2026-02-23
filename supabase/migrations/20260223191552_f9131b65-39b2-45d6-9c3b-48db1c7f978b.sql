
-- Fix search_path on functions
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_next_queue_position()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ghost_count INTEGER;
  user_count INTEGER;
  next_pos INTEGER;
BEGIN
  SELECT COUNT(*) INTO ghost_count FROM ghost_users;
  SELECT COUNT(*) INTO user_count FROM profiles WHERE queue_position > 0;
  next_pos := (user_count + 1) * 100 + 1;
  IF next_pos > 2000 THEN
    next_pos := ghost_count + user_count + 1;
  END IF;
  RETURN next_pos;
END;
$$;
