
-- Add bank and social bonus columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_bonus_balance numeric DEFAULT 0;

-- Social Media Accounts table
CREATE TABLE IF NOT EXISTS public.social_media_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_link text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, verified, rejected
  created_at timestamp with time zone DEFAULT now()
);

-- Social Media Challenges table
CREATE TABLE IF NOT EXISTS public.social_media_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  hashtag text,
  action_required text,
  words_to_say text,
  reward_naira numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Social Media Submissions table
CREATE TABLE IF NOT EXISTS public.social_media_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.social_media_challenges(id) ON DELETE CASCADE,
  video_link text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reward_naira numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Social Media Withdrawals table
CREATE TABLE IF NOT EXISTS public.social_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_naira numeric NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, completed, rejected
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_media_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_withdrawals ENABLE ROW LEVEL SECURITY;

-- Social Media Accounts Policies
CREATE POLICY "Users can manage their own social accounts" ON public.social_media_accounts
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all social accounts" ON public.social_media_accounts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Social Media Challenges Policies
CREATE POLICY "Everyone can view active challenges" ON public.social_media_challenges
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage challenges" ON public.social_media_challenges
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Social Media Submissions Policies
CREATE POLICY "Users can manage their own submissions" ON public.social_media_submissions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all submissions" ON public.social_media_submissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Social Media Withdrawals Policies
CREATE POLICY "Users can manage their own withdrawals" ON public.social_withdrawals
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all withdrawals" ON public.social_withdrawals
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
