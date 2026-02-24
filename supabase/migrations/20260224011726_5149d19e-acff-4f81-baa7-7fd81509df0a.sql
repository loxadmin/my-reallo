
-- Drop all existing restrictive policies and recreate as permissive

-- PROFILES
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
-- Allow looking up any profile by referral_code (needed for referral system)
CREATE POLICY "Anyone can lookup by referral code" ON profiles FOR SELECT USING (true);

-- REFERRALS
DROP POLICY IF EXISTS "Users can read own referrals" ON referrals;
DROP POLICY IF EXISTS "Users can insert referrals" ON referrals;
DROP POLICY IF EXISTS "Admins can read all referrals" ON referrals;

CREATE POLICY "Users can read own referrals" ON referrals FOR SELECT USING ((referrer_id = auth.uid()) OR (referred_user_id = auth.uid()));
CREATE POLICY "Users can insert referrals" ON referrals FOR INSERT WITH CHECK ((referrer_id = auth.uid()) OR (referred_user_id = auth.uid()));
CREATE POLICY "Admins can manage referrals" ON referrals FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- USER_ROLES
DROP POLICY IF EXISTS "Users can read own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

CREATE POLICY "Users can read own roles" ON user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own role" ON user_roles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- WAITLIST_ACTIVITY
DROP POLICY IF EXISTS "Users can read own activity" ON waitlist_activity;
DROP POLICY IF EXISTS "Users can insert own activity" ON waitlist_activity;
DROP POLICY IF EXISTS "Admins can manage activity" ON waitlist_activity;

CREATE POLICY "Users can read own activity" ON waitlist_activity FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own activity" ON waitlist_activity FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage activity" ON waitlist_activity FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- GHOST_USERS
DROP POLICY IF EXISTS "Authenticated can count ghost users" ON ghost_users;
DROP POLICY IF EXISTS "Admins can manage ghost users" ON ghost_users;

CREATE POLICY "Authenticated can count ghost users" ON ghost_users FOR SELECT USING (true);
CREATE POLICY "Admins can manage ghost users" ON ghost_users FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create the auth trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
