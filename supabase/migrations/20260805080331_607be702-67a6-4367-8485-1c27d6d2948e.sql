
CREATE TABLE public.user_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  instructions text,
  task_type text NOT NULL DEFAULT 'switching',
  mode text NOT NULL DEFAULT 'online',
  duration_days integer NOT NULL DEFAULT 1,
  evidence_config jsonb NOT NULL DEFAULT '[]'::jsonb,
  reward_points integer NOT NULL DEFAULT 0,
  switch_from_brand text,
  switch_to_brand text,
  category text,
  max_participants integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_tasks TO anon;
GRANT SELECT ON public.user_tasks TO authenticated;
GRANT ALL ON public.user_tasks TO service_role;
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tasks" ON public.user_tasks
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage tasks" ON public.user_tasks
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER user_tasks_touch BEFORE UPDATE ON public.user_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_generic();


CREATE TABLE public.user_task_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.user_tasks(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  approved_days integer NOT NULL DEFAULT 0,
  reward_credited boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id)
);

GRANT SELECT, INSERT, UPDATE ON public.user_task_enrollments TO authenticated;
GRANT ALL ON public.user_task_enrollments TO service_role;
ALTER TABLE public.user_task_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own enrollments" ON public.user_task_enrollments
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own enrollments" ON public.user_task_enrollments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins update enrollments" ON public.user_task_enrollments
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER user_task_enrollments_touch BEFORE UPDATE ON public.user_task_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_generic();


CREATE TABLE public.user_task_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.user_task_enrollments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  day_index integer NOT NULL DEFAULT 1,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  status text NOT NULL DEFAULT 'pending',
  reviewer_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, day_index)
);

GRANT SELECT, INSERT, UPDATE ON public.user_task_submissions TO authenticated;
GRANT ALL ON public.user_task_submissions TO service_role;
ALTER TABLE public.user_task_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own submissions" ON public.user_task_submissions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own submissions" ON public.user_task_submissions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins review submissions" ON public.user_task_submissions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER user_task_submissions_touch BEFORE UPDATE ON public.user_task_submissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_generic();


CREATE OR REPLACE FUNCTION public.trg_user_task_submission_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_enr RECORD;
  v_task RECORD;
  v_approved int;
  v_goal uuid;
BEGIN
  IF NEW.status <> 'approved' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN RETURN NEW; END IF;

  SELECT * INTO v_enr FROM public.user_task_enrollments WHERE id = NEW.enrollment_id FOR UPDATE;
  IF v_enr.id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_task FROM public.user_tasks WHERE id = v_enr.task_id;
  IF v_task.id IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*)::int INTO v_approved FROM public.user_task_submissions
    WHERE enrollment_id = NEW.enrollment_id AND status = 'approved';

  UPDATE public.user_task_enrollments SET approved_days = v_approved WHERE id = v_enr.id;

  IF v_approved >= v_task.duration_days AND v_enr.reward_credited = false THEN
    UPDATE public.user_task_enrollments
      SET status = 'completed', completed_at = now(), reward_credited = true
      WHERE id = v_enr.id;

    IF v_task.reward_points > 0 THEN
      UPDATE public.profiles SET points_balance = points_balance + v_task.reward_points
        WHERE id = v_enr.user_id;
    END IF;

    v_goal := public.active_goal_account(v_enr.user_id);
    IF v_goal IS NOT NULL AND v_task.reward_points > 0 THEN
      PERFORM public.apply_goal_unlock(v_goal, 'task', v_enr.id::text,
        (v_task.reward_points / 2)::bigint, format('Task completed: %s', v_task.title));
    END IF;

    PERFORM public.mark_referral_valid(v_enr.user_id, 'task');
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER user_task_submission_progress
AFTER INSERT OR UPDATE ON public.user_task_submissions
FOR EACH ROW EXECUTE FUNCTION public.trg_user_task_submission_progress();


ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_bonus_awarded boolean NOT NULL DEFAULT false;
