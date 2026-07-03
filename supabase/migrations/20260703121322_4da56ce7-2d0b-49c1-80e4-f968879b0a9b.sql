
-- Onboarding question categories
CREATE TABLE public.onboarding_question_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.onboarding_question_categories TO authenticated;
GRANT ALL ON public.onboarding_question_categories TO service_role;
ALTER TABLE public.onboarding_question_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read categories" ON public.onboarding_question_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage categories" ON public.onboarding_question_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Onboarding questions
CREATE TABLE public.onboarding_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.onboarding_question_categories(id) ON DELETE SET NULL,
  prompt text NOT NULL,
  question_type text NOT NULL DEFAULT 'text',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  tag_key text NOT NULL,
  required boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.onboarding_questions TO authenticated;
GRANT ALL ON public.onboarding_questions TO service_role;
ALTER TABLE public.onboarding_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read questions" ON public.onboarding_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage questions" ON public.onboarding_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Brand catalog
CREATE TABLE public.brand_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'other',
  country text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brand_catalog TO authenticated;
GRANT ALL ON public.brand_catalog TO service_role;
ALTER TABLE public.brand_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read brands" ON public.brand_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage brands" ON public.brand_catalog FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User behavior profile
CREATE TABLE public.user_behavior_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  segments text[] NOT NULL DEFAULT '{}',
  brands_used text[] NOT NULL DEFAULT '{}',
  spending_habits text[] NOT NULL DEFAULT '{}',
  task_capabilities text[] NOT NULL DEFAULT '{}',
  financial jsonb NOT NULL DEFAULT '{}'::jsonb,
  country text,
  state text,
  city text,
  age_group text,
  occupation text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_behavior_profile TO authenticated;
GRANT ALL ON public.user_behavior_profile TO service_role;
ALTER TABLE public.user_behavior_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.user_behavior_profile FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin read profile" ON public.user_behavior_profile FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Onboarding answers
CREATE TABLE public.user_onboarding_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.onboarding_questions(id) ON DELETE SET NULL,
  tag_key text NOT NULL,
  answer jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_onboarding_answers TO authenticated;
GRANT ALL ON public.user_onboarding_answers TO service_role;
ALTER TABLE public.user_onboarding_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own answers" ON public.user_onboarding_answers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin read answers" ON public.user_onboarding_answers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Goal ideas
CREATE TABLE public.goal_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  typical_target_min bigint,
  typical_target_max bigint,
  tags text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.goal_ideas TO authenticated;
GRANT ALL ON public.goal_ideas TO service_role;
ALTER TABLE public.goal_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read goal ideas" ON public.goal_ideas FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage goal ideas" ON public.goal_ideas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User goals (dynamic, user-set)
CREATE TABLE public.user_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text,
  target_amount bigint NOT NULL DEFAULT 0,
  target_date date,
  status text NOT NULL DEFAULT 'active',
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_goals TO authenticated;
GRANT ALL ON public.user_goals TO service_role;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals" ON public.user_goals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin read goals" ON public.user_goals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Campaign eligibility (loose ref: campaign_id text so it works across existing campaign-like tables)
CREATE TABLE public.campaign_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL,
  campaign_type text NOT NULL DEFAULT 'online',
  eligible_segments text[] NOT NULL DEFAULT '{}',
  eligible_brands text[] NOT NULL DEFAULT '{}',
  eligible_goals text[] NOT NULL DEFAULT '{}',
  eligible_locations text[] NOT NULL DEFAULT '{}',
  eligible_interests text[] NOT NULL DEFAULT '{}',
  deposit_required bigint NOT NULL DEFAULT 0,
  referral_required int NOT NULL DEFAULT 0,
  weight int NOT NULL DEFAULT 1,
  priority int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  budget_remaining bigint,
  proof_types text[] NOT NULL DEFAULT '{}',
  proof_instructions text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campaign_eligibility TO authenticated;
GRANT ALL ON public.campaign_eligibility TO service_role;
ALTER TABLE public.campaign_eligibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read eligibility" ON public.campaign_eligibility FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage eligibility" ON public.campaign_eligibility FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Campaign recommendations
CREATE TABLE public.campaign_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id text NOT NULL,
  campaign_type text,
  score numeric NOT NULL DEFAULT 0,
  reason jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, campaign_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_recommendations TO authenticated;
