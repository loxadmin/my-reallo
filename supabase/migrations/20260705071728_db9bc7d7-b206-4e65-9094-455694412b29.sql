
-- Onboarding v2, currency, brand switching intent, custom brands, offer daily proofs

-- 1. profile: onboarding version + preferred currency
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_version int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferred_currency text;

-- 2. user_custom_brands
CREATE TABLE IF NOT EXISTS public.user_custom_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text,
  promoted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ucb_user ON public.user_custom_brands(user_id);
CREATE INDEX IF NOT EXISTS idx_ucb_name_lower ON public.user_custom_brands ((lower(name)));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_custom_brands TO authenticated;
GRANT ALL ON public.user_custom_brands TO service_role;
ALTER TABLE public.user_custom_brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ucb self read" ON public.user_custom_brands;
CREATE POLICY "ucb self read" ON public.user_custom_brands FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "ucb self insert" ON public.user_custom_brands;
CREATE POLICY "ucb self insert" ON public.user_custom_brands FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ucb admin update" ON public.user_custom_brands;
CREATE POLICY "ucb admin update" ON public.user_custom_brands FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "ucb admin delete" ON public.user_custom_brands;
CREATE POLICY "ucb admin delete" ON public.user_custom_brands FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. user_brand_switch_intent
CREATE TABLE IF NOT EXISTS public.user_brand_switch_intent (
  user_id uuid NOT NULL,
  brand_name text NOT NULL,
  brand_category text,
  willing_to_switch boolean NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, brand_name)
);
CREATE INDEX IF NOT EXISTS idx_ubsi_brand ON public.user_brand_switch_intent (brand_name);
CREATE INDEX IF NOT EXISTS idx_ubsi_willing ON public.user_brand_switch_intent (willing_to_switch);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_brand_switch_intent TO authenticated;
GRANT ALL ON public.user_brand_switch_intent TO service_role;
ALTER TABLE public.user_brand_switch_intent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ubsi self read" ON public.user_brand_switch_intent;
CREATE POLICY "ubsi self read" ON public.user_brand_switch_intent FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "ubsi self upsert" ON public.user_brand_switch_intent;
CREATE POLICY "ubsi self upsert" ON public.user_brand_switch_intent FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ubsi self update" ON public.user_brand_switch_intent;
CREATE POLICY "ubsi self update" ON public.user_brand_switch_intent FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ubsi self delete" ON public.user_brand_switch_intent;
CREATE POLICY "ubsi self delete" ON public.user_brand_switch_intent FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. campaign_eligibility extensions
ALTER TABLE public.campaign_eligibility
  ADD COLUMN IF NOT EXISTS competes_with_brands text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS exclusive_to_switchers boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duration_days int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS category text;

