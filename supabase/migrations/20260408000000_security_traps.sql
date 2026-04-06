
-- Create blacklisted_entities table
CREATE TABLE IF NOT EXISTS public.blacklisted_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  fingerprint text,
  reason text NOT NULL,
  expires_at timestamptz,
  CONSTRAINT at_least_one_identifier CHECK (ip_address IS NOT NULL OR fingerprint IS NOT NULL)
);

-- Create security_incidents table
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  fingerprint text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  severity text NOT NULL DEFAULT 'low' -- low, medium, high, critical
);

-- Enable RLS
ALTER TABLE public.blacklisted_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

-- Policies for blacklisted_entities
CREATE POLICY "Admins can manage blacklisted_entities"
  ON public.blacklisted_entities FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policies for security_incidents
CREATE POLICY "Admins can view security_incidents"
  ON public.security_incidents FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage security_incidents"
  ON public.security_incidents FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Helper function to check blacklist status including IP (IP check must be done via Edge Function or this SECURITY DEFINER function)
CREATE OR REPLACE FUNCTION public.check_is_blacklisted(client_fingerprint text)
RETURNS boolean AS $$
DECLARE
  is_blocked boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.blacklisted_entities
    WHERE (fingerprint = client_fingerprint)
    AND (expires_at > now() OR expires_at IS NULL)
  ) INTO is_blocked;

  RETURN is_blocked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_blacklisted_ip ON public.blacklisted_entities(ip_address);
CREATE INDEX IF NOT EXISTS idx_blacklisted_fingerprint ON public.blacklisted_entities(fingerprint);
CREATE INDEX IF NOT EXISTS idx_security_incidents_type ON public.security_incidents(type);
CREATE INDEX IF NOT EXISTS idx_security_incidents_created_at ON public.security_incidents(created_at);
