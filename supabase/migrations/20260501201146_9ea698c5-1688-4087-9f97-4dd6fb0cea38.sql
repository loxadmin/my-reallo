
-- Add segment + lock period columns to goal_categories
ALTER TABLE public.goal_categories
  ADD COLUMN IF NOT EXISTS user_segments text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lock_period_months integer NOT NULL DEFAULT 6;

-- Update existing rows to align with the new structure
-- Education -> students only, lock 12 months
UPDATE public.goal_categories
  SET user_segments = ARRAY['student'], lock_period_months = 12
  WHERE goal_type = 'education';

-- Vacation -> available to all (student, parent, others), lock 6 months
UPDATE public.goal_categories
  SET user_segments = ARRAY['student','parent','others'], lock_period_months = 6
  WHERE goal_type = 'vacation';

-- Business funding -> available to student, parent, others; lock 12 months
UPDATE public.goal_categories
  SET user_segments = ARRAY['student','parent','others'], lock_period_months = 12
  WHERE goal_type = 'business';

-- Existing rent row: convert to "save_for_rainy_day" for others (rename via new insert below)
-- Keep old rent row as legacy but tag as 'others' rainy day fallback
UPDATE public.goal_categories
  SET user_segments = ARRAY['others'], lock_period_months = 6,
      goal_type = 'rainy_day', label = 'Save For A Rainy Day'
  WHERE goal_type = 'rent';

-- Insert new parent-only goals
INSERT INTO public.goal_categories (goal_type, subcategory, label, max_price, user_segments, lock_period_months)
VALUES
  ('child_savings', 'e_go_better_fund', 'E Go Better Fund Savings', 10000000, ARRAY['parent'], 60),
  ('child_savings', 'university_fund',   'University Fund Savings',  15000000, ARRAY['parent'], 60),
  ('car_savings',   NULL,                'Car Savings (New Car)',    20000000, ARRAY['parent'], 12)
ON CONFLICT DO NOTHING;
