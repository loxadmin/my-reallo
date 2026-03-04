
-- Decision Apps table (admin creates apps for users to select)
CREATE TABLE public.decision_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name TEXT NOT NULL,
  app_logo_url TEXT,
  category TEXT NOT NULL DEFAULT 'yes_no' CHECK (category IN ('yes_no', 'referral')),
  points_select INTEGER NOT NULL DEFAULT 500,
  points_switch_intent INTEGER NOT NULL DEFAULT 2000,
  points_switch_complete INTEGER NOT NULL DEFAULT 10000,
  switch_link TEXT,
  referral_message TEXT,
  referral_link TEXT,
  referral_points INTEGER NOT NULL DEFAULT 10000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Decision Responses table (user responses)
CREATE TABLE public.decision_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES public.decision_apps(id) ON DELETE CASCADE,
  has_app BOOLEAN NOT NULL DEFAULT false,
  would_switch BOOLEAN,
  switch_available_at TIMESTAMPTZ,
  switch_completed BOOLEAN NOT NULL DEFAULT false,
  referral_clicked BOOLEAN NOT NULL DEFAULT false,
  referral_screenshot_url TEXT,
  referral_approved BOOLEAN NOT NULL DEFAULT false,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, app_id)
);

-- Enable RLS
ALTER TABLE public.decision_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_responses ENABLE ROW LEVEL SECURITY;

-- RLS for decision_apps (everyone can read active apps)
CREATE POLICY "Anyone can read active decision apps" ON public.decision_apps
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage decision apps" ON public.decision_apps
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS for decision_responses
CREATE POLICY "Users can read own decision responses" ON public.decision_responses
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own decision responses" ON public.decision_responses
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own decision responses" ON public.decision_responses
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all decision responses" ON public.decision_responses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
