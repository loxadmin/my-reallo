ALTER TABLE public.dummy_users
ADD COLUMN annual_data_spend NUMERIC DEFAULT 0,
ADD COLUMN annual_electricity_spend NUMERIC DEFAULT 0,
ADD COLUMN annual_food_spend NUMERIC DEFAULT 0,
ADD COLUMN annual_transport_spend NUMERIC DEFAULT 0,
ADD COLUMN user_type TEXT,
ADD COLUMN spend_verified BOOLEAN DEFAULT false,
ADD COLUMN target_amount NUMERIC DEFAULT 0;

CREATE TABLE public.dummy_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dummy_user_id UUID REFERENCES public.dummy_users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  positions_moved INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dummy_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage dummy activity" ON public.dummy_activity
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.dummy_users IS 'enhanced dummy users';
