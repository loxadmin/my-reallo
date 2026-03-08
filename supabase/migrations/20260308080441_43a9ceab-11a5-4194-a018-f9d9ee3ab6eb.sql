
-- Influencer challenges table (admin creates these)
CREATE TABLE public.influencer_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  instructions text NOT NULL DEFAULT '',
  hashtag text NOT NULL DEFAULT '',
  challenge_type text NOT NULL DEFAULT 'single', -- 'single' or 'set'
  total_videos integer NOT NULL DEFAULT 1,
  reward_per_video integer NOT NULL DEFAULT 3000,
  posting_interval_days integer NOT NULL DEFAULT 1, -- for sets: 1 video per X days
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Influencer challenge submissions (influencers submit video links)
CREATE TABLE public.influencer_challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES public.influencer_challenges(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  video_url text NOT NULL,
  video_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending_review', -- pending_review, approved, rejected
  admin_notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

-- Influencer challenge enrollments (tracks user enrollment in a challenge)
CREATE TABLE public.influencer_challenge_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES public.influencer_challenges(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed boolean NOT NULL DEFAULT false,
  pending_earnings integer NOT NULL DEFAULT 0,
  approved_earnings integer NOT NULL DEFAULT 0,
  UNIQUE(challenge_id, user_id)
);

-- RLS
ALTER TABLE public.influencer_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_challenge_enrollments ENABLE ROW LEVEL SECURITY;

-- Challenges: anyone can read active, admins manage all
CREATE POLICY "Anyone can read active challenges" ON public.influencer_challenges FOR SELECT USING (true);
CREATE POLICY "Admins can manage challenges" ON public.influencer_challenges FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Submissions: users can insert/read own, admins manage all
CREATE POLICY "Users can insert own submissions" ON public.influencer_challenge_submissions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can read own submissions" ON public.influencer_challenge_submissions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all submissions" ON public.influencer_challenge_submissions FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enrollments: users can insert/read/update own, admins manage all
CREATE POLICY "Users can insert own enrollments" ON public.influencer_challenge_enrollments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can read own enrollments" ON public.influencer_challenge_enrollments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own enrollments" ON public.influencer_challenge_enrollments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all enrollments" ON public.influencer_challenge_enrollments FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
