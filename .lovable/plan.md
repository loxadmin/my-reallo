# Valid Referrals & Influencer Withdrawal Target

## Concept

- **Valid referral** = a referred user who has completed at least one task (admin-approved survey screenshot, approved spend verification, approved decision/referral-app task, or approved influencer challenge submission).
- All referral rewards (points to regular users, ₦500 to influencer wallets) become **pending** at signup and are **released** only when the referred user achieves a valid referral.
- **Influencer withdrawal target**: in a rolling 30-day window, an influencer must have at least **100 valid new referrals**, otherwise withdrawals are blocked with a clear message showing progress (e.g. "42 / 100 valid referrals in last 30 days").

## Database changes (migration)

1. `referrals` table — add:
   - `status text not null default 'pending'` ('pending' | 'valid')
   - `validated_at timestamptz`
   - `validation_source text` (e.g. 'survey', 'spend', 'decision', 'challenge')
2. `influencer_referrals` table — add `status`, `validated_at` (mirror).
3. New SQL function `public.mark_referral_valid(_referred_user_id uuid, _source text)`:
   - Idempotent. If referral already valid → no-op.
   - Marks `referrals` row valid.
   - If referrer is a regular user with pending points: credit `profiles.points_balance` (the 1000 pts or 20-queue-skip is already applied at signup for queue skip; only points reward is held — keep queue skip immediate, hold only points/₦).
   - If referrer has active influencer wallet: credit ₦500 to `influencer_wallets.balance` and mark `influencer_referrals` valid + insert `influencer_wallet_transactions` row.
4. New SQL function `public.count_valid_referrals_last_30d(_user_id uuid) returns int`.
5. Update `request_influencer_withdrawal` RPC to check `count_valid_referrals_last_30d(auth.uid()) >= 100` else return `{ error: 'You need 100 valid referrals in the last 30 days to withdraw. Current: X' }`.
6. Update `handle_new_user` trigger and the `credit_influencer_referral` trigger:
   - Insert referral row with `status='pending'`.
   - Do NOT credit points / wallet immediately. Queue-skip stays immediate (it's a queue mechanic, not a monetary reward).
7. Add task-completion hooks (triggers) that call `mark_referral_valid` when a row transitions to approved:
   - `survey_responses` → status becomes 'approved' or `points_awarded > 0`
   - `spend_verifications` → status becomes 'approved'
   - `decision_responses` → status becomes 'approved'
   - `influencer_challenge_submissions` → status becomes 'approved'

## Edge function changes

- `handle-referral` and `handle-google-referral`: remove immediate points credit / ₦500 credit. Still record referral (pending) and apply queue skip.

## Frontend changes

- `InfluencerPanel.tsx` (withdrawal UI):
  - Fetch `count_valid_referrals_last_30d` via RPC.
  - Show progress: "Valid referrals (last 30 days): X / 100". Disable Withdraw button until ≥100, with tooltip explaining the rule.
  - Surface server-side error message from RPC.
- Referral list views (user dashboard + influencer dashboard): show each referral's status badge (Pending / Valid) and validated date.

## Backfill

- For existing `referrals` rows where the referred user already has ≥1 approved task: mark `status='valid'`, set `validated_at = now()`. Do NOT retroactively credit money/points (avoid double-credit since old logic already paid out).
- For new referrals only, the pending→valid credit logic applies.

## Out of scope

- No changes to queue mechanics, OAuth, currency, or other features.
- Existing balances untouched.

## Technical notes

- Validation triggers (not CHECK) used for state transitions.
- All new functions `SECURITY DEFINER` with `set search_path = public`.
- All grants included per public-schema rule.
