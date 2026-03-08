-- Influencer applications table
CREATE TABLE public.influencer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  social_link text NOT NULL,
  status text NOT NULL DEFAULT 'pending_review',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE(user_id)
);
ALTER TABLE public.influencer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own influencer application" ON public.influencer_applications FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can read own influencer application" ON public.influencer_applications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage influencer applications" ON public.influencer_applications FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Influencer wallets table
CREATE TABLE public.influencer_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_activation',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.influencer_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own influencer wallet" ON public.influencer_wallets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own influencer wallet" ON public.influencer_wallets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own influencer wallet" ON public.influencer_wallets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage influencer wallets" ON public.influencer_wallets FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Influencer bank accounts table
CREATE TABLE public.influencer_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  bank_name text NOT NULL,
  bank_code text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  id_document_url text,
  verification_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.influencer_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own influencer bank account" ON public.influencer_bank_accounts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can read own influencer bank account" ON public.influencer_bank_accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own influencer bank account" ON public.influencer_bank_accounts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage influencer bank accounts" ON public.influencer_bank_accounts FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Influencer referrals table
CREATE TABLE public.influencer_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_amount integer NOT NULL DEFAULT 500,
  status text NOT NULL DEFAULT 'credited',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.influencer_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own influencer referrals" ON public.influencer_referrals FOR SELECT USING (influencer_id = auth.uid());
CREATE POLICY "Admins can manage influencer referrals" ON public.influencer_referrals FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Influencer withdrawals table
CREATE TABLE public.influencer_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  bank_account_id uuid NOT NULL REFERENCES public.influencer_bank_accounts(id),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
ALTER TABLE public.influencer_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own influencer withdrawals" ON public.influencer_withdrawals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can read own influencer withdrawals" ON public.influencer_withdrawals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage influencer withdrawals" ON public.influencer_withdrawals FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for ID documents
INSERT INTO storage.buckets (id, name, public) VALUES ('id-documents', 'id-documents', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Users upload own ID docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'id-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own ID docs" ON storage.objects FOR SELECT USING (bucket_id = 'id-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins read all ID docs" ON storage.objects FOR SELECT USING (bucket_id = 'id-documents' AND public.has_role(auth.uid(), 'admin'));