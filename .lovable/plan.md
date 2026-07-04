# Goal Accounts (replaces Savings Accounts)

Extends existing Karbali. Reuses existing AI onboarding (`ai-onboard`), profile (`user_behavior_profile`), goal planner (`ai-goal-plan`), campaign recommender (`ai-recommend-campaigns`), brand catalog, onboarding questions, campaign eligibility, and Earn UI. No changes to auth, wallets, referrals, influencer program, admin shell, or existing rewards math.

## 1. Database (one migration)

New / extended tables (public, with GRANTs + RLS):

- `goal_accounts` — the funded-account model, replaces free-form `user_goals` as the source of truth for savings.
  - `id, user_id, title, category, target_amount, target_date, status` (`active|completed|closed|abandoned`)
  - `deposit_required int default 0`, `deposit_paid int default 0`
  - `locked_amount int` (= target_amount − unlocked_amount), `unlocked_amount int default 0`
  - `plan jsonb` (chosen AI plan: duration_months, required tasks, referrals, deposit)
  - `chosen_option text`, `risk_level text`, `maturity_months int`
  - `opened_at, closed_at, withdrawn_at, withdrawn_amount`
  - `unlock_sources jsonb` (running tally: `{deposits, tasks, referrals, purchases, streaks, campaigns}`)
- `goal_account_contributions` — every unit of unlock (append-only ledger)
  - `id, goal_account_id, user_id, source` (`deposit|task|referral|purchase|streak|campaign|partner|bonus`)
  - `source_id`, `amount int`, `note`, `created_at`
- `goal_account_options` — the 2–3 AI-generated paths at creation time so user can pick
  - `id, goal_account_id, label, deposit int, duration_months int, requirements jsonb, monthly_contribution int, chosen bool, created_at`
- Extend `campaign_eligibility` (already exists) with:
  - `task_mode text` (`online|offline|either`) default `either`
  - `proof_types text[]` default `{screenshot}` (screenshot|video|screen_recording|receipt|image)
  - `goal_contribution_value int` (naira added to unlocked balance on approval)
  - `ai_weight numeric` default 1
- Extend `campaign_recommendations` with `goal_account_id uuid null` so recs can be scoped to a specific goal.
- Keep `user_goals` table but stop writing to it from UI (read-only legacy). All new work uses `goal_accounts`.

Functions (SECURITY DEFINER, search_path=public):
- `open_goal_account(p_title, p_target_amount, p_target_date, p_option_id)` — creates goal_accounts row from chosen option; if deposit_required > 0, expects wallet deduction (existing wallets flow) and records a `deposit` contribution.
- `apply_goal_unlock(p_goal_id, p_source, p_source_id, p_amount, p_note)` — inserts contribution, increments `unlocked_amount`, decrements `locked_amount`, caps at target, marks `status='completed'` when fully unlocked.
- `withdraw_goal_account(p_goal_id)` — one-time: transfers `unlocked_amount` to wallet, sets `withdrawn_at`, `status='closed'`, forfeits any remaining locked amount (audit note). Enforces "one goal, one withdrawal".
- Extend triggers on `survey_responses`, `spend_verifications`, `decision_responses`, `influencer_challenge_submissions` on approval → find user's active goal_account (most recent) → call `apply_goal_unlock` using campaign's `goal_contribution_value` (fallback: reward amount / 2).

Grants: authenticated own rows for `goal_accounts` / `goal_account_contributions` / `goal_account_options`; admin via `has_role` for full read. Service role all.

## 2. Edge functions

- **New `ai-open-goal`** — one-shot: given `{title, target_amount, target_date}` + profile → returns 2–3 options with `deposit`, `duration_months`, `monthly_contribution`, `requirements` (referrals, tasks, purchases). Wraps `ai-goal-plan` and persists into `goal_account_options`.
- **Extend `ai-recommend-campaigns`** — accept optional `goal_account_id`; when supplied, boost score by campaigns whose `eligible_brands` overlap the user's `brands_used` AND whose `goal_contribution_value` fits remaining locked amount. Add "brand migration" scoring: if user uses brand X and a partner Y in same `brand_catalog.category` exists, surface Y campaign with a `migration_from: X` reason.
- **Extend `ai-onboard`** — no shape change; already adaptive.
- **New `ai-goal-optimize`** (invoked on client cadence + on progress events) — inspects goal_account progress vs plan.duration_months; if behind pace, invokes `ai-recommend-campaigns` and returns coaching text + suggested actions.

