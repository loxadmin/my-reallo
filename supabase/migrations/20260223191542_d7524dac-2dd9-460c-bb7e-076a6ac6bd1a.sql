
-- 1. Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. RLS on user_roles
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  annual_data_spend INTEGER DEFAULT 0,
  annual_electricity_spend INTEGER DEFAULT 0,
  total_annual_spend INTEGER DEFAULT 0,
  selected_goal TEXT,
  target_amount INTEGER DEFAULT 0,
  queue_position INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.profiles(id),
  last_active TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Ghost users table
CREATE TABLE public.ghost_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ghost_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ghost users" ON public.ghost_users
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can count ghost users" ON public.ghost_users
  FOR SELECT TO authenticated
  USING (true);

-- 6. Referrals table
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

CREATE POLICY "Admins can read all referrals" ON public.referrals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Waitlist activity table
CREATE TABLE public.waitlist_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('referral', 'login', 'auto_move')),
  positions_moved INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.waitlist_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own activity" ON public.waitlist_activity
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage activity" ON public.waitlist_activity
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

-- 9. Function to get next queue position
CREATE OR REPLACE FUNCTION public.get_next_queue_position()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ghost_count INTEGER;
  user_count INTEGER;
  next_pos INTEGER;
BEGIN
  SELECT COUNT(*) INTO ghost_count FROM ghost_users;
  SELECT COUNT(*) INTO user_count FROM profiles WHERE queue_position > 0;
  -- Each new user goes behind 100 ghosts + existing users * 100 gap
  next_pos := (user_count + 1) * 100 + 1;
  IF next_pos > 2000 THEN
    next_pos := ghost_count + user_count + 1;
  END IF;
  RETURN next_pos;
END;
$$;

-- 10. Seed 2000 ghost users
INSERT INTO public.ghost_users (position)
SELECT generate_series(1, 2000);
