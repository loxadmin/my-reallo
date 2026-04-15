CREATE TABLE public.dummy_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  total_annual_spend NUMERIC DEFAULT 0,
  selected_goal TEXT,
  queue_position INTEGER DEFAULT 0,
  referral_code TEXT,
  points_balance INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT
);

CREATE TABLE public.dummy_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dummy_user_id UUID REFERENCES public.dummy_users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  transaction_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_verified BOOLEAN DEFAULT true
);

ALTER TABLE public.dummy_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dummy_transactions ENABLE ROW LEVEL SECURITY;

-- Admins can manage dummy users
CREATE POLICY "Admins can manage dummy users" ON public.dummy_users
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage dummy transactions
CREATE POLICY "Admins can manage dummy transactions" ON public.dummy_transactions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
