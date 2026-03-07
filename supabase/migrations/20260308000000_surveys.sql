
-- Create surveys table
CREATE TABLE IF NOT EXISTS public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  points_reward INTEGER NOT NULL DEFAULT 0,
  completion_link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create survey_questions table
CREATE TABLE IF NOT EXISTS public.survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_option TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create survey_responses table
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE,
  screenshot_url TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Surveys Policies
CREATE POLICY "Public surveys are viewable by everyone" ON public.surveys
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage surveys" ON public.surveys
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Survey Questions Policies
CREATE POLICY "Questions are viewable by everyone" ON public.survey_questions
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND (s.is_active = true OR public.has_role(auth.uid(), 'admin'))));

CREATE POLICY "Admins can manage survey questions" ON public.survey_questions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Survey Responses Policies
CREATE POLICY "Users can view their own survey responses" ON public.survey_responses
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own survey responses" ON public.survey_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage survey responses" ON public.survey_responses
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for survey screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('survey_screenshots', 'survey_screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for survey_screenshots
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'survey_screenshots');

CREATE POLICY "Users can upload survey screenshots" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'survey_screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can manage survey screenshots" ON storage.objects FOR ALL USING (
  bucket_id = 'survey_screenshots' AND
  public.has_role(auth.uid(), 'admin')
);