All use `google/gemini-2.5-flash` via Lovable AI Gateway (existing pattern).

## 3. Admin UI

- **`AdminGoalAccounts.tsx`** — list all goal_accounts (filter status/goal/user), CSV+XLSX export (add `xlsx` dep), progress bars, view contribution ledger.
- **Extend `AdminCampaignEligibility.tsx`** — add fields: `task_mode`, `proof_types` (multi-select), `goal_contribution_value`, `ai_weight`.
- **Extend `AdminBehaviorAnalytics.tsx`** — add sections: users-by-brand (OPay/PalmPay/Bolt/Uber/MTN/Airtel counts), users-by-goal-category, avg deposit, avg goal size, most common goals, willingness (online vs offline tasks) — all filterable + XLSX export.
- Keep existing `AdminUserGoals.tsx` as read-only legacy view.

## 4. User-facing

- **`GoalAccountFlow.tsx`** (new) launched from AI chat when user states a goal:
  1. AI extracts title + target (via existing `ai-onboard` extract path).
  2. Client calls `ai-open-goal` → shows 2–3 options as cards (deposit vs no-deposit tradeoffs, duration, required tasks/referrals).
  3. User picks → `open_goal_account` RPC → if deposit>0, wallet flow → goal_account created.
- **`GoalAccountCard.tsx`** — visual funded-account: Locked / Unlocked / Remaining / Progress %, contribution ledger, "Withdraw" button (disabled until `unlocked_amount >= min_withdraw` — reuse existing 50k rule; withdrawal is one-shot and closes the account with a confirmation modal explaining forfeit of locked).
- **`RecommendedOffers.tsx`** — already exists; extend to accept `goalAccountId` prop and pass to `ai-recommend-campaigns`.
- **Earn tab toggle** — add "Personalized / All Offers" switch (Personalized default = `campaign_recommendations`, All = existing full list). Already partially in place; wire the toggle.
- **Task submission** — no shape change; on admin approval, existing triggers apply unlock via `apply_goal_unlock`.

## 5. Data migration

- Do NOT migrate `user_goals` rows (kept for admin history).
- Existing "savings" surfaces (if any) route to Goal Account list — one legacy card in dashboard becomes "Open your first Goal Account" CTA when none exist.

## 6. Out of scope

Auth, wallet primitives, referral gating, influencer program, existing admin tabs, currency conversion, existing rewards math, visual redesign of Auth/Nav/Footer.

## Technical notes

- All new SQL SECURITY DEFINER + `set search_path=public`.
- Structured output via chat-completions `response_format: { type: 'json_object' }` (existing edge-function pattern in `ai-goal-plan`) — no zod schema bounds.
- XLSX export via `xlsx` npm package (add dep) for admin analytics; CSV stays client-side.
- One-time withdrawal enforced at DB level (`withdraw_goal_account` refuses if `withdrawn_at IS NOT NULL`).
- Unlock is monotonic and capped at target; overflow (bigger contribution than remaining) trims to remaining and marks `completed`.

## Files to create

- `supabase/migrations/<ts>_goal_accounts.sql`
- `supabase/functions/ai-open-goal/index.ts`
- `supabase/functions/ai-goal-optimize/index.ts`
- `src/components/GoalAccountFlow.tsx`
- `src/components/GoalAccountCard.tsx`
- `src/components/admin/AdminGoalAccounts.tsx`

## Files to edit

- `supabase/functions/ai-recommend-campaigns/index.ts` (goal-scoped + brand migration)
- `src/components/admin/AdminCampaignEligibility.tsx` (new fields)
- `src/components/admin/AdminBehaviorAnalytics.tsx` (brand + goal aggregates + xlsx)
- `src/components/RecommendedOffers.tsx` (accept `goalAccountId`)
- `src/pages/Admin.tsx` (register `AdminGoalAccounts` tab)
- `src/components/QueueDisplay.tsx` (Earn toggle, Goal Account section)
- `src/components/KarbaliChat.tsx` (launch `GoalAccountFlow` on goal intent)
