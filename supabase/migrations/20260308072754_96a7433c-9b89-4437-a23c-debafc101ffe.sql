-- Function to credit influencer referral when a new user signs up via referral
CREATE OR REPLACE FUNCTION public.credit_influencer_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  referrer_id_val uuid;
  inf_wallet RECORD;
BEGIN
  -- Get the referrer from the newly created profile
  SELECT referred_by INTO referrer_id_val FROM public.profiles WHERE id = NEW.referred_user_id;
  
  IF referrer_id_val IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if the referrer has an active influencer wallet
  SELECT id, balance INTO inf_wallet FROM public.influencer_wallets 
  WHERE user_id = referrer_id_val AND status = 'active';
  
  IF inf_wallet.id IS NOT NULL THEN
    -- Credit ₦500 (stored as naira integer) to influencer wallet
    UPDATE public.influencer_wallets SET balance = balance + 500 WHERE id = inf_wallet.id;
    
    -- Record the influencer referral
    INSERT INTO public.influencer_referrals (influencer_id, referred_user_id, reward_amount)
    VALUES (referrer_id_val, NEW.referred_user_id, 500);
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'credit_influencer_referral error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- Trigger on referrals table
CREATE TRIGGER on_referral_credit_influencer
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.credit_influencer_referral();