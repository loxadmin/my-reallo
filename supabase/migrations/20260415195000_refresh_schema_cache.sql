
-- Re-ensure tables exist and trigger schema cache reload
-- Current Date: 2026-04-15

-- 1. system_errors
CREATE TABLE IF NOT EXISTS public.system_errors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  message text NOT NULL,
  stack text,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  url text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- 2. blacklisted_entities
CREATE TABLE IF NOT EXISTS public.blacklisted_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  fingerprint text,
  reason text NOT NULL,
  expires_at timestamptz,
  CONSTRAINT at_least_one_identifier CHECK (ip_address IS NOT NULL OR fingerprint IS NOT NULL)
);

-- 3. security_incidents
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  fingerprint text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  severity text NOT NULL DEFAULT 'low'
);

-- 4. dummy_users
CREATE TABLE IF NOT EXISTS public.dummy_users (
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

-- 5. dummy_transactions
CREATE TABLE IF NOT EXISTS public.dummy_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dummy_user_id UUID REFERENCES public.dummy_users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  transaction_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_verified BOOLEAN DEFAULT true
);

-- Trigger schema cache reload by adding a comment
COMMENT ON TABLE public.profiles IS 'Karbali User Profiles - Updated to refresh schema cache on 2026-04-16';

-- Ensure RLS is enabled
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklisted_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dummy_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dummy_transactions ENABLE ROW LEVEL SECURITY;

-- Re-apply policies if they might be missing (using DO blocks to avoid errors if they exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_errors' AND policyname = 'Anyone can insert system errors') THEN
        CREATE POLICY "Anyone can insert system errors" ON public.system_errors FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_errors' AND policyname = 'Admins can view system errors') THEN
        CREATE POLICY "Admins can view system errors" ON public.system_errors FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_errors' AND policyname = 'Admins can delete system errors') THEN
        CREATE POLICY "Admins can delete system errors" ON public.system_errors FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blacklisted_entities' AND policyname = 'Admins can manage blacklisted_entities') THEN
        CREATE POLICY "Admins can manage blacklisted_entities" ON public.blacklisted_entities FOR ALL USING (public.has_role(auth.uid(), 'admin'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'security_incidents' AND policyname = 'Admins can view security_incidents') THEN
        CREATE POLICY "Admins can view security_incidents" ON public.security_incidents FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'security_incidents' AND policyname = 'Admins can manage security_incidents') THEN
        CREATE POLICY "Admins can manage security_incidents" ON public.security_incidents FOR ALL USING (public.has_role(auth.uid(), 'admin'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dummy_users' AND policyname = 'Admins can manage dummy users') THEN
        CREATE POLICY "Admins can manage dummy users" ON public.dummy_users FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dummy_transactions' AND policyname = 'Admins can manage dummy transactions') THEN
        CREATE POLICY "Admins can manage dummy transactions" ON public.dummy_transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END
$$;
