
-- Add points_balance to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points_balance integer NOT NULL DEFAULT 0;

-- Questionnaires table (admin-configurable)
CREATE TABLE public.questionnaires (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  points_reward integer NOT NULL DEFAULT 0,
  current_bank_question text NOT NULL DEFAULT 'Which bank do you currently use?',
  switch_question_template text NOT NULL DEFAULT 'Since you use "{current_bank}" would you switch to "{preferred_bank}" for your daily transactions?',
  preferred_bank text NOT NULL DEFAULT '',
  switch_timer_days integer NOT NULL DEFAULT 30,
  switch_enabled boolean NOT NULL DEFAULT false,
  switch_link text NOT NULL DEFAULT '',
  why_switch_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active questionnaires" ON public.questionnaires
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage questionnaires" ON public.questionnaires
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- User questionnaire responses
CREATE TABLE public.questionnaire_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  questionnaire_id uuid NOT NULL REFERENCES public.questionnaires(id),
  current_bank text,
  would_switch boolean NOT NULL DEFAULT false,
  switch_reason text,
  switch_reason_freetext text,
  points_awarded integer NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  switch_timer_start timestamptz,
  switch_completed boolean NOT NULL DEFAULT false,
  UNIQUE(user_id, questionnaire_id)
);

ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own responses" ON public.questionnaire_responses
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own responses" ON public.questionnaire_responses
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own responses" ON public.questionnaire_responses
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage responses" ON public.questionnaire_responses
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Vouchers table
CREATE TABLE public.vouchers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  voucher_code text NOT NULL UNIQUE,
  amount_naira numeric NOT NULL,
  points_used integer NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own vouchers" ON public.vouchers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own vouchers" ON public.vouchers
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage vouchers" ON public.vouchers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin settings table
CREATE TABLE public.admin_settings (
  key text NOT NULL PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON public.admin_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage settings" ON public.admin_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default admin settings
INSERT INTO public.admin_settings (key, value) VALUES
  ('verify_expense_link', ''),
  ('post_queue_referral_points', '1000')
ON CONFLICT (key) DO NOTHING;

-- Function to generate voucher code
CREATE OR REPLACE FUNCTION public.generate_voucher_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := 'RLO-' || upper(substr(md5(random()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.vouchers WHERE voucher_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;