GRANT ALL ON public.campaign_recommendations TO service_role;
ALTER TABLE public.campaign_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recs" ON public.campaign_recommendations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "admin read recs" ON public.campaign_recommendations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at_generic()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_touch_onboarding_questions BEFORE UPDATE ON public.onboarding_questions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_generic();
CREATE TRIGGER trg_touch_user_behavior_profile BEFORE UPDATE ON public.user_behavior_profile
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_generic();
CREATE TRIGGER trg_touch_user_goals BEFORE UPDATE ON public.user_goals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_generic();
CREATE TRIGGER trg_touch_campaign_eligibility BEFORE UPDATE ON public.campaign_eligibility
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_generic();

-- Seed a starter set of onboarding questions and a few brands so the flow works out of the box
INSERT INTO public.onboarding_question_categories (name, sort_order) VALUES
  ('About You', 1), ('Brands & Habits', 2), ('Financial', 3), ('Task Capability', 4);

INSERT INTO public.onboarding_questions (category_id, prompt, question_type, tag_key, sort_order, required, options) VALUES
  ((SELECT id FROM public.onboarding_question_categories WHERE name='About You'), 'Tell me a bit about yourself — what do you do?', 'text', 'occupation', 1, true, '[]'),
  ((SELECT id FROM public.onboarding_question_categories WHERE name='About You'), 'Where are you based (city, state, country)?', 'text', 'location', 2, true, '[]'),
  ((SELECT id FROM public.onboarding_question_categories WHERE name='About You'), 'Which age group do you belong to?', 'choice', 'age_group', 3, false, '["under 18","18-24","25-34","35-44","45-54","55+"]'),
  ((SELECT id FROM public.onboarding_question_categories WHERE name='Brands & Habits'), 'Which banking or fintech apps do you use? (e.g. Opay, PalmPay, GTBank, Moniepoint)', 'multi', 'banks_used', 1, false, '[]'),
  ((SELECT id FROM public.onboarding_question_categories WHERE name='Brands & Habits'), 'Which ride-hailing apps do you use? (Uber, Bolt, LagRide)', 'multi', 'ride_apps', 2, false, '[]'),
  ((SELECT id FROM public.onboarding_question_categories WHERE name='Brands & Habits'), 'Which shopping platforms do you use? (Jumia, Temu, Konga, Amazon)', 'multi', 'shopping_apps', 3, false, '[]'),
  ((SELECT id FROM public.onboarding_question_categories WHERE name='Brands & Habits'), 'Which telecom provider(s) do you use? (MTN, Airtel, Glo, 9mobile)', 'multi', 'telecom', 4, false, '[]'),
  ((SELECT id FROM public.onboarding_question_categories WHERE name='Financial'), 'What is your approximate monthly spend (in Naira)?', 'numeric', 'monthly_spend', 1, false, '[]'),
  ((SELECT id FROM public.onboarding_question_categories WHERE name='Financial'), 'What income range best describes you?', 'choice', 'income_range', 2, false, '["under 100k","100k-300k","300k-700k","700k-1.5M","1.5M+"]'),
  ((SELECT id FROM public.onboarding_question_categories WHERE name='Task Capability'), 'Which of these can you complete easily?', 'multi', 'task_capabilities', 1, false, '["online tasks","offline tasks","referrals","surveys","app downloads","store visits","product purchases"]');

INSERT INTO public.brand_catalog (name, category) VALUES
  ('Opay','bank'), ('PalmPay','bank'), ('Moniepoint','bank'), ('GTBank','bank'), ('Access Bank','bank'),
  ('Uber','ride'), ('Bolt','ride'), ('LagRide','ride'),
  ('Jumia','shopping'), ('Temu','shopping'), ('Konga','shopping'), ('Amazon','shopping'),
  ('MTN','telecom'), ('Airtel','telecom'), ('Glo','telecom'), ('9mobile','telecom'),
  ('Netflix','streaming'), ('Showmax','streaming'),
  ('Maggi','food'), ('Peak Milk','food'), ('Golden Penny','food'), ('Milo','food'), ('Dano','food')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.goal_ideas (title, description, tags) VALUES
  ('Business Capital','Start or grow a small business','{business,entrepreneur}'),
  ('Education / Tuition','Pay school or tuition fees','{education,student}'),
  ('Japa (Relocation)','Save for relocating abroad','{japa,relocation}'),
  ('Wedding','Fund a wedding','{wedding,life}'),
  ('House / Rent','Save for house or rent','{house,rent,shelter}'),
  ('Car','Buy a car','{car,mobility}'),
  ('Vacation','Fund a trip','{vacation,travel}'),
  ('Emergency Fund','Build an emergency cushion','{emergency,safety}');
