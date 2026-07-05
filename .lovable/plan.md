# Onboarding v2, Brand Switching & Daily Offer Proofs

Scope is additive. No changes to auth, wallet, referrals, influencer program, or the goal-account math.

## 1. Force re-onboarding for existing users

- Add `profiles.onboarding_version int default 0` and current required version constant `2` in code.
- `KarbaliChat` / `QueueDisplay` gate: if `onboarding_version < 2`, launch the AI onboarding flow before the rest of the app is usable (soft banner + modal — no logout).
- Bump to `2` when `ai-onboard` returns `done: true` AND the switch-intent step is finished.

## 2. Currency picker during onboarding

- Since IP geolocation is unreliable, `ai-onboard` asks the user their preferred currency early on (NGN, USD, GBP, EUR, GHS, KES, ZAR, "Other").
- Store on `profiles.preferred_currency` (new column). `CurrencyContext` reads `profiles.preferred_currency` first, then falls back to IP.

## 3. Fill the missing onboarding questions

Seed missing questions into `onboarding_questions` (idempotent upsert on `tag_key`):

- `monthly_data_spend` (numeric)
- `monthly_electricity_spend` (numeric)
- `monthly_airtime_spend` (numeric)
- `monthly_transport_spend` (numeric)
- `monthly_food_spend` (numeric)
- `monthly_rent_spend` (numeric)
- `monthly_streaming_spend` (numeric)

`ai-onboard` prompt already iterates `onboarding_questions`, so no function change beyond making sure numeric answers land in `user_behavior_profile.financial`.

## 4. "Other" brands + free-typed brands

- Ensure every category in `brand_catalog` also has an implicit "Other" — surfaced by `ai-onboard` as a follow-up: "Any other brands you use we didn't list? Type them in."
- New table `user_custom_brands(user_id, name, category, created_at)` for user-typed brands.
- `AdminBrandCatalog` gets a "Suggested by users" panel to promote a custom brand into the official catalog (moves the row, dedupes case-insensitively).

## 5. Brand switching intent

New table:

```
user_brand_switch_intent (
  user_id uuid,
  brand_name text,    -- normalized lower
  brand_category text,
  willing_to_switch boolean,
  captured_at timestamptz default now(),
  primary key (user_id, brand_name)
)
```

- After brands step, `ai-onboard` returns a `switch_prompt` payload: `{ brands: [{name, category}, ...] }`.
- Frontend renders a checklist: for each brand the user selected, a Yes/No toggle "Willing to switch from <Brand> to a Karbali partner?".
- Submission writes/updates `user_brand_switch_intent`. Onboarding v2 is only complete once this step is submitted.
- Admin export: `AdminBehaviorAnalytics` gets a "Switch intent" tab — bar chart per brand of Yes counts + CSV download ("how many will switch from Opay / Peak Milk / …").

## 6. Admin brand-competition targeting on offers

Extend `campaign_eligibility`:

- `competes_with_brands text[] default '{}'` — admin picks brands this offer is designed to steal customers from.
- `exclusive_to_switchers boolean default true` — when true, offer only surfaces to users who (a) selected one of those brands AND (b) said "willing to switch" AND (c) have never had an approved offer completion with another Karbali partner brand. Users can still opt to view via the existing "All offers" toggle on the Earn tab.

`ai-recommend-campaigns` scoring update:

```
if (competes_with_brands.length) {
  const willing = switchIntent.filter(s => competes.includes(s.brand) && s.willing).map(s=>s.brand);
  if (willing.length === 0 && exclusive_to_switchers) skip;
  else score += willing.length * 5;   // strong boost
}
// exemption: if user has any approved offer_daily_proofs with campaign whose category === this.category, skip when exclusive_to_switchers
```

`AdminCampaignEligibility.tsx` gains a brand multi-select bound to `brand_catalog` + toggle for `exclusive_to_switchers`.

## 7. Daily-screenshot proof for offers

New tables:

```
offer_enrollments (
  id, user_id, campaign_id, started_at, expected_days int, status ('active'|'completed'|'expired')
)
offer_daily_proofs (
  id, enrollment_id, user_id, day_index int, screenshot_url text,
  status ('pending'|'approved'|'rejected'), admin_note, reviewed_by, reviewed_at, created_at
)
unique (enrollment_id, day_index)
```

- `campaign_eligibility.duration_days int default 1` — admin sets how many daily proofs are required.
- User flow (`OfferEnrollmentCard.tsx` inside `RecommendedOffers`):
  - "Accept offer" → creates enrollment.
  - Each day shows an upload slot ("Day 3 of 10 — upload today's screenshot"). One upload per calendar day per enrollment.
  - Screenshot goes to existing `survey_screenshots` bucket under `offers/<user>/<enrollment>/<day>.jpg`.
- Admin queue: new `AdminOfferProofs.tsx` (mirrors `VerifySpend` admin view) — approve/reject each daily proof. On the final approved day, enrollment flips to `completed` and the goal-account contribution trigger fires (reuse the `apply_goal_unlock` pattern).
- Partial completion = no reward. Rejected day requires re-upload same day.

## 8. Files

**New**
- `supabase/migrations/…_onboarding_v2_switch_intent_offer_proofs.sql`
- `src/components/OfferEnrollmentCard.tsx`
- `src/components/BrandSwitchIntentStep.tsx`
- `src/components/admin/AdminOfferProofs.tsx`
- `src/components/admin/AdminBrandSwitchIntent.tsx` (tab inside behavior analytics)

**Edited**
- `supabase/functions/ai-onboard/index.ts` — currency Q, custom brands, switch-intent payload, sets `onboarding_version=2`
- `supabase/functions/ai-recommend-campaigns/index.ts` — switch-intent scoring & exemption
- `src/components/admin/AdminBrandCatalog.tsx` — suggested-by-users panel
- `src/components/admin/AdminCampaignEligibility.tsx` — competes_with_brands, exclusive_to_switchers, duration_days
- `src/components/admin/AdminBehaviorAnalytics.tsx` — switch-intent tab + CSV
- `src/components/RecommendedOffers.tsx` — enroll + daily proof entry point
- `src/components/QueueDisplay.tsx` / `KarbaliChat.tsx` — force re-onboarding when `onboarding_version < 2`
- `src/contexts/CurrencyContext.tsx` — prefer `profiles.preferred_currency`
- `src/pages/Admin.tsx` — new "Offer Proofs" sidebar entry

## Out of scope

Auth, wallets, existing goal-account math, influencer program, existing surveys/decision/spend flows, currency conversion rates.

Confirm and I'll ship it.