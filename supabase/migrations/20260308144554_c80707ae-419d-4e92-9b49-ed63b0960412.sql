CREATE OR REPLACE FUNCTION public.request_influencer_withdrawal(
  p_amount integer,
  p_bank_account_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_wallet RECORD;
  v_withdrawal_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  -- Get wallet
  SELECT id, balance, status INTO v_wallet
  FROM influencer_wallets
  WHERE user_id = v_user_id AND status = 'active';

  IF v_wallet.id IS NULL THEN
    RETURN json_build_object('error', 'No active wallet found');
  END IF;

  IF p_amount < 30000 THEN
    RETURN json_build_object('error', 'Minimum withdrawal is ₦30,000');
  END IF;

  IF p_amount > v_wallet.balance THEN
    RETURN json_build_object('error', 'Insufficient balance');
  END IF;

  -- Verify bank account belongs to user
  IF NOT EXISTS (SELECT 1 FROM influencer_bank_accounts WHERE id = p_bank_account_id AND user_id = v_user_id) THEN
    RETURN json_build_object('error', 'Invalid bank account');
  END IF;

  -- Deduct balance
  UPDATE influencer_wallets
  SET balance = balance - p_amount
  WHERE id = v_wallet.id;

  -- Create withdrawal record
  INSERT INTO influencer_withdrawals (user_id, amount, bank_account_id)
  VALUES (v_user_id, p_amount, p_bank_account_id)
  RETURNING id INTO v_withdrawal_id;

  RETURN json_build_object('success', true, 'withdrawal_id', v_withdrawal_id, 'new_balance', v_wallet.balance - p_amount);
END;
$$;