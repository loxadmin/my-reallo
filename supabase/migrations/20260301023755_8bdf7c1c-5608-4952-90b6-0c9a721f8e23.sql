
-- Add category column to questionnaires
ALTER TABLE public.questionnaires ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'bank_switch';

-- Create spend verification table
CREATE TABLE public.spend_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  frequency text NOT NULL DEFAULT 'daily', -- daily, weekly, monthly
  verification_link text DEFAULT '',
  verification_description text DEFAULT '',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ends_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  status text NOT NULL DEFAULT 'in_progress', -- in_progress, completed, verified
  recalculated_amount integer DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.spend_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own verifications" ON public.spend_verifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own verifications" ON public.spend_verifications FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own verifications" ON public.spend_verifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage verifications" ON public.spend_verifications FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create transaction IDs table
CREATE TABLE public.verification_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_id uuid NOT NULL REFERENCES public.spend_verifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  transaction_id text NOT NULL,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  is_verified boolean NOT NULL DEFAULT false,
  verified_amount numeric DEFAULT NULL
);

ALTER TABLE public.verification_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions" ON public.verification_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own transactions" ON public.verification_transactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage transactions" ON public.verification_transactions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for CSV uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('admin-uploads', 'admin-uploads', false);

CREATE POLICY "Admins can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'admin-uploads' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can read uploads" ON storage.objects FOR SELECT USING (bucket_id = 'admin-uploads' AND has_role(auth.uid(), 'admin'::app_role));
