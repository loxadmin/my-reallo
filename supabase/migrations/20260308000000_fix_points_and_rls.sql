
-- Add RLS policy to allow admins to update all profiles
-- This is still useful for general admin tasks, even though RPCs use SECURITY DEFINER
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'profiles' AND policyname = 'Admins can update all profiles'
    ) THEN
        CREATE POLICY "Admins can update all profiles" ON public.profiles
        FOR UPDATE USING (public.has_role(auth.uid(), 'admin'))
        WITH CHECK (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- Function to recalculate a specific user's points
CREATE OR REPLACE FUNCTION public.recalculate_user_points(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_decision_points INTEGER;
  total_questionnaire_points INTEGER;
  total_voucher_points INTEGER;
  total_friend_referral_points INTEGER;
  p_post_queue_points INTEGER;
  p_is_off_queue BOOLEAN;
  new_balance INTEGER;
BEGIN
  -- Security check: only admin or the user themselves can call this
  IF NOT (
    public.has_role(auth.uid(), 'admin') OR
    auth.uid() = target_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get friend referral points setting (default to 1000 if not set)
  SELECT COALESCE(value::INTEGER, 1000) INTO p_post_queue_points
  FROM public.admin_settings
  WHERE key = 'post_queue_referral_points';

  -- Check if user is off-queue (position 0 or less)
  SELECT (queue_position <= 0) INTO p_is_off_queue
  FROM public.profiles
  WHERE id = target_user_id;

  -- Sum points from decision responses (includes: selection, intent, completion, and referral app approval)
  SELECT COALESCE(SUM(points_awarded), 0) INTO total_decision_points
  FROM public.decision_responses
  WHERE user_id = target_user_id;

  -- Sum points from questionnaire responses
  SELECT COALESCE(SUM(points_awarded), 0) INTO total_questionnaire_points
  FROM public.questionnaire_responses
  WHERE user_id = target_user_id;

  -- Sum points from friend referrals (only award points if user is off-queue)
  IF p_is_off_queue THEN
    SELECT COALESCE(COUNT(*), 0) * p_post_queue_points INTO total_friend_referral_points
    FROM public.referrals
    WHERE referrer_id = target_user_id;
  ELSE
    total_friend_referral_points := 0;
  END IF;

  -- Sum points used from vouchers
  SELECT COALESCE(SUM(points_used), 0) INTO total_voucher_points
  FROM public.vouchers
  WHERE user_id = target_user_id;

  -- Calculate new balance
  new_balance := total_decision_points + total_questionnaire_points + total_friend_referral_points - total_voucher_points;

  -- Update user's profile
  UPDATE public.profiles
  SET points_balance = new_balance
  WHERE id = target_user_id;
END;
$$;

-- Function to recalculate all users' points
CREATE OR REPLACE FUNCTION public.recalculate_all_users_points()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Security check: only admin can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR user_record IN SELECT id FROM public.profiles LOOP
    PERFORM public.recalculate_user_points(user_record.id);
  END LOOP;
END;
$$;
