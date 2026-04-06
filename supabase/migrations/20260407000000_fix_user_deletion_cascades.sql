-- Add missing ON DELETE CASCADE to various tables to make user deletion more robust

-- 1. Questionnaire Responses
ALTER TABLE public.questionnaire_responses
DROP CONSTRAINT IF EXISTS questionnaire_responses_user_id_fkey,
ADD CONSTRAINT questionnaire_responses_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Vouchers
ALTER TABLE public.vouchers
DROP CONSTRAINT IF EXISTS vouchers_user_id_fkey,
ADD CONSTRAINT vouchers_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Spend Verifications
ALTER TABLE public.spend_verifications
DROP CONSTRAINT IF EXISTS spend_verifications_user_id_fkey,
ADD CONSTRAINT spend_verifications_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Verification Transactions
ALTER TABLE public.verification_transactions
DROP CONSTRAINT IF EXISTS verification_transactions_user_id_fkey,
ADD CONSTRAINT verification_transactions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 5. Profiles (referred_by)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_referred_by_fkey,
ADD CONSTRAINT profiles_referred_by_fkey
FOREIGN KEY (referred_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 6. User Warnings (issued_by)
ALTER TABLE public.user_warnings
DROP CONSTRAINT IF EXISTS user_warnings_issued_by_fkey,
ADD CONSTRAINT user_warnings_issued_by_fkey
FOREIGN KEY (issued_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 7. Influencer Withdrawals (bank_account_id) - Not user_id, but good to have cascade if bank account is deleted
ALTER TABLE public.influencer_withdrawals
DROP CONSTRAINT IF EXISTS influencer_withdrawals_bank_account_id_fkey,
ADD CONSTRAINT influencer_withdrawals_bank_account_id_fkey
FOREIGN KEY (bank_account_id) REFERENCES public.influencer_bank_accounts(id) ON DELETE CASCADE;
