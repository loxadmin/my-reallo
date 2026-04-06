
-- Enable RLS on the 5 tables that are missing it
ALTER TABLE public.influencer_survey_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- influencer_surveys: anyone authenticated can read active surveys
CREATE POLICY "Authenticated users can read active influencer surveys"
  ON public.influencer_surveys FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage influencer surveys"
  ON public.influencer_surveys FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- influencer_survey_questions: read if survey is active
CREATE POLICY "Authenticated users can read influencer survey questions"
  ON public.influencer_survey_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.influencer_surveys s WHERE s.id = survey_id AND s.is_active = true));

CREATE POLICY "Admins can manage influencer survey questions"
  ON public.influencer_survey_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- influencer_survey_options: read if survey is active
CREATE POLICY "Authenticated users can read influencer survey options"
  ON public.influencer_survey_options FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.influencer_survey_questions q JOIN public.influencer_surveys s ON s.id = q.survey_id WHERE q.id = question_id AND s.is_active = true));

CREATE POLICY "Admins can manage influencer survey options"
  ON public.influencer_survey_options FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- influencer_survey_responses: users can only see/create their own
CREATE POLICY "Users can read own influencer survey responses"
  ON public.influencer_survey_responses FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own influencer survey responses"
  ON public.influencer_survey_responses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own influencer survey responses"
  ON public.influencer_survey_responses FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all influencer survey responses"
  ON public.influencer_survey_responses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- influencer_wallet_transactions: users can only see their own
CREATE POLICY "Users can read own wallet transactions"
  ON public.influencer_wallet_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all wallet transactions"
  ON public.influencer_wallet_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