-- 5. offer_enrollments
CREATE TABLE IF NOT EXISTS public.offer_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id text NOT NULL,
  eligibility_id uuid REFERENCES public.campaign_eligibility(id) ON DELETE SET NULL,
  expected_days int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oe_user ON public.offer_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_oe_campaign ON public.offer_enrollments(campaign_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_enrollments TO authenticated;
GRANT ALL ON public.offer_enrollments TO service_role;
ALTER TABLE public.offer_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "oe self read" ON public.offer_enrollments;
CREATE POLICY "oe self read" ON public.offer_enrollments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "oe self insert" ON public.offer_enrollments;
CREATE POLICY "oe self insert" ON public.offer_enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "oe admin update" ON public.offer_enrollments;
CREATE POLICY "oe admin update" ON public.offer_enrollments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 6. offer_daily_proofs
CREATE TABLE IF NOT EXISTS public.offer_daily_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.offer_enrollments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  day_index int NOT NULL,
  screenshot_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, day_index)
);
CREATE INDEX IF NOT EXISTS idx_odp_user ON public.offer_daily_proofs(user_id);
CREATE INDEX IF NOT EXISTS idx_odp_status ON public.offer_daily_proofs(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_daily_proofs TO authenticated;
GRANT ALL ON public.offer_daily_proofs TO service_role;
ALTER TABLE public.offer_daily_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "odp self read" ON public.offer_daily_proofs;
CREATE POLICY "odp self read" ON public.offer_daily_proofs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "odp self insert" ON public.offer_daily_proofs;
CREATE POLICY "odp self insert" ON public.offer_daily_proofs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "odp admin update" ON public.offer_daily_proofs;
CREATE POLICY "odp admin update" ON public.offer_daily_proofs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Trigger: when final day is approved, complete enrollment + unlock goal
CREATE OR REPLACE FUNCTION public.trg_offer_proof_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_enrollment RECORD;
  v_approved int;
  v_goal uuid;
  v_contrib bigint;
BEGIN
  IF NEW.status <> 'approved' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN RETURN NEW; END IF;

  SELECT * INTO v_enrollment FROM public.offer_enrollments WHERE id = NEW.enrollment_id;
  IF v_enrollment.id IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_approved FROM public.offer_daily_proofs
    WHERE enrollment_id = NEW.enrollment_id AND status = 'approved';

  IF v_approved >= v_enrollment.expected_days AND v_enrollment.status <> 'completed' THEN
    UPDATE public.offer_enrollments
      SET status = 'completed', completed_at = now(), updated_at = now()
      WHERE id = NEW.enrollment_id;

    -- Unlock goal account contribution if configured
    v_goal := public.active_goal_account(v_enrollment.user_id);
    IF v_goal IS NOT NULL THEN
      SELECT COALESCE(goal_contribution_value, 0)::bigint INTO v_contrib
        FROM public.campaign_eligibility WHERE id = v_enrollment.eligibility_id;
      IF v_contrib > 0 THEN
        PERFORM public.apply_goal_unlock(v_goal, 'offer', v_enrollment.id::text, v_contrib, 'Offer completed');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_offer_proof_completion ON public.offer_daily_proofs;
CREATE TRIGGER trg_offer_proof_completion
  AFTER INSERT OR UPDATE OF status ON public.offer_daily_proofs
  FOR EACH ROW EXECUTE FUNCTION public.trg_offer_proof_completion();

-- 8. Seed missing onboarding questions (idempotent by tag_key)
INSERT INTO public.onboarding_questions (prompt, question_type, tag_key, required, active, sort_order)
SELECT * FROM (VALUES
  ('What''s your preferred currency? (e.g. NGN, USD, GBP, EUR)', 'choice', 'preferred_currency', true, true, 1),
  ('Roughly how much do you spend on mobile data per month?', 'numeric', 'monthly_data_spend', true, true, 50),
  ('Roughly how much do you spend on airtime per month?', 'numeric', 'monthly_airtime_spend', true, true, 51),
  ('Roughly how much do you spend on electricity per month?', 'numeric', 'monthly_electricity_spend', true, true, 52),
  ('Roughly how much do you spend on transport per month?', 'numeric', 'monthly_transport_spend', true, true, 53),
  ('Roughly how much do you spend on food per month?', 'numeric', 'monthly_food_spend', true, true, 54),
  ('Roughly how much do you spend on rent per month?', 'numeric', 'monthly_rent_spend', false, true, 55),
  ('Roughly how much do you spend on streaming subscriptions per month?', 'numeric', 'monthly_streaming_spend', false, true, 56)
) v(prompt, question_type, tag_key, required, active, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.onboarding_questions oq WHERE oq.tag_key = v.tag_key
);

-- Attach options to preferred_currency question if it exists and lacks options
UPDATE public.onboarding_questions
  SET options = '["NGN","USD","GBP","EUR","GHS","KES","ZAR","CAD","AUD","Other"]'::jsonb
  WHERE tag_key = 'preferred_currency' AND (options IS NULL OR options = 'null'::jsonb OR options = '[]'::jsonb);
