
-- Surveys table
CREATE TABLE public.surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  points_reward integer NOT NULL DEFAULT 0,
  completion_link text,
  completion_instructions text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active surveys" ON public.surveys FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage surveys" ON public.surveys FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Survey questions table
CREATE TABLE public.survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read survey questions" ON public.survey_questions FOR SELECT USING (true);
CREATE POLICY "Admins can manage survey questions" ON public.survey_questions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Survey options table
CREATE TABLE public.survey_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.survey_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read survey options" ON public.survey_options FOR SELECT USING (true);
CREATE POLICY "Admins can manage survey options" ON public.survey_options FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Survey responses table
CREATE TABLE public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  screenshot_url text,
  status text NOT NULL DEFAULT 'pending',
  points_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE(user_id, survey_id)
);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own responses" ON public.survey_responses FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all responses" ON public.survey_responses FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for survey screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('survey_screenshots', 'survey_screenshots', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'survey_screenshots');
CREATE POLICY "Users can upload own survey screenshots" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'survey_screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Admins can manage survey screenshots" ON storage.objects FOR ALL USING (
  bucket_id = 'survey_screenshots' AND
  public.has_role(auth.uid(), 'admin')
);
