# Conversational Onboarding, Goal Unlock Tiers & Unified Task System

## 1. Smarter onboarding AI

Rewrite the `ai-onboard` system prompt so the assistant reasons over Karbali's actual rules instead of running a script.

- Give the model a compact "system knowledge" block: how points work (1 point = ₦0.5), goal accounts, task types, influencer eligibility rules (min 1,000 followers/subscribers, min 200 views per post), switching offers, verification flow.
- Branching intelligence: when a user's wish is "money", the assistant explores *how* they want to earn it — e.g. offers the influencer path, then qualifies them against the follower/views guardrails and routes them to the standard earning path if they don't qualify.
- Empathy and diversion handling: if a user says "I'm tired" / goes off-topic, respond warmly, then re-anchor with a soft question. Never repeat the same phrasing twice; vary question wording across sessions.
- Skipping: user can say "later" at any point. The assistant closes gracefully, marks onboarding incomplete, and the setup gate can be reopened from the dashboard.
- Completion bonus: finishing onboarding in the same session as signup credits a **₦2,000 equivalent points bonus** (4,000 points), once per user.

## 2. Goal account unlock options (5 tiers)

When a goal target is confirmed (e.g. ₦10,000,000), generate five options where deposit and task load trade off:

| Option | Deposit | Task load |
|---|---|---|
| A | 0% | Highest number of tasks, longest estimated time |
| B | 10% | High |
| C | 20% | Medium |
| D | 50% | Low |
| E | Custom / higher | Lowest |

Each option shows: deposit amount, estimated task count, estimated months to unlock, and monthly contribution if any. Computed deterministically from the target so numbers are always consistent, then narrated by the AI.

## 3. Task system (user side)

New unified **Tasks** area in the dashboard with three groups:

- **Switching tasks** — brand-to-brand switching (Peak → Loya, DSTV → alternative, Airtel → MTN, Uber → Bolt). Online or offline.
- **Survey tasks** — existing surveys, unchanged.
- **Online tasks** — app/web actions with daily progress.

Switching tasks are **progression tasks**: a task with a 30-day duration requires one approved evidence submission per day. The user sees a day-by-day tracker (day 1…N) with per-day status: pending / submitted / approved / rejected. Reward is credited only when **all** days are approved.

Evidence types per task (admin-selected, one or more):
- Photo/screenshot upload (with a required count, e.g. 3 shots: purchase, opened product, in use)
- Video upload
- Barcode/label scan or photo of product code
- Receipt/transaction screenshot

## 4. Admin panel restructure

Group everything under a single **User Tasks** tab with sub-tabs:
- Switching Tasks (create online/offline, set duration in days, evidence types + required counts, instructions, reward, target brand being switched from)
- Surveys
- Online Tasks
- Submissions review queue (approve/reject each day's evidence, same pattern as expense verification)

**Influencer Tasks** stays a separate tab (challenges, influencer surveys, leaderboard).

## 5. Design coverage

Task progress, available tasks, and goal unlock options render in all dashboard variants: default, bold, minimal, neon, cards — each using its own visual language via shared data hooks so logic is written once.

## Technical notes

- New tables: `user_tasks` (definition: type, mode online/offline, duration_days, evidence_config jsonb, reward_points, switch_from_brand, instructions, active), `user_task_enrollments` (user, task, status, day progress), `user_task_submissions` (enrollment, day_index, evidence urls/type, status, reviewer notes). Each with GRANTs + RLS (users see/insert own; admins full access via `has_role`).
- Storage: reuse a private bucket for evidence with signed URLs for admin review; video uploads allowed.
- Goal tier generation: deterministic helper in `supabase/functions/_shared/`, consumed by `ai-onboard` and `ai-goal-plan`, written into `goal_account_options`.
- Reward crediting on final-day approval via a DB trigger, mirroring `trg_offer_proof_completion`, and also unlocking goal-account progress.
- Onboarding bonus tracked with a `onboarding_bonus_awarded` flag on `profiles`.
- Existing `offer_enrollments` / `offer_daily_proofs` are folded into the new task model so there is one progression engine, not two.

## Note

The screenshots you mentioned did not come through — if you re-attach them I'll match the task progress UI to them exactly. Otherwise I'll build a clean day-tracker layout consistent with the current design system.
