
CREATE TABLE public.signup_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  device_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage signup_devices"
  ON public.signup_devices FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_signup_devices_ip ON public.signup_devices(ip_address);
CREATE INDEX idx_signup_devices_fingerprint ON public.signup_devices(device_fingerprint);
