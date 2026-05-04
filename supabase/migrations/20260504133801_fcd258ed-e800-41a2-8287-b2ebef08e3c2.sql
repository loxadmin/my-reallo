-- 1. Profiles: account type and business fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS business_category text,
  ADD COLUMN IF NOT EXISTS weekly_business_spend integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_business_spend integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_line integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_line_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS financing_claimed_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_type_check
  CHECK (account_type IN ('personal','business'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_business_category_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_business_category_check
  CHECK (business_category IS NULL OR business_category IN ('retailer','wholesaler','fuel_station','pharmacy','supermarket'));

-- 2. business_items table
CREATE TABLE IF NOT EXISTS public.business_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_name text NOT NULL,
  weekly_spend integer NOT NULL DEFAULT 0,
  verification_frequency text NOT NULL DEFAULT 'weekly',
  is_verified boolean NOT NULL DEFAULT false,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_items_frequency_check CHECK (verification_frequency IN ('daily','weekly','monthly'))
);

CREATE INDEX IF NOT EXISTS idx_business_items_user_id ON public.business_items(user_id);

ALTER TABLE public.business_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own business items" ON public.business_items;
CREATE POLICY "Users can read own business items"
  ON public.business_items FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own business items" ON public.business_items;
CREATE POLICY "Users can insert own business items"
  ON public.business_items FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own business items" ON public.business_items;
CREATE POLICY "Users can update own business items"
  ON public.business_items FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own business items" ON public.business_items;
CREATE POLICY "Users can delete own business items"
  ON public.business_items FOR DELETE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage business items" ON public.business_items;
CREATE POLICY "Admins can manage business items"
  ON public.business_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.touch_business_items_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_business_items ON public.business_items;
CREATE TRIGGER trg_touch_business_items
  BEFORE UPDATE ON public.business_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_business_items_updated_at();

-- 3. Audience targeting
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'both';
ALTER TABLE public.surveys
  DROP CONSTRAINT IF EXISTS surveys_audience_check;
ALTER TABLE public.surveys
  ADD CONSTRAINT surveys_audience_check CHECK (audience IN ('personal','business','both'));

ALTER TABLE public.decision_apps
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'both';
ALTER TABLE public.decision_apps
  DROP CONSTRAINT IF EXISTS decision_apps_audience_check;
ALTER TABLE public.decision_apps
  ADD CONSTRAINT decision_apps_audience_check CHECK (audience IN ('personal','business','both'));

ALTER TABLE public.influencer_surveys
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'both';
ALTER TABLE public.influencer_surveys
  DROP CONSTRAINT IF EXISTS influencer_surveys_audience_check;
ALTER TABLE public.influencer_surveys
  ADD CONSTRAINT influencer_surveys_audience_check CHECK (audience IN ('personal','business','both'));

ALTER TABLE public.influencer_challenges
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'both';
ALTER TABLE public.influencer_challenges
  DROP CONSTRAINT IF EXISTS influencer_challenges_audience_check;
ALTER TABLE public.influencer_challenges
  ADD CONSTRAINT influencer_challenges_audience_check CHECK (audience IN ('personal','business','both'));

-- 4. Update handle_new_user to capture account_type from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ref_code TEXT;
  queue_pos INTEGER;
  input_referral TEXT;
  referrer_record RECORD;
  input_account_type TEXT;
BEGIN
  SELECT generate_referral_code() INTO ref_code;
  SELECT get_next_queue_position() INTO queue_pos;

  input_account_type := COALESCE(NEW.raw_user_meta_data ->> 'account_type', 'personal');
  IF input_account_type NOT IN ('personal','business') THEN
    input_account_type := 'personal';
  END IF;

  INSERT INTO public.profiles (id, email, referral_code, queue_position, account_type)
  VALUES (NEW.id, NEW.email, ref_code, queue_pos, input_account_type);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  input_referral := NEW.raw_user_meta_data ->> 'referral_code';

  IF input_referral IS NOT NULL AND input_referral != '' THEN
    SELECT id, queue_position, off_queue_at INTO referrer_record
    FROM public.profiles
    WHERE referral_code = upper(input_referral);

    IF referrer_record.id IS NOT NULL THEN
      UPDATE public.profiles SET referred_by = referrer_record.id WHERE id = NEW.id;

      IF referrer_record.queue_position <= 0 AND referrer_record.off_queue_at IS NOT NULL THEN
        UPDATE public.profiles
        SET points_balance = points_balance + 1000
        WHERE id = referrer_record.id;

        INSERT INTO public.waitlist_activity (user_id, action_type, positions_moved)
        VALUES (referrer_record.id, 'referral_points', 0);
      ELSE
        UPDATE public.profiles
        SET queue_position = GREATEST(1, referrer_record.queue_position - 20)
        WHERE id = referrer_record.id;

        INSERT INTO public.waitlist_activity (user_id, action_type, positions_moved)
        VALUES (referrer_record.id, 'referral', 20);
      END IF;

      INSERT INTO public.referrals (referrer_id, referred_user_id)
      VALUES (referrer_record.id, NEW.id);
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$function$;