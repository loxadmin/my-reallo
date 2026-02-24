
-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE

-- profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- ghost_users
DROP POLICY IF EXISTS "Admins can manage ghost users" ON ghost_users;
DROP POLICY IF EXISTS "Authenticated can count ghost users" ON ghost_users;

CREATE POLICY "Admins can manage ghost users" ON ghost_users FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can count ghost users" ON ghost_users FOR SELECT USING (true);

-- referrals
DROP POLICY IF EXISTS "Admins can read all referrals" ON referrals;
DROP POLICY IF EXISTS "Users can read own referrals" ON referrals;

CREATE POLICY "Admins can read all referrals" ON referrals FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can read own referrals" ON referrals FOR SELECT USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());
CREATE POLICY "Users can insert referrals" ON referrals FOR INSERT WITH CHECK (referrer_id = auth.uid() OR referred_user_id = auth.uid());

-- user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON user_roles;

CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can read own roles" ON user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own role" ON user_roles FOR INSERT WITH CHECK (user_id = auth.uid());

-- waitlist_activity
DROP POLICY IF EXISTS "Admins can manage activity" ON waitlist_activity;
DROP POLICY IF EXISTS "Users can read own activity" ON waitlist_activity;

CREATE POLICY "Admins can manage activity" ON waitlist_activity FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can read own activity" ON waitlist_activity FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own activity" ON waitlist_activity FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create trigger for auto profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  ref_code TEXT;
  queue_pos INTEGER;
BEGIN
  SELECT generate_referral_code() INTO ref_code;
  SELECT get_next_queue_position() INTO queue_pos;
  
  INSERT INTO public.profiles (id, email, referral_code, queue_position)
  VALUES (NEW.id, NEW.email, ref_code, queue_pos);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
