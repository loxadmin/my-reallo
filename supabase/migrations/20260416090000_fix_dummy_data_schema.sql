
-- Ensure dummy_users columns exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dummy_users' AND column_name = 'annual_data_spend') THEN
        ALTER TABLE public.dummy_users ADD COLUMN annual_data_spend NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dummy_users' AND column_name = 'annual_electricity_spend') THEN
        ALTER TABLE public.dummy_users ADD COLUMN annual_electricity_spend NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dummy_users' AND column_name = 'annual_food_spend') THEN
        ALTER TABLE public.dummy_users ADD COLUMN annual_food_spend NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dummy_users' AND column_name = 'annual_transport_spend') THEN
        ALTER TABLE public.dummy_users ADD COLUMN annual_transport_spend NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dummy_users' AND column_name = 'user_type') THEN
        ALTER TABLE public.dummy_users ADD COLUMN user_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dummy_users' AND column_name = 'spend_verified') THEN
        ALTER TABLE public.dummy_users ADD COLUMN spend_verified BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dummy_users' AND column_name = 'target_amount') THEN
        ALTER TABLE public.dummy_users ADD COLUMN target_amount NUMERIC DEFAULT 0;
    END IF;
END
$$;

-- Ensure dummy_activity table exists
CREATE TABLE IF NOT EXISTS public.dummy_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dummy_user_id UUID REFERENCES public.dummy_users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  positions_moved INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure RLS is enabled for dummy_activity
ALTER TABLE public.dummy_activity ENABLE ROW LEVEL SECURITY;

-- Ensure dummy_activity policy exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dummy_activity' AND policyname = 'Admins can manage dummy activity') THEN
        CREATE POLICY "Admins can manage dummy activity" ON public.dummy_activity
          FOR ALL TO authenticated
          USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END
$$;

-- Force schema cache reload
COMMENT ON TABLE public.profiles IS 'Karbali User Profiles - Schema cache refresh triggered on 2026-04-16';
COMMENT ON TABLE public.dummy_users IS 'Dummy users for platform metrics - Updated 2026-04-16';
