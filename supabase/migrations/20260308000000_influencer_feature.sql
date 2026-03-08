-- Migration for influencer feature

-- Add influencer-related columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS influencer_status TEXT DEFAULT 'none';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS influencer_social_link TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS influencer_id_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS influencer_wallet_balance DECIMAL DEFAULT 0;

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS public.influencer_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  amount DECIMAL NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for withdrawals
ALTER TABLE public.influencer_withdrawals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own withdrawals') THEN
        CREATE POLICY "Users can view their own withdrawals" ON public.influencer_withdrawals
          FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create their own withdrawals') THEN
        CREATE POLICY "Users can create their own withdrawals" ON public.influencer_withdrawals
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all withdrawals') THEN
        CREATE POLICY "Admins can manage all withdrawals" ON public.influencer_withdrawals
          FOR ALL USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END
$$;

-- Update handle_new_user to award influencer referral bonus and fix queue regression
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
BEGIN
  SELECT generate_referral_code() INTO ref_code;
  SELECT get_next_queue_position() INTO queue_pos;

  INSERT INTO public.profiles (id, email, referral_code, queue_position)
  VALUES (NEW.id, NEW.email, ref_code, queue_pos);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  input_referral := NEW.raw_user_meta_data ->> 'referral_code';

  IF input_referral IS NOT NULL AND input_referral != '' THEN
    SELECT id, queue_position, influencer_status INTO referrer_record
    FROM public.profiles
    WHERE referral_code = upper(input_referral);

    IF referrer_record.id IS NOT NULL THEN
      UPDATE public.profiles SET referred_by = referrer_record.id WHERE id = NEW.id;

      -- Standard queue advance - only if not already off queue
      IF referrer_record.queue_position > 0 THEN
        UPDATE public.profiles
        SET queue_position = GREATEST(1, referrer_record.queue_position - 20)
        WHERE id = referrer_record.id;
      END IF;

      -- Influencer bonus
      IF referrer_record.influencer_status = 'approved' THEN
        UPDATE public.profiles
        SET influencer_wallet_balance = influencer_wallet_balance + 500
        WHERE id = referrer_record.id;
      END IF;

      INSERT INTO public.referrals (referrer_id, referred_user_id)
      VALUES (referrer_record.id, NEW.id);

      INSERT INTO public.waitlist_activity (user_id, action_type, positions_moved)
      VALUES (referrer_record.id, 'referral', 20);
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$function$;

-- Storage bucket for influencer IDs - Make it public to simplify for now as per survey screenshots pattern
-- (In a real app, use private + signed URLs)
INSERT INTO storage.buckets (id, name, public) VALUES ('influencer_ids', 'influencer_ids', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read influencer IDs' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Public read influencer IDs" ON storage.objects FOR SELECT USING (bucket_id = 'influencer_ids');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload own ID' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Users can upload own ID" ON storage.objects FOR INSERT WITH CHECK (
          bucket_id = 'influencer_ids' AND
          auth.uid()::text = (storage.foldername(name))[1]
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage influencer IDs' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Admins can manage influencer IDs" ON storage.objects FOR ALL USING (
          bucket_id = 'influencer_ids' AND
          public.has_role(auth.uid(), 'admin')
        );
    END IF;
END
$$;
