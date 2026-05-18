
CREATE TABLE IF NOT EXISTS public.dummy_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  total_annual_spend integer DEFAULT 0,
  annual_data_spend integer DEFAULT 0,
  annual_electricity_spend integer DEFAULT 0,
  annual_food_spend integer DEFAULT 0,
  annual_transport_spend integer DEFAULT 0,
  user_type text,
  spend_verified boolean DEFAULT false,
  points_balance integer DEFAULT 0,
  queue_position integer DEFAULT 0,
  referral_code text,
  target_amount integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dummy_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dummy_user_id uuid REFERENCES public.dummy_users(id) ON DELETE CASCADE,
  amount integer NOT NULL DEFAULT 0,
  transaction_id text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dummy_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dummy_user_id uuid REFERENCES public.dummy_users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  positions_moved integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dummy_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dummy_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dummy_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage dummy_users" ON public.dummy_users
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage dummy_transactions" ON public.dummy_transactions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage dummy_activity" ON public.dummy_activity
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.ensure_dummy_data_tables()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true;
$$;

REVOKE ALL ON FUNCTION public.ensure_dummy_data_tables() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ensure_dummy_data_tables() TO authenticated;

CREATE INDEX IF NOT EXISTS dummy_transactions_user_idx ON public.dummy_transactions(dummy_user_id);
CREATE INDEX IF NOT EXISTS dummy_activity_user_idx ON public.dummy_activity(dummy_user_id);
