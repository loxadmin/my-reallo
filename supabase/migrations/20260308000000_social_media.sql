-- Social Media Features Migration

-- Add columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_bonus_balance NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_name TEXT;

-- Social Media Accounts
CREATE TABLE IF NOT EXISTS public.social_media_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    account_link TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social Media Challenges
CREATE TABLE IF NOT EXISTS public.social_media_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    reward_naira NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social Media Submissions
CREATE TABLE IF NOT EXISTS public.social_media_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES public.social_media_challenges(id) ON DELETE CASCADE,
    video_link TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reward_paid_naira NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social Withdrawals
CREATE TABLE IF NOT EXISTS public.social_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount_naira NUMERIC NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.social_media_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_withdrawals ENABLE ROW LEVEL SECURITY;

-- Policies for social_media_accounts
CREATE POLICY "Users can view own accounts" ON public.social_media_accounts
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON public.social_media_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all accounts" ON public.social_media_accounts
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies for social_media_challenges
CREATE POLICY "Anyone can view active challenges" ON public.social_media_challenges
    FOR SELECT USING (is_active = TRUE OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage challenges" ON public.social_media_challenges
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies for social_media_submissions
CREATE POLICY "Users can view own submissions" ON public.social_media_submissions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own submissions" ON public.social_media_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all submissions" ON public.social_media_submissions
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies for social_withdrawals
CREATE POLICY "Users can view own withdrawals" ON public.social_withdrawals
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own withdrawals" ON public.social_withdrawals
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all withdrawals" ON public.social_withdrawals
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));
