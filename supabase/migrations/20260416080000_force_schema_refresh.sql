-- Force schema cache refresh and ensure tables/columns exist
-- Current Date: 2026-04-16

-- 1. Ensure system_errors table exists
CREATE TABLE IF NOT EXISTS public.system_errors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  message text NOT NULL,
  stack text,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  url text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- 2. Ensure dummy_users table and all columns exist
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

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'dummy_users' AND COLUMN_NAME = 'annual_data_spend') THEN
        ALTER TABLE public.dummy_users ADD COLUMN annual_data_spend NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'dummy_users' AND COLUMN_NAME = 'annual_electricity_spend') THEN
        ALTER TABLE public.dummy_users ADD COLUMN annual_electricity_spend NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'dummy_users' AND COLUMN_NAME = 'annual_food_spend') THEN
        ALTER TABLE public.dummy_users ADD COLUMN annual_food_spend NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'dummy_users' AND COLUMN_NAME = 'annual_transport_spend') THEN
        ALTER TABLE public.dummy_users ADD COLUMN annual_transport_spend NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'dummy_users' AND COLUMN_NAME = 'user_type') THEN
        ALTER TABLE public.dummy_users ADD COLUMN user_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'dummy_users' AND COLUMN_NAME = 'spend_verified') THEN
        ALTER TABLE public.dummy_users ADD COLUMN spend_verified BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'dummy_users' AND COLUMN_NAME = 'target_amount') THEN
        ALTER TABLE public.dummy_users ADD COLUMN target_amount NUMERIC DEFAULT 0;
    END IF;
END
$$;

-- 3. Ensure dummy_activity table exists
CREATE TABLE IF NOT EXISTS public.dummy_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dummy_user_id UUID REFERENCES public.dummy_users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  positions_moved INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS and set policies
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dummy_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dummy_activity ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- system_errors policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_errors' AND policyname = 'Anyone can insert system errors') THEN
        CREATE POLICY "Anyone can insert system errors" ON public.system_errors FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_errors' AND policyname = 'Admins can view system errors') THEN
        CREATE POLICY "Admins can view system errors" ON public.system_errors FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_errors' AND policyname = 'Admins can delete system errors') THEN
        CREATE POLICY "Admins can delete system errors" ON public.system_errors FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
    END IF;

    -- dummy_users policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dummy_users' AND policyname = 'Admins can manage dummy users') THEN
        CREATE POLICY "Admins can manage dummy users" ON public.dummy_users FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;

    -- dummy_activity policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dummy_activity' AND policyname = 'Admins can manage dummy activity') THEN
        CREATE POLICY "Admins can manage dummy activity" ON public.dummy_activity FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END
$$;

-- Trigger schema cache reload by adding a comment
COMMENT ON TABLE public.profiles IS 'Karbali User Profiles - Force refresh schema cache on 2026-04-16 08:30:00';
