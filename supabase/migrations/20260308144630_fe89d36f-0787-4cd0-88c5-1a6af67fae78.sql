-- Fix existing pending withdrawal: deduct ₦31,000 from wallet
UPDATE influencer_wallets 
SET balance = balance - 31000 
WHERE user_id = '54f329cd-5017-48be-b379-82871a6656f5' 
AND balance >= 31000;