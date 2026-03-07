-- Surveys table
CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  points_reward INTEGER NOT NULL DEFAULT 0,
  completion_link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Survey Questions table
CREATE TABLE public.survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of strings
  correct_answer TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Survey Responses table
CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'answered_correctly', 'screenshot_uploaded', 'approved', 'rejected')),
  screenshot_url TEXT,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, survey_id)
);

-- Enable RLS
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- RLS for surveys
CREATE POLICY "Anyone can read active surveys" ON public.surveys
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage surveys" ON public.surveys
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS for survey_questions
CREATE POLICY "Anyone can read survey questions" ON public.survey_questions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage survey questions" ON public.survey_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS for survey_responses
CREATE POLICY "Users can read own survey responses" ON public.survey_responses
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own survey responses" ON public.survey_responses
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own survey responses" ON public.survey_responses
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all survey responses" ON public.survey_responses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Points Recalculation RPCs
CREATE OR REPLACE FUNCTION public.recalculate_user_points(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_points INTEGER := 0;
  decision_pts INTEGER := 0;
  questionnaire_pts INTEGER := 0;
  survey_pts INTEGER := 0;
  referral_pts INTEGER := 0;
  used_pts INTEGER := 0;
  is_off_queue BOOLEAN := false;
  off_queue_date TIMESTAMPTZ;
  ref_pts_setting INTEGER := 1000;
BEGIN
  -- Sum decision response points
  SELECT COALESCE(SUM(points_awarded), 0) INTO decision_pts
  FROM public.decision_responses
  WHERE user_id = target_user_id;

  -- Sum questionnaire response points
  SELECT COALESCE(SUM(points_awarded), 0) INTO questionnaire_pts
  FROM public.questionnaire_responses
  WHERE user_id = target_user_id;

  -- Sum survey response points
  SELECT COALESCE(SUM(points_awarded), 0) INTO survey_pts
  FROM public.survey_responses
  WHERE user_id = target_user_id;

  -- Check if off queue
  SELECT (queue_position <= 0), off_queue_at INTO is_off_queue, off_queue_date
  FROM public.profiles
  WHERE id = target_user_id;

  -- Get referral points setting
  SELECT COALESCE(value::INTEGER, 1000) INTO ref_pts_setting
  FROM public.admin_settings
  WHERE key = 'post_queue_referral_points';

  -- Add referral points if off queue
  IF is_off_queue THEN
    SELECT COUNT(*) * ref_pts_setting INTO referral_pts
    FROM public.referrals
    WHERE referrer_id = target_user_id;
  END IF;

  -- Sum used points from vouchers
  SELECT COALESCE(SUM(points_used), 0) INTO used_pts
  FROM public.vouchers
  WHERE user_id = target_user_id;

  -- Calculate final balance
  total_points := decision_pts + questionnaire_pts + survey_pts + referral_pts - used_pts;

  -- Update profile
  UPDATE public.profiles
  SET points_balance = GREATEST(0, total_points)
  WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_all_users_points()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM public.profiles LOOP
    PERFORM public.recalculate_user_points(user_record.id);
  END LOOP;
END;
$$;
