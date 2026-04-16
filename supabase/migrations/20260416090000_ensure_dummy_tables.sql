-- Self-healing helper for environments where dummy tables were not provisioned yet.
CREATE OR REPLACE FUNCTION public.ensure_dummy_data_tables()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

  ALTER TABLE public.dummy_users
    ADD COLUMN IF NOT EXISTS annual_data_spend NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS annual_electricity_spend NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS annual_food_spend NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS annual_transport_spend NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'student',
    ADD COLUMN IF NOT EXISTS spend_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS target_amount NUMERIC DEFAULT 0;

  CREATE TABLE IF NOT EXISTS public.dummy_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dummy_user_id UUID REFERENCES public.dummy_users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    transaction_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_verified BOOLEAN DEFAULT true
  );

  CREATE TABLE IF NOT EXISTS public.dummy_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dummy_user_id UUID REFERENCES public.dummy_users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    positions_moved INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  ALTER TABLE public.dummy_users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.dummy_transactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.dummy_activity ENABLE ROW LEVEL SECURITY;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dummy_users' AND policyname = 'Admins can manage dummy users') THEN
    CREATE POLICY "Admins can manage dummy users" ON public.dummy_users
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dummy_transactions' AND policyname = 'Admins can manage dummy transactions') THEN
    CREATE POLICY "Admins can manage dummy transactions" ON public.dummy_transactions
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dummy_activity' AND policyname = 'Admins can manage dummy activity') THEN
    CREATE POLICY "Admins can manage dummy activity" ON public.dummy_activity
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_dummy_data_tables() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_dummy_data_tables() TO authenticated;
