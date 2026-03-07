
-- Create surveys table
CREATE TABLE IF NOT EXISTS public.surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    points_reward INTEGER NOT NULL DEFAULT 0,
    completion_link TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create survey questions table
CREATE TABLE IF NOT EXISTS public.survey_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of strings
    correct_answer TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create survey responses table
CREATE TABLE IF NOT EXISTS public.survey_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    is_correct BOOLEAN DEFAULT false,
    screenshot_url TEXT,
    is_approved BOOLEAN DEFAULT false,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, survey_id)
);

-- RLS for surveys
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public surveys are viewable by everyone') THEN
        CREATE POLICY "Public surveys are viewable by everyone" ON public.surveys FOR SELECT USING (is_active = true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage surveys') THEN
        CREATE POLICY "Admins can manage surveys" ON public.surveys FOR ALL USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- RLS for survey_questions
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public survey questions are viewable by everyone') THEN
        CREATE POLICY "Public survey questions are viewable by everyone" ON public.survey_questions FOR SELECT USING (
            EXISTS (SELECT 1 FROM public.surveys WHERE id = survey_id AND is_active = true)
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage survey questions') THEN
        CREATE POLICY "Admins can manage survey questions" ON public.survey_questions FOR ALL USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- RLS for survey_responses
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own survey responses') THEN
        CREATE POLICY "Users can view their own survey responses" ON public.survey_responses FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own survey responses') THEN
        CREATE POLICY "Users can insert their own survey responses" ON public.survey_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own survey responses') THEN
        CREATE POLICY "Users can update their own survey responses" ON public.survey_responses FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all survey responses') THEN
        CREATE POLICY "Admins can manage all survey responses" ON public.survey_responses FOR ALL USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- Recalculate User Points Function
CREATE OR REPLACE FUNCTION public.recalculate_user_points(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
    total_earned INTEGER := 0;
    total_used INTEGER := 0;
    referral_pts INTEGER := 0;
    is_off_queue BOOLEAN := false;
    post_queue_ref_pts INTEGER := 1000;
BEGIN
    -- Points from Decision Responses
    SELECT COALESCE(SUM(points_awarded), 0) INTO total_earned
    FROM public.decision_responses
    WHERE user_id = target_user_id;

    -- Points from Questionnaire Responses
    total_earned := total_earned + (
        SELECT COALESCE(SUM(points_awarded), 0)
        FROM public.questionnaire_responses
        WHERE user_id = target_user_id
    );

    -- Points from Survey Responses
    total_earned := total_earned + (
        SELECT COALESCE(SUM(points_awarded), 0)
        FROM public.survey_responses
        WHERE user_id = target_user_id AND is_approved = true
    );

    -- Points from Friend Referrals (if off queue)
    SELECT (off_queue_at IS NOT NULL) INTO is_off_queue
    FROM public.profiles
    WHERE id = target_user_id;

    IF is_off_queue THEN
        SELECT COALESCE(CAST(value AS INTEGER), 1000) INTO post_queue_ref_pts
        FROM public.admin_settings
        WHERE key = 'post_queue_referral_points';

        SELECT COUNT(*) * post_queue_ref_pts INTO referral_pts
        FROM public.referrals
        WHERE referrer_id = target_user_id;

        total_earned := total_earned + referral_pts;
    END IF;

    -- Points Used (Vouchers)
    SELECT COALESCE(SUM(points_used), 0) INTO total_used
    FROM public.vouchers
    WHERE user_id = target_user_id;

    -- Update Profile
    UPDATE public.profiles
    SET points_balance = (total_earned - total_used)
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalculate All Users Points Function
CREATE OR REPLACE FUNCTION public.recalculate_all_users_points()
RETURNS VOID AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.profiles LOOP
        PERFORM public.recalculate_user_points(r.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
