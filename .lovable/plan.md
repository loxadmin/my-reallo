# AI User Profiling, Dynamic Offer Matching & Goal Intelligence

Extends existing Karbali. Does not touch auth, wallets, savings, rewards, admin shell, existing campaigns/earn UI, or assistant chat surface.

## 1. Database (single migration)

New tables (all `public`, with GRANTs + RLS):

- `onboarding_question_categories` — id, name, sort_order, active
- `onboarding_questions` — id, category_id, prompt, question_type (text|choice|multi|yesno|numeric|date|file), options jsonb, required, active, sort_order, tag_key (used to key the answer in the profile)
- `brand_catalog` — id, name, category (bank|ride|shopping|telecom|food|streaming|other), country, active. Admin-managed, no limit.
- `user_behavior_profile` — user_id (pk), segments text[] (e.g. student, business_owner, entrepreneur), brands_used text[], spending_habits text[], task_capabilities text[], financial jsonb (income_range, monthly_spend, occupation, household_size), country, state, city, age_group, raw jsonb, updated_at
- `user_onboarding_answers` — id, user_id, question_id, tag_key, answer jsonb, created_at
- `user_goals` — id, user_id, title, category (free-form idea), target_amount, target_date, status (active|paused|achieved|abandoned), plan jsonb (chosen plan), created_at, updated_at. Replaces admin-defined `goal_categories` as the source of truth for user goals (keep `goal_categories` table as read-only "goal ideas" library).
- `goal_ideas` — id, title, description, typical_target_min, typical_target_max, tags text[], active. Admin CRUD; feeds AI suggestions.
- `campaign_eligibility` — campaign_id (fk existing campaigns), eligible_segments text[], eligible_brands text[], eligible_goals text[], eligible_locations text[], deposit_required int, referral_required int, weight int, priority int, expires_at, budget_remaining
- `campaign_proof_config` — campaign_id, proof_types text[] (screenshot|screen_recording|photo|video), instructions
- `campaign_recommendations` — id, user_id, campaign_id, score, reason jsonb, generated_at (cache of AI matches)

Grants: authenticated read/write own rows for `user_*`; admin-only for catalogs/questions/ideas via `has_role`. Service role all.

## 2. Edge functions

- `ai-onboard` — given last user message + current profile state, calls Lovable AI gateway (`google/gemini-3-flash-preview`) with the admin-defined questions and structured-output schema; returns next question or completion + extracted tags/segments/brands. Persists answer + updates `user_behavior_profile`.
- `ai-goal-plan` — takes goal (title/target/date) + profile → returns 2–3 plan objects (deposit, duration, requirements). Stored on `user_goals.plan`.
- `ai-recommend-campaigns` — scores available campaigns against profile, upserts top N into `campaign_recommendations`. Triggered on: profile change, goal change, campaign completion, deposit, new/expired campaign (cron-ish, invoked by hooks).

All server-side, use `LOVABLE_API_KEY`.

## 3. Admin UI additions (new tabs in existing Admin.tsx)

- `AdminOnboardingManager.tsx` — CRUD questions + categories, drag reorder, toggle active/required, edit options.
- `AdminBrandCatalog.tsx` — CRUD brands.
- `AdminGoalIdeas.tsx` — CRUD goal ideas.
- `AdminBehaviorAnalytics.tsx` — aggregate views: brand usage counts, segment breakdowns, filters (country/state/city/age/occupation/goal/date), CSV + Excel export, simple charts (recharts already in project).
- `AdminUserGoals.tsx` — list all user-set goals, filter/export CSV.
- Extend existing campaigns admin with eligibility + proof config fields.

## 4. User-facing changes

- `KarbaliChat.tsx` onboarding mode → drive from `onboarding_questions` via `ai-onboard` edge function instead of hardcoded flow. Result writes to `user_behavior_profile` + creates a `user_goals` row.
- Remove Student/Parent/Others manual selection paths (already removed from Auth; ensure onboarding no longer branches on it).
- Goal creation UI: user types free-form goal (with AI-suggested ideas from `goal_ideas`), enters target amount + date. AI generates plans; user picks one.
- `Earn` tab: add "Recommended For You" default sub-tab reading `campaign_recommendations`; keep existing content as "All Offers".

## 5. Recomputation hooks

DB triggers on `survey_responses`/`spend_verifications`/`decision_responses` approvals → `pg_notify` (or direct edge invoke via existing patterns) to refresh recommendations. Client also calls `ai-recommend-campaigns` on goal change / deposit.

## 6. Out of scope

Auth, wallets, referrals gating, influencer program, OAuth, existing rewards math, currency, existing admin tabs. No visual redesign of Earn or Chat surfaces — only data source swaps + one new sub-tab.

## Technical notes

- All new SQL functions `SECURITY DEFINER`, `set search_path = public`.
- Structured output via AI SDK `Output.object` with small schemas; clamp/validate in code (no schema `.min/.max`).
- CSV export client-side; Excel via `xlsx` npm (add dep).
- Reuse existing `useAuth`, `has_role`, admin tab pattern, and toast/error conventions.
